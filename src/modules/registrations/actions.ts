"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { optionalText, redirectWithMessage } from "@/lib/form";

const requiredName = z.string().trim().min(1, "Informe o nome.").max(200, "Nome muito longo.");
const idSchema = z.string().cuid();

function parseBase(data: FormData) {
  return { name: requiredName.parse(data.get("name")), document: optionalText(data.get("document")) };
}

async function execute(path: string, success: string, operation: () => Promise<unknown>) {
  try { await operation(); revalidatePath(path); }
  catch (error) { if (error instanceof z.ZodError) redirectWithMessage(path, "error", error.issues[0]?.message ?? "Dados inválidos."); redirectWithMessage(path, "error", "Não foi possível salvar. Revise os dados e tente novamente."); }
  redirectWithMessage(path, "success", success);
}

export async function createCompany(data: FormData) { const path = "/cadastros/empresas"; await execute(path, "Empresa cadastrada.", () => prisma.company.create({ data: { ...parseBase(data), tradeName: optionalText(data.get("tradeName")) } })); }
export async function updateCompany(data: FormData) { const path = "/cadastros/empresas"; await execute(path, "Empresa atualizada.", () => prisma.company.update({ where: { id: idSchema.parse(data.get("id")) }, data: { ...parseBase(data), tradeName: optionalText(data.get("tradeName")) } })); }
export async function toggleCompany(data: FormData) { const path = "/cadastros/empresas"; await execute(path, "Situação da empresa atualizada.", () => prisma.company.update({ where: { id: idSchema.parse(data.get("id")) }, data: { active: data.get("active") === "true" } })); }

export async function createCustomer(data: FormData) { const path = "/cadastros/clientes"; await execute(path, "Cliente cadastrado.", () => prisma.customer.create({ data: parseBase(data) })); }
export async function updateCustomer(data: FormData) { const path = "/cadastros/clientes"; await execute(path, "Cliente atualizado.", () => prisma.customer.update({ where: { id: idSchema.parse(data.get("id")) }, data: parseBase(data) })); }
export async function toggleCustomer(data: FormData) { const path = "/cadastros/clientes"; await execute(path, "Situação do cliente atualizada.", () => prisma.customer.update({ where: { id: idSchema.parse(data.get("id")) }, data: { active: data.get("active") === "true" } })); }

function parseProduct(data: FormData) { return { name: requiredName.parse(data.get("name")), reference: optionalText(data.get("reference")) }; }
export async function createProduct(data: FormData) { const path = "/cadastros/produtos"; await execute(path, "Produto cadastrado.", () => prisma.product.create({ data: parseProduct(data) })); }
export async function updateProduct(data: FormData) { const path = "/cadastros/produtos"; await execute(path, "Produto atualizado.", () => prisma.product.update({ where: { id: idSchema.parse(data.get("id")) }, data: parseProduct(data) })); }
export async function toggleProduct(data: FormData) { const path = "/cadastros/produtos"; await execute(path, "Situação do produto atualizada.", () => prisma.product.update({ where: { id: idSchema.parse(data.get("id")) }, data: { active: data.get("active") === "true" } })); }

function parseContractor(data: FormData) { return { ...parseBase(data), phone: optionalText(data.get("phone")), address: optionalText(data.get("address")), notes: optionalText(data.get("notes")) }; }
export async function createContractor(data: FormData) { const path = "/cadastros/terceirizados"; await execute(path, "Terceirizado cadastrado.", () => prisma.contractor.create({ data: parseContractor(data) })); }
export async function updateContractor(data: FormData) { const path = "/cadastros/terceirizados"; await execute(path, "Terceirizado atualizado.", () => prisma.contractor.update({ where: { id: idSchema.parse(data.get("id")) }, data: parseContractor(data) })); }
export async function toggleContractor(data: FormData) { const path = "/cadastros/terceirizados"; await execute(path, "Situação do terceirizado atualizada.", () => prisma.contractor.update({ where: { id: idSchema.parse(data.get("id")) }, data: { active: data.get("active") === "true" } })); }
