"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { redirectWithMessage } from "@/lib/form";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/modules/auth/session";
import { saveOutsourcedServiceAssignment } from "./service";
import { outsourcedServiceSchema } from "./validation";

function values(data: FormData) {
  return {
    serviceId: String(data.get("serviceId") ?? ""),
    contractorId: String(data.get("contractorId") ?? ""),
    plannedQuantity: String(data.get("plannedQuantity") ?? ""),
    notes: String(data.get("notes") ?? ""),
  };
}

export async function saveOutsourcedService(data: FormData) {
  await requireUser("OPERATION_MUTATE");
  const orderId = String(data.get("orderId"));
  const id = String(data.get("id") ?? "");
  const path = `/ops/${orderId}`;
  try {
    const input = outsourcedServiceSchema.parse(values(data));
    await saveOutsourcedServiceAssignment(prisma, orderId, id || null, input);
    revalidatePath(path);
    redirectWithMessage(path, "success", id ? "Serviço terceirizado atualizado." : "Serviço terceirizado adicionado.");
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    if (error instanceof z.ZodError) redirectWithMessage(path, "error", error.issues[0]?.message ?? "Dados inválidos.");
    redirectWithMessage(path, "error", error instanceof Error ? error.message : "Não foi possível salvar.");
  }
}
