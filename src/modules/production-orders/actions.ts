"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { redirectWithMessage } from "@/lib/form";
import { productionOrderSchema } from "./validation";
import { requireUser } from "@/modules/auth/session";

function formValues(data: FormData) { return Object.fromEntries(["number", "entryDate", "companyId", "customerId", "productId", "quantity", "unitPrice", "notes"].map((key) => [key, String(data.get(key) ?? "")])); }
function isUniqueError(error: unknown): error is { code: string } { return typeof error === "object" && error !== null && "code" in error && error.code === "P2002"; }
async function validateRelations(ids: { companyId: string; customerId: string; productId: string }, current?: typeof ids) {
  const [company, customer, product] = await Promise.all([
    prisma.company.findFirst({ where: { id: ids.companyId, OR: [{ active: true }, ...(current?.companyId === ids.companyId ? [{ id: current.companyId }] : [])] } }),
    prisma.customer.findFirst({ where: { id: ids.customerId, OR: [{ active: true }, ...(current?.customerId === ids.customerId ? [{ id: current.customerId }] : [])] } }),
    prisma.product.findFirst({ where: { id: ids.productId, OR: [{ active: true }, ...(current?.productId === ids.productId ? [{ id: current.productId }] : [])] } }),
  ]);
  if (!company || !customer || !product) throw new Error("Selecione somente empresa, cliente e produto disponíveis.");
}
function dataForPrisma(input: z.infer<typeof productionOrderSchema>) { return { ...input, entryDate: new Date(`${input.entryDate}T00:00:00.000Z`) }; }

export async function createProductionOrder(data: FormData) {
  await requireUser("OPERATION_MUTATE");
  const path = "/ops/nova";
  try { const input = productionOrderSchema.parse(formValues(data)); await validateRelations(input); const order = await prisma.productionOrder.create({ data: dataForPrisma(input) }); revalidatePath("/"); revalidatePath("/ops"); redirect(`/ops/${order.id}?success=${encodeURIComponent("OP cadastrada com sucesso.")}`); }
  catch (error) { if (isUniqueError(error)) redirectWithMessage(path, "error", "Já existe uma OP com esse número para a empresa selecionada."); if (error instanceof z.ZodError) redirectWithMessage(path, "error", error.issues[0]?.message ?? "Dados inválidos."); if (error && typeof error === "object" && "digest" in error) throw error; redirectWithMessage(path, "error", error instanceof Error ? error.message : "Não foi possível cadastrar a OP."); }
}
export async function updateProductionOrder(data: FormData) {
  await requireUser("OPERATION_MUTATE");
  const id = z.string().cuid().parse(data.get("id")); const path = `/ops/${id}`;
  try { const existing = await prisma.productionOrder.findUniqueOrThrow({ where: { id } }); const input = productionOrderSchema.parse(formValues(data)); await validateRelations(input, existing); await prisma.productionOrder.update({ where: { id }, data: dataForPrisma(input) }); revalidatePath("/"); revalidatePath("/ops"); revalidatePath(path); redirectWithMessage(path, "success", "OP atualizada com sucesso."); }
  catch (error) { if (isUniqueError(error)) redirectWithMessage(path, "error", "Já existe uma OP com esse número para a empresa selecionada."); if (error instanceof z.ZodError) redirectWithMessage(path, "error", error.issues[0]?.message ?? "Dados inválidos."); if (error && typeof error === "object" && "digest" in error) throw error; redirectWithMessage(path, "error", error instanceof Error ? error.message : "Não foi possível atualizar a OP."); }
}
