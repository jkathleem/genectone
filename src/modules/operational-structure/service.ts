import type { PrismaClient } from "@/generated/prisma";

type DB = Pick<PrismaClient, "internalSector" | "serviceInternalSector" | "serviceContractor">;

function required(value: string, message: string) {
  const normalized = value.trim();
  if (!normalized) throw new Error(message);
  return normalized;
}

export function createInternalSector(db: DB, input: { name: string; displayOrder: number; notes?: string | null }) {
  if (!Number.isInteger(input.displayOrder) || input.displayOrder < 0) throw new Error("A ordem de exibição deve ser um inteiro não negativo.");
  return db.internalSector.create({ data: { name: required(input.name, "Informe o nome do setor."), displayOrder: input.displayOrder, notes: input.notes?.trim() || null } });
}

export function updateInternalSector(db: DB, id: string, input: { name: string; displayOrder: number; notes?: string | null }) {
  if (!Number.isInteger(input.displayOrder) || input.displayOrder < 0) throw new Error("A ordem de exibição deve ser um inteiro não negativo.");
  return db.internalSector.update({ where: { id }, data: { name: required(input.name, "Informe o nome do setor."), displayOrder: input.displayOrder, notes: input.notes?.trim() || null } });
}

export function setInternalSectorActive(db: DB, id: string, active: boolean) {
  return db.internalSector.update({ where: { id }, data: { active } });
}

export function enableInternalSectorForService(db: DB, serviceId: string, internalSectorId: string) {
  return db.serviceInternalSector.upsert({ where: { serviceId_internalSectorId: { serviceId, internalSectorId } }, update: {}, create: { serviceId, internalSectorId } });
}

export function enableContractorForService(db: DB, serviceId: string, contractorId: string) {
  return db.serviceContractor.upsert({ where: { serviceId_contractorId: { serviceId, contractorId } }, update: {}, create: { serviceId, contractorId } });
}
