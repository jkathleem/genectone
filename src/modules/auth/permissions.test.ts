import { describe, expect, it } from "vitest";
import { canAccessPath, hasPermission } from "./permissions";

describe("permissões do perfil CONTRACTOR", () => {
  it("não recebe mutações ou relatórios internos", () => {
    expect(hasPermission("CONTRACTOR", "ADMIN")).toBe(false);
    expect(hasPermission("CONTRACTOR", "OPERATION_MUTATE")).toBe(false);
    expect(hasPermission("CONTRACTOR", "FINANCE_MUTATE")).toBe(false);
    expect(hasPermission("CONTRACTOR", "REPORT_VIEW")).toBe(false);
    expect(hasPermission("CONTRACTOR", "STOCK_VIEW")).toBe(false);
  });

  it("fica restrito à página inicial e ao portal", () => {
    expect(canAccessPath("CONTRACTOR", "/")).toBe(true);
    expect(canAccessPath("CONTRACTOR", "/portal")).toBe(true);
    expect(canAccessPath("CONTRACTOR", "/portal/ops/abc")).toBe(true);
    expect(canAccessPath("CONTRACTOR", "/ops")).toBe(false);
    expect(canAccessPath("CONTRACTOR", "/cadastros/terceirizados")).toBe(false);
    expect(canAccessPath("CONTRACTOR", "/cadastros")).toBe(false);
    expect(canAccessPath("CONTRACTOR", "/financeiro/dre")).toBe(false);
    expect(canAccessPath("CONTRACTOR", "/estoque")).toBe(false);
  });

  it("permite abrir o ambiente de cadastros para perfis internos", () => {
    expect(canAccessPath("OPERATIONS", "/cadastros")).toBe(true);
    expect(canAccessPath("FINANCE", "/cadastros")).toBe(true);
    expect(canAccessPath("VIEWER", "/cadastros")).toBe(true);
  });

  it("permite ao VIEWER consultar OPs sem conceder mutação", () => {
    expect(canAccessPath("VIEWER", "/ops/qualquer-id")).toBe(true);
    expect(hasPermission("VIEWER", "OPERATION_MUTATE")).toBe(false);
  });

  it("aplica permissões específicas de estoque por papel", () => {
    expect(hasPermission("ADMIN", "STOCK_ADJUST")).toBe(true);
    expect(hasPermission("FINANCE", "STOCK_PURCHASE")).toBe(true);
    expect(hasPermission("OPERATIONS", "STOCK_CONSUME")).toBe(true);
    expect(hasPermission("VIEWER", "STOCK_VIEW")).toBe(true);
    expect(hasPermission("VIEWER", "STOCK_CONSUME")).toBe(false);
    expect(hasPermission("CONTRACTOR", "STOCK_CONSUME")).toBe(false);
    expect(hasPermission("VIEWER", "STOCK_PURCHASE")).toBe(false);
    expect(canAccessPath("VIEWER", "/estoque")).toBe(true);
  });
});
