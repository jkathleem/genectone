import { prisma } from "@/lib/prisma";

export async function outsourcingOptions(include?: { serviceId: string; contractorId: string }) {
  const [services, contractors, contractorServices] = await Promise.all([
    prisma.service.findMany({
      where: { OR: [{ active: true }, ...(include ? [{ id: include.serviceId }] : [])] },
      orderBy: { name: "asc" },
    }),
    prisma.contractor.findMany({
      where: { OR: [{ active: true }, ...(include ? [{ id: include.contractorId }] : [])] },
      orderBy: { name: "asc" },
    }),
    prisma.serviceContractor.findMany({
      where: { active: true, unitPrice: { not: null }, service: { active: true }, contractor: { active: true } },
      select: { serviceId: true, contractorId: true, unitPrice: true },
    }),
  ]);
  return {
    services: services.map((service) => ({ id: service.id, name: service.name })),
    contractors: contractors.map((contractor) => ({ id: contractor.id, name: contractor.name })),
    contractorServices: contractorServices.map((item) => ({ serviceId: item.serviceId, contractorId: item.contractorId, price: item.unitPrice!.toFixed(4) })),
  };
}
