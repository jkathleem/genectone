import { Prisma } from "@/generated/prisma";
export type ReceivableStatus = "Em aberto" | "Vencida";
export function receivedAmount() { return new Prisma.Decimal(0); }
export function receivableRemainingAmount(original: Prisma.Decimal | string) { return new Prisma.Decimal(original); }
export function receivableStatus(dueDate: Date, today = new Date()): ReceivableStatus {
  const due = dueDate.toISOString().slice(0, 10), current = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Fortaleza" }).format(today);
  return due < current ? "Vencida" : "Em aberto";
}
