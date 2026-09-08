import { DreGroup, PrismaClient } from "@/generated/prisma";

type DB = Pick<PrismaClient, "$transaction" | "financialClassification">;
export const classificationCodePattern = /^[A-Z0-9_]+$/;

function required(value: string, message: string) {
  const normalized = value.trim();
  if (!normalized) throw new Error(message);
  return normalized;
}

export async function createFinancialClassification(db: DB, input: { code: string; name: string; dreGroup: DreGroup; notes?: string | null }) {
  const code = required(input.code, "Informe o código.");
  if (!classificationCodePattern.test(code)) throw new Error("O código deve usar somente A-Z, 0-9 e _.");
  return db.financialClassification.create({ data: {
    code,
    name: required(input.name, "Informe o nome."),
    dreGroup: input.dreGroup,
    notes: input.notes?.trim() || null,
  } });
}

export async function updateFinancialClassification(db: DB, id: string, input: { name: string; dreGroup: DreGroup; notes?: string | null }) {
  return db.$transaction(async (tx) => {
    const current = await tx.financialClassification.findUnique({ where: { id }, include: { _count: { select: { accountsPayable: true } } } });
    if (!current) throw new Error("Classificação não encontrada.");
    if (current.dreGroup !== input.dreGroup && current._count.accountsPayable > 0) throw new Error("O grupo DRE não pode ser alterado porque a classificação já está em uso.");
    return tx.financialClassification.update({ where: { id }, data: {
      name: required(input.name, "Informe o nome."),
      dreGroup: input.dreGroup,
      notes: input.notes?.trim() || null,
    } });
  });
}

export async function setFinancialClassificationActive(db: DB, id: string, active: boolean) {
  return db.financialClassification.update({ where: { id }, data: { active } });
}
