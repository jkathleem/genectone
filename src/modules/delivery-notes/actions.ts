"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { redirectWithMessage } from "@/lib/form";
import { allItemsBelongToContractor, availableToSend, validateRequestedQuantity } from "./domain";
import { nextDeliveryNoteNumber } from "./numbering";
import { deliveryNoteSchema } from "./validation";

export async function createDeliveryNote(data: FormData) {
  const path = "/romaneios/novo";
  try {
    const input = deliveryNoteSchema.parse({
      contractorId: String(data.get("contractorId") ?? ""),
      departureDate: String(data.get("departureDate") ?? ""),
      responsibleName: String(data.get("responsibleName") ?? ""),
      notes: String(data.get("notes") ?? ""),
      items: JSON.parse(String(data.get("items") ?? "[]")),
    });

    const note = await prisma.$transaction(async (tx) => {
      const contractor = await tx.contractor.findFirst({ where: { id: input.contractorId, active: true } });
      if (!contractor) throw new Error("O terceirizado selecionado não está disponível.");

      const ids = input.items.map((item) => item.outsourcedServiceId);
      await tx.$queryRaw`SELECT "id" FROM "OutsourcedService" WHERE "id" IN (${Prisma.join(ids)}) FOR UPDATE`;
      const services = await tx.outsourcedService.findMany({
        where: { id: { in: ids } },
        include: { deliveryNoteItems: { select: { quantity: true } } },
      });
      if (services.length !== ids.length) throw new Error("Um ou mais serviços selecionados não existem.");
      if (!allItemsBelongToContractor(services, input.contractorId)) throw new Error("Todos os itens devem pertencer ao mesmo terceirizado do Romaneio.");

      const byId = new Map(services.map((service) => [service.id, service]));
      for (const item of input.items) {
        const service = byId.get(item.outsourcedServiceId);
        if (!service?.plannedQuantity) throw new Error("O serviço selecionado não possui quantidade prevista.");
        const sent = service.deliveryNoteItems.reduce((sum, existing) => sum + existing.quantity, 0);
        if (!validateRequestedQuantity(item.quantity, availableToSend(service.plannedQuantity, sent))) {
          throw new Error("A quantidade enviada deve ser inteira, maior que zero e não pode ultrapassar o saldo disponível.");
        }
      }

      const number = await nextDeliveryNoteNumber(tx);
      return tx.deliveryNote.create({
        data: {
          number,
          contractorId: input.contractorId,
          departureDate: new Date(`${input.departureDate}T00:00:00.000Z`),
          responsibleName: input.responsibleName,
          notes: input.notes,
          items: { create: input.items.map((item) => ({ outsourcedServiceId: item.outsourcedServiceId, quantity: item.quantity })) },
        },
      });
    });

    revalidatePath("/");
    revalidatePath("/romaneios");
    revalidatePath("/terceirizacao");
    redirect(`/romaneios/${note.id}?success=${encodeURIComponent("Romaneio emitido com sucesso.")}`);
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    if (error instanceof z.ZodError) redirectWithMessage(path, "error", error.issues[0]?.message ?? "Dados inválidos.");
    if (error instanceof SyntaxError) redirectWithMessage(path, "error", "Itens do Romaneio inválidos.");
    redirectWithMessage(path, "error", error instanceof Error ? error.message : "Não foi possível emitir o Romaneio.");
  }
}
