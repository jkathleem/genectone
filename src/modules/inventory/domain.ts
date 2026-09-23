import { Prisma, type StockMovementDirection } from "@/generated/prisma";

export type DecimalInput = Prisma.Decimal | string;

export type InventoryWarning = {
  code: "NEGATIVE_STOCK";
  message: string;
  supplyId: string;
  balance: Prisma.Decimal;
};

export type StockMovementForBalance = {
  direction: StockMovementDirection;
  quantity: DecimalInput;
};

export function requiredInventoryText(value: string | undefined | null, message: string) {
  const normalized = value?.trim() ?? "";
  if (!normalized) throw new Error(message);
  return normalized;
}

export function positiveDecimal(value: DecimalInput, message: string) {
  const decimal = new Prisma.Decimal(value);
  if (!decimal.gt(0)) throw new Error(message);
  return decimal;
}

export function validInventoryDate(value: Date, message: string) {
  if (Number.isNaN(value.getTime())) throw new Error(message);
  return value;
}

export function calculateSupplyBalanceFromMovements(movements: StockMovementForBalance[]) {
  return movements.reduce((balance, movement) => {
    const quantity = new Prisma.Decimal(movement.quantity);
    return movement.direction === "IN" ? balance.plus(quantity) : balance.minus(quantity);
  }, new Prisma.Decimal(0));
}

export function negativeStockWarning(supplyId: string, balance: Prisma.Decimal): InventoryWarning | null {
  if (!balance.lt(0)) return null;
  return {
    code: "NEGATIVE_STOCK",
    supplyId,
    balance,
    message: "O estoque ficou negativo. O movimento foi registrado para preservar a auditoria física.",
  };
}

export function competenceFromDate(date: Date) {
  return new Date(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-01T00:00:00.000Z`);
}
