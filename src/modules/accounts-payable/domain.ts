import { Prisma } from "@/generated/prisma";
export type FinancialStatus = "Em aberto" | "Vencida" | "Parcial" | "Pago";
type PaymentValue = { amount: Prisma.Decimal | string; reversal?: unknown | null };
export function competenceDate(year: number, month: number) { return new Date(`${year}-${String(month).padStart(2, "0")}-01T00:00:00.000Z`); }
export function paidAmount(payments: PaymentValue[] = []) { return payments.filter(payment=>!payment.reversal).reduce((sum, payment) => sum.plus(payment.amount), new Prisma.Decimal(0)); }
export function remainingAmount(original: Prisma.Decimal | string, payments: PaymentValue[] = []) { return new Prisma.Decimal(original).minus(paidAmount(payments)); }
export function financialStatus(original: Prisma.Decimal | string, dueDate: Date, payments: PaymentValue[] = [], today = new Date()): FinancialStatus {
  const paid = paidAmount(payments), remaining = new Prisma.Decimal(original).minus(paid);
  if (remaining.eq(0)) return "Pago";
  if (paid.gt(0)) return "Parcial";
  const due = dueDate.toISOString().slice(0, 10), current = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Fortaleza" }).format(today);
  return due < current ? "Vencida" : "Em aberto";
}
