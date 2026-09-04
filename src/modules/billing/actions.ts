"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseMoneyInput } from "@/modules/production-orders/validation";
import { createBillingAndReceivable } from "./creation";
export async function registerBilling(formData: FormData) {
  const id = String(formData.get("productionOrderId") ?? ""), path = `/ops/${id}/faturamento/novo`;
  try {
    const issueDate = String(formData.get("issueDate") ?? ""), dueDate = String(formData.get("dueDate") ?? "");
    await createBillingAndReceivable(prisma, id, { invoiceNumber: String(formData.get("invoiceNumber") ?? ""), issueDate: new Date(`${issueDate}T00:00:00.000Z`), amount: parseMoneyInput(String(formData.get("amount") ?? "")), competenceMonth: Number(formData.get("competenceMonth")), competenceYear: Number(formData.get("competenceYear")), dueDate: new Date(`${dueDate}T00:00:00.000Z`), notes: String(formData.get("notes") ?? "") });
    revalidatePath(`/ops/${id}`); revalidatePath("/financeiro/contas-a-receber");
    redirect(`/ops/${id}?success=${encodeURIComponent("Faturamento registrado e Conta a Receber criada.")}`);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect(`${path}?error=${encodeURIComponent(error instanceof Error ? error.message : "Não foi possível registrar o faturamento.")}`);
  }
}
