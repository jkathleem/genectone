"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { optionalText } from "@/lib/form";
import { requireUser } from "@/modules/auth/session";
import { parseMoneyInput } from "@/modules/production-orders/validation";
import { registerStockAdjustment, registerSupplyPurchase } from "./service";
import { supplyUnitOptions } from "./presentation";
import { z } from "zod";

const id = z.string().cuid();
const unit = z.enum(supplyUnitOptions);
type StockTab = "supplies" | "purchases" | "movements";

function target(tab: StockTab, kind: "success" | "error", message: string, extra?: Record<string, string>) {
  return `/estoque?${new URLSearchParams({ tab, [kind]: message, ...(extra ?? {}) })}`;
}

function dateValue(value: FormDataEntryValue | null, message: string) {
  const text = String(value ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error(message);
  return new Date(`${text}T00:00:00.000Z`);
}

function optionalDecimal(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text ? parseMoneyInput(text) : null;
}

function parseSupplyForm(data: FormData) {
  const minimumStock = optionalDecimal(data.get("minimumStock"));
  if (minimumStock && minimumStock.lt(0)) throw new Error("O estoque mínimo não pode ser negativo.");
  return {
    code: optionalText(data.get("code")),
    name: z.string().trim().min(1, "Informe o nome do insumo.").max(200).parse(data.get("name")),
    unit: unit.parse(data.get("unit")),
    minimumStock,
    notes: optionalText(data.get("notes")),
    active: data.get("active") === "on",
  };
}

export async function saveInventorySupply(data: FormData) {
  try {
    await requireUser("ADMIN");
    const values = parseSupplyForm(data);
    const recordId = String(data.get("id") ?? "");
    if (recordId) await prisma.supply.update({ where: { id: id.parse(recordId) }, data: values });
    else await prisma.supply.create({ data: { ...values, active: true } });
    revalidatePath("/estoque");
    redirect(target("supplies", "success", recordId ? "Insumo atualizado." : "Insumo cadastrado."));
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    const duplicate = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
    const detail = error instanceof z.ZodError ? error.issues[0]?.message : error instanceof Error ? error.message : "Não foi possível salvar o insumo.";
    redirect(target("supplies", "error", duplicate ? "Já existe um insumo com este código ou nome." : detail));
  }
}

export async function registerInventoryPurchase(data: FormData) {
  try {
    const user = await requireUser("STOCK_PURCHASE");
    const supplyIds = data.getAll("itemSupplyId").map(String);
    const quantities = data.getAll("itemQuantity").map(String);
    const unitPrices = data.getAll("itemUnitPrice").map(String);
    const notes = data.getAll("itemNotes").map(String);
    const items = supplyIds.map((supplyId, index) => ({
      supplyId,
      quantity: parseMoneyInput(quantities[index] ?? ""),
      unitPrice: parseMoneyInput(unitPrices[index] ?? ""),
      notes: optionalText(notes[index] ?? ""),
    })).filter((item) => item.supplyId);
    const result = await registerSupplyPurchase(prisma, {
      companyId: id.parse(data.get("companyId")),
      supplierNameSnapshot: String(data.get("supplierNameSnapshot") ?? ""),
      purchaseDate: dateValue(data.get("purchaseDate"), "Informe uma data de compra válida."),
      dueDate: data.get("dueDate") ? dateValue(data.get("dueDate"), "Informe um vencimento válido.") : null,
      documentNumber: optionalText(data.get("documentNumber")),
      notes: optionalText(data.get("notes")),
      financialClassificationId: id.parse(data.get("financialClassificationId")),
      items,
    }, { role: user.role, userId: user.id });
    revalidatePath("/estoque");
    revalidatePath("/financeiro/contas-a-pagar");
    redirect(target("purchases", "success", "Compra registrada com sucesso. Estoque atualizado e conta a pagar criada.", { payableId: result.accountPayable.id }));
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    const detail = error instanceof z.ZodError ? error.issues[0]?.message : error instanceof Error ? error.message : "Não foi possível registrar a compra.";
    redirect(target("purchases", "error", detail));
  }
}

export async function registerInventoryAdjustment(data: FormData) {
  try {
    const user = await requireUser("STOCK_ADJUST");
    const result = await registerStockAdjustment(prisma, {
      supplyId: id.parse(data.get("supplyId")),
      direction: z.enum(["IN", "OUT"]).parse(data.get("direction")),
      quantity: parseMoneyInput(String(data.get("quantity") ?? "")),
      movementDate: dateValue(data.get("movementDate"), "Informe uma data de ajuste válida."),
      reason: String(data.get("reason") ?? ""),
      notes: optionalText(data.get("notes")),
    }, { role: user.role, userId: user.id });
    revalidatePath("/estoque");
    const warning = result.warnings[0]?.message;
    redirect(target("movements", "success", warning ? `Ajuste registrado. ${warning}` : "Ajuste registrado."));
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    const detail = error instanceof z.ZodError ? error.issues[0]?.message : error instanceof Error ? error.message : "Não foi possível registrar o ajuste.";
    redirect(target("movements", "error", detail));
  }
}
