export type DeliveryItemInput = { outsourcedServiceId: string; quantity: number };

export function sentQuantity(items: { quantity: number }[]) {
  return items.reduce((total, item) => total + item.quantity, 0);
}

export function availableToSend(planned: number, alreadySent: number) {
  return planned - alreadySent;
}

export function deliveryNoteTotal(items: { quantity: number }[]) {
  return sentQuantity(items);
}

export function allItemsBelongToContractor(items: { contractorId: string }[], contractorId: string) {
  return items.every((item) => item.contractorId === contractorId);
}

export function validateRequestedQuantity(quantity: number, available: number) {
  return Number.isInteger(quantity) && quantity > 0 && quantity <= available;
}
