import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";
import { canAccessPath, hasPermission } from "./permissions";

describe("autenticação e permissões", () => {
  it("gera hash com salt e valida somente a senha correta", async () => {
    const first = await hashPassword("senha-segura");
    const second = await hashPassword("senha-segura");
    expect(first).not.toBe(second);
    expect(await verifyPassword("senha-segura", first)).toBe(true);
    expect(await verifyPassword("senha-errada", first)).toBe(false);
  });
  it("aplica os perfis básicos", () => {
    expect(hasPermission("OPERATIONS", "OPERATION_MUTATE")).toBe(true);
    expect(hasPermission("VIEWER", "FINANCE_MUTATE")).toBe(false);
    expect(canAccessPath("OPERATIONS", "/financeiro/dre")).toBe(false);
    expect(canAccessPath("ADMIN", "/cadastros/usuarios")).toBe(true);
  });
});
