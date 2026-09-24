"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { redirectWithMessage } from "@/lib/form";
import { requireUser } from "@/modules/auth/session";
import { registerProductionOrderSupplyConsumption } from "@/modules/inventory/service";
import { completeProductionOrderRecord, createProductionOrderWorkspace, updateOrderSupplyPlan } from "./service";
import { parseMoneyInput, productionOrderOperationalUpdateSchema, productionOrderSchema } from "./validation";

function isUniqueError(error: unknown): error is { code: string } {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

export async function createProductionOrder(data: FormData) {
  const user = await requireUser("OPERATION_MUTATE");
  const path = "/ops/nova";
  try {
    const input = productionOrderSchema.parse(Object.fromEntries(["number", "entryDate", "companyId", "customerId", "productId", "quantity", "isUrgent", "expectedCompletionDate", "notes"].map((key) => [key, String(data.get(key) ?? "")])));
    const order = await createProductionOrderWorkspace(prisma, {
      ...input,
      entryDate: new Date(`${input.entryDate}T00:00:00.000Z`),
      expectedCompletionDate: input.expectedCompletionDate ? new Date(`${input.expectedCompletionDate}T00:00:00.000Z`) : null,
      createdByUserId: user.id,
    });
    revalidatePath("/");
    revalidatePath("/ops");
    redirect(`/ops/${order.id}?success=${encodeURIComponent("OP cadastrada com preço e insumos preservados em snapshot.")}`);
  } catch (error) {
    if (isUniqueError(error)) redirectWithMessage(path, "error", "Já existe uma OP com esse número para a empresa selecionada.");
    if (error instanceof z.ZodError) redirectWithMessage(path, "error", error.issues[0]?.message ?? "Dados inválidos.");
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirectWithMessage(path, "error", error instanceof Error ? error.message : "Não foi possível cadastrar a OP.");
  }
}

export async function updateProductionOrder(data: FormData) {
  await requireUser("OPERATION_MUTATE");
  const id = z.string().cuid().parse(data.get("id"));
  const path = `/ops/${id}`;
  try {
    const input = productionOrderOperationalUpdateSchema.parse({ isUrgent: String(data.get("isUrgent") ?? ""), expectedCompletionDate: String(data.get("expectedCompletionDate") ?? ""), notes: String(data.get("notes") ?? "") });
    await prisma.productionOrder.update({ where: { id }, data: { isUrgent: input.isUrgent, expectedCompletionDate: input.expectedCompletionDate ? new Date(`${input.expectedCompletionDate}T00:00:00.000Z`) : null, notes: input.notes } });
    revalidatePath("/ops");
    revalidatePath(path);
    redirectWithMessage(path, "success", "Dados operacionais da OP atualizados.");
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    if (error instanceof z.ZodError) redirectWithMessage(path, "error", error.issues[0]?.message ?? "Dados inválidos.");
    redirectWithMessage(path, "error", error instanceof Error ? error.message : "Não foi possível atualizar a OP.");
  }
}

export async function completeProductionOrder(data: FormData) {
  const user = await requireUser("OPERATION_MUTATE");
  const id = z.string().cuid().parse(data.get("id"));
  const path = `/ops/${id}?tab=summary`;
  try {
    const completionDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(data.get("completionDate"));
    await completeProductionOrderRecord(prisma, id, new Date(`${completionDate}T12:00:00.000Z`), user.id);
    revalidatePath("/ops");
    revalidatePath(`/ops/${id}`);
    redirectWithMessage(path, "success", "Produção concluída. O faturamento continua sendo um fato separado.");
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirectWithMessage(path, "error", error instanceof Error ? error.message : "Não foi possível concluir a produção.");
  }
}

export async function updateProductionOrderSupply(data: FormData) {
  await requireUser("OPERATION_MUTATE");
  const orderId = z.string().cuid().parse(data.get("orderId"));
  const itemId = z.string().cuid().parse(data.get("itemId"));
  const path = `/ops/${orderId}?tab=supplies`;
  try {
    await updateOrderSupplyPlan(prisma, orderId, itemId, parseMoneyInput(String(data.get("plannedQuantity") ?? "")));
    revalidatePath(`/ops/${orderId}`);
    redirectWithMessage(path, "success", "Previsão do insumo ajustada somente nesta OP.");
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirectWithMessage(path, "error", error instanceof Error ? error.message : "Não foi possível ajustar o insumo.");
  }
}

export async function registerProductionOrderSupplyConsumptionAction(data: FormData) {
  const user = await requireUser("STOCK_CONSUME");
  const orderId = z.string().cuid().parse(data.get("orderId"));
  const path = `/ops/${orderId}?tab=supplies`;
  try {
    const productionOrderSupplyIdText = String(data.get("productionOrderSupplyId") ?? "").trim();
    const consumptionDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(data.get("consumptionDate"));
    const result = await registerProductionOrderSupplyConsumption(prisma, {
      productionOrderId: orderId,
      productionOrderSupplyId: productionOrderSupplyIdText ? z.string().cuid().parse(productionOrderSupplyIdText) : null,
      supplyId: z.string().cuid().parse(data.get("supplyId")),
      quantity: parseMoneyInput(String(data.get("quantity") ?? "")),
      consumptionDate: new Date(`${consumptionDate}T00:00:00.000Z`),
      notes: String(data.get("notes") ?? "").trim() || null,
    }, { role: user.role, userId: user.id });
    revalidatePath(`/ops/${orderId}`);
    revalidatePath("/estoque");
    const warning = result.warnings[0]?.message;
    redirectWithMessage(path, "success", warning ? `Consumo registrado. ${warning}` : "Consumo registrado e estoque atualizado.");
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirectWithMessage(path, "error", error instanceof Error ? error.message : "Não foi possível registrar o consumo.");
  }
}
