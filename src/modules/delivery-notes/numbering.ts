import type { Prisma } from "@/generated/prisma";

export function formatDeliveryNoteNumber(value: bigint | number) {
  return value.toString().padStart(6, "0");
}

export async function nextDeliveryNoteNumber(tx: Prisma.TransactionClient) {
  const [result] = await tx.$queryRaw<{ value: bigint }[]>`
    SELECT nextval('delivery_note_number_seq') AS value
  `;
  if (!result) throw new Error("Não foi possível gerar o número do Romaneio.");
  return formatDeliveryNoteNumber(result.value);
}
