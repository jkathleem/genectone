import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@/generated/prisma";
import { addDraftItem } from "@/modules/contractor-settlements/mutations";
import { setContractorServicePrice } from "@/modules/operational-structure/service";
import { saveOutsourcedServiceAssignment } from "./service";

const run = process.env.RUN_CONTRACTOR_PRICE_INTEGRATION === "1";
const marker = "TEMP QA CONTRACTOR PRICE";
let prisma: PrismaClient;
let companyId = "";
let customerId = "";
let productId = "";
let serviceId = "";
let contractorAId = "";
let contractorBId = "";
let contractorWithoutPriceId = "";
let sectorId = "";
let oldOutsourcedServiceId = "";
let newOutsourcedServiceId = "";
let otherContractorServiceId = "";
let settlementId = "";

async function cleanup() {
  if (!prisma) return;
  await prisma.contractorSettlementItem.deleteMany({ where: { settlement: { notes: marker } } });
  await prisma.contractorSettlement.deleteMany({ where: { notes: marker } });
  await prisma.outsourcedService.deleteMany({ where: { notes: marker } });
  await prisma.productionOrder.deleteMany({ where: { number: { startsWith: "TEMP-QA-CONTRACTOR-PRICE" } } });
  await prisma.serviceInternalSector.deleteMany({ where: { OR: [{ service: { name: marker } }, { internalSector: { name: marker } }] } });
  await prisma.serviceContractor.deleteMany({ where: { OR: [{ service: { name: marker } }, { contractor: { name: { startsWith: marker } } }] } });
  await prisma.internalSector.deleteMany({ where: { name: marker } });
  await prisma.service.deleteMany({ where: { name: marker } });
  await prisma.product.deleteMany({ where: { name: marker } });
  await prisma.customer.deleteMany({ where: { name: marker } });
  await prisma.contractor.deleteMany({ where: { name: { startsWith: marker } } });
  await prisma.company.deleteMany({ where: { name: marker } });
}

describe.runIf(run)("preço atual por Terceirizado + Serviço no PostgreSQL", () => {
  beforeAll(async () => {
    prisma = (await import("@/lib/prisma")).prisma;
    await cleanup();
    companyId = (await prisma.company.create({ data: { name: marker } })).id;
    customerId = (await prisma.customer.create({ data: { name: marker } })).id;
    productId = (await prisma.product.create({ data: { name: marker } })).id;
    serviceId = (await prisma.service.create({ data: { name: marker } })).id;
    contractorAId = (await prisma.contractor.create({ data: { name: `${marker} A` } })).id;
    contractorBId = (await prisma.contractor.create({ data: { name: `${marker} B` } })).id;
    contractorWithoutPriceId = (await prisma.contractor.create({ data: { name: `${marker} SEM PREÇO` } })).id;
    sectorId = (await prisma.internalSector.create({ data: { name: marker, displayOrder: 999 } })).id;
    await prisma.serviceContractor.createMany({ data: [
      { serviceId, contractorId: contractorAId, unitPrice: "1.1000" },
      { serviceId, contractorId: contractorBId, unitPrice: "2.2000" },
      { serviceId, contractorId: contractorWithoutPriceId, unitPrice: null },
    ] });
    await prisma.serviceInternalSector.create({ data: { serviceId, internalSectorId: sectorId } });

    const createOrder = async (suffix: string) => (await prisma.productionOrder.create({ data: { number: `TEMP-QA-CONTRACTOR-PRICE-${suffix}`, entryDate: new Date("2026-09-15T00:00:00Z"), companyId, customerId, productId, quantity: 10, unitPrice: "10" } })).id;
    const oldOrderId = await createOrder("OLD");
    oldOutsourcedServiceId = (await saveOutsourcedServiceAssignment(prisma, oldOrderId, null, { serviceId, contractorId: contractorAId, plannedQuantity: 10, notes: marker })).id;
    await setContractorServicePrice(prisma, serviceId, contractorAId, "1.5000");
    const newOrderId = await createOrder("NEW");
    newOutsourcedServiceId = (await saveOutsourcedServiceAssignment(prisma, newOrderId, null, { serviceId, contractorId: contractorAId, plannedQuantity: 10, notes: marker })).id;
    const otherOrderId = await createOrder("OTHER");
    otherContractorServiceId = (await saveOutsourcedServiceAssignment(prisma, otherOrderId, null, { serviceId, contractorId: contractorBId, plannedQuantity: 10, notes: marker })).id;

    await prisma.outsourcedService.update({ where: { id: oldOutsourcedServiceId }, data: { approvedQuantity: 10 } });
    settlementId = (await prisma.contractorSettlement.create({ data: { companyId, contractorId: contractorAId, periodYear: 2026, periodMonth: 9, notes: marker } })).id;
    await addDraftItem(prisma, settlementId, oldOutsourcedServiceId, 10);
    await setContractorServicePrice(prisma, serviceId, contractorAId, "1.8000");
  });

  afterAll(async () => {
    await cleanup();
    if (prisma) await prisma.$disconnect();
  });

  it("permite o mesmo Serviço com preços distintos por Terceirizado", async () => {
    const first = await prisma.outsourcedService.findUniqueOrThrow({ where: { id: newOutsourcedServiceId } });
    const second = await prisma.outsourcedService.findUniqueOrThrow({ where: { id: otherContractorServiceId } });
    expect(first.appliedUnitPrice.toFixed(4)).toBe("1.5000");
    expect(second.appliedUnitPrice.toFixed(4)).toBe("2.2000");
  });

  it("preserva o snapshot antigo e usa o preço novo apenas em nova atribuição", async () => {
    expect((await prisma.outsourcedService.findUniqueOrThrow({ where: { id: oldOutsourcedServiceId } })).appliedUnitPrice.toFixed(4)).toBe("1.1000");
    expect((await prisma.outsourcedService.findUniqueOrThrow({ where: { id: newOutsourcedServiceId } })).appliedUnitPrice.toFixed(4)).toBe("1.5000");
    expect((await prisma.serviceContractor.findUniqueOrThrow({ where: { serviceId_contractorId: { serviceId, contractorId: contractorAId } } })).unitPrice?.toFixed(4)).toBe("1.8000");
  });

  it("mantém o preço histórico do fechamento", async () => {
    const item = await prisma.contractorSettlementItem.findFirstOrThrow({ where: { settlementId } });
    expect(item.appliedUnitPriceSnapshot.toFixed(4)).toBe("1.1000");
  });

  it("não empresta preço de outro Terceirizado", async () => {
    const orderId = (await prisma.productionOrder.create({ data: { number: "TEMP-QA-CONTRACTOR-PRICE-NO-PRICE", entryDate: new Date("2026-09-15T00:00:00Z"), companyId, customerId, productId, quantity: 10, unitPrice: "10" } })).id;
    await expect(saveOutsourcedServiceAssignment(prisma, orderId, null, { serviceId, contractorId: contractorWithoutPriceId, plannedQuantity: 10, notes: marker })).rejects.toThrow("Configure o preço");
  });

  it("mantém executor interno sem preço e protege a unicidade externa", async () => {
    expect(await prisma.serviceInternalSector.findUnique({ where: { serviceId_internalSectorId: { serviceId, internalSectorId: sectorId } } })).not.toHaveProperty("unitPrice");
    await expect(prisma.serviceContractor.create({ data: { serviceId, contractorId: contractorAId, unitPrice: "9" } })).rejects.toBeTruthy();
  });

  it("rejeita preço atual igual a zero na aplicação e no banco", async () => {
    expect(() => setContractorServicePrice(prisma, serviceId, contractorAId, "0")).toThrow("maior que zero");
    await expect(prisma.serviceContractor.update({
      where: { serviceId_contractorId: { serviceId, contractorId: contractorAId } },
      data: { unitPrice: "0" },
    })).rejects.toBeTruthy();
  });
});
