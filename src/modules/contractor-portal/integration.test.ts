import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AuthenticatedUser } from "@/modules/auth/session";
import type { PrismaClient } from "@/generated/prisma";
import { getContractorPortal, getContractorServiceDetail } from "./queries";

const run = process.env.RUN_CONTRACTOR_PORTAL_INTEGRATION === "1";
const marker = "TEMP QA CONTRACTOR PORTAL";
let prisma: PrismaClient;
let companyId = "";
let customerId = "";
let productId = "";
let serviceId = "";
let contractorAId = "";
let contractorBId = "";
let userA: AuthenticatedUser & { contractorId: string };
let userB: AuthenticatedUser & { contractorId: string };
let serviceAId = "";
let serviceBId = "";

async function cleanup() {
  if (!prisma) return;
  await prisma.paymentReversal.deleteMany({ where: { payment: { accountPayable: { contractorSettlement: { notes: marker } } } } });
  await prisma.payment.deleteMany({ where: { accountPayable: { contractorSettlement: { notes: marker } } } });
  await prisma.accountPayable.deleteMany({ where: { contractorSettlement: { notes: marker } } });
  await prisma.contractorSettlementItem.deleteMany({ where: { settlement: { notes: marker } } });
  await prisma.contractorSettlement.deleteMany({ where: { notes: marker } });
  await prisma.operationalIssue.deleteMany({ where: { description: { startsWith: marker } } });
  await prisma.outsourcingReturn.deleteMany({ where: { outsourcedService: { notes: marker } } });
  await prisma.deliveryNoteItem.deleteMany({ where: { outsourcedService: { notes: marker } } });
  await prisma.deliveryNote.deleteMany({ where: { notes: marker } });
  await prisma.outsourcedService.deleteMany({ where: { notes: marker } });
  await prisma.productionOrderSupply.deleteMany({ where: { productionOrder: { number: { startsWith: "TEMP-QA-PORTAL" } } } });
  await prisma.productionOrder.deleteMany({ where: { number: { startsWith: "TEMP-QA-PORTAL" } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: "temp.qa.contractor.portal" } } });
  await prisma.product.deleteMany({ where: { name: marker } });
  await prisma.customer.deleteMany({ where: { name: marker } });
  await prisma.company.deleteMany({ where: { name: marker } });
  await prisma.service.deleteMany({ where: { name: marker } });
  await prisma.contractor.deleteMany({ where: { name: { startsWith: marker } } });
}

describe.runIf(run)("portal do terceirizado no PostgreSQL", () => {
  beforeAll(async () => {
    prisma = (await import("@/lib/prisma")).prisma;
    await cleanup();
    companyId = (await prisma.company.create({ data: { name: marker } })).id;
    customerId = (await prisma.customer.create({ data: { name: marker } })).id;
    productId = (await prisma.product.create({ data: { name: marker, reference: "PORTAL", color: "Azul", customerId, currentUnitPrice: "10.0000" } })).id;
    serviceId = (await prisma.service.create({ data: { name: marker } })).id;
    contractorAId = (await prisma.contractor.create({ data: { name: `${marker} A` } })).id;
    contractorBId = (await prisma.contractor.create({ data: { name: `${marker} B` } })).id;
    const userAId = (await prisma.user.create({ data: { name: `${marker} A`, email: "temp.qa.contractor.portal.a@genect.local", passwordHash: marker, role: "CONTRACTOR", contractorId: contractorAId } })).id;
    const userBId = (await prisma.user.create({ data: { name: `${marker} B`, email: "temp.qa.contractor.portal.b@genect.local", passwordHash: marker, role: "CONTRACTOR", contractorId: contractorBId } })).id;
    userA = { id: userAId, name: `${marker} A`, email: "temp.qa.contractor.portal.a@genect.local", role: "CONTRACTOR", contractorId: contractorAId };
    userB = { id: userBId, name: `${marker} B`, email: "temp.qa.contractor.portal.b@genect.local", role: "CONTRACTOR", contractorId: contractorBId };
    const orderA = await prisma.productionOrder.create({ data: { number: "TEMP-QA-PORTAL-A", entryDate: new Date("2026-09-10T00:00:00Z"), companyId, customerId, productId, quantity: 100, unitPrice: "10.0000" } });
    const orderB = await prisma.productionOrder.create({ data: { number: "TEMP-QA-PORTAL-B", entryDate: new Date("2026-09-10T00:00:00Z"), companyId, customerId, productId, quantity: 100, unitPrice: "10.0000" } });
    serviceAId = (await prisma.outsourcedService.create({ data: { productionOrderId: orderA.id, serviceId, contractorId: contractorAId, plannedQuantity: 100, approvedQuantity: 100, appliedUnitPrice: "1.5000", expectedReturnDate: new Date("2026-09-12T00:00:00Z"), notes: marker } })).id;
    serviceBId = (await prisma.outsourcedService.create({ data: { productionOrderId: orderB.id, serviceId, contractorId: contractorBId, plannedQuantity: 100, approvedQuantity: 100, appliedUnitPrice: "2.0000", notes: marker } })).id;
    const note = await prisma.deliveryNote.create({ data: { number: "TEMP-QA-PORTAL-001", contractorId: contractorAId, departureDate: new Date("2026-09-10T00:00:00Z"), notes: marker } });
    await prisma.deliveryNoteItem.create({ data: { deliveryNoteId: note.id, outsourcedServiceId: serviceAId, quantity: 100 } });
    await prisma.outsourcingReturn.create({ data: { outsourcedServiceId: serviceAId, returnDate: new Date("2026-09-14T00:00:00Z"), quantity: 100, notes: marker } });
    await prisma.operationalIssue.create({ data: { productionOrderId: orderA.id, outsourcedServiceId: serviceAId, contractorId: contractorAId, createdByUserId: userAId, type: "MISSING_THREAD", description: `${marker} linha`, status: "OPEN" } });
    const classification = await prisma.financialClassification.findUniqueOrThrow({ where: { code: "OUTSOURCED_PRODUCTION" } });
    const settlement = await prisma.contractorSettlement.create({ data: { companyId, contractorId: contractorAId, periodYear: 2026, periodMonth: 9, status: "APPROVED", approvedAt: new Date("2026-09-15T00:00:00Z"), notes: marker } });
    await prisma.contractorSettlementItem.create({ data: { settlementId: settlement.id, outsourcedServiceId: serviceAId, approvedQuantityIncluded: 40, appliedUnitPriceSnapshot: "1.5000" } });
    const account = await prisma.accountPayable.create({ data: { companyId, contractorSettlementId: settlement.id, source: "CONTRACTOR_SETTLEMENT", classificationId: classification.id, classificationCodeSnapshot: classification.code, classificationNameSnapshot: classification.name, financialNatureSnapshot: classification.financialNature, dreGroupSnapshot: classification.dreGroup, payeeName: `${marker} A`, description: marker, competenceDate: new Date("2026-09-01T00:00:00Z"), dueDate: new Date("2026-09-30T00:00:00Z"), originalAmount: "80.0000" } });
    await prisma.payment.create({ data: { accountPayableId: account.id, paymentDate: new Date("2026-09-16T00:00:00Z"), amount: "30.0000", notes: marker } });
    const reversedPayment = await prisma.payment.create({ data: { accountPayableId: account.id, paymentDate: new Date("2026-09-16T00:00:00Z"), amount: "10.0000", notes: marker } });
    await prisma.paymentReversal.create({ data: { paymentId: reversedPayment.id, reversalDate: new Date("2026-09-16T00:00:00Z"), reason: marker, createdByUserId: userAId } });
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  it("isola OPs, pendências e financeiro pelo contractorId da sessão", async () => {
    const portalA = await getContractorPortal(userA, {});
    const portalB = await getContractorPortal(userB, {});
    expect(portalA.services.map((item) => item.id)).toEqual([serviceAId]);
    expect(portalB.services.map((item) => item.id)).toEqual([serviceBId]);
    expect(portalA.issues).toHaveLength(1);
    expect(portalB.issues).toHaveLength(0);
    expect(portalA.financial.summary.waitingSettlement.toFixed(2)).toBe("90.00");
    expect(portalA.financial.summary.waitingPayment.toFixed(2)).toBe("50.00");
    expect(portalA.financial.summary.paidThisMonth.toFixed(2)).toBe("30.00");
    expect(portalB.financial.summary.waitingPayment.toFixed(2)).toBe("0.00");
  });

  it("nega detalhe direto de serviço pertencente a outro Terceirizado", async () => {
    await expect(getContractorServiceDetail(userA, serviceBId)).rejects.toThrow();
    await expect(getContractorServiceDetail(userB, serviceAId)).rejects.toThrow();
    await expect(getContractorServiceDetail(userA, serviceAId)).resolves.toMatchObject({ card: { id: serviceAId } });
  });
});
