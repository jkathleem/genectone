import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { createDeliveryNoteRecord } from "@/modules/delivery-notes/service";
import { createBillingAndReceivable } from "@/modules/billing/creation";
import { receivableStatus } from "@/modules/accounts-receivable/domain";
import { createReceipt } from "@/modules/receipts/creation";
import { mountingAvailability } from "@/modules/outsourcing/domain";
import { registerOutsourcingReturn } from "@/modules/outsourcing/return-service";
import { saveOutsourcedServiceAssignment } from "@/modules/outsourcing/service";
import { completeProductionOrderRecord, createProductionOrderWorkspace } from "./service";

const run = process.env.RUN_OP_WORKSPACE_INTEGRATION === "1" ? describe : describe.skip;
const marker = `TEMP QA OP WORKSPACE ${Date.now()}`;
let companyId = "", customerId = "", productId = "", supplyId = "", orderId = "", contractorId = "", serviceAId = "", serviceBId = "", externalAId = "", externalBId = "", sectorId = "";

run("workspace da OP no PostgreSQL", () => {
  afterAll(async () => {
    if (orderId) {
      const receipts = await prisma.receipt.findMany({ where: { allocations: { some: { accountReceivable: { billing: { productionOrderId: orderId } } } } }, select: { id: true } });
      await prisma.receiptAllocation.deleteMany({ where: { accountReceivable: { billing: { productionOrderId: orderId } } } });
      await prisma.receipt.deleteMany({ where: { id: { in: receipts.map((item) => item.id) } } });
      await prisma.accountReceivable.deleteMany({ where: { billing: { productionOrderId: orderId } } });
      await prisma.billing.deleteMany({ where: { productionOrderId: orderId } });
      const notes = await prisma.deliveryNote.findMany({ where: { items: { some: { outsourcedService: { productionOrderId: orderId } } } }, select: { id: true } });
      await prisma.outsourcingReturn.deleteMany({ where: { outsourcedService: { productionOrderId: orderId } } });
      await prisma.deliveryNoteItem.deleteMany({ where: { outsourcedService: { productionOrderId: orderId } } });
      await prisma.deliveryNote.deleteMany({ where: { id: { in: notes.map((item) => item.id) } } });
      await prisma.internalProductionService.deleteMany({ where: { productionOrderId: orderId } });
      await prisma.outsourcedService.deleteMany({ where: { productionOrderId: orderId } });
      await prisma.productionOrderSupply.deleteMany({ where: { productionOrderId: orderId } });
      await prisma.productionOrder.deleteMany({ where: { id: orderId } });
    }
    if (serviceAId || serviceBId) {
      await prisma.serviceContractor.deleteMany({ where: { serviceId: { in: [serviceAId, serviceBId].filter(Boolean) } } });
      await prisma.serviceInternalSector.deleteMany({ where: { serviceId: { in: [serviceAId, serviceBId].filter(Boolean) } } });
      await prisma.service.deleteMany({ where: { id: { in: [serviceAId, serviceBId].filter(Boolean) } } });
    }
    if (sectorId) await prisma.internalSector.deleteMany({ where: { id: sectorId } });
    if (contractorId) await prisma.contractor.deleteMany({ where: { id: contractorId } });
    if (productId) { await prisma.productSupply.deleteMany({ where: { productId } }); await prisma.product.deleteMany({ where: { id: productId } }); }
    if (supplyId) await prisma.supply.deleteMany({ where: { id: supplyId } });
    if (customerId) await prisma.customer.deleteMany({ where: { id: customerId } });
    if (companyId) await prisma.company.deleteMany({ where: { id: companyId } });
    await prisma.$disconnect();
  });

  it("cria OP pelo Produto com snapshots de preço e insumo", async () => {
    const company = await prisma.company.create({ data: { name: marker } }); companyId = company.id;
    const customer = await prisma.customer.create({ data: { name: marker } }); customerId = customer.id;
    const supply = await prisma.supply.create({ data: { name: marker, unit: "cone" } }); supplyId = supply.id;
    const product = await prisma.product.create({ data: { name: marker, reference: marker, customerId, color: "Azul", currentUnitPrice: "12.50", supplies: { create: { supplyId, quantityPerBase: "2", baseQuantity: 1000 } } } }); productId = product.id;
    const order = await createProductionOrderWorkspace(prisma, { number: marker, entryDate: new Date("2026-09-15T00:00:00Z"), companyId, productId, quantity: 1200, isUrgent: true }); orderId = order.id;
    expect(order.customerId).toBe(customerId);
    expect(order.unitPrice.toFixed(4)).toBe("12.5000");
    expect(order.supplies[0]?.plannedQuantity?.toFixed(4)).toBe("2.4000");
    await prisma.product.update({ where: { id: productId }, data: { currentUnitPrice: "99.99" } });
    await prisma.productSupply.update({ where: { productId_supplyId: { productId, supplyId } }, data: { quantityPerBase: "5" } });
    const preserved = await prisma.productionOrder.findUniqueOrThrow({ where: { id: orderId }, include: { supplies: true, billing: true } });
    expect(preserved.unitPrice.toFixed(4)).toBe("12.5000");
    expect(preserved.supplies[0]?.plannedQuantity?.toFixed(4)).toBe("2.4000");
    expect(preserved.billing).toBeNull();
  });

  it("filtra executor por capacidade e preserva preço correto", async () => {
    const contractor = await prisma.contractor.create({ data: { name: marker } }); contractorId = contractor.id;
    const sector = await prisma.internalSector.create({ data: { name: marker } }); sectorId = sector.id;
    const serviceA = await prisma.service.create({ data: { name: `${marker} A` } }); serviceAId = serviceA.id;
    const serviceB = await prisma.service.create({ data: { name: `${marker} B` } }); serviceBId = serviceB.id;
    await prisma.serviceContractor.createMany({ data: [{ serviceId: serviceAId, contractorId, unitPrice: "1.50" }, { serviceId: serviceBId, contractorId, unitPrice: "0.27" }] });
    await prisma.serviceInternalSector.create({ data: { serviceId: serviceAId, internalSectorId: sectorId } });
    const externalA = await saveOutsourcedServiceAssignment(prisma, orderId, null, { serviceId: serviceAId, contractorId, plannedQuantity: 1200, expectedReturnDate: new Date("2026-09-20T00:00:00Z"), notes: marker }); externalAId = externalA.id;
    const externalB = await saveOutsourcedServiceAssignment(prisma, orderId, null, { serviceId: serviceBId, contractorId, plannedQuantity: 1200, notes: marker }); externalBId = externalB.id;
    expect(externalA.appliedUnitPrice.toFixed(4)).toBe("1.5000");
    expect(externalB.appliedUnitPrice.toFixed(4)).toBe("0.2700");
    const internal = await prisma.internalProductionService.create({ data: { productionOrderId: orderId, serviceId: serviceAId, internalSectorId: sectorId, plannedQuantity: 1200 } });
    expect(internal).not.toHaveProperty("appliedUnitPrice");
  });

  it("envio e retornos oficiais derivam Montagem parcial e completa", async () => {
    await createDeliveryNoteRecord(prisma, { contractorId, departureDate: new Date("2026-09-15T00:00:00Z"), items: [{ outsourcedServiceId: externalAId, quantity: 1200 }] });
    await createDeliveryNoteRecord(prisma, { contractorId, departureDate: new Date("2026-09-15T00:00:00Z"), items: [{ outsourcedServiceId: externalBId, quantity: 1200 }] });
    await registerOutsourcingReturn(prisma, externalBId, { quantity: 400, returnDate: new Date("2026-09-16T00:00:00Z") });
    await registerOutsourcingReturn(prisma, externalBId, { quantity: 800, returnDate: new Date("2026-09-17T00:00:00Z"), approve: true });
    let rows = await prisma.outsourcedService.findMany({ where: { id: { in: [externalAId, externalBId] } }, include: { deliveryNoteItems: true, returns: true } });
    expect(mountingAvailability(rows)).toBe("PARTIALLY_AVAILABLE");
    await registerOutsourcingReturn(prisma, externalAId, { quantity: 1200, returnDate: new Date("2026-09-18T00:00:00Z") });
    rows = await prisma.outsourcedService.findMany({ where: { id: { in: [externalAId, externalBId] } }, include: { deliveryNoteItems: true, returns: true } });
    expect(mountingAvailability(rows)).toBe("FULLY_AVAILABLE");
    expect(rows.find((item) => item.id === externalBId)?.approvedQuantity).toBe(800);
  });

  it("concluir produção não cria Billing ou Conta a Receber", async () => {
    await completeProductionOrderRecord(prisma, orderId, new Date("2026-09-19T12:00:00Z"));
    const order = await prisma.productionOrder.findUniqueOrThrow({ where: { id: orderId }, include: { billing: true } });
    expect(order.completedAt).not.toBeNull();
    expect(order.billing).toBeNull();
  });

  it("faturamento cria A/R e Receipt altera somente a situação financeira", async () => {
    const { accountReceivable } = await createBillingAndReceivable(prisma, orderId, { invoiceNumber: marker, issueDate: new Date("2026-09-20T00:00:00Z"), amount: "15000", competenceYear: 2026, competenceMonth: 9, dueDate: new Date("2026-09-30T00:00:00Z"), notes: marker });
    await createReceipt(prisma, { companyId, customerId, receiptDate: new Date("2026-09-21T00:00:00Z"), amount: "15000", notes: marker, allocations: [{ accountReceivableId: accountReceivable.id, amount: "15000" }] });
    const account = await prisma.accountReceivable.findUniqueOrThrow({ where: { id: accountReceivable.id }, include: { allocations: true } });
    expect(receivableStatus(account.originalAmount, account.dueDate, account.allocations)).toBe("Recebida");
    expect((await prisma.productionOrder.findUniqueOrThrow({ where: { id: orderId } })).completedAt).not.toBeNull();
  });
});
