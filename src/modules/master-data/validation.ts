import { z } from "zod";
import { parseMoneyInput } from "@/modules/production-orders/validation";

const optional = (maximum = 200) => z.string().trim().max(maximum).transform((value) => value || null);
const name = z.string().trim().min(1, "Informe o nome.").max(200, "Nome muito longo.");
const email = z.string().trim().max(200).transform((value, context) => {
  if (!value) return null;
  if (!z.email().safeParse(value).success) {
    context.addIssue({ code: "custom", message: "Informe um e-mail válido." });
    return z.NEVER;
  }
  return value.toLowerCase();
});
const state = z.string().trim().max(2, "UF deve possuir até duas letras.").transform((value) => value ? value.toUpperCase() : null);

const contactAddress = {
  stateRegistration: optional(), phone: optional(50), whatsapp: optional(50), email,
  postalCode: optional(20), address: optional(), addressNumber: optional(30),
  addressComplement: optional(), neighborhood: optional(), city: optional(), state,
};

export const companySchema = z.object({ name, tradeName: optional(), document: optional(30), ...contactAddress });
export const customerSchema = z.object({ name, personType: z.enum(["PF", "PJ"]), tradeName: optional(), document: optional(30), ...contactAddress });
export const contractorSchema = z.object({ name, document: optional(30), phone: optional(50), whatsapp: optional(50), email, postalCode: optional(20), address: optional(), addressNumber: optional(30), addressComplement: optional(), neighborhood: optional(), city: optional(), state, pixKey: optional(), notes: optional(2000) });
export const productSchema = z.object({
  name, reference: optional(100), customerId: z.string().cuid().or(z.literal("")).transform((value) => value || null), color: optional(100),
  currentUnitPrice: z.string().trim().transform((value, context) => {
    if (!value) return null;
    try { return parseMoneyInput(value); } catch (error) { context.addIssue({ code: "custom", message: error instanceof Error ? error.message : "Preço inválido." }); return z.NEVER; }
  }).refine((value) => value === null || value.gte(0), "O preço não pode ser negativo."),
  imageUrl: z.string().trim().max(2000).transform((value, context) => {
    if (!value) return null;
    if (!z.url().safeParse(value).success) { context.addIssue({ code: "custom", message: "Informe uma URL válida." }); return z.NEVER; }
    return value;
  }),
});

export function formValues(data: FormData, fields: readonly string[]) {
  return Object.fromEntries(fields.map((field) => [field, String(data.get(field) ?? "")]));
}
