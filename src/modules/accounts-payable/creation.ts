import { Prisma, PrismaClient } from "@/generated/prisma";
import { settlementTotal } from "@/modules/contractor-settlements/domain";
import { competenceDate } from "./domain";

const OUTSOURCED_PRODUCTION_CODE = "OUTSOURCED_PRODUCTION";
type DB = Pick<PrismaClient, "$transaction">;

export type ManualAccountPayableInput = {
  companyId: string;
  payeeName: string;
  description: string;
  classificationId: string;
  competenceYear: number;
  competenceMonth: number;
  dueDate: Date;
  originalAmount: Prisma.Decimal | string;
};

function requiredText(value: string, message: string) {
  const normalized = value.trim();
  if (!normalized) throw new Error(message);
  return normalized;
}

function validCompetence(year: number, month: number) {
  return Number.isInteger(year) && year >= 1900 && Number.isInteger(month) && month >= 1 && month <= 12;
}

export async function createFromSettlement(db: DB, settlementId: string, dueDate: Date) {
  if (Number.isNaN(dueDate.getTime())) throw new Error("Informe um vencimento válido.");
  try {
    return await db.$transaction(async (tx) => {
      const settlement = await tx.contractorSettlement.findUnique({
        where: { id: settlementId },
        include: { contractor: true, items: true, accountPayable: true },
      });
      if (!settlement) throw new Error("Fechamento não encontrado.");
      if (settlement.status !== "APPROVED") throw new Error("Somente fechamentos aprovados podem gerar Conta a Pagar.");
      if (settlement.accountPayable) throw new Error("Este fechamento já possui uma Conta a Pagar.");
      const classification = await tx.financialClassification.findUnique({ where: { code: OUTSOURCED_PRODUCTION_CODE } });
      if (!classification?.active) throw new Error("A classificação oficial de terceirização não está ativa.");
      const total = settlementTotal(settlement.items.map((item) => ({ quantity: item.approvedQuantityIncluded, price: item.appliedUnitPriceSnapshot })));
      return tx.accountPayable.create({ data: {
        companyId: settlement.companyId,
        contractorSettlementId: settlement.id,
        source: "CONTRACTOR_SETTLEMENT",
        classificationId: classification.id,
        classificationCodeSnapshot: classification.code,
        classificationNameSnapshot: classification.name,
        dreGroupSnapshot: classification.dreGroup,
        payeeName: settlement.contractor.name,
        description: `Fechamento de serviços terceirizados — ${settlement.contractor.name} — ${String(settlement.periodMonth).padStart(2, "0")}/${settlement.periodYear}`,
        competenceDate: competenceDate(settlement.periodYear, settlement.periodMonth),
        dueDate,
        originalAmount: total,
      } });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new Error("Este fechamento já possui uma Conta a Pagar.");
    throw error;
  }
}

export async function createManualAccountPayable(db: DB, input: ManualAccountPayableInput) {
  const payeeName = requiredText(input.payeeName, "Informe o beneficiário.");
  const description = requiredText(input.description, "Informe a descrição.");
  if (!input.companyId) throw new Error("Selecione a empresa.");
  if (!input.classificationId) throw new Error("Selecione a classificação.");
  if (!validCompetence(input.competenceYear, input.competenceMonth)) throw new Error("Informe uma competência válida.");
  if (Number.isNaN(input.dueDate.getTime())) throw new Error("Informe um vencimento válido.");
  const originalAmount = new Prisma.Decimal(input.originalAmount);
  if (!originalAmount.gt(0)) throw new Error("O valor deve ser maior que zero.");

  return db.$transaction(async (tx) => {
    const company = await tx.company.findUnique({ where: { id: input.companyId }, select: { id: true, active: true } });
    const classification = await tx.financialClassification.findUnique({ where: { id: input.classificationId } });
    if (!company?.active) throw new Error("Selecione uma empresa ativa.");
    if (!classification?.active) throw new Error("Selecione uma classificação ativa.");
    return tx.accountPayable.create({ data: {
      companyId: company.id,
      contractorSettlementId: null,
      source: "MANUAL",
      classificationId: classification.id,
      classificationCodeSnapshot: classification.code,
      classificationNameSnapshot: classification.name,
      dreGroupSnapshot: classification.dreGroup,
      payeeName,
      description,
      competenceDate: competenceDate(input.competenceYear, input.competenceMonth),
      dueDate: input.dueDate,
      originalAmount,
    } });
  });
}
