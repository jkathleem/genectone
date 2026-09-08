"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { redirectWithMessage } from "@/lib/form";
import { parseMoneyInput } from "@/modules/production-orders/validation";
import { createManualAccountPayable } from "./creation";

const path = "/financeiro/contas-a-pagar/nova";
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe o vencimento.");

export async function createManualPayableAction(formData: FormData) {
  try {
    const dueDate = dateSchema.parse(formData.get("dueDate"));
    const account = await createManualAccountPayable(prisma, {
      companyId: String(formData.get("companyId") ?? ""),
      payeeName: String(formData.get("payeeName") ?? ""),
      description: String(formData.get("description") ?? ""),
      classificationId: String(formData.get("classificationId") ?? ""),
      competenceMonth: z.coerce.number().int().parse(formData.get("competenceMonth")),
      competenceYear: z.coerce.number().int().parse(formData.get("competenceYear")),
      dueDate: new Date(`${dueDate}T00:00:00.000Z`),
      originalAmount: parseMoneyInput(String(formData.get("originalAmount") ?? "")),
    });
    redirectWithMessage(`/financeiro/contas-a-pagar/${account.id}`, "success", "Conta a Pagar manual registrada.");
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    if (error instanceof z.ZodError) redirectWithMessage(path, "error", error.issues[0]?.message ?? "Dados inválidos.");
    redirectWithMessage(path, "error", error instanceof Error ? error.message : "Não foi possível registrar a Conta a Pagar.");
  }
}
