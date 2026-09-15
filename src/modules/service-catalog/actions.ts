"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { optionalText, redirectWithMessage } from "@/lib/form";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/modules/auth/session";

const path = "/cadastros/servicos";

async function run(message: string, operation: () => Promise<unknown>) {
  try {
    await requireUser("OPERATION_MUTATE");
    await operation();
    revalidatePath(path);
  } catch (error) {
    if (error instanceof z.ZodError) redirectWithMessage(path, "error", error.issues[0]?.message ?? "Dados inválidos.");
    redirectWithMessage(path, "error", error instanceof Error ? error.message : "Não foi possível salvar.");
  }
  redirectWithMessage(path, "success", message);
}

export async function createService(data: FormData) {
  await run("Serviço cadastrado.", () => prisma.service.create({ data: { name: z.string().trim().min(1).parse(data.get("name")), description: optionalText(data.get("description")) } }));
}

export async function updateService(data: FormData) {
  await run("Serviço atualizado.", () => prisma.service.update({ where: { id: z.string().cuid().parse(data.get("id")) }, data: { name: z.string().trim().min(1).parse(data.get("name")), description: optionalText(data.get("description")) } }));
}

export async function toggleService(data: FormData) {
  await run("Situação atualizada.", () => prisma.service.update({ where: { id: z.string().cuid().parse(data.get("id")) }, data: { active: data.get("active") === "true" } }));
}
