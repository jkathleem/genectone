import { z } from "zod";

const itemSchema = z.object({
  outsourcedServiceId: z.string().cuid("Item de serviço inválido."),
  quantity: z.number().int("A quantidade deve ser inteira.").positive("A quantidade deve ser maior que zero."),
});

export const deliveryNoteSchema = z.object({
  contractorId: z.string().cuid("Selecione um terceirizado."),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe a data de saída."),
  responsibleName: z.string().trim().min(1, "Informe o responsável pela saída.").max(200),
  notes: z.string().trim().max(2000).transform((value) => value || null),
  items: z.array(itemSchema).min(1, "Selecione pelo menos um item.").superRefine((items, context) => {
    if (new Set(items.map((item) => item.outsourcedServiceId)).size !== items.length) {
      context.addIssue({ code: "custom", message: "Um serviço não pode aparecer duas vezes no mesmo Romaneio." });
    }
  }),
});
