import { Prisma } from "@/generated/prisma";

export type SettlementStatus = "DRAFT" | "APPROVED";
export function settlementStatusLabel(status: SettlementStatus) { return status === "APPROVED" ? "Aprovado" : "Rascunho"; }
export function settledQuantity(items: { approvedQuantityIncluded: number; settlement: { status: SettlementStatus } }[]) { return items.filter((item) => item.settlement.status === "APPROVED").reduce((sum, item) => sum + item.approvedQuantityIncluded, 0); }
export function eligibleQuantity(approved: number, settled: number) { return approved - settled; }
export function validSettlementQuantity(quantity: number, eligible: number) { return Number.isInteger(quantity) && quantity > 0 && quantity <= eligible; }
export function subtotal(quantity: number, price: Prisma.Decimal | string) { return new Prisma.Decimal(price).mul(quantity); }
export function settlementTotal(items: { quantity: number; price: Prisma.Decimal | string }[]) { return items.reduce((sum, item) => sum.add(subtotal(item.quantity, item.price)), new Prisma.Decimal(0)); }
export function sameContractor(items: { contractorId: string }[], contractorId: string) { return items.every((item) => item.contractorId === contractorId); }
