"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { redirectWithMessage } from "@/lib/form";
import { requireUser } from "@/modules/auth/session";
import { deliveryNoteSchema } from "./validation";
import { createDeliveryNoteRecord } from "./service";

export async function createDeliveryNote(data: FormData) {
  await requireUser("OPERATION_MUTATE");
  const path = "/romaneios/novo";
  try {
    const input = deliveryNoteSchema.parse({ contractorId: String(data.get("contractorId") ?? ""), departureDate: String(data.get("departureDate") ?? ""), responsibleName: String(data.get("responsibleName") ?? ""), notes: String(data.get("notes") ?? ""), items: JSON.parse(String(data.get("items") ?? "[]")) });
    const note = await createDeliveryNoteRecord(prisma, { ...input, departureDate: new Date(`${input.departureDate}T00:00:00.000Z`) });
    revalidatePath("/"); revalidatePath("/romaneios"); revalidatePath("/terceirizacao");
    redirect(`/romaneios/${note.id}?success=${encodeURIComponent("Romaneio emitido com sucesso.")}`);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    if (error instanceof z.ZodError) redirectWithMessage(path, "error", error.issues[0]?.message ?? "Dados inválidos.");
    if (error instanceof SyntaxError) redirectWithMessage(path, "error", "Itens do Romaneio inválidos.");
    redirectWithMessage(path, "error", error instanceof Error ? error.message : "Não foi possível emitir o Romaneio.");
  }
}
