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

export function canChangeAssignment(
  hasDeliveryNoteItem: boolean,
  current: { serviceId: string; contractorId: string },
  next: { serviceId: string; contractorId: string },
) {
  return !hasDeliveryNoteItem || (current.serviceId === next.serviceId && current.contractorId === next.contractorId);
}
