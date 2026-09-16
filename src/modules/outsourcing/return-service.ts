import { PrismaClient } from "@/generated/prisma";
import { validApproval, validReturn } from "./domain";

type DB = Pick<PrismaClient, "$transaction">;

export async function registerOutsourcingReturn(db: DB, id: string, input: { quantity: number; returnDate: Date; notes?: string | null; approve?: boolean }) {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "OutsourcedService" WHERE "id" = ${id} FOR UPDATE`;
    const item = await tx.outsourcedService.findUnique({ where: { id }, include: { deliveryNoteItems: { select: { quantity: true } }, returns: { select: { quantity: true } }, productionOrder: { select: { completedAt: true } } } });
    if (!item) throw new Error("Serviço terceirizado não encontrado.");
    if (item.productionOrder.completedAt) throw new Error("Não é possível registrar retorno para uma OP concluída.");
    const sent = item.deliveryNoteItems.reduce((sum, row) => sum + row.quantity, 0);
    const returned = item.returns.reduce((sum, row) => sum + row.quantity, 0);
    if (!validReturn(input.quantity, sent - returned)) throw new Error("A quantidade deve ser inteira, maior que zero e não pode ultrapassar a pendência.");
    const result = await tx.outsourcingReturn.create({ data: { outsourcedServiceId: id, returnDate: input.returnDate, quantity: input.quantity, notes: input.notes?.trim() || null } });
    if (input.approve) await tx.outsourcedService.update({ where: { id }, data: { approvedQuantity: item.approvedQuantity + input.quantity } });
    return result;
  });
}

export async function setApprovedQuantity(db: DB, id: string, quantity: number) {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "OutsourcedService" WHERE "id" = ${id} FOR UPDATE`;
    const item = await tx.outsourcedService.findUnique({ where: { id }, include: { returns: { select: { quantity: true } } } });
    if (!item) throw new Error("Serviço terceirizado não encontrado.");
    const returned = item.returns.reduce((sum, row) => sum + row.quantity, 0);
    if (!validApproval(quantity, returned)) throw new Error("A quantidade aprovada deve estar entre zero e o total retornado.");
    return tx.outsourcedService.update({ where: { id }, data: { approvedQuantity: quantity } });
  });
}
