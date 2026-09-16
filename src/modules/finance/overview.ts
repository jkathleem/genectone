import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { flowTotals } from "@/modules/cash-flow/domain";
import { cashFlowData } from "@/modules/cash-flow/queries";
import { monthRange, payableBalance, productionOrderPredictedValue, receivableBalance, sumOpenBalances } from "./overview-domain";

export async function financialOverview(companyId: string | undefined, year: number, month: number, todayKey: string) {
  const { from: monthFrom, to: monthTo } = monthRange(year, month);
  const today = new Date(`${todayKey}T00:00:00.000Z`);
  const commonCompany = companyId || undefined;

  const [accountsPayable, accountsReceivable, openOrders, completedToBillOrders, cashActual] = await Promise.all([
    prisma.accountPayable.findMany({
      where: { companyId: commonCompany, dueDate: { lt: monthTo } },
      include: { payments: { select: { amount: true, reversal: { select: { id: true } } } }, company: true },
      orderBy: { dueDate: "asc" },
    }),
    prisma.accountReceivable.findMany({
      where: { companyId: commonCompany },
      include: {
        allocations: { select: { amount: true, receipt: { select: { reversal: { select: { id: true } } } } } },
        company: true,
        customer: true,
        billing: { include: { productionOrder: true } },
      },
      orderBy: { dueDate: "asc" },
    }),
    prisma.productionOrder.findMany({
      where: { companyId: commonCompany, completedAt: null },
      select: { id: true, number: true, quantity: true, unitPrice: true, customer: { select: { name: true } }, product: { select: { reference: true } } },
      orderBy: { entryDate: "desc" },
    }),
    prisma.productionOrder.findMany({
      where: { companyId: commonCompany, completedAt: { not: null }, billing: null },
      select: { id: true, number: true, quantity: true, unitPrice: true, completedAt: true, customer: { select: { name: true } }, product: { select: { reference: true } } },
      orderBy: { completedAt: "asc" },
    }),
    cashFlowData({ companyId, from: monthFrom, to: new Date(monthTo.getTime() - 86_400_000), view: "actual" }),
  ]);

  const payableBalanceFor = (row: (typeof accountsPayable)[number]) => payableBalance(row.originalAmount, row.payments);
  const receivableBalanceFor = (row: (typeof accountsReceivable)[number]) => receivableBalance(row.originalAmount, row.allocations);
  const sameDay = (date: Date) => date.toISOString().slice(0, 10) === todayKey;
  const inMonth = (date: Date) => date >= monthFrom && date < monthTo;
  const overdue = (date: Date) => date < today;

  const productionPortfolioValue = openOrders.reduce((sum, order) => sum.plus(productionOrderPredictedValue(order.quantity, order.unitPrice)), new Prisma.Decimal(0));
  const completedToBillValue = completedToBillOrders.reduce((sum, order) => sum.plus(productionOrderPredictedValue(order.quantity, order.unitPrice)), new Prisma.Decimal(0));
  const cashTotals = flowTotals(cashActual.movements);
  const billedToReceiveBalance = sumOpenBalances(accountsReceivable, receivableBalanceFor);

  return {
    payableToday: sumOpenBalances(accountsPayable, payableBalanceFor, (row) => sameDay(row.dueDate)),
    payableMonth: sumOpenBalances(accountsPayable, payableBalanceFor, (row) => inMonth(row.dueDate)),
    payableOverdue: sumOpenBalances(accountsPayable, payableBalanceFor, (row) => overdue(row.dueDate)),
    receivableToday: sumOpenBalances(accountsReceivable, receivableBalanceFor, (row) => sameDay(row.dueDate)),
    receivableMonth: sumOpenBalances(accountsReceivable, receivableBalanceFor, (row) => inMonth(row.dueDate)),
    receivableOverdue: sumOpenBalances(accountsReceivable, receivableBalanceFor, (row) => overdue(row.dueDate)),
    cashActualEntries: cashTotals.entries,
    cashActualExits: cashTotals.exits,
    cashActualNet: cashTotals.net,
    productionPortfolioCount: openOrders.length,
    productionPortfolioValue,
    completedToBillCount: completedToBillOrders.length,
    completedToBillValue,
    completedToBillOrders,
    billedToReceiveCount: accountsReceivable.filter((row) => receivableBalanceFor(row).gt(0)).length,
    billedToReceiveBalance,
    attention: {
      overduePayableCount: accountsPayable.filter((row) => payableBalanceFor(row).gt(0) && overdue(row.dueDate)).length,
      overdueReceivableCount: accountsReceivable.filter((row) => receivableBalanceFor(row).gt(0) && overdue(row.dueDate)).length,
      completedToBillCount: completedToBillOrders.length,
    },
  };
}
