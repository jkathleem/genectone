"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { redirectWithMessage } from "@/lib/form";
import { requireUser } from "@/modules/auth/session";
import { registerOutsourcingReturn, setApprovedQuantity } from "./return-service";

const idSchema = z.string().cuid();
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
function refresh(id: string) { revalidatePath("/terceirizacao"); revalidatePath("/terceirizacao/cobrancas"); revalidatePath(`/terceirizacao/${id}/retorno`); }

export async function registerReturn(data: FormData) {
  await requireUser("OPERATION_MUTATE");
  const id = String(data.get("id") ?? ""), path = `/terceirizacao/${id}/retorno`;
  try {
    idSchema.parse(id);
    const quantity = z.coerce.number().int().parse(data.get("quantity"));
    const returnDate = dateSchema.parse(data.get("returnDate"));
    await registerOutsourcingReturn(prisma, id, { quantity, returnDate: new Date(`${returnDate}T00:00:00.000Z`), notes: String(data.get("notes") ?? "") });
    refresh(id); redirectWithMessage(path, "success", "Retorno registrado.");
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirectWithMessage(path, "error", error instanceof Error ? error.message : "Não foi possível registrar o retorno.");
  }
}

export async function updateApprovedQuantity(data: FormData) {
  await requireUser("OPERATION_MUTATE");
  const id = String(data.get("id") ?? ""), path = `/terceirizacao/${id}/retorno`;
  try {
    idSchema.parse(id);
    await setApprovedQuantity(prisma, id, z.coerce.number().int().parse(data.get("approvedQuantity")));
    refresh(id); redirectWithMessage(path, "success", "Quantidade aprovada atualizada.");
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirectWithMessage(path, "error", error instanceof Error ? error.message : "Não foi possível atualizar a aprovação.");
  }
}
