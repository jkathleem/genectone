import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@/generated/prisma";
import { createBillingAndReceivable } from "./creation";
import { receivableRemainingAmount, receivedAmount } from "@/modules/accounts-receivable/domain";
const run = process.env.RUN_BILLING_INTEGRATION === "1", marker = `TEMP QA BILL ${Date.now()}`;
let prisma: PrismaClient, companyA = "", companyB = "", customerId = "", productId = "";
const orders: string[] = [];
const input = (invoiceNumber: string) => ({ invoiceNumber, issueDate: new Date("2026-09-30T00:00:00Z"), amount: "10450.0000", competenceYear: 2026, competenceMonth: 9, dueDate: new Date("2026-10-15T00:00:00Z"), notes: marker });
describe.runIf(run)("faturamento no PostgreSQL real", () => {
  beforeAll(async () => {
    prisma = (await import("@/lib/prisma")).prisma;
    companyA = (await prisma.company.create({ data: { name: `${marker} A` } })).id; companyB = (await prisma.company.create({ data: { name: `${marker} B` } })).id;
    customerId = (await prisma.customer.create({ data: { name: marker } })).id; productId = (await prisma.product.create({ data: { name: marker } })).id;
    for (let index = 0; index < 5; index++) { const companyId = index === 2 ? companyB : companyA; orders.push((await prisma.productionOrder.create({ data: { number: `${marker}-${index}`, entryDate: new Date("2026-09-01T00:00:00Z"), companyId, customerId, productId, quantity: 1000, unitPrice: "10.5000" } })).id); }
  });
  afterAll(async () => {
    if (orders.length) { const bills = await prisma.billing.findMany({ where: { productionOrderId: { in: orders } }, select: { id: true } }); await prisma.accountReceivable.deleteMany({ where: { billingId: { in: bills.map(x => x.id) } } }); await prisma.billing.deleteMany({ where: { productionOrderId: { in: orders } } }); await prisma.productionOrder.deleteMany({ where: { id: { in: orders } } }); await prisma.product.delete({ where: { id: productId } }); await prisma.customer.delete({ where: { id: customerId } }); await prisma.company.deleteMany({ where: { id: { in: [companyA, companyB] } } }); }
  });
  it("aceita 10.450 faturado para OP prevista em 10.500 e cria snapshots", async () => {
    const result = await createBillingAndReceivable(prisma, orders[0], input("12345")); const order = await prisma.productionOrder.findUniqueOrThrow({ where: { id: orders[0] } });
    expect(order.unitPrice.toFixed(4)).toBe("10.5000"); expect(result.billing.amount.toFixed(4)).toBe("10450.0000"); expect(result.accountReceivable.originalAmount.toFixed(4)).toBe("10450.0000"); expect(result.accountReceivable.companyId).toBe(companyA); expect(result.accountReceivable.customerId).toBe(customerId); expect(receivedAmount([]).toFixed(4)).toBe("0.0000"); expect(receivableRemainingAmount(result.accountReceivable.originalAmount, []).toFixed(4)).toBe("10450.0000");
  });
  it("rejeita NFe repetida na mesma empresa e permite em empresa diferente", async () => { await expect(createBillingAndReceivable(prisma, orders[1], input("12345"))).rejects.toThrow("já está registrado"); await expect(createBillingAndReceivable(prisma, orders[2], input("12345"))).resolves.toBeTruthy(); });
  it("aceita somente um faturamento concorrente para a mesma OP", async () => { const results = await Promise.allSettled([createBillingAndReceivable(prisma, orders[3], input("CONC-A")), createBillingAndReceivable(prisma, orders[3], input("CONC-B"))]); expect(results.filter(x => x.status === "fulfilled")).toHaveLength(1); expect(results.filter(x => x.status === "rejected")).toHaveLength(1); expect(await prisma.billing.count({ where: { productionOrderId: orders[3] } })).toBe(1); const billing = await prisma.billing.findUniqueOrThrow({ where: { productionOrderId: orders[3] } }); expect(await prisma.accountReceivable.count({ where: { billingId: billing.id } })).toBe(1); });
  it("rollback não deixa Billing órfão se a Conta a Receber falhar", async () => { await expect(prisma.$transaction(async tx => { const billing = await tx.billing.create({ data: { productionOrderId: orders[4], companyId: companyA, invoiceNumber: "ATOMIC", issueDate: new Date(), competenceDate: new Date("2026-09-01T00:00:00Z"), amount: "10" } }); await tx.accountReceivable.create({ data: { companyId: companyA, customerId, billingId: billing.id, description: marker, competenceDate: new Date("2026-09-01T00:00:00Z"), dueDate: new Date(), originalAmount: "0" } }); })).rejects.toBeTruthy(); expect(await prisma.billing.count({ where: { productionOrderId: orders[4] } })).toBe(0); });
});
