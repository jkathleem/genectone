import { Prisma, PrismaClient } from "@/generated/prisma";
import { billingCompetenceDate, normalizeInvoiceNumber } from "./domain";
type DB = Pick<PrismaClient, "$transaction">;
export type BillingInput = { invoiceNumber: string; issueDate: Date; amount: Prisma.Decimal | string; competenceYear: number; competenceMonth: number; dueDate: Date; notes?: string | null };
export async function createBillingAndReceivable(db: DB, productionOrderId: string, input: BillingInput) {
  const invoiceNumber = normalizeInvoiceNumber(input.invoiceNumber), amount = new Prisma.Decimal(input.amount);
  if (!invoiceNumber) throw new Error("Informe o número da NFe.");
  if (invoiceNumber.length > 100) throw new Error("O número da NFe deve possuir no máximo 100 caracteres.");
  if (!amount.gt(0)) throw new Error("O valor faturado deve ser maior que zero.");
  if (Number.isNaN(input.issueDate.getTime())) throw new Error("Informe uma data de emissão válida.");
  if (Number.isNaN(input.dueDate.getTime())) throw new Error("Informe um vencimento válido.");
  if (!Number.isInteger(input.competenceYear) || input.competenceYear < 1900 || input.competenceYear > 9999 || !Number.isInteger(input.competenceMonth) || input.competenceMonth < 1 || input.competenceMonth > 12) throw new Error("Informe uma competência válida.");
  const competenceDate = billingCompetenceDate(input.competenceYear, input.competenceMonth);
  try {
    return await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "ProductionOrder" WHERE "id" = ${productionOrderId} FOR UPDATE`;
      const order = await tx.productionOrder.findUnique({ where: { id: productionOrderId }, include: { company: true, customer: true, billing: true } });
      if (!order) throw new Error("OP não encontrada.");
      if (order.billing) throw new Error("Esta OP já possui faturamento registrado.");
      const duplicate = await tx.billing.findUnique({ where: { companyId_invoiceNumber: { companyId: order.companyId, invoiceNumber } }, select: { id: true } });
      if (duplicate) throw new Error("Este número de NFe já está registrado para esta empresa.");
      const billing = await tx.billing.create({ data: { productionOrderId: order.id, companyId: order.companyId, invoiceNumber, issueDate: input.issueDate, amount, competenceDate, notes: input.notes?.trim() || null } });
      const accountReceivable = await tx.accountReceivable.create({ data: { companyId: order.companyId, customerId: order.customerId, billingId: billing.id, description: `Faturamento OP ${order.number} — NFe ${invoiceNumber} — ${order.customer.name}`, competenceDate, dueDate: input.dueDate, originalAmount: amount } });
      return { billing, accountReceivable };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = String(error.meta?.target ?? "");
      if (target.includes("productionOrderId")) throw new Error("Esta OP já possui faturamento registrado.");
      throw new Error("Este número de NFe já está registrado para esta empresa.");
    }
    throw error;
  }
}
