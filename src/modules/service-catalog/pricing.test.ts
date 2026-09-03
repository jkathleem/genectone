import { Prisma } from "@/generated/prisma";
import { describe, expect, it } from "vitest";
import { currentPrice } from "./pricing";
const price = (value: string, from: string, until: string | null = null) => ({ unitPrice: new Prisma.Decimal(value), validFrom: new Date(from), validUntil: until ? new Date(until) : null });
describe("preço vigente", () => { it("escolhe a referência vigente mais recente", () => expect(currentPrice([price("1.00", "2026-01-01"), price("1.10", "2026-09-01")], new Date("2026-09-02"))?.unitPrice.toFixed(2)).toBe("1.10")); it("não inventa preço quando não há vigente", () => expect(currentPrice([], new Date())).toBeNull()); });
