"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/modules/auth/password";
import { requireUser } from "@/modules/auth/session";
import { userContractorId } from "./domain";
import { z } from "zod";

const roleSchema = z.enum(["ADMIN", "FINANCE", "OPERATIONS", "VIEWER", "CONTRACTOR"]);
const emailSchema = z.string().trim().email("Informe um e-mail válido.").transform((value) => value.toLowerCase());
const nameSchema = z.string().trim().min(1, "Informe o nome.").max(200);
const passwordSchema = z.string().min(8, "A senha deve possuir ao menos 8 caracteres.");
const path = "/cadastros?tab=users";

function destination(kind: "success" | "error", message: string) {
  return `${path}&${new URLSearchParams({ [kind]: message })}`;
}

async function execute(message: string, operation: (actorId: string) => Promise<unknown>) {
  try {
    const actor = await requireUser("ADMIN");
    await operation(actor.id);
    revalidatePath("/cadastros");
  } catch (error) {
    const duplicate = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
    const detail = error instanceof z.ZodError ? error.issues[0]?.message : error instanceof Error ? error.message : null;
    redirect(destination("error", duplicate ? "Já existe um usuário com este e-mail." : detail || "Não foi possível salvar o usuário."));
  }
  redirect(destination("success", message));
}

async function validatedContractorId(role: z.infer<typeof roleSchema>, rawId: FormDataEntryValue | null) {
  const contractorId = String(rawId ?? "") || null;
  const contractor = contractorId ? await prisma.contractor.findUnique({ where: { id: contractorId }, select: { active: true } }) : null;
  return userContractorId(role, contractorId, contractor?.active === true);
}

export async function createUserAction(formData: FormData) {
  await execute("Usuário criado.", async () => {
    const role = roleSchema.parse(formData.get("role"));
    await prisma.user.create({ data: {
      name: nameSchema.parse(formData.get("name")),
      email: emailSchema.parse(formData.get("email")),
      passwordHash: await hashPassword(passwordSchema.parse(formData.get("password"))),
      role,
      contractorId: await validatedContractorId(role, formData.get("contractorId")),
    } });
  });
}

export async function updateUserAction(formData: FormData) {
  await execute("Usuário atualizado.", async () => {
    const id = z.string().cuid().parse(formData.get("id"));
    const role = roleSchema.parse(formData.get("role"));
    const password = String(formData.get("password") ?? "");
    await prisma.user.update({ where: { id }, data: {
      name: nameSchema.parse(formData.get("name")),
      email: emailSchema.parse(formData.get("email")),
      role,
      contractorId: await validatedContractorId(role, formData.get("contractorId")),
      ...(password ? { passwordHash: await hashPassword(passwordSchema.parse(password)) } : {}),
    } });
  });
}

export async function toggleUserAction(formData: FormData) {
  await execute("Situação do usuário atualizada.", async (actorId) => {
    const id = z.string().cuid().parse(formData.get("id"));
    const active = formData.get("active") === "true";
    if (actorId === id && !active) throw new Error("Você não pode desativar o próprio usuário.");
    await prisma.$transaction([
      prisma.user.update({ where: { id }, data: { active } }),
      ...(!active ? [prisma.session.deleteMany({ where: { userId: id } })] : []),
    ]);
  });
}
