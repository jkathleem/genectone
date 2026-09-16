import { Prisma, PrismaClient } from "@/generated/prisma";
import { allItemsBelongToContractor, availableToSend, validateRequestedQuantity } from "./domain";
import { nextDeliveryNoteNumber } from "./numbering";

type DB = Pick<PrismaClient, "$transaction">;
export type CreateDeliveryNoteInput = { contractorId: string; departureDate: Date; responsibleName?: string | null; notes?: string | null; items: { outsourcedServiceId: string; quantity: number }[] };

export async function createDeliveryNoteRecord(db: DB, input: CreateDeliveryNoteInput) {
  return db.$transaction(async (tx) => {
    const contractor = await tx.contractor.findFirst({ where: { id: input.contractorId, active: true } });
    if (!contractor) throw new Error("O terceirizado selecionado não está disponível.");
    const ids = input.items.map((item) => item.outsourcedServiceId);
    await tx.$queryRaw`SELECT "id" FROM "OutsourcedService" WHERE "id" IN (${Prisma.join(ids)}) FOR UPDATE`;
    const services = await tx.outsourcedService.findMany({ where: { id: { in: ids } }, include: { deliveryNoteItems: { select: { quantity: true } }, productionOrder: { select: { completedAt: true } } } });
    if (services.length !== ids.length) throw new Error("Um ou mais serviços selecionados não existem.");
    if (!allItemsBelongToContractor(services, input.contractorId)) throw new Error("Todos os itens devem pertencer ao mesmo terceirizado do Romaneio.");
    const byId = new Map(services.map((service) => [service.id, service]));
    for (const item of input.items) {
      const service = byId.get(item.outsourcedServiceId);
      if (service?.productionOrder.completedAt) throw new Error("Não é possível registrar envio para uma OP concluída.");
      if (!service?.plannedQuantity) throw new Error("O serviço selecionado não possui quantidade prevista.");
      const sent = service.deliveryNoteItems.reduce((sum, existing) => sum + existing.quantity, 0);
      if (!validateRequestedQuantity(item.quantity, availableToSend(service.plannedQuantity, sent))) throw new Error("A quantidade enviada deve ser inteira, maior que zero e não pode ultrapassar o saldo disponível.");
    }
    const number = await nextDeliveryNoteNumber(tx);
    return tx.deliveryNote.create({ data: { number, contractorId: input.contractorId, departureDate: input.departureDate, responsibleName: input.responsibleName?.trim() || null, notes: input.notes?.trim() || null, items: { create: input.items } } });
  });
}
