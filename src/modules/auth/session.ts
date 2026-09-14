import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/generated/prisma";
import { hasPermission, type Permission } from "./permissions";

export const SESSION_COOKIE = "genect_session";
const SESSION_DAYS = 7;
const digest = (token: string) => createHash("sha256").update(token).digest("hex");

export type AuthenticatedUser = { id: string; name: string; email: string; role: UserRole };

export async function findUserByToken(token?: string | null): Promise<AuthenticatedUser | null> {
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: digest(token) },
    include: { user: { select: { id: true, name: true, email: true, role: true, active: true } } },
  });
  if (!session || session.expiresAt <= new Date() || !session.user.active) return null;
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role,
  };
}

export async function currentUser() {
  return findUserByToken((await cookies()).get(SESSION_COOKIE)?.value);
}

export async function requireUser(permission?: Permission) {
  const user = await currentUser();
  if (!user) throw new Error("Sessão inválida ou expirada. Entre novamente.");
  if (permission && !hasPermission(user.role, permission)) throw new Error("Você não possui permissão para esta ação.");
  return user;
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({ data: { userId, tokenHash: digest(token), expiresAt } });
  (await cookies()).set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", expires: expiresAt });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { tokenHash: digest(token) } });
  jar.delete(SESSION_COOKIE);
}
