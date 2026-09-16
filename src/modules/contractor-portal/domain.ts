import { Prisma } from "@/generated/prisma";
import { derivedQuantities } from "@/modules/outsourcing/domain";
import { isOutsourcedServiceLate } from "@/modules/production-orders/domain";

export type PortalIssueStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED";
export type PortalIssueType = "MISSING_THREAD" | "MISSING_TRIM" | "MISSING_COMPONENT" | "QUANTITY_ISSUE" | "EXECUTION_QUESTION" | "OTHER";
export type PortalServiceFilter = "all" | "active" | "partial" | "late" | "completed" | "issue";

export type PortalServiceInput = {
  id: string;
  plannedQuantity: number | null;
  approvedQuantity: number;
  appliedUnitPrice: Prisma.Decimal | string;
  expectedReturnDate: Date | null;
  productionOrder: {
    id: string;
    number: string;
    quantity: number;
    isUrgent: boolean;
    product: { reference: string | null; name: string; color: string | null };
  };
  service: { name: string };
  deliveryNoteItems: { quantity: number; deliveryNote: { departureDate: Date } }[];
  returns: { quantity: number; returnDate: Date; notes: string | null }[];
  operationalIssues: {
    id: string;
    type: PortalIssueType;
    description: string;
    status: PortalIssueStatus;
    createdAt: Date;
    updatedAt: Date;
  }[];
  settlementItems: { approvedQuantityIncluded: number; settlement: { status: "DRAFT" | "APPROVED" } }[];
};

export type PortalServiceStatus = "AWAITING_SHIPMENT" | "IN_PROGRESS" | "PARTIAL" | "COMPLETED" | "LATE" | "BLOCKED_BY_ISSUE";

export type PortalServiceCard = {
  id: string;
  orderId: string;
  orderNumber: string;
  reference: string;
  productName: string;
  color: string;
  orderQuantity: number;
  serviceName: string;
  plannedQuantity: number | null;
  sentQuantity: number;
  returnedQuantity: number;
  pendingQuantity: number;
  lastDepartureDate: Date | null;
  expectedReturnDate: Date | null;
  status: PortalServiceStatus;
  hasOpenIssue: boolean;
  openIssueCount: number;
  producedValue: Prisma.Decimal;
};

export type PortalFinancialInput = {
  services: Pick<PortalServiceInput, "id" | "approvedQuantity" | "appliedUnitPrice" | "productionOrder" | "service" | "settlementItems">[];
  approvedSettlements: {
    id: string;
    periodYear: number;
    periodMonth: number;
    approvedAt: Date | null;
    accountPayable: null | {
      id: string;
      dueDate: Date;
      originalAmount: Prisma.Decimal | string;
      payments: { id: string; paymentDate: Date; amount: Prisma.Decimal | string; notes: string | null; reversal: object | null }[];
    };
    items: { approvedQuantityIncluded: number; appliedUnitPriceSnapshot: Prisma.Decimal | string }[];
  }[];
};

export type PortalFinancialSummary = {
  waitingSettlement: Prisma.Decimal;
  waitingPayment: Prisma.Decimal;
  paidThisMonth: Prisma.Decimal;
};

export type WaitingSettlementItem = {
  outsourcedServiceId: string;
  orderNumber: string;
  serviceName: string;
  quantity: number;
  unitPrice: Prisma.Decimal;
  value: Prisma.Decimal;
};

export type WaitingPaymentItem = {
  settlementId: string;
  accountPayableId: string;
  reference: string;
  dueDate: Date;
  originalAmount: Prisma.Decimal;
  paidAmount: Prisma.Decimal;
  balance: Prisma.Decimal;
  status: "OPEN" | "OVERDUE" | "PARTIAL" | "PAID";
};

export type PaymentHistoryItem = {
  id: string;
  settlementId: string;
  reference: string;
  paymentDate: Date;
  amount: Prisma.Decimal;
  effective: boolean;
  notes: string | null;
};

export type PortalFinancialView = {
  summary: PortalFinancialSummary;
  waitingSettlementItems: WaitingSettlementItem[];
  waitingPaymentItems: WaitingPaymentItem[];
  paymentHistory: PaymentHistoryItem[];
};

export const issueLabels: Record<PortalIssueType, string> = {
  MISSING_THREAD: "Falta de linha",
  MISSING_TRIM: "Falta de aviamento",
  MISSING_COMPONENT: "Falta de peça/componente",
  QUANTITY_ISSUE: "Problema com quantidade",
  EXECUTION_QUESTION: "Dúvida sobre execução",
  OTHER: "Outro",
};

export const issueStatusLabels: Record<PortalIssueStatus, string> = {
  OPEN: "Aberta",
  IN_PROGRESS: "Em tratamento",
  RESOLVED: "Resolvida",
};

export const serviceStatusLabels: Record<PortalServiceStatus, string> = {
  AWAITING_SHIPMENT: "Aguardando envio",
  IN_PROGRESS: "Em andamento",
  PARTIAL: "Parcialmente entregue",
  COMPLETED: "Concluído",
  LATE: "Atrasado",
  BLOCKED_BY_ISSUE: "Bloqueado por pendência",
};

function activeIssues(service: Pick<PortalServiceInput, "operationalIssues">) {
  return service.operationalIssues.filter((issue) => issue.status === "OPEN" || issue.status === "IN_PROGRESS");
}

export function buildPortalServiceCard(service: PortalServiceInput, today = new Date()): PortalServiceCard {
  const quantities = derivedQuantities(service.deliveryNoteItems, service.returns);
  const openIssueCount = activeIssues(service).length;
  const isLate = isOutsourcedServiceLate(service.expectedReturnDate, quantities.sentQuantity, quantities.returnedQuantity, today);
  let status: PortalServiceStatus = "AWAITING_SHIPMENT";
  if (quantities.sentQuantity > 0 && quantities.returnedQuantity <= 0) status = "IN_PROGRESS";
  if (quantities.returnedQuantity > 0 && quantities.pendingQuantity > 0) status = "PARTIAL";
  if (quantities.sentQuantity > 0 && quantities.pendingQuantity <= 0) status = "COMPLETED";
  if (isLate) status = openIssueCount > 0 ? "BLOCKED_BY_ISSUE" : "LATE";
  const lastDepartureDate = service.deliveryNoteItems.reduce<Date | null>((latest, item) => !latest || item.deliveryNote.departureDate > latest ? item.deliveryNote.departureDate : latest, null);
  return {
    id: service.id,
    orderId: service.productionOrder.id,
    orderNumber: service.productionOrder.number,
    reference: service.productionOrder.product.reference ?? "—",
    productName: service.productionOrder.product.name,
    color: service.productionOrder.product.color ?? "sem cor",
    orderQuantity: service.productionOrder.quantity,
    serviceName: service.service.name,
    plannedQuantity: service.plannedQuantity,
    sentQuantity: quantities.sentQuantity,
    returnedQuantity: quantities.returnedQuantity,
    pendingQuantity: quantities.pendingQuantity,
    lastDepartureDate,
    expectedReturnDate: service.expectedReturnDate,
    status,
    hasOpenIssue: openIssueCount > 0,
    openIssueCount,
    producedValue: new Prisma.Decimal(service.appliedUnitPrice).mul(service.approvedQuantity),
  };
}

export function serviceMatchesFilter(card: PortalServiceCard, filter: PortalServiceFilter) {
  if (filter === "all") return true;
  if (filter === "active") return card.status === "AWAITING_SHIPMENT" || card.status === "IN_PROGRESS" || card.status === "LATE" || card.status === "BLOCKED_BY_ISSUE";
  if (filter === "partial") return card.status === "PARTIAL";
  if (filter === "late") return card.status === "LATE" || card.status === "BLOCKED_BY_ISSUE";
  if (filter === "completed") return card.status === "COMPLETED";
  if (filter === "issue") return card.hasOpenIssue;
  return true;
}

export function buildPortalFinancialView(input: PortalFinancialInput, today = new Date()): PortalFinancialView {
  const waitingSettlementItems = input.services.flatMap((service) => {
    const settled = service.settlementItems.filter((item) => item.settlement.status === "APPROVED").reduce((sum, item) => sum + item.approvedQuantityIncluded, 0);
    const quantity = Math.max(0, service.approvedQuantity - settled);
    if (quantity <= 0) return [];
    const unitPrice = new Prisma.Decimal(service.appliedUnitPrice);
    return [{
      outsourcedServiceId: service.id,
      orderNumber: service.productionOrder.number,
      serviceName: service.service.name,
      quantity,
      unitPrice,
      value: unitPrice.mul(quantity),
    }];
  });

  const waitingPaymentItems = input.approvedSettlements.flatMap((settlement) => {
    if (!settlement.accountPayable) return [];
    const paidAmount = settlement.accountPayable.payments.filter((payment) => !payment.reversal).reduce((sum, payment) => sum.add(payment.amount), new Prisma.Decimal(0));
    const originalAmount = new Prisma.Decimal(settlement.accountPayable.originalAmount);
    const balance = originalAmount.minus(paidAmount);
    if (balance.lte(0)) return [];
    const status: WaitingPaymentItem["status"] = paidAmount.gt(0) ? "PARTIAL" : settlement.accountPayable.dueDate < today ? "OVERDUE" : "OPEN";
    return [{
      settlementId: settlement.id,
      accountPayableId: settlement.accountPayable.id,
      reference: `${String(settlement.periodMonth).padStart(2, "0")}/${settlement.periodYear}`,
      dueDate: settlement.accountPayable.dueDate,
      originalAmount,
      paidAmount,
      balance,
      status,
    }];
  });

  const paymentHistory = input.approvedSettlements.flatMap((settlement) => settlement.accountPayable?.payments.map((payment) => ({
    id: payment.id,
    settlementId: settlement.id,
    reference: `${String(settlement.periodMonth).padStart(2, "0")}/${settlement.periodYear}`,
    paymentDate: payment.paymentDate,
    amount: new Prisma.Decimal(payment.amount),
    effective: !payment.reversal,
    notes: payment.notes,
  })) ?? []).sort((a, b) => b.paymentDate.getTime() - a.paymentDate.getTime());

  const currentMonth = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Fortaleza", year: "numeric", month: "2-digit" }).format(today);
  const paidThisMonth = paymentHistory.filter((payment) => payment.effective && new Intl.DateTimeFormat("en-CA", { timeZone: "America/Fortaleza", year: "numeric", month: "2-digit" }).format(payment.paymentDate) === currentMonth).reduce((sum, payment) => sum.add(payment.amount), new Prisma.Decimal(0));

  return {
    summary: {
      waitingSettlement: waitingSettlementItems.reduce((sum, item) => sum.add(item.value), new Prisma.Decimal(0)),
      waitingPayment: waitingPaymentItems.reduce((sum, item) => sum.add(item.balance), new Prisma.Decimal(0)),
      paidThisMonth,
    },
    waitingSettlementItems,
    waitingPaymentItems,
    paymentHistory,
  };
}
