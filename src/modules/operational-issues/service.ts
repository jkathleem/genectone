import type { OperationalIssueStatus, OperationalIssueType, PrismaClient } from "@/generated/prisma";

type DB = Pick<PrismaClient, "$transaction">;
type CreateIssueInput = {
  productionOrderId: string;
  outsourcedServiceId?: string | null;
  contractorId: string;
  createdByUserId: string;
  type: OperationalIssueType;
  description: string;
};

export async function createOperationalIssue(db: DB, input: CreateIssueInput) {
  const description = input.description.trim();
  if (!description) throw new Error("Informe a descrição da pendência.");
  return db.$transaction(async (tx) => {
    const order = await tx.productionOrder.findUnique({ where: { id: input.productionOrderId }, select: { id: true } });
    const contractor = await tx.contractor.findUnique({ where: { id: input.contractorId }, select: { id: true } });
    const creator = await tx.user.findUnique({ where: { id: input.createdByUserId }, select: { id: true, role: true, contractorId: true } });
    const outsourcedService = input.outsourcedServiceId
      ? await tx.outsourcedService.findUnique({ where: { id: input.outsourcedServiceId }, select: { id: true, productionOrderId: true, contractorId: true } })
      : null;
    if (!order) throw new Error("OP não encontrada.");
    if (!contractor) throw new Error("Terceirizado não encontrado.");
    if (!creator) throw new Error("Usuário responsável não encontrado.");
    if (creator.role === "CONTRACTOR" && creator.contractorId !== input.contractorId) throw new Error("O usuário terceirizado só pode registrar pendências para o próprio cadastro.");
    if (input.outsourcedServiceId && !outsourcedService) throw new Error("Serviço terceirizado não encontrado.");
    if (outsourcedService && (outsourcedService.productionOrderId !== input.productionOrderId || outsourcedService.contractorId !== input.contractorId)) {
      throw new Error("O serviço terceirizado deve pertencer à OP e ao terceirizado informados.");
    }
    return tx.operationalIssue.create({ data: { ...input, outsourcedServiceId: input.outsourcedServiceId || null, description, status: "OPEN" } });
  });
}

export async function changeOperationalIssueStatus(db: DB, id: string, status: Exclude<OperationalIssueStatus, "OPEN">, actorUserId: string) {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "OperationalIssue" WHERE "id" = ${id} FOR UPDATE`;
    const issue = await tx.operationalIssue.findUnique({ where: { id } });
    if (!issue) throw new Error("Pendência operacional não encontrada.");
    if (issue.status === "RESOLVED") throw new Error("Pendência resolvida permanece no histórico e não pode ser reaberta nesta etapa.");
    if (status === "IN_PROGRESS") return tx.operationalIssue.update({ where: { id }, data: { status, resolvedAt: null, resolvedByUserId: null } });
    return tx.operationalIssue.update({ where: { id }, data: { status, resolvedAt: new Date(), resolvedByUserId: actorUserId } });
  });
}
