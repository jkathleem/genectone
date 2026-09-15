import { z } from "zod";

export const outsourcedServiceSchema = z.object({
  serviceId: z.string().cuid("Selecione o serviço."),
  contractorId: z.string().cuid("Selecione o terceirizado."),
  plannedQuantity: z.coerce.number().int("A quantidade prevista deve ser inteira.").positive("A quantidade prevista deve ser maior que zero."),
  notes: z.string().trim().max(2000, "Observações muito longas.").transform((value) => value || null),
});
