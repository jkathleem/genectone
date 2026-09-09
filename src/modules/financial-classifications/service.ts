import { DreGroup, FinancialNature, PrismaClient } from "@/generated/prisma";

type DB = Pick<PrismaClient, "$transaction" | "financialClassification">;
export const classificationCodePattern = /^[A-Z0-9_]+$/;

function required(value: string, message: string) {
  const normalized = value.trim();
  if (!normalized) throw new Error(message);
  return normalized;
}

type ClassificationInput = { name: string; financialNature: FinancialNature; dreGroup: DreGroup | null; notes?: string | null };

export function validateNatureAndGroup(financialNature: FinancialNature, dreGroup: DreGroup | null) {
  const operatingGroups: DreGroup[] = ["VARIABLE_COST_EXPENSE", "FIXED_COST_EXPENSE"];
  const postOperatingGroups: DreGroup[] = ["FINANCIAL_REVENUE", "FINANCIAL_EXPENSE", "INCOME_TAX_EXPENSE"];
  if (financialNature === "OPERATING_EXPENSE" && (!dreGroup || !operatingGroups.includes(dreGroup))) throw new Error("Selecione um grupo operacional variável ou fixo.");
  if (financialNature === "DRE_POST_OPERATING" && (!dreGroup || !postOperatingGroups.includes(dreGroup))) throw new Error("Selecione um grupo pós-operacional válido.");
  if (financialNature === "NON_DRE" && dreGroup) throw new Error("Classificações fora da DRE não podem possuir grupo DRE.");
}

export async function createFinancialClassification(db: DB, input: ClassificationInput & { code: string }) {
  const code = required(input.code, "Informe o código.");
  if (!classificationCodePattern.test(code)) throw new Error("O código deve usar somente A-Z, 0-9 e _.");
  validateNatureAndGroup(input.financialNature, input.dreGroup);
  return db.financialClassification.create({ data: {
    code,
    name: required(input.name, "Informe o nome."),
    financialNature: input.financialNature,
    dreGroup: input.dreGroup,
    notes: input.notes?.trim() || null,
  } });
}

export async function updateFinancialClassification(db: DB, id: string, input: ClassificationInput) {
  validateNatureAndGroup(input.financialNature, input.dreGroup);
  return db.$transaction(async (tx) => {
    const current = await tx.financialClassification.findUnique({ where: { id }, include: { _count: { select: { accountsPayable: true } } } });
    if (!current) throw new Error("Classificação não encontrada.");
    if (current.financialNature !== input.financialNature && current._count.accountsPayable > 0) throw new Error("A natureza financeira não pode ser alterada porque a classificação já está em uso.");
    if (current.dreGroup !== input.dreGroup && current._count.accountsPayable > 0) throw new Error("O grupo DRE não pode ser alterado porque a classificação já está em uso.");
    return tx.financialClassification.update({ where: { id }, data: {
      name: required(input.name, "Informe o nome."),
      financialNature: input.financialNature,
      dreGroup: input.dreGroup,
      notes: input.notes?.trim() || null,
    } });
  });
}

export async function setFinancialClassificationActive(db: DB, id: string, active: boolean) {
  return db.financialClassification.update({ where: { id }, data: { active } });
}
