import type { Prisma, PrismaClient } from "@/generated/prisma";
import { canChangeAssignment } from "./domain";

type DB = Pick<PrismaClient, "$transaction">;
type OutsourcedServiceInput = { serviceId: string; contractorId: string; plannedQuantity: number; notes: string | null };

async function currentAssignment(tx: Prisma.TransactionClient, serviceId: string, contractorId: string) {
  await tx.$queryRaw`SELECT "serviceId" FROM "ServiceContractor" WHERE "serviceId" = ${serviceId} AND "contractorId" = ${contractorId} FOR SHARE`;
  const assignment = await tx.serviceContractor.findUnique({
    where: { serviceId_contractorId: { serviceId, contractorId } },
    include: { service: { select: { active: true } }, contractor: { select: { active: true } } },
  });
  if (!assignment?.active || !assignment.service.active || !assignment.contractor.active) throw new Error("O terceirizado não está habilitado para este serviço.");
  if (!assignment.unitPrice) throw new Error("Configure o preço deste serviço para o terceirizado antes de adicioná-lo à OP.");
  return assignment;
}

export async function saveOutsourcedServiceAssignment(db: DB, productionOrderId: string, id: string | null, input: OutsourcedServiceInput) {
  return db.$transaction(async (tx) => {
    const order = await tx.productionOrder.findUnique({ where: { id: productionOrderId }, select: { id: true } });
    if (!order) throw new Error("OP não encontrada.");
    const existing = id
      ? await tx.outsourcedService.findUnique({ where: { id }, include: { deliveryNoteItems: { take: 1, select: { id: true } } } })
      : null;
    if (id && (!existing || existing.productionOrderId !== productionOrderId)) throw new Error("Lançamento inválido.");
    if (existing && !canChangeAssignment(existing.deliveryNoteItems.length > 0, existing, input)) throw new Error("Serviço e terceirizado não podem ser alterados após a primeira saída.");

    const assignmentChanged = !existing || existing.serviceId !== input.serviceId || existing.contractorId !== input.contractorId;
    const appliedUnitPrice = assignmentChanged
      ? (await currentAssignment(tx, input.serviceId, input.contractorId)).unitPrice!
      : existing.appliedUnitPrice;
    const data = { ...input, appliedUnitPrice };
    return existing
      ? tx.outsourcedService.update({ where: { id: existing.id }, data })
      : tx.outsourcedService.create({ data: { ...data, productionOrderId, approvedQuantity: 0 } });
  });
}
