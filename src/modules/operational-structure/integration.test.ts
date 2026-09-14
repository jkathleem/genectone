import { createHash } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@/generated/prisma";
import { findUserByToken } from "@/modules/auth/session";
import { changeOperationalIssueStatus, createOperationalIssue } from "@/modules/operational-issues/service";
import { createInternalSector, enableContractorForService, enableInternalSectorForService, setInternalSectorActive, updateInternalSector } from "./service";

const run = process.env.RUN_POST_MVP_INTEGRATION === "1";
const marker = "TEMP QA POST MVP";
const contractorToken = "TEMP-QA-POST-MVP-CONTRACTOR-TOKEN";
let prisma: PrismaClient;
let companyId = "";
let customerId = "";
let productId = "";
let serviceId = "";
let contractorAId = "";
let contractorBId = "";
let adminId = "";
let contractorUserId = "";
let orderId = "";
let outsourcedServiceId = "";
let sectorAId = "";
let sectorBId = "";
let supplyId = "";

async function cleanup() {
  if (!prisma) return;
  await prisma.operationalIssue.deleteMany({ where: { description: { startsWith: marker } } });
  await prisma.session.deleteMany({ where: { user: { email: { startsWith: "temp.qa.post-mvp" } } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: "temp.qa.post-mvp" } } });
  await prisma.serviceInternalSector.deleteMany({ where: { OR: [{ service: { name: marker } }, { internalSector: { name: { startsWith: marker } } }] } });
  await prisma.serviceContractor.deleteMany({ where: { OR: [{ service: { name: marker } }, { contractor: { name: { startsWith: marker } } }] } });
  await prisma.productSupply.deleteMany({ where: { OR: [{ product: { name: marker } }, { supply: { name: { startsWith: marker } } }] } });
  await prisma.outsourcedService.deleteMany({ where: { notes: marker } });
  await prisma.productionOrder.deleteMany({ where: { number: "TEMP-QA-POST-MVP" } });
  await prisma.internalSector.deleteMany({ where: { name: { startsWith: marker } } });
  await prisma.supply.deleteMany({ where: { name: { startsWith: marker } } });
  await prisma.service.deleteMany({ where: { name: marker } });
  await prisma.product.deleteMany({ where: { name: marker } });
  await prisma.customer.deleteMany({ where: { name: marker } });
  await prisma.contractor.deleteMany({ where: { name: { startsWith: marker } } });
  await prisma.company.deleteMany({ where: { name: marker } });
}

describe.runIf(run)("base operacional pós-MVP no PostgreSQL", () => {
  beforeAll(async () => {
    prisma = (await import("@/lib/prisma")).prisma;
    await cleanup();
    companyId = (await prisma.company.create({ data: { name: marker } })).id;
    customerId = (await prisma.customer.create({ data: { name: marker } })).id;
    productId = (await prisma.product.create({ data: { name: marker, customerId, color: "Azul", currentUnitPrice: "12.5000", imageUrl: "https://example.invalid/product.png" } })).id;
    serviceId = (await prisma.service.create({ data: { name: marker } })).id;
    contractorAId = (await prisma.contractor.create({ data: { name: `${marker} A`, whatsapp: "85999990001", email: "a@example.invalid", postalCode: "60000000", addressNumber: "10", addressComplement: "A", neighborhood: "Centro", city: "Fortaleza", state: "CE", pixKey: "temp-a" } })).id;
    contractorBId = (await prisma.contractor.create({ data: { name: `${marker} B` } })).id;
    adminId = (await prisma.user.create({ data: { name: marker, email: "temp.qa.post-mvp.admin@genect.local", passwordHash: marker, role: "ADMIN" } })).id;
    contractorUserId = (await prisma.user.create({ data: { name: marker, email: "temp.qa.post-mvp.contractor@genect.local", passwordHash: marker, role: "CONTRACTOR", contractorId: contractorAId } })).id;
    await prisma.session.create({ data: { userId: contractorUserId, tokenHash: createHash("sha256").update(contractorToken).digest("hex"), expiresAt: new Date(Date.now() + 60_000) } });
    orderId = (await prisma.productionOrder.create({ data: { number: "TEMP-QA-POST-MVP", entryDate: new Date("2026-09-14T00:00:00Z"), companyId, customerId, productId, quantity: 100, unitPrice: "12.5000" } })).id;
    outsourcedServiceId = (await prisma.outsourcedService.create({ data: { productionOrderId: orderId, serviceId, contractorId: contractorAId, plannedQuantity: 100, appliedUnitPrice: "1.5000", notes: marker } })).id;
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  it("mantém OP antiga válida e aplica defaults compatíveis", async () => {
    const order = await prisma.productionOrder.findUniqueOrThrow({ where: { id: orderId } });
    expect(order).toMatchObject({ isUrgent: false, expectedCompletionDate: null, completedAt: null });
    expect((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).currentUnitPrice?.toFixed(4)).toBe("12.5000");
  });

  it("cria, renomeia, ordena e desativa setores sem permitir apagar setor em uso", async () => {
    sectorAId = (await createInternalSector(prisma, { name: `${marker} SETOR A`, displayOrder: 10 })).id;
    sectorBId = (await createInternalSector(prisma, { name: `${marker} SETOR B`, displayOrder: 20 })).id;
    await updateInternalSector(prisma, sectorBId, { name: `${marker} SETOR B RENOMEADO`, displayOrder: 5, notes: "ordem ajustada" });
    await setInternalSectorActive(prisma, sectorBId, false);
    await enableInternalSectorForService(prisma, serviceId, sectorAId);
    await enableInternalSectorForService(prisma, serviceId, sectorBId);
    await enableContractorForService(prisma, serviceId, contractorAId);
    await enableContractorForService(prisma, serviceId, contractorBId);
    expect(await prisma.serviceInternalSector.count({ where: { serviceId } })).toBe(2);
    expect(await prisma.serviceContractor.count({ where: { serviceId } })).toBe(2);
    await expect(prisma.internalSector.delete({ where: { id: sectorAId } })).rejects.toBeTruthy();
  });

  it("mantém insumo de produto e consumo proporcional com integridade", async () => {
    supplyId = (await prisma.supply.create({ data: { name: `${marker} LINHA`, unit: "m" } })).id;
    await prisma.productSupply.create({ data: { productId, supplyId, quantityPerBase: "1.5000", baseQuantity: 100 } });
    await expect(prisma.productSupply.create({ data: { productId, supplyId: (await prisma.supply.create({ data: { name: `${marker} INVÁLIDO`, unit: "m" } })).id, quantityPerBase: "1.0000", baseQuantity: null } })).rejects.toBeTruthy();
    await expect(prisma.supply.delete({ where: { id: supplyId } })).rejects.toBeTruthy();
  });

  it("protege explicitamente o vínculo entre UserRole e Contractor inclusive com NULL", async () => {
    await expect(prisma.user.create({ data: { name: marker, email: "temp.qa.post-mvp.invalid-null@genect.local", passwordHash: marker, role: "CONTRACTOR" } })).rejects.toBeTruthy();
    await expect(prisma.user.create({ data: { name: marker, email: "temp.qa.post-mvp.invalid-admin@genect.local", passwordHash: marker, role: "ADMIN", contractorId: contractorAId } })).rejects.toBeTruthy();
    expect((await prisma.user.findUniqueOrThrow({ where: { id: contractorUserId } })).contractorId).toBe(contractorAId);
    expect(await findUserByToken(contractorToken)).toMatchObject({ role: "CONTRACTOR", contractorId: contractorAId });
  });

  it("cria, assume e resolve pendência preservando histórico e coerência", async () => {
    const issue = await createOperationalIssue(prisma, { productionOrderId: orderId, outsourcedServiceId, contractorId: contractorAId, createdByUserId: contractorUserId, type: "MISSING_THREAD", description: `  ${marker} LINHA  ` });
    expect(issue).toMatchObject({ status: "OPEN", description: `${marker} LINHA`, resolvedAt: null });
    expect((await changeOperationalIssueStatus(prisma, issue.id, "IN_PROGRESS", adminId)).status).toBe("IN_PROGRESS");
    await expect(prisma.operationalIssue.update({ where: { id: issue.id }, data: { status: "RESOLVED" } })).rejects.toBeTruthy();
    const resolved = await changeOperationalIssueStatus(prisma, issue.id, "RESOLVED", adminId);
    expect(resolved.resolvedAt).toBeInstanceOf(Date);
    expect(resolved.resolvedByUserId).toBe(adminId);
    await expect(changeOperationalIssueStatus(prisma, issue.id, "IN_PROGRESS", adminId)).rejects.toThrow("histórico");
    await expect(createOperationalIssue(prisma, { productionOrderId: orderId, outsourcedServiceId, contractorId: contractorBId, createdByUserId: adminId, type: "OTHER", description: `${marker} INCOERENTE` })).rejects.toThrow("pertencer à OP");
    await expect(prisma.contractor.delete({ where: { id: contractorAId } })).rejects.toBeTruthy();
  });
});
