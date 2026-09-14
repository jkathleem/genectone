import { Prisma } from "@/generated/prisma";

export function derivedQuantities(items: { quantity: number }[], returns: { quantity: number }[]) {
  const sentQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const returnedQuantity = returns.reduce((sum, item) => sum + item.quantity, 0);
  return { sentQuantity, returnedQuantity, pendingQuantity: sentQuantity - returnedQuantity };
}
export function operationalStatus(sent: number, returned: number) {
  if (sent === 0) return "Aguardando envio";
  if (returned === 0) return "Em terceirização";
  if (sent - returned > 0) return "Retorno parcial";
  return "Retornado";
}
export function plannedValue(quantity: number, price: Prisma.Decimal | string) { return new Prisma.Decimal(price).mul(quantity); }
export function approvedValue(quantity: number, price: Prisma.Decimal | string) { return new Prisma.Decimal(price).mul(quantity); }
export function daysOutside(lastDeparture: Date, today: Date) { return Math.max(0, Math.floor((Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) - Date.UTC(lastDeparture.getUTCFullYear(), lastDeparture.getUTCMonth(), lastDeparture.getUTCDate())) / 86400000)); }
export function appearsInCollections(sent: number, returned: number) { return sent - returned > 0; }
export function validReturn(quantity: number, pending: number) { return Number.isInteger(quantity) && quantity > 0 && quantity <= pending; }
export function validApproval(quantity: number, returned: number) { return Number.isInteger(quantity) && quantity >= 0 && quantity <= returned; }

export type MountingAvailability = "NOT_AVAILABLE" | "PARTIALLY_AVAILABLE" | "FULLY_AVAILABLE";

export function mountingAvailability(
  services: { deliveryNoteItems: { quantity: number }[]; returns: { quantity: number }[] }[],
): MountingAvailability {
  if (services.length === 0) return "NOT_AVAILABLE";
  const completed = services.filter((service) => {
    const quantities = derivedQuantities(service.deliveryNoteItems, service.returns);
    return quantities.sentQuantity > 0 && quantities.pendingQuantity <= 0;
  }).length;
  if (completed === 0) return "NOT_AVAILABLE";
  return completed === services.length ? "FULLY_AVAILABLE" : "PARTIALLY_AVAILABLE";
}

export function canChangeAssignment(
  hasDeliveryNoteItem: boolean,
  current: { serviceId: string; contractorId: string },
  next: { serviceId: string; contractorId: string },
) {
  return !hasDeliveryNoteItem || (current.serviceId === next.serviceId && current.contractorId === next.contractorId);
}
