"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/modules/auth/session";
import { createDeliveryNoteRecord } from "@/modules/delivery-notes/service";
import { createOperationalIssue, changeOperationalIssueStatus } from "@/modules/operational-issues/service";
import { registerOutsourcingReturn, setApprovedQuantity } from "@/modules/outsourcing/return-service";
import { saveOutsourcedServiceAssignment } from "@/modules/outsourcing/service";
import { outsourcedServiceSchema } from "@/modules/outsourcing/validation";

const id = z.string().cuid();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const positiveInt = z.coerce.number().int().positive();
function orderPath(orderId: string, tab: string, kind: "success" | "error", message: string) {
  return `/ops/${orderId}?tab=${tab}&${kind}=${encodeURIComponent(message)}`;
}
function refresh(orderId: string) { revalidatePath("/ops"); revalidatePath(`/ops/${orderId}`); revalidatePath("/romaneios"); revalidatePath("/terceirizacao"); }

export async function addExternalServiceFromOrder(data: FormData) {
  const user = await requireUser("OPERATION_MUTATE");
  const orderId = id.parse(data.get("orderId"));
  try {
    const input = outsourcedServiceSchema.parse({ serviceId: String(data.get("serviceId") ?? ""), contractorId: String(data.get("contractorId") ?? ""), plannedQuantity: String(data.get("plannedQuantity") ?? ""), expectedReturnDate: String(data.get("expectedReturnDate") ?? ""), notes: String(data.get("notes") ?? "") });
    await saveOutsourcedServiceAssignment(prisma, orderId, null, input, user.id);
    refresh(orderId); redirect(orderPath(orderId, "services", "success", "Serviço terceirizado adicionado."));
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect(orderPath(orderId, "services", "error", error instanceof Error ? error.message : "Não foi possível adicionar o serviço."));
  }
}

export async function addInternalServiceFromOrder(data: FormData) {
  const user = await requireUser("OPERATION_MUTATE");
  const orderId = id.parse(data.get("orderId"));
  try {
    const serviceId = id.parse(data.get("serviceId"));
    const internalSectorId = id.parse(data.get("internalSectorId"));
    const plannedQuantity = positiveInt.parse(data.get("plannedQuantity"));
    await prisma.$transaction(async (tx) => {
      const [order, capability] = await Promise.all([
        tx.productionOrder.findUnique({ where: { id: orderId }, select: { completedAt: true } }),
        tx.serviceInternalSector.findUnique({ where: { serviceId_internalSectorId: { serviceId, internalSectorId } }, include: { service: true, internalSector: true } }),
      ]);
      if (!order) throw new Error("OP não encontrada.");
      if (order.completedAt) throw new Error("Não é possível adicionar serviço a uma OP concluída.");
      if (!capability?.service.active || !capability.internalSector.active) throw new Error("O Setor não está habilitado para este Serviço.");
      await tx.internalProductionService.create({ data: { productionOrderId: orderId, serviceId, internalSectorId, plannedQuantity, notes: String(data.get("notes") ?? "").trim() || null, createdByUserId: user.id } });
    });
    refresh(orderId); redirect(orderPath(orderId, "services", "success", "Serviço interno adicionado."));
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect(orderPath(orderId, "services", "error", error instanceof Error ? error.message : "Não foi possível adicionar o serviço interno."));
  }
}

export async function completeInternalService(data: FormData) {
  const user = await requireUser("OPERATION_MUTATE");
  const orderId = id.parse(data.get("orderId"));
  const serviceId = id.parse(data.get("internalServiceId"));
  try {
    const result = await prisma.internalProductionService.updateMany({ where: { id: serviceId, productionOrderId: orderId, completedAt: null, productionOrder: { completedAt: null } }, data: { completedAt: new Date(), completedByUserId: user.id } });
    if (!result.count) throw new Error("Serviço interno não encontrado, já concluído ou OP encerrada.");
    refresh(orderId); redirect(orderPath(orderId, "services", "success", "Serviço interno concluído."));
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect(orderPath(orderId, "services", "error", error instanceof Error ? error.message : "Não foi possível concluir o serviço."));
  }
}

export async function sendOutsourcedServiceFromOrder(data: FormData) {
  await requireUser("OPERATION_MUTATE");
  const orderId = id.parse(data.get("orderId"));
  try {
    const outsourcedServiceId = id.parse(data.get("outsourcedServiceId"));
    const service = await prisma.outsourcedService.findFirst({ where: { id: outsourcedServiceId, productionOrderId: orderId }, select: { contractorId: true } });
    if (!service) throw new Error("Serviço terceirizado não pertence a esta OP.");
    const note = await createDeliveryNoteRecord(prisma, { contractorId: service.contractorId, departureDate: new Date(`${date.parse(data.get("departureDate"))}T00:00:00.000Z`), notes: String(data.get("notes") ?? ""), items: [{ outsourcedServiceId, quantity: positiveInt.parse(data.get("quantity")) }] });
    refresh(orderId); redirect(orderPath(orderId, "services", "success", `Envio registrado no Romaneio ${note.number}.`));
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect(orderPath(orderId, "services", "error", error instanceof Error ? error.message : "Não foi possível registrar o envio."));
  }
}

export async function receiveOutsourcedServiceFromOrder(data: FormData) {
  await requireUser("OPERATION_MUTATE");
  const orderId = id.parse(data.get("orderId"));
  try {
    const outsourcedServiceId = id.parse(data.get("outsourcedServiceId"));
    const belongs = await prisma.outsourcedService.count({ where: { id: outsourcedServiceId, productionOrderId: orderId } });
    if (!belongs) throw new Error("Serviço terceirizado não pertence a esta OP.");
    await registerOutsourcingReturn(prisma, outsourcedServiceId, { quantity: positiveInt.parse(data.get("quantity")), returnDate: new Date(`${date.parse(data.get("returnDate"))}T00:00:00.000Z`), notes: String(data.get("notes") ?? ""), approve: data.get("approve") === "on" });
    refresh(orderId); redirect(orderPath(orderId, "services", "success", data.get("approve") === "on" ? "Recebimento e aprovação registrados como fatos distintos na mesma transação." : "Recebimento registrado."));
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect(orderPath(orderId, "services", "error", error instanceof Error ? error.message : "Não foi possível registrar o recebimento."));
  }
}

export async function approveOutsourcedServiceFromOrder(data: FormData) {
  await requireUser("OPERATION_MUTATE");
  const orderId = id.parse(data.get("orderId"));
  try {
    const outsourcedServiceId = id.parse(data.get("outsourcedServiceId"));
    const belongs = await prisma.outsourcedService.count({ where: { id: outsourcedServiceId, productionOrderId: orderId } });
    if (!belongs) throw new Error("Serviço terceirizado não pertence a esta OP.");
    await setApprovedQuantity(prisma, outsourcedServiceId, z.coerce.number().int().nonnegative().parse(data.get("approvedQuantity")));
    refresh(orderId); redirect(orderPath(orderId, "services", "success", "Quantidade aprovada atualizada."));
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect(orderPath(orderId, "services", "error", error instanceof Error ? error.message : "Não foi possível aprovar."));
  }
}

export async function createIssueFromOrder(data: FormData) {
  const user = await requireUser("OPERATION_MUTATE");
  const orderId = id.parse(data.get("orderId"));
  try {
    const outsourcedServiceId = id.parse(data.get("outsourcedServiceId"));
    const service = await prisma.outsourcedService.findFirst({ where: { id: outsourcedServiceId, productionOrderId: orderId }, select: { contractorId: true } });
    if (!service) throw new Error("Serviço terceirizado não pertence a esta OP.");
    const type = z.enum(["MISSING_THREAD", "MISSING_TRIM", "MISSING_COMPONENT", "QUANTITY_ISSUE", "EXECUTION_QUESTION", "OTHER"]).parse(data.get("type"));
    await createOperationalIssue(prisma, { productionOrderId: orderId, outsourcedServiceId, contractorId: service.contractorId, createdByUserId: user.id, type, description: String(data.get("description") ?? "") });
    refresh(orderId); redirect(orderPath(orderId, "services", "success", "Pendência operacional registrada."));
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect(orderPath(orderId, "services", "error", error instanceof Error ? error.message : "Não foi possível registrar a pendência."));
  }
}

export async function changeIssueFromOrder(data: FormData) {
  const user = await requireUser("OPERATION_MUTATE");
  const orderId = id.parse(data.get("orderId"));
  try {
    const issueId = id.parse(data.get("issueId"));
    const issue = await prisma.operationalIssue.findFirst({ where: { id: issueId, productionOrderId: orderId }, select: { id: true } });
    if (!issue) throw new Error("Pendência não pertence a esta OP.");
    const status = z.enum(["IN_PROGRESS", "RESOLVED"]).parse(data.get("status"));
    await changeOperationalIssueStatus(prisma, issueId, status, user.id);
    refresh(orderId); redirect(orderPath(orderId, "services", "success", status === "RESOLVED" ? "Pendência resolvida." : "Pendência em tratamento."));
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    redirect(orderPath(orderId, "services", "error", error instanceof Error ? error.message : "Não foi possível tratar a pendência."));
  }
}
