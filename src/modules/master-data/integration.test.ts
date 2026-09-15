import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Prisma, type PrismaClient } from "@/generated/prisma";
import { setContractorServicePrice } from "@/modules/operational-structure/service";
import { saveOutsourcedServiceAssignment } from "@/modules/outsourcing/service";
import { adjustedProductPrice } from "./domain";
import { updateProductPrices } from "./service";
import { userContractorId } from "@/modules/users/domain";

const run = process.env.RUN_MASTER_DATA_INTEGRATION === "1";
const marker = "TEMP QA MASTER DATA";
let prisma: PrismaClient;
let companyId = "";
let customerPfId = "";
let customerPjId = "";
let contractorId = "";
let serviceAId = "";
let serviceBId = "";
let productId = "";
let supplyId = "";
let sectorId = "";
let orderId = "";
let outsourcedServiceId = "";

async function cleanup() {
  if (!prisma) return;
  await prisma.outsourcedService.deleteMany({ where: { notes: marker } });
  await prisma.productionOrder.deleteMany({ where: { number: "TEMP-QA-MASTER-DATA" } });
  await prisma.user.deleteMany({ where: { email: "temp.qa.master@genect.local" } });
  await prisma.productSupply.deleteMany({ where: { product: { name: marker } } });
  await prisma.serviceInternalSector.deleteMany({ where: { internalSector: { name: marker } } });
  await prisma.serviceContractor.deleteMany({ where: { contractor: { name: marker } } });
  await prisma.internalSector.deleteMany({ where: { name: marker } });
  await prisma.supply.deleteMany({ where: { name: marker } });
  await prisma.product.deleteMany({ where: { name: marker } });
  await prisma.customer.deleteMany({ where: { name: { startsWith: marker } } });
  await prisma.contractor.deleteMany({ where: { name: marker } });
  await prisma.service.deleteMany({ where: { name: { startsWith: marker } } });
  await prisma.financialClassification.deleteMany({ where: { code: "TEMP_QA_MASTER_DATA" } });
  await prisma.company.deleteMany({ where: { name: marker } });
}

describe.runIf(run)("Cadastros unificados no PostgreSQL", () => {
  beforeAll(async () => {
    prisma = (await import("@/lib/prisma")).prisma;
    await cleanup();
    companyId = (await prisma.company.create({ data: { name: marker, tradeName: "TEMP QA", document: "000", stateRegistration: "IE", phone: "1", whatsapp: "2", email: "empresa@temp.local", postalCode: "60000", address: "Rua QA", addressNumber: "10", addressComplement: "A", neighborhood: "Centro", city: "Fortaleza", state: "CE" } })).id;
    customerPfId = (await prisma.customer.create({ data: { name: `${marker} PF`, personType: "PF", phone: "1" } })).id;
    customerPjId = (await prisma.customer.create({ data: { name: `${marker} PJ`, personType: "PJ", tradeName: "TEMP PJ", document: "111" } })).id;
    contractorId = (await prisma.contractor.create({ data: { name: marker, whatsapp: "3", pixKey: "temp" } })).id;
    serviceAId = (await prisma.service.create({ data: { name: `${marker} A` } })).id;
    serviceBId = (await prisma.service.create({ data: { name: `${marker} B` } })).id;
    await prisma.serviceContractor.createMany({ data: [{ contractorId, serviceId: serviceAId, unitPrice: "1.0000" }, { contractorId, serviceId: serviceBId, unitPrice: "2.0000" }] });
    productId = (await prisma.product.create({ data: { name: marker, reference: "TEMP-REF", customerId: customerPjId, color: "Azul", currentUnitPrice: "100", imageUrl: "https://example.com/temp.png" } })).id;
    supplyId = (await prisma.supply.create({ data: { name: marker, unit: "cone" } })).id;
    await prisma.productSupply.create({ data: { productId, supplyId, quantityPerBase: "2", baseQuantity: 1000, notes: marker } });
    sectorId = (await prisma.internalSector.create({ data: { name: marker, displayOrder: 999, notes: marker } })).id;
    await prisma.serviceInternalSector.create({ data: { internalSectorId: sectorId, serviceId: serviceAId } });
    await prisma.financialClassification.create({ data: { code: "TEMP_QA_MASTER_DATA", name: marker, financialNature: "NON_DRE", dreGroup: null, notes: marker } });
    await prisma.user.create({ data: { name: marker, email: "temp.qa.master@genect.local", passwordHash: "TEMP", role: "CONTRACTOR", contractorId: userContractorId("CONTRACTOR", contractorId, true) } });
    orderId = (await prisma.productionOrder.create({ data: { number: "TEMP-QA-MASTER-DATA", entryDate: new Date("2026-09-15T00:00:00Z"), companyId, customerId: customerPjId, productId, quantity: 10, unitPrice: "10" } })).id;
    outsourcedServiceId = (await saveOutsourcedServiceAssignment(prisma, orderId, null, { serviceId: serviceAId, contractorId, plannedQuantity: 10, notes: marker })).id;
  });

  afterAll(async () => { await cleanup(); if (prisma) await prisma.$disconnect(); });

  it("persiste Company ampliada e clientes PF/PJ sem obrigar documento", async () => {
    expect((await prisma.company.findUniqueOrThrow({ where: { id: companyId } })).city).toBe("Fortaleza");
    expect((await prisma.customer.findUniqueOrThrow({ where: { id: customerPfId } })).document).toBeNull();
    expect((await prisma.customer.findUniqueOrThrow({ where: { id: customerPjId } })).personType).toBe("PJ");
  });

  it("mantém dois Serviços e preços no mesmo Terceirizado sem alterar snapshot", async () => {
    expect(await prisma.serviceContractor.count({ where: { contractorId } })).toBe(2);
    await setContractorServicePrice(prisma, serviceAId, contractorId, "1.5000");
    expect((await prisma.outsourcedService.findUniqueOrThrow({ where: { id: outsourcedServiceId } })).appliedUnitPrice.toFixed(4)).toBe("1.0000");
  });

  it("mantém Produto, Insumo e atualização em massa separados da OP histórica", async () => {
    const product = await prisma.product.findUniqueOrThrow({ where: { id: productId }, include: { supplies: true } });
    expect(product.supplies).toHaveLength(1);
    expect(adjustedProductPrice(product.currentUnitPrice, "PERCENT", "10").toFixed(4)).toBe("110.0000");
    await updateProductPrices(prisma, [productId], "PERCENT", new Prisma.Decimal("10"));
    expect((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).currentUnitPrice?.toFixed(4)).toBe("110.0000");
    expect((await prisma.productionOrder.findUniqueOrThrow({ where: { id: orderId } })).unitPrice.toFixed(4)).toBe("10.0000");
  });

  it("preserva Setor sem preço, categoria e vínculo CONTRACTOR", async () => {
    expect(await prisma.serviceInternalSector.findUnique({ where: { serviceId_internalSectorId: { serviceId: serviceAId, internalSectorId: sectorId } } })).not.toHaveProperty("unitPrice");
    expect(await prisma.financialClassification.count({ where: { code: "TEMP_QA_MASTER_DATA" } })).toBe(1);
    expect((await prisma.user.findUniqueOrThrow({ where: { email: "temp.qa.master@genect.local" } })).contractorId).toBe(contractorId);
  });
});
