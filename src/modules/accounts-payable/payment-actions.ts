"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseMoneyInput } from "@/modules/production-orders/validation";
import { createPayment } from "./payments";
import { requireUser } from "@/modules/auth/session";
function destination(id: string, kind: "success" | "error", message: string) { return `/financeiro/contas-a-pagar/${id}?${kind}=${encodeURIComponent(message)}`; }
export async function registerPayment(formData: FormData) {
  const user = await requireUser("FINANCE_MUTATE");
  const id = String(formData.get("accountPayableId") ?? "");
  try {
    const date = String(formData.get("paymentDate") ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Informe uma data de pagamento válida.");
    await createPayment(prisma, id, { createdByUserId: user.id, paymentDate: new Date(`${date}T00:00:00.000Z`), amount: parseMoneyInput(String(formData.get("amount") ?? "")), notes: String(formData.get("notes") ?? "") });
    revalidatePath("/financeiro/contas-a-pagar"); revalidatePath(`/financeiro/contas-a-pagar/${id}`);
    redirect(destination(id, "success", "Pagamento registrado."));
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect(destination(id, "error", error instanceof Error ? error.message : "Não foi possível registrar o pagamento."));
  }
}
