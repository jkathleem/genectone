import { describe, expect, it } from "vitest";
import { supplySituation } from "./presentation";

describe("apresentação de estoque", () => {
  it("deriva a situação visual do insumo pelo saldo", () => {
    expect(supplySituation("-1", "10")).toBe("NEGATIVE");
    expect(supplySituation("0", "10")).toBe("ZERO");
    expect(supplySituation("5", "10")).toBe("BELOW_MINIMUM");
    expect(supplySituation("11", "10")).toBe("NORMAL");
  });
});
