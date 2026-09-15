import { describe, expect, it } from "vitest";
import { canReadRegistrationTab, canWriteRegistrationTab, visibleRegistrationTabs } from "./permissions";

describe("permissões dos Cadastros unificados", () => {
  it("concede acesso total ao ADMIN", () => {
    expect(visibleRegistrationTabs("ADMIN")).toHaveLength(7);
    expect(canWriteRegistrationTab("ADMIN", "users")).toBe(true);
  });

  it("limita OPERATIONS aos cadastros operacionais", () => {
    expect(canWriteRegistrationTab("OPERATIONS", "products")).toBe(true);
    expect(canReadRegistrationTab("OPERATIONS", "categories")).toBe(false);
    expect(canReadRegistrationTab("OPERATIONS", "users")).toBe(false);
  });

  it("permite categorias ao FINANCE e somente leitura dos demais mestres", () => {
    expect(canWriteRegistrationTab("FINANCE", "categories")).toBe(true);
    expect(canReadRegistrationTab("FINANCE", "companies")).toBe(true);
    expect(canWriteRegistrationTab("FINANCE", "companies")).toBe(false);
  });

  it("mantém VIEWER somente leitura e CONTRACTOR sem acesso", () => {
    expect(canReadRegistrationTab("VIEWER", "contractors")).toBe(true);
    expect(canWriteRegistrationTab("VIEWER", "contractors")).toBe(false);
    expect(visibleRegistrationTabs("CONTRACTOR")).toEqual([]);
  });
});
