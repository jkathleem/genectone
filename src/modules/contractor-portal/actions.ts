"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/modules/auth/session";
import { createOperationalIssue } from "@/modules/operational-issues/service";

const issueSchema = z.object({
  outsourcedServiceId: z.string().min(1),
  type: z.enum(["MISSING_THREAD", "MISSING_TRIM", "MISSING_COMPONENT", "QUANTITY_ISSUE", "EXECUTION_QUESTION", "OTHER"]),
  description: z.string().trim().min(1, "Informe a descrição da pendência."),
});

export async function createContractorIssue(formData: FormData) {
  const user = await requireUser();
  const parsed = issueSchema.safeParse({
    outsourcedServiceId: formData.get("outsourcedServiceId"),
    type: formData.get("type"),
    description: formData.get("description"),
  });
  const serviceId = String(formData.get("outsourcedServiceId") ?? "");
  if (user.role !== "CONTRACTOR" || !user.contractorId) redirect(`/portal/ops/${serviceId}?error=${encodeURIComponent("Acesso restrito ao terceirizado.")}`);
  if (!parsed.success) redirect(`/portal/ops/${serviceId}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Dados inválidos.")}`);
  try {
    const service = await prisma.outsourcedService.findFirst({
      where: { id: parsed.data.outsourcedServiceId, contractorId: user.contractorId },
      select: { id: true, productionOrderId: true, contractorId: true },
    });
    if (!service) throw new Error("Serviço não encontrado para o seu portal.");
    await createOperationalIssue(prisma, {
      productionOrderId: service.productionOrderId,
      outsourcedServiceId: service.id,
      contractorId: service.contractorId,
      createdByUserId: user.id,
      type: parsed.data.type,
      description: parsed.data.description,
    });
  } catch (error) {
    redirect(`/portal/ops/${serviceId}?error=${encodeURIComponent(error instanceof Error ? error.message : "Não foi possível registrar a pendência.")}`);
  }
  revalidatePath("/portal");
  revalidatePath(`/portal/ops/${serviceId}`);
  revalidatePath("/");
  redirect(`/portal/ops/${serviceId}?success=${encodeURIComponent("Pendência registrada para acompanhamento da Genect.")}`);
}
