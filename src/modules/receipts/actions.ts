"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseMoneyInput } from "@/modules/production-orders/validation";
import { createReceipt } from "./creation";
import { requireUser } from "@/modules/auth/session";
export async function registerReceipt(formData: FormData) {
  const user = await requireUser("FINANCE_MUTATE");
  const companyId = String(formData.get("companyId") ?? ""), customerId = String(formData.get("customerId") ?? "");
  try {
    const allocations = [...formData.entries()].filter(([key, value]) => key.startsWith("allocation-") && String(value).trim()).map(([key, value]) => ({ accountReceivableId: key.slice("allocation-".length), amount: parseMoneyInput(String(value)) }));
    const date = String(formData.get("receiptDate") ?? "");
    const receipt = await createReceipt(prisma, { createdByUserId: user.id, companyId, customerId, receiptDate: new Date(`${date}T00:00:00.000Z`), amount: parseMoneyInput(String(formData.get("amount") ?? "")), notes: String(formData.get("notes") ?? ""), allocations });
    revalidatePath("/financeiro/recebimentos"); revalidatePath("/financeiro/contas-a-receber");
    redirect(`/financeiro/recebimentos/${receipt.id}?success=${encodeURIComponent("Recebimento registrado.")}`);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect(`/financeiro/recebimentos/novo?companyId=${encodeURIComponent(companyId)}&customerId=${encodeURIComponent(customerId)}&error=${encodeURIComponent(error instanceof Error ? error.message : "Não foi possível registrar o recebimento.")}`);
  }
}
