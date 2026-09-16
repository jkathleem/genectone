import { Prisma } from "@/generated/prisma";
import { z } from "zod";

export function parseMoneyInput(value: string) {
  const normalized = value.trim().replace(/\s/g, "").replace(/^R\$/, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,4})?$/.test(normalized)) throw new Error("Informe um valor válido com até quatro casas decimais.");
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
  isUrgent: z.union([z.literal("on"), z.literal("")]).transform((value) => value === "on"),
  expectedCompletionDate: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]).transform((value) => value || null),
  notes: z.string().trim().max(2000, "Observações muito longas.").optional().transform((value) => value || null),
});

export const productionOrderOperationalUpdateSchema = z.object({
  isUrgent: z.union([z.literal("on"), z.literal("")]).transform((value) => value === "on"),
  expectedCompletionDate: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma previsão válida.")]).transform((value) => value || null),
  notes: z.string().trim().max(2000, "Observações muito longas.").optional().transform((value) => value || null),
});

export type ProductionOrderInput = z.infer<typeof productionOrderSchema>;
