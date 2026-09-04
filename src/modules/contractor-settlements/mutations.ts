import { PrismaClient } from "@/generated/prisma";
import { assertDraft } from "./approval";
import { eligibleQuantity, settledQuantity, validSettlementQuantity } from "./domain";

type Database = Pick<PrismaClient, "$transaction">;
function positive(quantity: number) { if (!Number.isInteger(quantity) || quantity <= 0) throw new Error("A quantidade informada deve ser maior que zero."); }

export async function updateDraft(db: Database, id: string, data: { periodMonth: number; periodYear: number; notes: string | null; contractorId: string }) {
  return db.$transaction(async (tx) => {
    const settlement = await tx.contractorSettlement.findUnique({ where: { id }, include: { _count: { select: { items: true } } } });
    if (!settlement) throw new Error("Fechamento não encontrado.");
    assertDraft(settlement.status);
    if (data.periodMonth < 1 || data.periodMonth > 12 || !Number.isInteger(data.periodYear)) throw new Error("Competência inválida.");
    if (settlement.contractorId !== data.contractorId && settlement._count.items) throw new Error("Remova os itens antes de alterar o terceirizado.");
    const contractor = await tx.contractor.findUnique({ where: { id: data.contractorId } });
    if (!contractor) throw new Error("Terceirizado não encontrado.");
    return tx.contractorSettlement.update({ where: { id }, data });
  });
}

export async function addDraftItem(db: Database, settlementId: string, outsourcedServiceId: string, quantity: number) {
  positive(quantity);
  return db.$transaction(async (tx) => {
    const settlement = await tx.contractorSettlement.findUnique({ where: { id: settlementId } });
    if (!settlement) throw new Error("Fechamento não encontrado.");
    assertDraft(settlement.status);
    const service = await tx.outsourcedService.findUnique({ where: { id: outsourcedServiceId }, include: { settlementItems: { include: { settlement: true } } } });
    if (!service) throw new Error("Serviço terceirizado não encontrado.");
    if (service.contractorId !== settlement.contractorId) throw new Error("O serviço selecionado pertence a outro terceirizado.");
    if (await tx.contractorSettlementItem.findUnique({ where: { settlementId_outsourcedServiceId: { settlementId, outsourcedServiceId } } })) throw new Error("Este serviço já está no fechamento.");
    const eligible = eligibleQuantity(service.approvedQuantity, settledQuantity(service.settlementItems));
    if (!validSettlementQuantity(quantity, eligible)) throw new Error("A quantidade informada ultrapassa o saldo elegível.");
    return tx.contractorSettlementItem.create({ data: { settlementId, outsourcedServiceId, approvedQuantityIncluded: quantity, appliedUnitPriceSnapshot: service.appliedUnitPrice } });
  });
}

export async function updateDraftItem(db: Database, id: string, quantity: number) {
  positive(quantity);
  return db.$transaction(async (tx) => {
    const item = await tx.contractorSettlementItem.findUnique({ where: { id }, include: { settlement: true, outsourcedService: { include: { settlementItems: { include: { settlement: true } } } } } });
    if (!item) throw new Error("Item não encontrado.");
    assertDraft(item.settlement.status);
    const eligible = eligibleQuantity(item.outsourcedService.approvedQuantity, settledQuantity(item.outsourcedService.settlementItems));
    if (!validSettlementQuantity(quantity, eligible)) throw new Error("A quantidade informada ultrapassa o saldo elegível.");
    return tx.contractorSettlementItem.update({ where: { id }, data: { approvedQuantityIncluded: quantity } });
  });
}

export async function removeDraftItem(db: Database, id: string) {
  return db.$transaction(async (tx) => {
    const item = await tx.contractorSettlementItem.findUnique({ where: { id }, include: { settlement: true } });
    if (!item) throw new Error("Item não encontrado.");
    assertDraft(item.settlement.status);
    return tx.contractorSettlementItem.delete({ where: { id } });
  });
}
