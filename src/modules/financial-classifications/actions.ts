"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { redirectWithMessage } from "@/lib/form";
import { createFinancialClassification, setFinancialClassificationActive, updateFinancialClassification } from "./service";
import { requireUser } from "@/modules/auth/session";

const path = "/cadastros/classificacoes-financeiras";
const groupSchema = z.enum(["VARIABLE_COST_EXPENSE", "FIXED_COST_EXPENSE", "FINANCIAL_REVENUE", "FINANCIAL_EXPENSE", "INCOME_TAX_EXPENSE"]);
const natureSchema = z.enum(["OPERATING_EXPENSE", "DRE_POST_OPERATING", "NON_DRE"]);
const idSchema = z.string().min(1);

async function execute(message: string, operation: () => Promise<unknown>) {
  try {
    await requireUser("FINANCE_MUTATE");
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
  await execute("Classificação cadastrada.", () => {
    const financialNature = natureSchema.parse(formData.get("financialNature"));
    return createFinancialClassification(prisma, {
      code: String(formData.get("code") ?? ""),
      name: String(formData.get("name") ?? ""),
      financialNature,
      dreGroup: financialNature === "NON_DRE" ? null : groupSchema.parse(formData.get("dreGroup")),
      notes: String(formData.get("notes") ?? ""),
    });
  });
}

export async function updateClassificationAction(formData: FormData) {
  await execute("Classificação atualizada.", () => {
    const financialNature = natureSchema.parse(formData.get("financialNature"));
    return updateFinancialClassification(prisma, idSchema.parse(formData.get("id")), {
      name: String(formData.get("name") ?? ""),
      financialNature,
      dreGroup: financialNature === "NON_DRE" ? null : groupSchema.parse(formData.get("dreGroup")),
      notes: String(formData.get("notes") ?? ""),
    });
  });
}

export async function toggleClassificationAction(formData: FormData) {
  await execute("Situação da classificação atualizada.", () => setFinancialClassificationActive(prisma, idSchema.parse(formData.get("id")), formData.get("active") === "true"));
}
