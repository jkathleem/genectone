import { describe, expect, it } from "vitest";
import { canAccessPath, hasPermission } from "./permissions";

describe("permissões do perfil CONTRACTOR", () => {
  it("não recebe mutações ou relatórios internos", () => {
    expect(hasPermission("CONTRACTOR", "ADMIN")).toBe(false);
    expect(hasPermission("CONTRACTOR", "OPERATION_MUTATE")).toBe(false);
    expect(hasPermission("CONTRACTOR", "FINANCE_MUTATE")).toBe(false);
    expect(hasPermission("CONTRACTOR", "REPORT_VIEW")).toBe(false);
  });

  it("fica restrito à página inicial enquanto o portal não existe", () => {
    expect(canAccessPath("CONTRACTOR", "/")).toBe(true);
    expect(canAccessPath("CONTRACTOR", "/ops")).toBe(false);
    expect(canAccessPath("CONTRACTOR", "/cadastros/terceirizados")).toBe(false);
    expect(canAccessPath("CONTRACTOR", "/financeiro/dre")).toBe(false);
  });
});
