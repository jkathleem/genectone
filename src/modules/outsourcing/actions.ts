"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { redirectWithMessage } from "@/lib/form";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/modules/auth/session";
import { saveOutsourcedServiceAssignment } from "./service";
import { outsourcedServiceSchema } from "./validation";

export async function saveOutsourcedService(data: FormData) {
  const user = await requireUser("OPERATION_MUTATE");
  const orderId = String(data.get("orderId"));
  const id = String(data.get("id") ?? "");
  const path = `/ops/${orderId}`;
  try {
    const input = outsourcedServiceSchema.parse({ serviceId: String(data.get("serviceId") ?? ""), contractorId: String(data.get("contractorId") ?? ""), plannedQuantity: String(data.get("plannedQuantity") ?? ""), expectedReturnDate: String(data.get("expectedReturnDate") ?? ""), notes: String(data.get("notes") ?? "") });
    await saveOutsourcedServiceAssignment(prisma, orderId, id || null, input, user.id);
    revalidatePath(path);
    redirectWithMessage(`${path}?tab=services`, "success", id ? "Serviço terceirizado atualizado." : "Serviço terceirizado adicionado.");
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    if (error instanceof z.ZodError) redirectWithMessage(path, "error", error.issues[0]?.message ?? "Dados inválidos.");
    redirectWithMessage(path, "error", error instanceof Error ? error.message : "Não foi possível salvar.");
  }
}
