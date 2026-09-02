import { Prisma } from "@/generated/prisma";
import { z } from "zod";

export function parseMoneyInput(value: string) {
  const normalized = value.trim().replace(/\s/g, "").replace(/^R\$/, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,4})?$/.test(normalized)) throw new Error("Informe um preço válido com até quatro casas decimais.");
  return new Prisma.Decimal(normalized);
}

export function calculateOrderTotal(quantity: number, unitPrice: Prisma.Decimal | string) {
  return new Prisma.Decimal(unitPrice).mul(quantity);
}

export const productionOrderSchema = z.object({
  number: z.string().trim().min(1, "Informe o número da OP.").max(100, "Número da OP muito longo."),
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data de entrada válida."),
  companyId: z.string().cuid("Selecione uma empresa."),
  customerId: z.string().cuid("Selecione um cliente."),
  productId: z.string().cuid("Selecione um produto."),
  quantity: z.coerce.number().int("A quantidade deve ser inteira.").positive("A quantidade deve ser maior que zero."),
  unitPrice: z.string().transform((value, context) => { try { return parseMoneyInput(value); } catch (error) { context.addIssue({ code: "custom", message: error instanceof Error ? error.message : "Preço inválido." }); return z.NEVER; } }).refine((value) => value.gte(0), "O preço não pode ser negativo."),
  notes: z.string().trim().max(2000, "Observações muito longas.").optional().transform((value) => value || null),
});

export type ProductionOrderInput = z.infer<typeof productionOrderSchema>;
