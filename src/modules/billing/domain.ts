import { Prisma } from "@/generated/prisma";
export function billingCompetenceDate(year: number, month: number) { return new Date(`${year}-${String(month).padStart(2, "0")}-01T00:00:00.000Z`); }
export function normalizeInvoiceNumber(value: string) { return value.trim().replace(/\s+/g, " "); }
export function expectedOrderAmount(quantity: number, unitPrice: Prisma.Decimal | string) { return new Prisma.Decimal(unitPrice).mul(quantity); }
