import { describe, expect, it } from "vitest";
import { receivableRemainingAmount, receivableStatus, receivedAmount } from "./domain";
describe("contas a receber", () => {
  const today = new Date("2026-09-04T12:00:00Z");
  it("deriva recebido e saldo pelas alocações", () => { const allocations = [{ amount: "4000" }, { amount: "3000" }]; expect(receivedAmount(allocations).toFixed(4)).toBe("7000.0000"); expect(receivableRemainingAmount("10000", allocations).toFixed(4)).toBe("3000.0000"); });
  it("deriva todos os status", () => { expect(receivableStatus("100", new Date("2026-09-04T00:00:00Z"), [], today)).toBe("Em aberto"); expect(receivableStatus("100", new Date("2026-09-03T00:00:00Z"), [], today)).toBe("Vencida"); expect(receivableStatus("100", new Date("2026-09-03T00:00:00Z"), [{ amount: "40" }], today)).toBe("Parcial"); expect(receivableStatus("100", new Date("2026-09-03T00:00:00Z"), [{ amount: "100" }], today)).toBe("Recebida"); });
});
