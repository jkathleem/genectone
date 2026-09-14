"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession } from "./session";
import { verifyPassword } from "./password";

export async function loginAction(formData: FormData) {
  const email = z.string().trim().email().parse(formData.get("email")).toLowerCase();
  const password = z.string().min(1).parse(formData.get("password"));
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.active || !(await verifyPassword(password, user.passwordHash))) redirect(`/login?error=${encodeURIComponent("E-mail ou senha inválidos.")}`);
  await createSession(user.id);
  redirect("/");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
