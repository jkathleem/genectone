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

export function fortalezaDateInputValue(value = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Fortaleza", year: "numeric", month: "2-digit", day: "2-digit" }).format(value);
}

export function fortalezaMonthYear(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Fortaleza", year: "numeric", month: "numeric" }).formatToParts(value);
  const part = (type: "year" | "month") => Number(parts.find(item => item.type === type)?.value);
  return { year: part("year"), month: part("month") };
}
