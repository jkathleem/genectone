import { createHash } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "./password";
import { findUserByToken } from "./session";

const marker = "temp.qa.auth@genect.local";
const token = "TEMP-QA-AUTH-TOKEN";
let userId = "";

describe.skipIf(process.env.RUN_DB_TESTS !== "1")("autenticação PostgreSQL", () => {
  beforeAll(async () => {
    await prisma.session.deleteMany({ where: { user: { email: marker } } });
    await prisma.user.deleteMany({ where: { email: marker } });
    const user = await prisma.user.create({ data: { name: "TEMP QA AUTH", email: marker, passwordHash: await hashPassword("TempQaAuth2026!"), role: "ADMIN" } });
    userId = user.id;
    await prisma.session.create({ data: { userId, tokenHash: createHash("sha256").update(token).digest("hex"), expiresAt: new Date(Date.now() + 60_000) } });
  });
  afterAll(async () => { await prisma.session.deleteMany({ where: { userId } }); await prisma.user.deleteMany({ where: { id: userId } }); await prisma.$disconnect(); });
  it("resolve sessão válida sem persistir o token aberto", async () => {
    expect((await findUserByToken(token))?.email).toBe(marker);
    expect(await prisma.session.findUnique({ where: { tokenHash: token } })).toBeNull();
  });
  it("nega imediatamente usuário desativado", async () => {
    await prisma.user.update({ where: { id: userId }, data: { active: false } });
    expect(await findUserByToken(token)).toBeNull();
  });
});
