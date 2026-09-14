"use server";
import { revalidatePath } from "next/cache";
import { redirectWithMessage } from "@/lib/form";
import { prisma } from "@/lib/prisma";
import { outsourcedServiceSchema } from "./validation";
import { canChangeAssignment } from "./domain";
import { z } from "zod";
import { requireUser } from "@/modules/auth/session";

function values(data: FormData) { return { serviceId: String(data.get("serviceId") ?? ""), contractorId: String(data.get("contractorId") ?? ""), plannedQuantity: String(data.get("plannedQuantity") ?? ""), appliedUnitPrice: String(data.get("appliedUnitPrice") ?? ""), notes: String(data.get("notes") ?? "") }; }
export async function saveOutsourcedService(data: FormData) {
  await requireUser("OPERATION_MUTATE");
  const orderId = String(data.get("orderId")); const id = String(data.get("id") ?? ""); const path = `/ops/${orderId}`;
  try {
    const input = outsourcedServiceSchema.parse(values(data));
    const [order, service, contractor, existing] = await Promise.all([prisma.productionOrder.findUnique({ where: { id: orderId } }), prisma.service.findUnique({ where: { id: input.serviceId } }), prisma.contractor.findUnique({ where: { id: input.contractorId } }), id ? prisma.outsourcedService.findUnique({ where: { id }, include: { deliveryNoteItems: { take: 1 } } }) : null]);
    if (!order || !service || !contractor) throw new Error("Selecione serviço e terceirizado disponíveis.");
    if (existing && existing.productionOrderId !== orderId) throw new Error("Lançamento inválido.");
    if ((!existing || existing.serviceId !== input.serviceId) && !service.active) throw new Error("O serviço selecionado está inativo.");
    if ((!existing || existing.contractorId !== input.contractorId) && !contractor.active) throw new Error("O terceirizado selecionado está inativo.");
    if (existing && !canChangeAssignment(existing.deliveryNoteItems.length > 0, existing, input)) throw new Error("Serviço e terceirizado não podem ser alterados após a primeira saída.");
    const payload = { ...input };
    if (id) await prisma.outsourcedService.update({ where: { id }, data: payload }); else await prisma.outsourcedService.create({ data: { ...payload, productionOrderId: orderId, approvedQuantity: 0 } });
    revalidatePath(path); redirectWithMessage(path, "success", id ? "Serviço terceirizado atualizado." : "Serviço terceirizado adicionado.");
  } catch (error) { if (error && typeof error === "object" && "digest" in error) throw error; if (error instanceof z.ZodError) redirectWithMessage(path, "error", error.issues[0]?.message ?? "Dados inválidos."); redirectWithMessage(path, "error", error instanceof Error ? error.message : "Não foi possível salvar."); }
}
