import { describe, expect, it } from "vitest";
import { userContractorId } from "./domain";

describe("vínculo do usuário CONTRACTOR", () => {
  it("exige Terceirizado ativo", () => {
    expect(userContractorId("CONTRACTOR", "contractor", true)).toBe("contractor");
    expect(() => userContractorId("CONTRACTOR", null, false)).toThrow("ativo");
    expect(() => userContractorId("CONTRACTOR", "contractor", false)).toThrow("ativo");
  });

  it("remove contractorId dos demais perfis", () => {
    expect(userContractorId("ADMIN", "contractor", true)).toBeNull();
    expect(userContractorId("FINANCE", "contractor", true)).toBeNull();
  });
});
