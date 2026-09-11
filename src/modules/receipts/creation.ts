import { Prisma, PrismaClient } from "@/generated/prisma";
type DB = Pick<PrismaClient, "$transaction">;
export type AllocationInput = { accountReceivableId: string; amount: Prisma.Decimal | string };
export type ReceiptInput = { companyId: string; customerId: string; receiptDate: Date; amount: Prisma.Decimal | string; notes?: string | null; allocations: AllocationInput[] };
export function allocationTotal(allocations: AllocationInput[]) { return allocations.reduce((sum, item) => sum.plus(item.amount), new Prisma.Decimal(0)); }
export async function createReceipt(db: DB, input: ReceiptInput) {
  const amount = new Prisma.Decimal(input.amount);
  if (!input.companyId || !input.customerId) throw new Error("Informe a empresa e o cliente.");
  if (Number.isNaN(input.receiptDate.getTime())) throw new Error("Informe uma data de recebimento válida.");
  if (!amount.gt(0)) throw new Error("O valor recebido deve ser maior que zero.");
  if (!input.allocations.length) throw new Error("Informe ao menos uma alocação.");
  const ids = input.allocations.map(item => item.accountReceivableId);
  if (new Set(ids).size !== ids.length) throw new Error("A mesma Conta a Receber não pode aparecer duas vezes.");
  if (input.allocations.some(item => !new Prisma.Decimal(item.amount).gt(0))) throw new Error("Toda alocação deve ser maior que zero.");
  if (!allocationTotal(input.allocations).eq(amount)) throw new Error("O total alocado deve ser igual ao valor recebido.");
  const orderedIds = [...ids].sort();
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "AccountReceivable" WHERE "id" IN (${Prisma.join(orderedIds)}) ORDER BY "id" FOR UPDATE`;
    const accounts = await tx.accountReceivable.findMany({ where: { id: { in: orderedIds } }, include: { allocations: { select: { amount: true, receipt: { select: { reversal: { select: { id: true } } } } } } } });
    if (accounts.length !== orderedIds.length) throw new Error("Uma ou mais Contas a Receber não foram encontradas.");
    const byId = new Map(accounts.map(account => [account.id, account]));
    for (const allocation of input.allocations) {
      const account = byId.get(allocation.accountReceivableId)!;
      if (account.companyId !== input.companyId) throw new Error("Todas as Contas a Receber devem pertencer à empresa selecionada.");
      if (account.customerId !== input.customerId) throw new Error("Todas as Contas a Receber devem pertencer ao cliente selecionado.");
      const alreadyReceived = account.allocations.filter(item=>!item.receipt?.reversal).reduce((sum, item) => sum.plus(item.amount), new Prisma.Decimal(0));
      const remaining = account.originalAmount.minus(alreadyReceived);
      if (new Prisma.Decimal(allocation.amount).gt(remaining)) throw new Error("Uma alocação não pode ultrapassar o saldo atual da Conta a Receber.");
    }
    return tx.receipt.create({ data: { companyId: input.companyId, customerId: input.customerId, receiptDate: input.receiptDate, amount, notes: input.notes?.trim() || null, allocations: { create: input.allocations.map(item => ({ accountReceivableId: item.accountReceivableId, amount: new Prisma.Decimal(item.amount) })) } }, include: { allocations: true } });
  });
}
