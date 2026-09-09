import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@/generated/prisma";
import { createManualAccountPayable } from "@/modules/accounts-payable/creation";
import { financialStatus } from "@/modules/accounts-payable/domain";
import { createPayment } from "@/modules/accounts-payable/payments";
import { createReceipt } from "@/modules/receipts/creation";

const run = process.env.RUN_DRE_INTEGRATION === "1";
const marker = "TEMP QA DRE OPERATIONAL";
let prisma: PrismaClient;
let companyA = "";
let companyB = "";
let customerId = "";
let productId = "";
let operationalDre: typeof import("./queries").operationalDre;
const classificationIds = new Map<string, string>();
const accounts = new Map<string, string>();

async function cleanup() {
  if (!prisma) return;
  const companies = await prisma.company.findMany({ where: { name: { startsWith: marker } }, select: { id: true } });
  const companyIds = companies.map((item) => item.id);
  await prisma.receiptAllocation.deleteMany({ where: { receipt: { companyId: { in: companyIds } } } });
  await prisma.receipt.deleteMany({ where: { companyId: { in: companyIds } } });
  await prisma.payment.deleteMany({ where: { accountPayable: { companyId: { in: companyIds } } } });
  await prisma.accountPayable.deleteMany({ where: { companyId: { in: companyIds } } });
  await prisma.contractorSettlement.deleteMany({ where: { companyId: { in: companyIds } } });
  await prisma.accountReceivable.deleteMany({ where: { companyId: { in: companyIds } } });
  await prisma.billing.deleteMany({ where: { companyId: { in: companyIds } } });
  await prisma.productionOrder.deleteMany({ where: { companyId: { in: companyIds } } });
  await prisma.financialClassification.deleteMany({ where: { notes: marker } });
  await prisma.contractor.deleteMany({ where: { name: marker } });
  await prisma.product.deleteMany({ where: { name: marker } });
  await prisma.customer.deleteMany({ where: { name: marker } });
  await prisma.company.deleteMany({ where: { id: { in: companyIds } } });
}

async function classification(code: string, name: string, dreGroup: "VARIABLE_COST_EXPENSE" | "FIXED_COST_EXPENSE") {
  const item = await prisma.financialClassification.create({ data: { code, name, financialNature: "OPERATING_EXPENSE", dreGroup, notes: marker } });
  classificationIds.set(code, item.id);
  return item;
}

async function billing(companyId: string, invoiceNumber: string, amount: string, createReceivable = false) {
  const order = await prisma.productionOrder.create({ data: { companyId, customerId, productId, number: `DRE-${invoiceNumber}`, entryDate: new Date("2026-08-01T00:00:00Z"), quantity: 1, unitPrice: amount } });
  const item = await prisma.billing.create({ data: { productionOrderId: order.id, companyId, invoiceNumber, issueDate: new Date("2026-09-05T00:00:00Z"), amount, competenceDate: new Date("2026-09-01T00:00:00Z"), notes: marker } });
  if (!createReceivable) return { item, order, receivable: null };
  const receivable = await prisma.accountReceivable.create({ data: { companyId, customerId, billingId: item.id, description: marker, competenceDate: new Date("2026-09-01T00:00:00Z"), dueDate: new Date("2026-10-10T00:00:00Z"), originalAmount: amount } });
  return { item, order, receivable };
}

async function manual(code: string, payeeName: string, amount: string, dueDate: string) {
  const account = await createManualAccountPayable(prisma, { companyId: companyA, payeeName, description: marker, classificationId: classificationIds.get(code)!, competenceYear: 2026, competenceMonth: 9, dueDate: new Date(`${dueDate}T00:00:00Z`), originalAmount: amount });
  accounts.set(code, account.id);
  return account;
}

describe.runIf(run)("DRE operacional no PostgreSQL", () => {
  beforeAll(async () => {
    prisma = (await import("@/lib/prisma")).prisma;
    operationalDre = (await import("./queries")).operationalDre;
    await cleanup();
    companyA = (await prisma.company.create({ data: { name: `${marker} A` } })).id;
    companyB = (await prisma.company.create({ data: { name: `${marker} B` } })).id;
    customerId = (await prisma.customer.create({ data: { name: marker } })).id;
    productId = (await prisma.product.create({ data: { name: marker } })).id;
    await classification("MATERIAL_QA", "Material QA", "VARIABLE_COST_EXPENSE");
    await classification("PAYROLL_QA", "Salários QA", "FIXED_COST_EXPENSE");
    await classification("ENERGY_QA", "Energia Elétrica", "FIXED_COST_EXPENSE");
    await classification("RENT_QA", "Aluguel QA", "FIXED_COST_EXPENSE");
    await classification("ACCOUNTANT_QA", "Contador QA", "FIXED_COST_EXPENSE");
    const billingA = await billing(companyA, "A-60000", "60000", true);
    await billing(companyA, "A-40000", "40000");
    await billing(companyB, "B-50000", "50000");
    await createReceipt(prisma, { companyId: companyA, customerId, receiptDate: new Date("2026-10-05T00:00:00Z"), amount: "60000", notes: marker, allocations: [{ accountReceivableId: billingA.receivable!.id, amount: "60000" }] });
    const official = await prisma.financialClassification.findUniqueOrThrow({ where: { code: "OUTSOURCED_PRODUCTION" } });
    const contractor = await prisma.contractor.create({ data: { name: marker } });
    const settlement = await prisma.contractorSettlement.create({ data: { companyId: companyA, contractorId: contractor.id, periodYear: 2026, periodMonth: 9, status: "APPROVED", notes: marker } });
    await prisma.accountPayable.create({ data: { companyId: companyA, contractorSettlementId: settlement.id, source: "CONTRACTOR_SETTLEMENT", classificationId: official.id, classificationCodeSnapshot: official.code, classificationNameSnapshot: official.name, financialNatureSnapshot: official.financialNature, dreGroupSnapshot: official.dreGroup, payeeName: marker, description: marker, competenceDate: new Date("2026-09-01T00:00:00Z"), dueDate: new Date("2026-10-15T00:00:00Z"), originalAmount: "25000" } });
    await manual("MATERIAL_QA", "Material QA", "15000", "2026-10-01");
    await manual("PAYROLL_QA", "Salários QA", "20000", "2026-12-01");
    await manual("ENERGY_QA", "Energia QA", "5000", "2026-08-31");
    await manual("RENT_QA", "Aluguel QA", "5000", "2026-10-05");
    await manual("ACCOUNTANT_QA", "Contador QA", "5000", "2026-10-05");
    await createPayment(prisma, accounts.get("RENT_QA")!, { paymentDate: new Date("2026-10-06T00:00:00Z"), amount: "1000", notes: marker });
    await createPayment(prisma, accounts.get("ACCOUNTANT_QA")!, { paymentDate: new Date("2026-10-06T00:00:00Z"), amount: "5000", notes: marker });
    await prisma.financialClassification.update({ where: { id: classificationIds.get("ENERGY_QA")! }, data: { name: "Energia" } });
  });
  afterAll(async () => {
    if (process.env.KEEP_DRE_QA !== "1") await cleanup();
    await prisma.$disconnect();
  });

  it("calcula o cenário por competência, snapshots e originalAmount", async () => {
    const dre = await operationalDre(companyA, 2026, 9);
    expect(dre.grossRevenue.toFixed(2)).toBe("100000.00");
    expect(dre.variableExpenses.toFixed(2)).toBe("40000.00");
    expect(dre.contributionMargin.toFixed(2)).toBe("60000.00");
    expect(dre.contributionMarginPercentage?.toFixed(2)).toBe("60.00");
    expect(dre.fixedExpenses.toFixed(2)).toBe("35000.00");
    expect(dre.operatingProfit.toFixed(2)).toBe("25000.00");
    expect(dre.operatingMarginPercentage?.toFixed(2)).toBe("25.00");
    expect(dre.fixedGroups.some((group) => group.classificationName === "Energia Elétrica" && group.total.eq(5000))).toBe(true);
    expect(dre.billings).toHaveLength(2);
  });

  it("ignora Receipt, Payment, vencimento e status financeiro", async () => {
    const september = await operationalDre(companyA, 2026, 9);
    const october = await operationalDre(companyA, 2026, 10);
    expect(october.grossRevenue.isZero()).toBe(true);
    expect(october.variableExpenses.isZero()).toBe(true);
    expect(october.fixedExpenses.isZero()).toBe(true);
    expect(september.fixedExpenses.eq(35000)).toBe(true);
    const payables = await prisma.accountPayable.findMany({ where: { id: { in: [accounts.get("PAYROLL_QA")!, accounts.get("ENERGY_QA")!, accounts.get("RENT_QA")!, accounts.get("ACCOUNTANT_QA")!] } }, include: { payments: true } });
    const statuses = payables.map((item) => financialStatus(item.originalAmount, item.dueDate, item.payments, new Date("2026-09-08T12:00:00Z")));
    expect(statuses).toEqual(expect.arrayContaining(["Em aberto", "Vencida", "Parcial", "Pago"]));
  });

  it("separa Companies e suporta mês sem movimento", async () => {
    expect((await operationalDre(companyA, 2026, 9)).grossRevenue.toFixed(2)).toBe("100000.00");
    expect((await operationalDre(companyB, 2026, 9)).grossRevenue.toFixed(2)).toBe("50000.00");
    const empty = await operationalDre(companyB, 2026, 10);
    expect(empty.grossRevenue.isZero()).toBe(true);
    expect(empty.contributionMarginPercentage).toBeNull();
  });
});
