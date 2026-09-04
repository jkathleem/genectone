import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@/generated/prisma";
import { financialStatus, paidAmount, remainingAmount } from "./domain";
import { createPayment } from "./payments";

const run = process.env.RUN_PAYMENT_INTEGRATION === "1";
const marker = `TEMP QA PAY ${Date.now()}`;
let companyId = "", contractorId = "", partialAccountId = "", concurrentAccountId = "";
let prisma: PrismaClient;

describe.runIf(run)("pagamentos no PostgreSQL real", () => {
  beforeAll(async () => {
    prisma = (await import("@/lib/prisma")).prisma;
    const company = await prisma.company.create({ data: { name: marker } }); companyId = company.id;
    const contractor = await prisma.contractor.create({ data: { name: marker } }); contractorId = contractor.id;
    for (const [index, amount] of ["784.0000", "100.0000"].entries()) {
      const settlement = await prisma.contractorSettlement.create({ data: { companyId, contractorId, periodYear: 2099, periodMonth: index + 1, status: "APPROVED", approvedAt: new Date() } });
      const account = await prisma.accountPayable.create({ data: { companyId, contractorSettlementId: settlement.id, description: marker, competenceDate: new Date(`2099-0${index + 1}-01T00:00:00Z`), dueDate: new Date("2099-12-31T00:00:00Z"), originalAmount: amount } });
      if (index === 0) partialAccountId = account.id; else concurrentAccountId = account.id;
    }
  });
  afterAll(async () => {
    if (companyId) {
      const accounts = await prisma.accountPayable.findMany({ where: { companyId }, select: { id: true } });
      await prisma.payment.deleteMany({ where: { accountPayableId: { in: accounts.map(x => x.id) } } });
      await prisma.accountPayable.deleteMany({ where: { companyId } });
      await prisma.contractorSettlement.deleteMany({ where: { companyId } });
      await prisma.contractor.delete({ where: { id: contractorId } });
      await prisma.company.delete({ where: { id: companyId } });
    }
  });
  it("registra 500 + 284, deriva Parcial/Pago e bloqueia pagamento adicional", async () => {
    await createPayment(prisma, partialAccountId, { paymentDate: new Date("2026-09-04T00:00:00Z"), amount: "500.0000", notes: "TEMP QA PAY parcial" });
    let account = await prisma.accountPayable.findUniqueOrThrow({ where: { id: partialAccountId }, include: { payments: true } });
    expect(paidAmount(account.payments).toFixed(4)).toBe("500.0000"); expect(remainingAmount(account.originalAmount, account.payments).toFixed(4)).toBe("284.0000"); expect(financialStatus(account.originalAmount, account.dueDate, account.payments)).toBe("Parcial");
    await createPayment(prisma, partialAccountId, { paymentDate: new Date("2026-09-04T00:00:00Z"), amount: "284.0000" });
    account = await prisma.accountPayable.findUniqueOrThrow({ where: { id: partialAccountId }, include: { payments: true } });
    expect(paidAmount(account.payments).toFixed(4)).toBe("784.0000"); expect(remainingAmount(account.originalAmount, account.payments).toFixed(4)).toBe("0.0000"); expect(financialStatus(account.originalAmount, account.dueDate, account.payments)).toBe("Pago");
    await expect(createPayment(prisma, partialAccountId, { paymentDate: new Date(), amount: "1.0000" })).rejects.toThrow("já está paga");
  });
  it("serializa duas quitações concorrentes sem exceder o saldo", async () => {
    const results = await Promise.allSettled([createPayment(prisma, concurrentAccountId, { paymentDate: new Date(), amount: "100.0000" }), createPayment(prisma, concurrentAccountId, { paymentDate: new Date(), amount: "100.0000" })]);
    expect(results.filter(x => x.status === "fulfilled")).toHaveLength(1); expect(results.filter(x => x.status === "rejected")).toHaveLength(1);
    const account = await prisma.accountPayable.findUniqueOrThrow({ where: { id: concurrentAccountId }, include: { payments: true } });
    expect(account.payments).toHaveLength(1); expect(paidAmount(account.payments).toFixed(4)).toBe("100.0000"); expect(remainingAmount(account.originalAmount, account.payments).toFixed(4)).toBe("0.0000");
  });
});
