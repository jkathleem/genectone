import { Prisma } from "@/generated/prisma";
import { describe, expect, it } from "vitest";
import { buildPortalFinancialView, buildPortalServiceCard, serviceMatchesFilter, type PortalServiceInput } from "./domain";

const today = new Date("2026-09-16T12:00:00Z");

function service(overrides: Partial<PortalServiceInput> = {}): PortalServiceInput {
  return {
    id: "service-a",
    plannedQuantity: 100,
    approvedQuantity: 0,
    appliedUnitPrice: new Prisma.Decimal("1.50"),
    expectedReturnDate: null,
    productionOrder: {
      id: "op-a",
      number: "100",
      quantity: 100,
      isUrgent: false,
      product: { reference: "5012", name: "Produto", color: "Azul" },
    },
    service: { name: "Frente Completa" },
    deliveryNoteItems: [],
    returns: [],
    operationalIssues: [],
    settlementItems: [],
    ...overrides,
  };
}

describe("contractor portal domain", () => {
  it("deriva status visual sem persistir status duplicado", () => {
    expect(buildPortalServiceCard(service(), today).status).toBe("AWAITING_SHIPMENT");
    expect(buildPortalServiceCard(service({ deliveryNoteItems: [{ quantity: 100, deliveryNote: { departureDate: today } }] }), today).status).toBe("IN_PROGRESS");
    expect(buildPortalServiceCard(service({ deliveryNoteItems: [{ quantity: 100, deliveryNote: { departureDate: today } }], returns: [{ quantity: 40, returnDate: today, notes: null }] }), today).status).toBe("PARTIAL");
    expect(buildPortalServiceCard(service({ deliveryNoteItems: [{ quantity: 100, deliveryNote: { departureDate: today } }], returns: [{ quantity: 100, returnDate: today, notes: null }] }), today).status).toBe("COMPLETED");
  });

  it("diferencia atraso simples de bloqueio por pendência", () => {
    const late = buildPortalServiceCard(service({ expectedReturnDate: new Date("2026-09-10T00:00:00Z"), deliveryNoteItems: [{ quantity: 100, deliveryNote: { departureDate: today } }] }), today);
    const blocked = buildPortalServiceCard(service({ expectedReturnDate: new Date("2026-09-10T00:00:00Z"), deliveryNoteItems: [{ quantity: 100, deliveryNote: { departureDate: today } }], operationalIssues: [{ id: "issue", type: "MISSING_THREAD", description: "Linha", status: "OPEN", createdAt: today, updatedAt: today }] }), today);
    expect(late.status).toBe("LATE");
    expect(blocked.status).toBe("BLOCKED_BY_ISSUE");
  });

  it("filtra cards do portal por situação", () => {
    const partial = buildPortalServiceCard(service({ deliveryNoteItems: [{ quantity: 100, deliveryNote: { departureDate: today } }], returns: [{ quantity: 50, returnDate: today, notes: null }] }), today);
    expect(serviceMatchesFilter(partial, "partial")).toBe(true);
    expect(serviceMatchesFilter(partial, "completed")).toBe(false);
  });

  it("separa aguardando fechamento, aguardando pagamento e pagos efetivos", () => {
    const financial = buildPortalFinancialView({
      services: [service({
        id: "unsettled",
        approvedQuantity: 100,
        appliedUnitPrice: new Prisma.Decimal("2.00"),
        settlementItems: [{ approvedQuantityIncluded: 30, settlement: { status: "APPROVED" } }],
      })],
      approvedSettlements: [{
        id: "settlement",
        periodYear: 2026,
        periodMonth: 9,
        approvedAt: today,
        items: [{ approvedQuantityIncluded: 100, appliedUnitPriceSnapshot: new Prisma.Decimal("2.00") }],
        accountPayable: {
          id: "ap",
          dueDate: new Date("2026-09-20T00:00:00Z"),
          originalAmount: new Prisma.Decimal("200.00"),
          payments: [
            { id: "pay-ok", paymentDate: new Date("2026-09-15T00:00:00Z"), amount: new Prisma.Decimal("50.00"), notes: null, reversal: null },
            { id: "pay-reversed", paymentDate: new Date("2026-09-15T00:00:00Z"), amount: new Prisma.Decimal("25.00"), notes: null, reversal: {} },
          ],
        },
      }],
    }, today);
    expect(financial.summary.waitingSettlement.toFixed(2)).toBe("140.00");
    expect(financial.summary.waitingPayment.toFixed(2)).toBe("150.00");
    expect(financial.summary.paidThisMonth.toFixed(2)).toBe("50.00");
    expect(financial.paymentHistory.find((payment) => payment.id === "pay-reversed")?.effective).toBe(false);
  });
});
