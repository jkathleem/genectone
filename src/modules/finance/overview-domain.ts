import { Prisma } from "@/generated/prisma";
import { remainingAmount } from "@/modules/accounts-payable/domain";
import { receivableRemainingAmount } from "@/modules/accounts-receivable/domain";

type PaymentValue = { amount: Prisma.Decimal; reversal: { id: string } | null };
type AllocationValue = { amount: Prisma.Decimal; receipt: { reversal: { id: string } | null } };

export function monthRange(year: number, month: number) {
  return {
    from: new Date(Date.UTC(year, month - 1, 1)),
    to: new Date(Date.UTC(year, month, 1)),
  };
}

export function payableBalance(originalAmount: Prisma.Decimal | string, payments: PaymentValue[] = []) {
  return remainingAmount(originalAmount, payments);
}

export function receivableBalance(originalAmount: Prisma.Decimal | string, allocations: AllocationValue[] = []) {
  return receivableRemainingAmount(originalAmount, allocations);
}

export function sumOpenBalances<T>(
  rows: T[],
  balance: (row: T) => Prisma.Decimal,
  predicate: (row: T) => boolean = () => true,
) {
  return rows.reduce((sum, row) => {
    if (!predicate(row)) return sum;
    const value = balance(row);
    return value.gt(0) ? sum.plus(value) : sum;
  }, new Prisma.Decimal(0));
}

export function productionOrderPredictedValue(quantity: number, unitPrice: Prisma.Decimal | string) {
  return new Prisma.Decimal(quantity).mul(unitPrice);
}

