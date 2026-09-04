import { describe, expect, it } from "vitest";
import { receivableRemainingAmount, receivableStatus, receivedAmount } from "./domain";
describe("contas a receber sem recebimentos", () => {
  const today = new Date("2026-09-04T12:00:00Z");
  it("inicia recebido zero e saldo igual ao original", () => { expect(receivedAmount().toFixed(4)).toBe("0.0000"); expect(receivableRemainingAmount("10450.0000").toFixed(4)).toBe("10450.0000"); });
  it("deriva Em aberto e Vencida", () => { expect(receivableStatus(new Date("2026-09-04T00:00:00Z"), today)).toBe("Em aberto"); expect(receivableStatus(new Date("2026-09-03T00:00:00Z"), today)).toBe("Vencida"); });
});
