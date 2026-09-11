import { Prisma } from "@/generated/prisma";
export type ReceivableStatus = "Em aberto" | "Vencida" | "Parcial" | "Recebida";
type AllocationValue = { amount: Prisma.Decimal | string; receipt?: object };
function reversed(item:AllocationValue){return !!item.receipt&&"reversal" in item.receipt&&!!item.receipt.reversal;}
export function receivedAmount(allocations: AllocationValue[] = []) { return allocations.filter(item=>!reversed(item)).reduce((sum, item) => sum.plus(item.amount), new Prisma.Decimal(0)); }
export function receivableRemainingAmount(original: Prisma.Decimal | string, allocations: AllocationValue[] = []) { return new Prisma.Decimal(original).minus(receivedAmount(allocations)); }
export function receivableStatus(original: Prisma.Decimal | string, dueDate: Date, allocations: AllocationValue[] = [], today = new Date()): ReceivableStatus {
  const received = receivedAmount(allocations), remaining = new Prisma.Decimal(original).minus(received);
  if (remaining.eq(0)) return "Recebida";
  if (received.gt(0)) return "Parcial";
  const due = dueDate.toISOString().slice(0, 10), current = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Fortaleza" }).format(today);
  return due < current ? "Vencida" : "Em aberto";
}
