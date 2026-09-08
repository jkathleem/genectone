import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@/generated/prisma";
import { createFromSettlement, createManualAccountPayable } from "@/modules/accounts-payable/creation";
import { createFinancialClassification, updateFinancialClassification } from "./service";

const run = process.env.RUN_FINANCIAL_CLASSIFICATION_INTEGRATION === "1";
const marker = "TEMP QA FINANCIAL CLASSIFICATION";
let prisma: PrismaClient;
let companyId = "";
let contractorId = "";
let classificationId = "";
let outsourcedServiceId = "";

async function cleanup() {
  if (!prisma) return;
  await prisma.payment.deleteMany({ where: { accountPayable: { OR: [{ payeeName: "Energia QA" }, { description: marker }] } } });
  await prisma.accountPayable.deleteMany({ where: { OR: [{ payeeName: "Energia QA" }, { description: marker }, { contractorSettlement: { notes: marker } }] } });
  await prisma.contractorSettlementItem.deleteMany({ where: { settlement: { notes: marker } } });
  await prisma.contractorSettlement.deleteMany({ where: { notes: marker } });
  await prisma.outsourcedService.deleteMany({ where: { notes: marker } });
  await prisma.productionOrder.deleteMany({ where: { number: "TEMP-QA-FINANCIAL" } });
  await prisma.service.deleteMany({ where: { name: marker } });
  await prisma.product.deleteMany({ where: { name: marker } });
  await prisma.customer.deleteMany({ where: { name: marker } });
  await prisma.financialClassification.deleteMany({ where: { code: "TEMP_FIXED_QA" } });
  await prisma.contractor.deleteMany({ where: { name: marker } });
  await prisma.company.deleteMany({ where: { name: marker } });
}

describe.runIf(run)("classificações e Contas a Pagar manuais no PostgreSQL", () => {
  beforeAll(async () => {
    prisma = (await import("@/lib/prisma")).prisma;
    await cleanup();
    companyId = (await prisma.company.create({ data: { name: marker } })).id;
    contractorId = (await prisma.contractor.create({ data: { name: marker } })).id;
    const customerId = (await prisma.customer.create({ data: { name: marker } })).id;
    const productId = (await prisma.product.create({ data: { name: marker } })).id;
    const serviceId = (await prisma.service.create({ data: { name: marker } })).id;
    const orderId = (await prisma.productionOrder.create({ data: { number: "TEMP-QA-FINANCIAL", entryDate: new Date("2026-09-01T00:00:00Z"), companyId, customerId, productId, quantity: 1, unitPrice: "1" } })).id;
    outsourcedServiceId = (await prisma.outsourcedService.create({ data: { productionOrderId: orderId, serviceId, contractorId, plannedQuantity: 1, approvedQuantity: 1, appliedUnitPrice: "1000", notes: marker } })).id;
    classificationId = (await createFinancialClassification(prisma, { code: "TEMP_FIXED_QA", name: "Despesa Fixa QA", dreGroup: "FIXED_COST_EXPENSE" })).id;
  });
  afterAll(async () => { await cleanup(); await prisma.$disconnect(); });

  it("preserva snapshots, unicidade, origem manual e não cria pagamento", async () => {
    const account = await createManualAccountPayable(prisma, { companyId, payeeName: "Energia QA", description: marker, classificationId, competenceYear: 2026, competenceMonth: 9, dueDate: new Date("2026-10-10T00:00:00Z"), originalAmount: "1000" });
    expect(account).toMatchObject({ source: "MANUAL", contractorSettlementId: null, classificationCodeSnapshot: "TEMP_FIXED_QA", classificationNameSnapshot: "Despesa Fixa QA", dreGroupSnapshot: "FIXED_COST_EXPENSE", payeeName: "Energia QA" });
    expect(account.competenceDate.toISOString()).toBe("2026-09-01T00:00:00.000Z");
    expect(await prisma.payment.count({ where: { accountPayableId: account.id } })).toBe(0);
    await updateFinancialClassification(prisma, classificationId, { name: "Despesa Fixa QA Renomeada", dreGroup: "FIXED_COST_EXPENSE" });
    expect((await prisma.accountPayable.findUniqueOrThrow({ where: { id: account.id } })).classificationNameSnapshot).toBe("Despesa Fixa QA");
    await expect(updateFinancialClassification(prisma, classificationId, { name: "Tentativa", dreGroup: "VARIABLE_COST_EXPENSE" })).rejects.toThrow("já está em uso");
    await expect(createFinancialClassification(prisma, { code: "TEMP_FIXED_QA", name: "Duplicada", dreGroup: "FIXED_COST_EXPENSE" })).rejects.toMatchObject({ code: "P2002" });
    await prisma.financialClassification.update({ where: { id: classificationId }, data: { active: false } });
    await expect(createManualAccountPayable(prisma, { companyId, payeeName: "Energia QA", description: marker, classificationId, competenceYear: 2026, competenceMonth: 9, dueDate: new Date("2026-10-10T00:00:00Z"), originalAmount: "1000" })).rejects.toThrow("classificação ativa");
    await prisma.financialClassification.update({ where: { id: classificationId }, data: { active: true } });
  });

  it("classifica automaticamente a Conta do Fechamento", async () => {
    const settlement = await prisma.contractorSettlement.create({ data: { companyId, contractorId, periodYear: 2026, periodMonth: 9, status: "APPROVED", notes: marker } });
    await prisma.contractorSettlementItem.create({ data: { settlementId: settlement.id, outsourcedServiceId, approvedQuantityIncluded: 1, appliedUnitPriceSnapshot: "1000" } });
    const account = await createFromSettlement(prisma, settlement.id, new Date("2026-10-15T00:00:00Z"));
    expect(account).toMatchObject({ source: "CONTRACTOR_SETTLEMENT", contractorSettlementId: settlement.id, classificationCodeSnapshot: "OUTSOURCED_PRODUCTION", classificationNameSnapshot: "Serviços terceirizados de produção", dreGroupSnapshot: "VARIABLE_COST_EXPENSE", payeeName: marker });
    const official = await prisma.financialClassification.findUniqueOrThrow({ where: { code: "OUTSOURCED_PRODUCTION" } });
    await expect(prisma.accountPayable.create({ data: { companyId, source: "CONTRACTOR_SETTLEMENT", contractorSettlementId: null, classificationId: official.id, classificationCodeSnapshot: official.code, classificationNameSnapshot: official.name, dreGroupSnapshot: official.dreGroup, payeeName: marker, description: marker, competenceDate: new Date("2026-09-01T00:00:00Z"), dueDate: new Date("2026-10-01T00:00:00Z"), originalAmount: "1" } })).rejects.toBeTruthy();
    await expect(prisma.accountPayable.create({ data: { companyId, source: "MANUAL", contractorSettlementId: settlement.id, classificationId: official.id, classificationCodeSnapshot: official.code, classificationNameSnapshot: official.name, dreGroupSnapshot: official.dreGroup, payeeName: marker, description: marker, competenceDate: new Date("2026-09-01T00:00:00Z"), dueDate: new Date("2026-10-01T00:00:00Z"), originalAmount: "1" } })).rejects.toBeTruthy();
  });
});
