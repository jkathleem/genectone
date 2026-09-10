import { Prisma, PrismaClient } from "@/generated/prisma";
import { monthlyCompetence, nonNegativeAmount } from "./domain";

type DB = Pick<PrismaClient, "$transaction">;

export async function createBudget(db: DB, companyId: string, year: number, month: number, notes?: string | null) {
  if (!companyId) throw new Error("Selecione a empresa.");
  const competenceDate = monthlyCompetence(year, month);
  try {
    return await db.$transaction(async tx => {
      const company = await tx.company.findUnique({ where: { id: companyId }, select: { active: true } });
      if (!company?.active) throw new Error("Selecione uma empresa ativa.");
      return tx.budget.create({ data: { companyId, competenceDate, notes: notes?.trim() || null } });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new Error("Já existe orçamento para esta empresa e competência.");
    throw error;
  }
}

export async function updateBudgetNotes(db: DB, id: string, notes?: string | null) {
  return db.$transaction(tx => tx.budget.update({ where: { id }, data: { notes: notes?.trim() || null } }));
}

export async function addGrossRevenue(db: DB, budgetId: string, amountValue: Prisma.Decimal | string, notes?: string | null) {
  const amount = nonNegativeAmount(amountValue);
  try { return await db.$transaction(async tx => {
    if (!await tx.budget.findUnique({ where: { id: budgetId } })) throw new Error("Orçamento não encontrado.");
    return tx.budgetEntry.create({ data: { budgetId, entryType: "GROSS_REVENUE", amount, notes: notes?.trim() || null } });
  }); } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new Error("Este orçamento já possui Receita Bruta prevista.");
    throw error;
  }
}

export async function addClassificationEntry(db: DB, budgetId: string, classificationId: string, amountValue: Prisma.Decimal | string, notes?: string | null) {
  const amount = nonNegativeAmount(amountValue);
  try { return await db.$transaction(async tx => {
    const classification = await tx.financialClassification.findUnique({ where: { id: classificationId } });
    if (!classification?.active) throw new Error("Selecione uma classificação ativa.");
    if (classification.financialNature === "NON_DRE" || !classification.dreGroup) throw new Error("Classificações NON_DRE não podem ser orçadas nesta tela.");
    return tx.budgetEntry.create({ data: { budgetId, entryType: "FINANCIAL_CLASSIFICATION", classificationId, classificationCodeSnapshot: classification.code, classificationNameSnapshot: classification.name, financialNatureSnapshot: classification.financialNature, dreGroupSnapshot: classification.dreGroup, amount, notes: notes?.trim() || null } });
  }); } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new Error("Esta classificação já foi incluída no orçamento.");
    throw error;
  }
}

export async function updateBudgetEntry(db: DB, id: string, amountValue: Prisma.Decimal | string, notes?: string | null) {
  return db.$transaction(tx => tx.budgetEntry.update({ where: { id }, data: { amount: nonNegativeAmount(amountValue), notes: notes?.trim() || null } }));
}

export async function deleteBudgetEntry(db: DB, id: string) {
  return db.$transaction(tx => tx.budgetEntry.delete({ where: { id } }));
}

export async function copyBudget(db: DB, sourceBudgetId: string, destinationYear: number, destinationMonth: number) {
  const competenceDate = monthlyCompetence(destinationYear, destinationMonth);
  try {
    return await db.$transaction(async tx => {
      const source = await tx.budget.findUnique({ where: { id: sourceBudgetId }, include: { entries: true } });
      if (!source) throw new Error("Orçamento de origem não encontrado.");
      if (await tx.budget.findUnique({ where: { companyId_competenceDate: { companyId: source.companyId, competenceDate } }, select: { id: true } })) throw new Error("Já existe um orçamento para esta competência.");
      const classificationIds = source.entries.flatMap(entry => entry.classificationId ? [entry.classificationId] : []);
      const classifications = await tx.financialClassification.findMany({ where: { id: { in: classificationIds } } });
      const byId = new Map(classifications.map(item => [item.id, item]));
      const invalid = source.entries.flatMap(entry => {
        if (entry.entryType === "GROSS_REVENUE") return [];
        const current = entry.classificationId ? byId.get(entry.classificationId) : undefined;
        return !current || !current.active || current.financialNature === "NON_DRE" || !current.dreGroup ? [entry.classificationNameSnapshot ?? entry.classificationCodeSnapshot ?? "Classificação não identificada"] : [];
      });
      if (invalid.length) throw new Error(`Não foi possível copiar. Classificações inativas ou inelegíveis: ${invalid.join(", ")}.`);
      return tx.budget.create({ data: {
        companyId: source.companyId, competenceDate, notes: null,
        entries: { create: source.entries.map(entry => {
          if (entry.entryType === "GROSS_REVENUE") return { entryType: "GROSS_REVENUE" as const, amount: entry.amount, notes: entry.notes };
          const current = byId.get(entry.classificationId!)!;
          return { entryType: "FINANCIAL_CLASSIFICATION" as const, classificationId: current.id, classificationCodeSnapshot: current.code, classificationNameSnapshot: current.name, financialNatureSnapshot: current.financialNature, dreGroupSnapshot: current.dreGroup!, amount: entry.amount, notes: entry.notes };
        }) },
      }, include: { entries: true } });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new Error("Já existe um orçamento para esta competência.");
    throw error;
  }
}
