"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { addClassificationEntry, addGrossRevenue, createBudget, deleteBudgetEntry, updateBudgetEntry, updateBudgetNotes } from "./service";

const path = "/financeiro/previsto-realizado";
const text = z.string().min(1);
const amount = z.string().trim().transform(v => v.replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".")).pipe(z.string().regex(/^\d+(\.\d{1,4})?$/, "Informe um valor válido."));
function target(form: FormData, kind: "success" | "error", message: string) { const q = new URLSearchParams({ companyId: String(form.get("companyId") ?? ""), month: String(form.get("month") ?? ""), year: String(form.get("year") ?? ""), [kind]: message }); return `${path}?${q}`; }
async function run(form: FormData, message: string, fn: () => Promise<unknown>) { try { await fn(); revalidatePath(path); } catch (e) { redirect(target(form, "error", e instanceof Error ? e.message : "Não foi possível concluir.")); } redirect(target(form, "success", message)); }

export async function createBudgetAction(form: FormData) { await run(form, "Orçamento criado.", () => createBudget(prisma, text.parse(form.get("companyId")), Number(form.get("year")), Number(form.get("month")), String(form.get("notes") ?? ""))); }
export async function updateBudgetAction(form: FormData) { await run(form, "Observações do orçamento atualizadas.", () => updateBudgetNotes(prisma, text.parse(form.get("budgetId")), String(form.get("notes") ?? ""))); }
export async function addRevenueAction(form: FormData) { await run(form, "Receita Bruta prevista adicionada.", () => addGrossRevenue(prisma, text.parse(form.get("budgetId")), amount.parse(form.get("amount")), String(form.get("notes") ?? ""))); }
export async function addClassificationAction(form: FormData) { await run(form, "Classificação adicionada.", () => addClassificationEntry(prisma, text.parse(form.get("budgetId")), text.parse(form.get("classificationId")), amount.parse(form.get("amount")), String(form.get("notes") ?? ""))); }
export async function updateEntryAction(form: FormData) { await run(form, "Linha atualizada.", () => updateBudgetEntry(prisma, text.parse(form.get("entryId")), amount.parse(form.get("amount")), String(form.get("notes") ?? ""))); }
export async function deleteEntryAction(form: FormData) { await run(form, "Linha removida.", () => deleteBudgetEntry(prisma, text.parse(form.get("entryId")))); }
