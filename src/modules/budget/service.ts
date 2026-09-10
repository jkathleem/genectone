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
