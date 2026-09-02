import { Prisma } from "@/generated/prisma";

export function formatCurrency(value: Prisma.Decimal | string) {
  const [integer, cents] = new Prisma.Decimal(value).toFixed(2).split(".");
  const sign = integer.startsWith("-") ? "-" : "";
  const digits = integer.replace("-", "");
  return `${sign}R$ ${digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${cents}`;
}

export function formatDate(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(value);
}

export function dateInputValue(value: Date) {
  return value.toISOString().slice(0, 10);
}
