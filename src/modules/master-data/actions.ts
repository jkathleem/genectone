"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { optionalText } from "@/lib/form";
import { requireUser } from "@/modules/auth/session";
import { createFinancialClassification, setFinancialClassificationActive, updateFinancialClassification } from "@/modules/financial-classifications/service";
import { enableContractorForService, setContractorServicePrice } from "@/modules/operational-structure/service";
import { expectedSupplyQuantity } from "@/modules/products/domain";
import { parseMoneyInput } from "@/modules/production-orders/validation";
import { categoryCode, financialGroupMapping, type BulkPriceMode } from "./domain";
import { canWriteRegistrationTab, type RegistrationTab } from "./permissions";
import { updateProductPrices } from "./service";
import { companySchema, contractorSchema, customerSchema, formValues, productSchema } from "./validation";
import { z } from "zod";

const id = z.string().cuid();
const name = z.string().trim().min(1, "Informe o nome.").max(200);
const companyFields = ["name", "tradeName", "document", "stateRegistration", "phone", "whatsapp", "email", "postalCode", "address", "addressNumber", "addressComplement", "neighborhood", "city", "state"] as const;
const customerFields = ["name", "personType", "tradeName", "document", "stateRegistration", "phone", "whatsapp", "email", "postalCode", "address", "addressNumber", "addressComplement", "neighborhood", "city", "state"] as const;
const contractorFields = ["name", "document", "phone", "whatsapp", "email", "postalCode", "address", "addressNumber", "addressComplement", "neighborhood", "city", "state", "pixKey", "notes"] as const;
const productFields = ["name", "reference", "customerId", "color", "currentUnitPrice", "imageUrl"] as const;

function target(tab: RegistrationTab, kind: "success" | "error", message: string) {
  return `/cadastros?${new URLSearchParams({ tab, [kind]: message })}`;
}

async function execute(tab: RegistrationTab, message: string, operation: () => Promise<unknown>) {
  try {
    const user = await requireUser();
    if (!canWriteRegistrationTab(user.role, tab)) throw new Error("Você não possui permissão para alterar este cadastro.");
    await operation();
    revalidatePath("/cadastros");
  } catch (error) {
    const duplicate = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
    const detail = error instanceof z.ZodError ? error.issues[0]?.message : error instanceof Error ? error.message : null;
    redirect(target(tab, "error", duplicate ? "Já existe um registro com estes dados." : detail || "Não foi possível salvar."));
  }
  redirect(target(tab, "success", message));
}

function toggle(data: FormData) {
  return { id: id.parse(data.get("id")), active: data.get("active") === "true" };
}

export async function saveCompany(data: FormData) {
  await execute("companies", data.get("id") ? "Empresa atualizada." : "Empresa cadastrada.", async () => {
    const values = companySchema.parse(formValues(data, companyFields));
    const recordId = String(data.get("id") ?? "");
    return recordId ? prisma.company.update({ where: { id: id.parse(recordId) }, data: values }) : prisma.company.create({ data: values });
  });
}
export async function toggleCompany(data: FormData) { const value = toggle(data); await execute("companies", "Situação da empresa atualizada.", () => prisma.company.update({ where: { id: value.id }, data: { active: value.active } })); }

export async function saveCustomer(data: FormData) {
  await execute("customers", data.get("id") ? "Cliente atualizado." : "Cliente cadastrado.", async () => {
    const values = customerSchema.parse(formValues(data, customerFields));
    const recordId = String(data.get("id") ?? "");
    return recordId ? prisma.customer.update({ where: { id: id.parse(recordId) }, data: values }) : prisma.customer.create({ data: values });
  });
}
export async function toggleCustomer(data: FormData) { const value = toggle(data); await execute("customers", "Situação do cliente atualizada.", () => prisma.customer.update({ where: { id: value.id }, data: { active: value.active } })); }

export async function saveContractor(data: FormData) {
  await execute("contractors", data.get("id") ? "Terceirizado atualizado." : "Terceirizado cadastrado.", async () => {
    const values = contractorSchema.parse(formValues(data, contractorFields));
    const recordId = String(data.get("id") ?? "");
    return recordId ? prisma.contractor.update({ where: { id: id.parse(recordId) }, data: values }) : prisma.contractor.create({ data: values });
  });
}
export async function toggleContractor(data: FormData) { const value = toggle(data); await execute("contractors", "Situação do terceirizado atualizada.", () => prisma.contractor.update({ where: { id: value.id }, data: { active: value.active } })); }

export async function createService(data: FormData) {
  await execute("contractors", "Serviço cadastrado.", () => prisma.service.create({ data: { name: name.parse(data.get("name")), description: optionalText(data.get("description")) } }));
}
export async function saveContractorService(data: FormData) {
  await execute("contractors", "Serviço do terceirizado salvo.", async () => {
    const serviceId = id.parse(data.get("serviceId"));
    const contractorId = id.parse(data.get("contractorId"));
    const price = parseMoneyInput(String(data.get("unitPrice") ?? ""));
    if (!price.gt(0)) throw new Error("O preço deve ser maior que zero.");
    const [existing, service, contractor] = await Promise.all([
      prisma.serviceContractor.findUnique({ where: { serviceId_contractorId: { serviceId, contractorId } } }),
      prisma.service.findUnique({ where: { id: serviceId }, select: { active: true } }),
      prisma.contractor.findUnique({ where: { id: contractorId }, select: { active: true } }),
    ]);
    if (!service?.active || !contractor?.active) throw new Error("Selecione Serviço e Terceirizado ativos.");
    return existing
      ? prisma.serviceContractor.update({ where: { serviceId_contractorId: { serviceId, contractorId } }, data: { unitPrice: price, active: true } })
      : enableContractorForService(prisma, serviceId, contractorId, price);
  });
}
export async function updateContractorService(data: FormData) {
  await execute("contractors", "Preço atualizado.", async () => {
    const serviceId = id.parse(data.get("serviceId"));
    const contractorId = id.parse(data.get("contractorId"));
    const price = parseMoneyInput(String(data.get("unitPrice") ?? ""));
    return setContractorServicePrice(prisma, serviceId, contractorId, price);
  });
}
export async function toggleContractorService(data: FormData) {
  await execute("contractors", "Situação do vínculo atualizada.", () => prisma.serviceContractor.update({ where: { serviceId_contractorId: { serviceId: id.parse(data.get("serviceId")), contractorId: id.parse(data.get("contractorId")) } }, data: { active: data.get("active") === "true" } }));
}

export async function saveProduct(data: FormData) {
  await execute("products", data.get("id") ? "Produto atualizado." : "Produto cadastrado.", async () => {
    const values = productSchema.parse(formValues(data, productFields));
    const recordId = String(data.get("id") ?? "");
    return recordId ? prisma.product.update({ where: { id: id.parse(recordId) }, data: values }) : prisma.product.create({ data: values });
  });
}
export async function toggleProduct(data: FormData) { const value = toggle(data); await execute("products", "Situação do produto atualizada.", () => prisma.product.update({ where: { id: value.id }, data: { active: value.active } })); }

export async function saveSupply(data: FormData) {
  await execute("products", data.get("id") ? "Insumo atualizado." : "Insumo cadastrado.", async () => {
    const values = { name: name.parse(data.get("name")), unit: z.string().trim().min(1, "Informe a unidade.").max(30).parse(data.get("unit")) };
    const recordId = String(data.get("id") ?? "");
    return recordId ? prisma.supply.update({ where: { id: id.parse(recordId) }, data: values }) : prisma.supply.create({ data: values });
  });
}
export async function toggleSupply(data: FormData) { const value = toggle(data); await execute("products", "Situação do insumo atualizada.", () => prisma.supply.update({ where: { id: value.id }, data: { active: value.active } })); }

function productSupplyValues(data: FormData) {
  const quantityText = String(data.get("quantityPerBase") ?? "").trim();
  const baseText = String(data.get("baseQuantity") ?? "").trim();
  const quantityPerBase = quantityText ? parseMoneyInput(quantityText) : null;
  const baseQuantity = baseText ? z.coerce.number().int().positive().parse(baseText) : null;
  expectedSupplyQuantity(1, quantityPerBase, baseQuantity);
  return { productId: id.parse(data.get("productId")), supplyId: id.parse(data.get("supplyId")), quantityPerBase, baseQuantity, notes: optionalText(data.get("notes")) };
}
export async function saveProductSupply(data: FormData) {
  await execute("products", "Insumo do produto salvo.", async () => {
    const values = productSupplyValues(data);
    return prisma.productSupply.upsert({ where: { productId_supplyId: { productId: values.productId, supplyId: values.supplyId } }, update: { quantityPerBase: values.quantityPerBase, baseQuantity: values.baseQuantity, notes: values.notes }, create: values });
  });
}
export async function removeProductSupply(data: FormData) {
  await execute("products", "Insumo removido do produto.", () => prisma.productSupply.delete({ where: { productId_supplyId: { productId: id.parse(data.get("productId")), supplyId: id.parse(data.get("supplyId")) } } }));
}

function signedDecimal(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (!/^-?\d+(\.\d{1,4})?$/.test(normalized)) throw new Error("Informe um ajuste válido com até quatro casas decimais.");
  return new Prisma.Decimal(normalized);
}
export async function bulkUpdateProductPrices(data: FormData) {
  await execute("products", "Preços atuais atualizados.", async () => {
    const ids = [...new Set(data.getAll("productIds").map(String))].map((value) => id.parse(value));
    if (!ids.length) throw new Error("Selecione ao menos um produto.");
    const mode = z.enum(["PERCENT", "FIXED"]).parse(data.get("mode")) as BulkPriceMode;
    const adjustment = signedDecimal(String(data.get("value") ?? ""));
    await updateProductPrices(prisma, ids, mode, adjustment);
  });
}

export async function saveInternalSector(data: FormData) {
  await execute("sectors", data.get("id") ? "Setor atualizado." : "Setor cadastrado.", async () => {
    const values = { name: name.parse(data.get("name")), displayOrder: z.coerce.number().int().min(0).parse(data.get("displayOrder")), notes: optionalText(data.get("notes")) };
    const recordId = String(data.get("id") ?? "");
    return recordId ? prisma.internalSector.update({ where: { id: id.parse(recordId) }, data: values }) : prisma.internalSector.create({ data: values });
  });
}
export async function toggleInternalSector(data: FormData) { const value = toggle(data); await execute("sectors", "Situação do setor atualizada.", () => prisma.internalSector.update({ where: { id: value.id }, data: { active: value.active } })); }
export async function addInternalSectorService(data: FormData) {
  await execute("sectors", "Serviço habilitado para o setor.", () => prisma.serviceInternalSector.upsert({ where: { serviceId_internalSectorId: { serviceId: id.parse(data.get("serviceId")), internalSectorId: id.parse(data.get("internalSectorId")) } }, update: {}, create: { serviceId: id.parse(data.get("serviceId")), internalSectorId: id.parse(data.get("internalSectorId")) } }));
}
export async function removeInternalSectorService(data: FormData) {
  await execute("sectors", "Serviço removido do setor.", () => prisma.serviceInternalSector.delete({ where: { serviceId_internalSectorId: { serviceId: id.parse(data.get("serviceId")), internalSectorId: id.parse(data.get("internalSectorId")) } } }));
}

const group = z.enum(["VARIABLE_COST_EXPENSE", "FIXED_COST_EXPENSE", "FINANCIAL_REVENUE", "FINANCIAL_EXPENSE", "INCOME_TAX_EXPENSE"]);
export async function saveFinancialCategory(data: FormData) {
  await execute("categories", data.get("id") ? "Categoria atualizada." : "Categoria cadastrada.", async () => {
    const groupValue = z.union([group, z.literal("NON_DRE")]).parse(data.get("group"));
    const categoryName = name.parse(data.get("name"));
    const values = { name: categoryName, ...financialGroupMapping(groupValue), notes: optionalText(data.get("notes")) };
    const recordId = String(data.get("id") ?? "");
    return recordId
      ? updateFinancialClassification(prisma, id.parse(recordId), values)
      : createFinancialClassification(prisma, { ...values, code: categoryCode(categoryName) });
  });
}
export async function toggleFinancialCategory(data: FormData) { const value = toggle(data); await execute("categories", "Situação da categoria atualizada.", () => setFinancialClassificationActive(prisma, value.id, value.active)); }
