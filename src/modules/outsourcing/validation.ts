import { z } from "zod";

export const outsourcedServiceSchema = z.object({
  serviceId: z.string().cuid("Selecione o serviço."),
  contractorId: z.string().cuid("Selecione o terceirizado."),
  plannedQuantity: z.coerce.number().int("A quantidade prevista deve ser inteira.").positive("A quantidade prevista deve ser maior que zero."),
  expectedReturnDate: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe um prazo válido.")]).optional().default("").transform((value) => value ? new Date(`${value}T00:00:00.000Z`) : null),
  notes: z.string().trim().max(2000, "Observações muito longas.").transform((value) => value || null),
});
