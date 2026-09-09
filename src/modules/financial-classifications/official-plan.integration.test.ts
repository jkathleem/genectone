import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@/generated/prisma";
import { createManualAccountPayable } from "@/modules/accounts-payable/creation";
import { createPayment } from "@/modules/accounts-payable/payments";

const run = process.env.RUN_FINANCIAL_PLAN_INTEGRATION === "1";
const marker = "TEMP QA OFFICIAL FINANCIAL PLAN";
let prisma: PrismaClient;
let operationalDre: typeof import("@/modules/dre/queries").operationalDre;
let cashFlowData: typeof import("@/modules/cash-flow/queries").cashFlowData;
let companyId = "";
let nonDrePayableId = "";

const expectedPlan = [
  ["OUTSOURCED_PRODUCTION", "VARIABLE_COST_EXPENSE"],
  ["PRODUCTION_MATERIALS", "VARIABLE_COST_EXPENSE"],
  ["PRODUCTION_SUPPLIES", "VARIABLE_COST_EXPENSE"],
  ["PAYROLL", "FIXED_COST_EXPENSE"],
  ["PAYROLL_CHARGES", "FIXED_COST_EXPENSE"],
  ["ELECTRICITY", "FIXED_COST_EXPENSE"],
  ["RENT", "FIXED_COST_EXPENSE"],
  ["ACCOUNTING", "FIXED_COST_EXPENSE"],
  ["MAINTENANCE", "FIXED_COST_EXPENSE"],
  ["ADMIN_EXPENSES", "FIXED_COST_EXPENSE"],
  ["COMMERCIAL_EXPENSES", "FIXED_COST_EXPENSE"],
  ["FINANCIAL_EXPENSES", "FINANCIAL_EXPENSE"],
  ["INCOME_TAXES", "INCOME_TAX_EXPENSE"],
] as const;

async function cleanup() {
  if (!prisma) return;
  const companies = await prisma.company.findMany({ where: { name: marker }, select: { id: true } });
  const companyIds = companies.map((item) => item.id);
  await prisma.payment.deleteMany({ where: { accountPayable: { companyId: { in: companyIds } } } });
  await prisma.accountPayable.deleteMany({ where: { companyId: { in: companyIds } } });
  await prisma.accountReceivable.deleteMany({ where: { companyId: { in: companyIds } } });
  await prisma.billing.deleteMany({ where: { companyId: { in: companyIds } } });
  await prisma.productionOrder.deleteMany({ where: { companyId: { in: companyIds } } });
  await prisma.product.deleteMany({ where: { name: marker } });
  await prisma.customer.deleteMany({ where: { name: marker } });
  await prisma.company.deleteMany({ where: { id: { in: companyIds } } });
  await prisma.financialClassification.deleteMany({ where: { code: "TEMP_NON_DRE_QA" } });
}

describe.runIf(run)("plano oficial de classificações no PostgreSQL", () => {
  beforeAll(async () => {
    prisma = (await import("@/lib/prisma")).prisma;
    operationalDre = (await import("@/modules/dre/queries")).operationalDre;
    cashFlowData = (await import("@/modules/cash-flow/queries")).cashFlowData;
    await cleanup();
    companyId = (await prisma.company.create({ data: { name: marker } })).id;
    const customerId = (await prisma.customer.create({ data: { name: marker } })).id;
    const productId = (await prisma.product.create({ data: { name: marker } })).id;
    const order = await prisma.productionOrder.create({ data: { companyId, customerId, productId, number: "TEMP-QA-PLAN", entryDate: new Date("2026-09-01T00:00:00Z"), quantity: 1, unitPrice: "100000" } });
    await prisma.billing.create({ data: { productionOrderId: order.id, companyId, invoiceNumber: "TEMP-QA-PLAN", issueDate: new Date("2026-09-01T00:00:00Z"), amount: "100000", competenceDate: new Date("2026-09-01T00:00:00Z"), notes: marker } });
    const values = new Map([
      ["OUTSOURCED_PRODUCTION", "20000"], ["PRODUCTION_MATERIALS", "10000"],
      ["PAYROLL", "25000"], ["PAYROLL_CHARGES", "5000"], ["ELECTRICITY", "4000"],
      ["RENT", "3000"], ["ACCOUNTING", "1000"], ["MAINTENANCE", "2000"],
    ]);
    for (const [code, amount] of values) {
      const classification = await prisma.financialClassification.findUniqueOrThrow({ where: { code } });
      await createManualAccountPayable(prisma, { companyId, payeeName: `${marker} ${code}`, description: marker, classificationId: classification.id, competenceYear: 2026, competenceMonth: 9, dueDate: new Date("2026-10-10T00:00:00Z"), originalAmount: amount });
    }
    const nonDre = await prisma.financialClassification.create({ data: { code: "TEMP_NON_DRE_QA", name: "Movimento fora da DRE QA", financialNature: "NON_DRE", dreGroup: null, notes: marker } });
    nonDrePayableId = (await createManualAccountPayable(prisma, { companyId, payeeName: marker, description: "Movimento fora da DRE QA", classificationId: nonDre.id, competenceYear: 2026, competenceMonth: 9, dueDate: new Date("2026-09-20T00:00:00Z"), originalAmount: "20000" })).id;
    for (const [code, amount] of [["FINANCIAL_EXPENSES", "5000"], ["INCOME_TAXES", "3000"]] as const) {
      const classification = await prisma.financialClassification.findUniqueOrThrow({ where: { code } });
      await createManualAccountPayable(prisma, { companyId, payeeName: marker, description: marker, classificationId: classification.id, competenceYear: 2026, competenceMonth: 9, dueDate: new Date("2026-09-20T00:00:00Z"), originalAmount: amount });
    }
  });
  afterAll(async () => { await cleanup(); await prisma.$disconnect(); });

  it("contém exatamente as 13 classificações oficiais ativas nos grupos confirmados", async () => {
    const classifications = await prisma.financialClassification.findMany({ where: { code: { in: expectedPlan.map(([code]) => code) } }, orderBy: { code: "asc" } });
    expect(classifications).toHaveLength(13);
    for (const [code, group] of expectedPlan) expect(classifications.find((item) => item.code === code)).toMatchObject({ code, financialNature: group === "VARIABLE_COST_EXPENSE" || group === "FIXED_COST_EXPENSE" ? "OPERATING_EXPENSE" : "DRE_POST_OPERATING", dreGroup: group, active: true });
  });

  it("copia snapshots oficiais e alimenta automaticamente a DRE", async () => {
    const accounts = await prisma.accountPayable.findMany({ where: { companyId } });
    expect(accounts).toHaveLength(11);
    for (const account of accounts) {
      const classification = await prisma.financialClassification.findUniqueOrThrow({ where: { id: account.classificationId } });
      expect(account).toMatchObject({ classificationCodeSnapshot: classification.code, classificationNameSnapshot: classification.name, financialNatureSnapshot: classification.financialNature, dreGroupSnapshot: classification.dreGroup });
    }
    const dre = await operationalDre(companyId, 2026, 9);
    expect(dre.grossRevenue.toFixed(2)).toBe("100000.00");
    expect(dre.variableExpenses.toFixed(2)).toBe("30000.00");
    expect(dre.contributionMargin.toFixed(2)).toBe("70000.00");
    expect(dre.fixedExpenses.toFixed(2)).toBe("40000.00");
    expect(dre.operatingProfit.toFixed(2)).toBe("30000.00");
    expect(dre.financialRevenue.toFixed(2)).toBe("0.00");
    expect(dre.financialExpenses.toFixed(2)).toBe("5000.00");
    expect(dre.resultBeforeTaxes.toFixed(2)).toBe("25000.00");
    expect(dre.incomeTaxExpenses.toFixed(2)).toBe("3000.00");
    expect(dre.managerialNetIncome.toFixed(2)).toBe("22000.00");
    expect(dre.managerialNetMarginPercentage?.toFixed(2)).toBe("22.00");
  });

  it("ignora NON_DRE na DRE e inclui a obrigação no Fluxo Previsto", async () => {
    const dre = await operationalDre(companyId, 2026, 9);
    expect(dre.operatingProfit.toFixed(2)).toBe("30000.00");
    const predicted = await cashFlowData({ companyId, from: new Date("2026-09-01T00:00:00Z"), to: new Date("2026-09-30T00:00:00Z"), view: "predicted" });
    expect(predicted.movements.find((item) => item.id === nonDrePayableId)?.amount.toFixed(2)).toBe("20000.00");
  });

  it("inclui o pagamento NON_DRE no Fluxo Realizado", async () => {
    await createPayment(prisma, nonDrePayableId, { paymentDate: new Date("2026-09-25T00:00:00Z"), amount: "20000", notes: marker });
    const actual = await cashFlowData({ companyId, from: new Date("2026-09-01T00:00:00Z"), to: new Date("2026-09-30T00:00:00Z"), view: "actual" });
    expect(actual.movements.find((item) => item.description === "Movimento fora da DRE QA")?.amount.toFixed(2)).toBe("20000.00");
  });
});
