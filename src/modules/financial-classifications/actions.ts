"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { redirectWithMessage } from "@/lib/form";
import { createFinancialClassification, setFinancialClassificationActive, updateFinancialClassification } from "./service";

const path = "/cadastros/classificacoes-financeiras";
const groupSchema = z.enum(["VARIABLE_COST_EXPENSE", "FIXED_COST_EXPENSE"]);
const idSchema = z.string().min(1);

async function execute(message: string, operation: () => Promise<unknown>) {
  try {
    await operation();
    revalidatePath(path);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") redirectWithMessage(path, "error", "Já existe uma classificação com esse código.");
    if (error instanceof z.ZodError) redirectWithMessage(path, "error", error.issues[0]?.message ?? "Dados inválidos.");
    redirectWithMessage(path, "error", error instanceof Error ? error.message : "Não foi possível salvar a classificação.");
  }
  redirectWithMessage(path, "success", message);
}

export async function createClassificationAction(formData: FormData) {
  await execute("Classificação cadastrada.", () => createFinancialClassification(prisma, {
    code: String(formData.get("code") ?? ""),
    name: String(formData.get("name") ?? ""),
    dreGroup: groupSchema.parse(formData.get("dreGroup")),
    notes: String(formData.get("notes") ?? ""),
  }));
}

export async function updateClassificationAction(formData: FormData) {
  await execute("Classificação atualizada.", () => updateFinancialClassification(prisma, idSchema.parse(formData.get("id")), {
    name: String(formData.get("name") ?? ""),
    dreGroup: groupSchema.parse(formData.get("dreGroup")),
    notes: String(formData.get("notes") ?? ""),
  }));
}

export async function toggleClassificationAction(formData: FormData) {
  await execute("Situação da classificação atualizada.", () => setFinancialClassificationActive(prisma, idSchema.parse(formData.get("id")), formData.get("active") === "true"));
}
