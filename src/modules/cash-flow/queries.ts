import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { CashMovement, positiveBalance, sumBalances } from "./domain";
type Params = { companyId?: string; from: Date; to: Date; view: "predicted" | "actual" };
export async function cashFlowData({ companyId, from, to, view }: Params) {
  if (view === "actual") {
    const [receipts, payments] = await Promise.all([
      prisma.receipt.findMany({ where: { companyId: companyId || undefined, receiptDate: { gte: from, lte: to } }, include: { company: true, customer: true, _count: { select: { allocations: true } } }, orderBy: { receiptDate: "asc" } }),
      prisma.payment.findMany({ where: { paymentDate: { gte: from, lte: to }, accountPayable: { companyId: companyId || undefined } }, include: { accountPayable: { include: { company: true, contractorSettlement: { include: { contractor: true } } } } }, orderBy: { paymentDate: "asc" } }),
    ]);
    const movements: CashMovement[] = [...receipts.map(item => ({ id: item.id, date: item.receiptDate, direction: "IN" as const, type: "Recebimento", company: item.company.tradeName || item.company.name, description: `Recebimento — ${item.customer.name} — ${item._count.allocations} conta(s) alocada(s)`, counterparty: item.customer.name, amount: item.amount, href: `/financeiro/recebimentos/${item.id}` })), ...payments.map(item => ({ id: item.id, date: item.paymentDate, direction: "OUT" as const, type: "Pagamento", company: item.accountPayable.company.tradeName || item.accountPayable.company.name, description: item.accountPayable.description, counterparty: item.accountPayable.contractorSettlement.contractor.name, amount: item.amount, href: `/financeiro/contas-a-pagar/${item.accountPayableId}` }))];
    return { movements, overdueReceivable: new Prisma.Decimal(0), overduePayable: new Prisma.Decimal(0) };
  }
  const accountInclude = { allocations: { select: { amount: true } }, billing: { include: { productionOrder: true } }, company: true, customer: true } as const;
  const payableInclude = { payments: { select: { amount: true } }, company: true, contractorSettlement: { include: { contractor: true } } } as const;
  const [receivables, payables, oldReceivables, oldPayables] = await Promise.all([
    prisma.accountReceivable.findMany({ where: { companyId: companyId || undefined, dueDate: { gte: from, lte: to } }, include: accountInclude, orderBy: { dueDate: "asc" } }),
    prisma.accountPayable.findMany({ where: { companyId: companyId || undefined, dueDate: { gte: from, lte: to } }, include: payableInclude, orderBy: { dueDate: "asc" } }),
    prisma.accountReceivable.findMany({ where: { companyId: companyId || undefined, dueDate: { lt: from } }, include: { allocations: { select: { amount: true } } } }),
    prisma.accountPayable.findMany({ where: { companyId: companyId || undefined, dueDate: { lt: from } }, include: { payments: { select: { amount: true } } } }),
  ]);
  const movements: CashMovement[] = [];
  for (const item of receivables) { const received = sumBalances(item.allocations.map(x => x.amount)), amount = positiveBalance(item.originalAmount, received); if (amount.gt(0)) movements.push({ id: item.id, date: item.dueDate, direction: "IN", type: "Conta a Receber", company: item.company.tradeName || item.company.name, description: `OP ${item.billing.productionOrder.number} — NFe ${item.billing.invoiceNumber}`, counterparty: item.customer.name, amount, originalAmount: item.originalAmount, settledAmount: received, href: `/financeiro/contas-a-receber/${item.id}` }); }
  for (const item of payables) { const paid = sumBalances(item.payments.map(x => x.amount)), amount = positiveBalance(item.originalAmount, paid); if (amount.gt(0)) movements.push({ id: item.id, date: item.dueDate, direction: "OUT", type: "Conta a Pagar", company: item.company.tradeName || item.company.name, description: item.description, counterparty: item.contractorSettlement.contractor.name, amount, originalAmount: item.originalAmount, settledAmount: paid, href: `/financeiro/contas-a-pagar/${item.id}` }); }
  const overdueReceivable = sumBalances(oldReceivables.map(item => positiveBalance(item.originalAmount, sumBalances(item.allocations.map(x => x.amount)))));
  const overduePayable = sumBalances(oldPayables.map(item => positiveBalance(item.originalAmount, sumBalances(item.payments.map(x => x.amount)))));
  return { movements, overdueReceivable, overduePayable };
}
