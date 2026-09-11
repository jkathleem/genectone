import { Prisma, PrismaClient } from "@/generated/prisma";
type DB = Pick<PrismaClient, "$transaction">;
export type PaymentInput = { paymentDate: Date; amount: Prisma.Decimal | string; notes?: string | null };
export async function createPayment(db: DB, accountPayableId: string, input: PaymentInput) {
  if (!accountPayableId) throw new Error("Conta a Pagar não informada.");
  if (Number.isNaN(input.paymentDate.getTime())) throw new Error("Informe uma data de pagamento válida.");
  const amount = new Prisma.Decimal(input.amount);
  if (!amount.gt(0)) throw new Error("O valor do pagamento deve ser maior que zero.");
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "AccountPayable" WHERE "id" = ${accountPayableId} FOR UPDATE`;
    const account = await tx.accountPayable.findUnique({ where: { id: accountPayableId }, include: { payments: { select: { amount: true, reversal: { select: { id: true } } } } } });
    if (!account) throw new Error("Conta a Pagar não encontrada.");
    const paid = account.payments.filter(payment=>!payment.reversal).reduce((sum, payment) => sum.plus(payment.amount), new Prisma.Decimal(0));
    const remaining = account.originalAmount.minus(paid);
    if (remaining.lte(0)) throw new Error("Esta Conta a Pagar já está paga.");
    if (amount.gt(remaining)) throw new Error("O valor do pagamento não pode ultrapassar o saldo atual.");
    return tx.payment.create({ data: { accountPayableId, paymentDate: input.paymentDate, amount, notes: input.notes?.trim() || null } });
  });
}
