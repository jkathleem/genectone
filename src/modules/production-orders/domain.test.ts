import { describe, expect, it } from "vitest";
import { productionOrderLifecycleStatus } from "./domain";

describe("ciclo de vida derivado da OP", () => {
  it("deriva os quatro estados sem coluna de status", () => {
    expect(productionOrderLifecycleStatus({})).toBe("EM_PRODUCAO");
    expect(productionOrderLifecycleStatus({ completedAt: new Date() })).toBe("CONCLUIDA");
    expect(productionOrderLifecycleStatus({ billing: null })).toBe("EM_PRODUCAO");
    expect(productionOrderLifecycleStatus({ billing: {} })).toBe("FATURADA");
    expect(productionOrderLifecycleStatus({ billing: { accountReceivable: { originalAmount: "100", allocations: [{ amount: "40" }, { amount: "60" }] } } })).toBe("RECEBIDA");
  });
});
