"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { approveSettlementById } from "./approval";
import { eligibleQuantity, sameContractor, validSettlementQuantity } from "./domain";
import { addDraftItem, removeDraftItem, updateDraft, updateDraftItem } from "./mutations";
import { requireUser } from "@/modules/auth/session";

const settlementPath = (id: string) => `/terceirizacao/fechamentos/${id}`;
const text = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();

export async function createSettlement(formData: FormData) {
  await requireUser("OPERATION_MUTATE");
  const contractorId = text(formData, "contractorId");
  const companyId = text(formData, "companyId");
  const periodMonth = Number(formData.get("periodMonth"));
  const periodYear = Number(formData.get("periodYear"));
  const notes = text(formData, "notes") || null;
  const requested = [...formData.entries()].filter(([key]) => key.startsWith("q:")).map(([key, value]) => ({ id: key.slice(2), quantity: Number(value) })).filter((item) => item.quantity > 0);
  if (!contractorId || !companyId || periodMonth < 1 || periodMonth > 12 || !Number.isInteger(periodYear)) throw new Error("Dados inválidos para criar o fechamento.");

  const settlement = await prisma.$transaction(async (tx) => {
    const contractor = await tx.contractor.findUnique({ where: { id: contractorId } });
    if (!contractor) throw new Error("Terceirizado não encontrado.");
    const services = await tx.outsourcedService.findMany({ where: { id: { in: requested.map((item) => item.id) } }, include: { settlementItems: { include: { settlement: true } } } });
    if (services.length !== requested.length || !sameContractor(services, contractorId)) throw new Error("Itens inválidos para o terceirizado.");
    for (const request of requested) {
      const service = services.find((item) => item.id === request.id)!;
      const used = service.settlementItems.filter((item) => item.settlement.status === "APPROVED").reduce((sum, item) => sum + item.approvedQuantityIncluded, 0);
      if (!validSettlementQuantity(request.quantity, eligibleQuantity(service.approvedQuantity, used))) throw new Error("Quantidade superior ao saldo elegível.");
    }
    return tx.contractorSettlement.create({ data: { contractorId, companyId, periodMonth, periodYear, notes, items: { create: requested.map((request) => { const service = services.find((item) => item.id === request.id)!; return { outsourcedServiceId: request.id, approvedQuantityIncluded: request.quantity, appliedUnitPriceSnapshot: service.appliedUnitPrice }; }) } } });
  });
  redirect(settlementPath(settlement.id));
}

export async function saveDraft(formData: FormData) {
  await requireUser("OPERATION_MUTATE");
  const id = text(formData, "id");
  const current = await prisma.contractorSettlement.findUniqueOrThrow({ where: { id }, select: { companyId: true } });
  await updateDraft(prisma, id, { contractorId: text(formData, "contractorId"), companyId: text(formData, "companyId") || current.companyId, periodMonth: Number(formData.get("periodMonth")), periodYear: Number(formData.get("periodYear")), notes: text(formData, "notes") || null });
  revalidatePath(settlementPath(id));
}

export async function addItem(formData: FormData) { await requireUser("OPERATION_MUTATE"); const id = text(formData, "id"); await addDraftItem(prisma, id, text(formData, "outsourcedServiceId"), Number(formData.get("quantity"))); revalidatePath(settlementPath(id)); }
export async function saveItemQuantity(formData: FormData) { await requireUser("OPERATION_MUTATE"); const id = text(formData, "settlementId"); await updateDraftItem(prisma, text(formData, "itemId"), Number(formData.get("quantity"))); revalidatePath(settlementPath(id)); }
export async function removeItem(formData: FormData) { await requireUser("OPERATION_MUTATE"); const id = text(formData, "settlementId"); await removeDraftItem(prisma, text(formData, "itemId")); revalidatePath(settlementPath(id)); }
export async function approveSettlement(formData: FormData) { await requireUser("OPERATION_MUTATE"); const id = text(formData, "id"); await approveSettlementById(prisma, id); revalidatePath(settlementPath(id)); revalidatePath("/terceirizacao/fechamentos"); }
