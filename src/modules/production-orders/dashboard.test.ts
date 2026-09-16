import { describe, expect, it } from "vitest";
import { buildOperationalDashboard } from "./dashboard";
import type { DashboardIssue } from "./dashboard";

const today = new Date("2026-09-16T12:00:00Z");
const sectors = [{ id: "assembly", name: "Montagem", active: true, displayOrder: 3 }];

function order(overrides: Partial<Parameters<typeof buildOperationalDashboard>[0][number]> = {}) {
  return {
    id: "op1",
    number: "TEMP-KB-001",
    quantity: 1200,
    isUrgent: false,
    expectedCompletionDate: null,
    completedAt: null,
    customer: { id: "customer", name: "Cliente" },
    product: { id: "product", reference: "5012", name: "Produto", color: "Azul" },
    billing: null,
    outsourcedServices: [],
    internalServices: [],
    operationalIssues: [],
    ...overrides,
  };
}

function external(id: string, contractorId: string, contractorName: string, serviceName: string, sent = 0, returned = 0, expectedReturnDate: Date | null = null, issues: DashboardIssue[] = []) {
  return {
    id,
    plannedQuantity: 1200,
    expectedReturnDate,
    createdAt: new Date("2026-09-10T00:00:00Z"),
    service: { id: `svc-${id}`, name: serviceName },
    contractor: { id: contractorId, name: contractorName, active: true },
    deliveryNoteItems: sent ? [{ quantity: sent, deliveryNote: { departureDate: new Date("2026-09-10T00:00:00Z") } }] : [],
    returns: returned ? [{ quantity: returned, returnDate: new Date("2026-09-12T00:00:00Z") }] : [],
    operationalIssues: issues,
  };
}

describe("buildOperationalDashboard", () => {
  it("mostra a mesma OP em dois terceirizados enquanto os serviços estão pendentes", () => {
    const dashboard = buildOperationalDashboard([order({ outsourcedServices: [
      external("a", "pricila", "Pricila", "Frente Completa", 1200, 0),
      external("b", "rafael", "Rafael", "Pala e Gancho", 1200, 0),
    ] })], sectors, {}, today);
    expect(dashboard.contractorColumns.find((column) => column.title === "Pricila")?.cards).toHaveLength(1);
    expect(dashboard.contractorColumns.find((column) => column.title === "Rafael")?.cards).toHaveLength(1);
    expect(dashboard.assemblyColumn.cards).toHaveLength(0);
  });

  it("entra em Montagem como aguardando complemento quando um serviço conclui e outro não", () => {
    const dashboard = buildOperationalDashboard([order({ outsourcedServices: [
      external("a", "pricila", "Pricila", "Frente Completa", 1200, 0),
      external("b", "rafael", "Rafael", "Pala e Gancho", 1200, 1200),
    ] })], sectors, {}, today);
    expect(dashboard.assemblyColumn.cards[0].status).toBe("AGUARDANDO_COMPLEMENTO");
    expect(dashboard.assemblyColumn.cards[0].waitingNames).toEqual(["Pricila"]);
    expect(dashboard.indicators.waitingComplement).toBe(1);
  });

  it("marca Montagem completa quando todos os serviços externos concluíram", () => {
    const dashboard = buildOperationalDashboard([order({ outsourcedServices: [
      external("a", "pricila", "Pricila", "Frente Completa", 1200, 1200),
      external("b", "rafael", "Rafael", "Pala e Gancho", 1200, 1200),
    ] })], sectors, { showCompleted: true }, today);
    expect(dashboard.assemblyColumn.cards[0].status).toBe("COMPLETA_PARA_MONTAGEM");
  });

  it("deriva retorno parcial e atraso", () => {
    const dashboard = buildOperationalDashboard([order({ outsourcedServices: [
      external("a", "pricila", "Pricila", "Frente Completa", 1200, 800, new Date("2026-09-10T00:00:00Z")),
    ] })], sectors, {}, today);
    expect(dashboard.contractorColumns[0].cards[0].status).toBe("PARCIAL");
    expect(dashboard.contractorColumns[0].cards[0].isLate).toBe(true);
    expect(dashboard.indicators.lateItems).toBe(1);
  });

  it("diferencia atraso bloqueado por pendência operacional", () => {
    const issue = { id: "issue", type: "MISSING_THREAD", description: "Linha", status: "OPEN", createdAt: new Date("2026-09-15T00:00:00Z"), contractor: { id: "pricila", name: "Pricila" }, outsourcedServiceId: "a" } as const;
    const dashboard = buildOperationalDashboard([order({ outsourcedServices: [
      external("a", "pricila", "Pricila", "Frente Completa", 1200, 0, new Date("2026-09-10T00:00:00Z"), [issue]),
    ], operationalIssues: [issue] })], sectors, {}, today);
    expect(dashboard.contractorColumns[0].cards[0].isBlocked).toBe(true);
    expect(dashboard.attention[0].title).toContain("Pendência");
  });

  it("prioriza bloqueio, atraso, urgência e complemento", () => {
    const issue = { id: "issue", type: "MISSING_THREAD", description: "Linha", status: "IN_PROGRESS", createdAt: new Date("2026-09-15T00:00:00Z"), contractor: { id: "a", name: "A" }, outsourcedServiceId: "blocked" } as const;
    const dashboard = buildOperationalDashboard([
      order({ id: "blocked-order", number: "1", outsourcedServices: [external("blocked", "a", "A", "Serviço", 100, 0, new Date("2026-09-01T00:00:00Z"), [issue])], operationalIssues: [issue] }),
      order({ id: "late-order", number: "2", outsourcedServices: [external("late", "b", "B", "Serviço", 100, 0, new Date("2026-09-01T00:00:00Z"))] }),
      order({ id: "urgent-order", number: "3", isUrgent: true, outsourcedServices: [external("urgent", "c", "C", "Serviço", 0, 0)] }),
    ], sectors, {}, today);
    const priorities = dashboard.contractorColumns.flatMap((column) => column.cards).map((card) => card.priority);
    expect(priorities.sort((a, b) => a - b)).toEqual([1, 2, 3]);
  });

  it("mantém densidade e filtros com 20 OPs temporárias em memória", () => {
    const orders = Array.from({ length: 20 }, (_, index) => order({
      id: `op-${index}`,
      number: `TEMP-KB-${String(index + 1).padStart(3, "0")}`,
      isUrgent: index % 5 === 0,
      outsourcedServices: [external(`svc-${index}`, index % 2 === 0 ? "pricila" : "rafael", index % 2 === 0 ? "Pricila" : "Rafael", "Frente", 100, index % 3 === 0 ? 50 : 0)],
    }));
    const dashboard = buildOperationalDashboard(orders, sectors, { filter: "urgent" }, today);
    expect(dashboard.indicators.activeOrders).toBe(20);
    expect(dashboard.contractorColumns.flatMap((column) => column.cards)).toHaveLength(4);
  });
});
