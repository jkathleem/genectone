import { Prisma } from "@/generated/prisma";
import { derivedQuantities, mountingAvailability } from "@/modules/outsourcing/domain";
import { externalServiceProgress, isOutsourcedServiceLate, productionOrderLifecycleStatus, type ServiceProgressStatus } from "./domain";

export type DashboardFilter =
  | "all"
  | "pending"
  | "partial"
  | "late"
  | "urgent"
  | "issue"
  | "assembly-waiting"
  | "completed";

export type DashboardFilters = {
  q?: string;
  filter?: DashboardFilter;
  customerId?: string;
  productId?: string;
  contractorId?: string;
  serviceId?: string;
  showCompleted?: boolean;
};

export type DashboardIssueStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED";
export type DashboardIssueType = "MISSING_THREAD" | "MISSING_TRIM" | "MISSING_COMPONENT" | "QUANTITY_ISSUE" | "EXECUTION_QUESTION" | "OTHER";

type DashboardOrder = {
  id: string;
  number: string;
  quantity: number;
  isUrgent: boolean;
  expectedCompletionDate: Date | null;
  completedAt: Date | null;
  customer: { id: string; name: string };
  product: { id: string; reference: string | null; name: string; color: string | null };
  billing?: null | { accountReceivable?: null | { originalAmount: Prisma.Decimal | string; allocations: { amount: Prisma.Decimal | string; receipt?: { reversal?: object | null } }[] } };
  outsourcedServices: DashboardExternalService[];
  internalServices: DashboardInternalService[];
  operationalIssues: DashboardIssue[];
};

type DashboardExternalService = {
  id: string;
  plannedQuantity: number | null;
  expectedReturnDate: Date | null;
  createdAt: Date;
  service: { id: string; name: string };
  contractor: { id: string; name: string; active: boolean };
  deliveryNoteItems: { quantity: number; deliveryNote?: { departureDate: Date } }[];
  returns: { quantity: number; returnDate: Date }[];
  operationalIssues: DashboardIssue[];
};

type DashboardInternalService = {
  id: string;
  plannedQuantity: number | null;
  completedAt: Date | null;
  service: { id: string; name: string };
  internalSector: { id: string; name: string; active: boolean; displayOrder: number };
};

export type DashboardIssue = {
  id: string;
  type: DashboardIssueType;
  description: string;
  status: DashboardIssueStatus;
  createdAt: Date;
  contractor?: { id: string; name: string } | null;
  outsourcedServiceId?: string | null;
};

export type DashboardCard = {
  key: string;
  kind: "external" | "internal" | "assembly";
  orderId: string;
  orderNumber: string;
  reference: string;
  productName: string;
  customerName: string;
  color: string;
  quantity: number;
  serviceName: string;
  responsibleName: string;
  progressLabel: string;
  pendingLabel: string | null;
  expectedDate: Date | null;
  status: ServiceProgressStatus | "AGUARDANDO_COMPLEMENTO" | "COMPLETA_PARA_MONTAGEM";
  isLate: boolean;
  isUrgent: boolean;
  isBlocked: boolean;
  hasIssue: boolean;
  waitingNames: string[];
  completedNames: string[];
  priority: number;
};

export type AttentionItem = {
  key: string;
  orderId: string;
  orderNumber: string;
  title: string;
  detail: string;
  severity: "danger" | "warning" | "info";
  priority: number;
};

export type DashboardColumn = {
  id: string;
  title: string;
  group: "internal" | "contractor" | "assembly";
  cards: DashboardCard[];
};

export type OperationalDashboard = {
  indicators: {
    activeOrders: number;
    urgentOrders: number;
    lateItems: number;
    waitingComplement: number;
    openIssues: number;
  };
  attention: AttentionItem[];
  internalColumns: DashboardColumn[];
  contractorColumns: DashboardColumn[];
  assemblyColumn: DashboardColumn;
  totalCards: number;
};

export type DashboardSector = { id: string; name: string; active: boolean; displayOrder: number };

const issueLabels: Record<DashboardIssueType, string> = {
  MISSING_THREAD: "Falta de linha",
  MISSING_TRIM: "Falta de aviamento",
  MISSING_COMPONENT: "Falta de componente",
  QUANTITY_ISSUE: "Divergência de quantidade",
  EXECUTION_QUESTION: "Dúvida de execução",
  OTHER: "Outra",
};

function fortalezaDay(value: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Fortaleza" }).format(value);
}

function daysSince(start: Date, today: Date) {
  const [sy, sm, sd] = fortalezaDay(start).split("-").map(Number);
  const [ty, tm, td] = fortalezaDay(today).split("-").map(Number);
  return Math.max(0, Math.floor((Date.UTC(ty, tm - 1, td) - Date.UTC(sy, sm - 1, sd)) / 86400000));
}

function activeIssues(issues: DashboardIssue[]) {
  return issues.filter((issue) => issue.status === "OPEN" || issue.status === "IN_PROGRESS");
}

function orderMatchesSearch(order: DashboardOrder, q: string | undefined) {
  if (!q?.trim()) return true;
  const value = q.trim().toLowerCase();
  return [order.number, order.product.reference, order.product.name, order.customer.name].some((item) => item?.toLowerCase().includes(value));
}

function completedExternalInfo(order: DashboardOrder) {
  return order.outsourcedServices.map((service) => {
    const quantities = derivedQuantities(service.deliveryNoteItems, service.returns);
    const completed = quantities.sentQuantity > 0 && quantities.pendingQuantity <= 0;
    const firstCompletedAt = completed ? service.returns.reduce<Date | null>((first, item) => !first || item.returnDate < first ? item.returnDate : first, null) : null;
    return { service, quantities, completed, firstCompletedAt };
  });
}

function priority(card: Pick<DashboardCard, "isBlocked" | "isLate" | "isUrgent" | "status" | "expectedDate">) {
  if (card.isBlocked) return 1;
  if (card.isLate) return 2;
  if (card.isUrgent) return 3;
  if (card.status === "AGUARDANDO_COMPLEMENTO") return 4;
  if (card.expectedDate) return 5;
  return 6;
}

function sortCards(cards: DashboardCard[]) {
  return [...cards].sort((a, b) => a.priority - b.priority || (a.expectedDate?.getTime() ?? 8640000000000000) - (b.expectedDate?.getTime() ?? 8640000000000000) || a.orderNumber.localeCompare(b.orderNumber));
}

function matchesCardFilter(card: DashboardCard, filter: DashboardFilter, showCompleted: boolean) {
  if (!showCompleted && (card.status === "CONCLUIDO" || card.status === "COMPLETA_PARA_MONTAGEM")) return false;
  if (filter === "all") return true;
  if (filter === "pending") return card.status === "PENDENTE";
  if (filter === "partial") return card.status === "PARCIAL";
  if (filter === "late") return card.isLate;
  if (filter === "urgent") return card.isUrgent;
  if (filter === "issue") return card.hasIssue;
  if (filter === "assembly-waiting") return card.status === "AGUARDANDO_COMPLEMENTO";
  if (filter === "completed") return card.status === "CONCLUIDO" || card.status === "COMPLETA_PARA_MONTAGEM";
  return true;
}

export function buildOperationalDashboard(orders: DashboardOrder[], sectors: DashboardSector[], filters: DashboardFilters = {}, today = new Date()): OperationalDashboard {
  const filter = filters.filter ?? "all";
  const candidateOrders = orders.filter((order) => {
    if (!orderMatchesSearch(order, filters.q)) return false;
    if (filters.customerId && order.customer.id !== filters.customerId) return false;
    if (filters.productId && order.product.id !== filters.productId) return false;
    if (filters.contractorId && !order.outsourcedServices.some((item) => item.contractor.id === filters.contractorId)) return false;
    if (filters.serviceId && ![...order.outsourcedServices, ...order.internalServices].some((item) => item.service.id === filters.serviceId)) return false;
    return true;
  });
  const contractorMap = new Map<string, DashboardColumn>();
  const internalMap = new Map<string, DashboardColumn>();
  const assemblyCards: DashboardCard[] = [];
  const attention = new Map<string, AttentionItem>();
  let lateItems = 0;
  let waitingComplement = 0;
  let openIssues = 0;

  for (const sector of sectors.filter((item) => item.active).sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name))) {
    internalMap.set(sector.id, { id: sector.id, title: sector.name, group: "internal", cards: [] });
  }

  for (const order of candidateOrders) {
    const lifecycle = productionOrderLifecycleStatus(order);
    const orderActive = lifecycle === "EM_PRODUCAO";
    const orderIssueCount = activeIssues(order.operationalIssues).length;
    openIssues += orderIssueCount;
    if (orderIssueCount > 0) {
      const issue = activeIssues(order.operationalIssues)[0];
      attention.set(`issue-${order.id}`, {
        key: `issue-${order.id}`,
        orderId: order.id,
        orderNumber: order.number,
        title: `Pendência operacional - OP ${order.number}`,
        detail: `${issue.contractor?.name ?? "Responsável"} · ${issueLabels[issue.type]} · aberta há ${daysSince(issue.createdAt, today)} dia(s)`,
        severity: "danger",
        priority: 1,
      });
    }
    if (order.isUrgent && orderActive) {
      attention.set(`urgent-${order.id}`, { key: `urgent-${order.id}`, orderId: order.id, orderNumber: order.number, title: `OP urgente ${order.number}`, detail: `${order.product.reference ?? order.product.name} · ${order.customer.name}`, severity: "info", priority: 4 });
    }
    if (order.expectedCompletionDate && !order.completedAt && fortalezaDay(order.expectedCompletionDate) < fortalezaDay(today)) {
      attention.set(`order-late-${order.id}`, { key: `order-late-${order.id}`, orderId: order.id, orderNumber: order.number, title: `Previsão geral vencida - OP ${order.number}`, detail: `Previsão ${fortalezaDay(order.expectedCompletionDate)}`, severity: "warning", priority: 6 });
    }

    const externalInfo = completedExternalInfo(order);
    const completed = externalInfo.filter((item) => item.completed);
    const pending = externalInfo.filter((item) => !item.completed);
    const mounting = mountingAvailability(order.outsourcedServices);
    if (mounting === "PARTIALLY_AVAILABLE") {
      waitingComplement += 1;
      const firstCompleted = completed.reduce<Date | null>((first, item) => item.firstCompletedAt && (!first || item.firstCompletedAt < first) ? item.firstCompletedAt : first, null);
      attention.set(`assembly-${order.id}`, {
        key: `assembly-${order.id}`,
        orderId: order.id,
        orderNumber: order.number,
        title: `Aguardando complemento - OP ${order.number}`,
        detail: `Aguardando ${pending.map((item) => item.service.contractor.name).join(", ")}${firstCompleted ? ` há ${daysSince(firstCompleted, today)} dia(s)` : ""}`,
        severity: "warning",
        priority: 3,
      });
    }

    for (const info of externalInfo) {
      const service = info.service;
      const issues = activeIssues(service.operationalIssues.length ? service.operationalIssues : order.operationalIssues.filter((issue) => issue.outsourcedServiceId === service.id));
      const isLate = isOutsourcedServiceLate(service.expectedReturnDate, info.quantities.sentQuantity, info.quantities.returnedQuantity, today);
      const status = externalServiceProgress(info.quantities.sentQuantity, info.quantities.returnedQuantity);
      const isBlocked = isLate && issues.length > 0;
      if (isLate) lateItems += 1;
      if (isLate) {
        attention.set(`late-${service.id}`, {
          key: `late-${service.id}`,
          orderId: order.id,
          orderNumber: order.number,
          title: isBlocked ? `Bloqueado por pendência - OP ${order.number}` : `Serviço atrasado - OP ${order.number}`,
          detail: `${service.contractor.name} · ${service.service.name}${isBlocked ? ` · ${issueLabels[issues[0].type]}` : ""}`,
          severity: isBlocked ? "warning" : "danger",
          priority: isBlocked ? 1 : 2,
        });
      }
      const card: DashboardCard = {
        key: `external-${service.id}`,
        kind: "external",
        orderId: order.id,
        orderNumber: order.number,
        reference: order.product.reference ?? "—",
        productName: order.product.name,
        customerName: order.customer.name,
        color: order.product.color ?? "sem cor",
        quantity: order.quantity,
        serviceName: service.service.name,
        responsibleName: service.contractor.name,
        progressLabel: `${info.quantities.returnedQuantity} / ${info.quantities.sentQuantity || service.plannedQuantity || order.quantity} recebidas`,
        pendingLabel: info.quantities.pendingQuantity > 0 ? `Faltam ${info.quantities.pendingQuantity}` : null,
        expectedDate: service.expectedReturnDate,
        status,
        isLate,
        isUrgent: order.isUrgent,
        isBlocked,
        hasIssue: issues.length > 0,
        waitingNames: [],
        completedNames: [],
        priority: 0,
      };
      card.priority = priority(card);
      if (!contractorMap.has(service.contractor.id)) contractorMap.set(service.contractor.id, { id: service.contractor.id, title: service.contractor.name, group: "contractor", cards: [] });
      if (matchesCardFilter(card, filter, Boolean(filters.showCompleted))) contractorMap.get(service.contractor.id)!.cards.push(card);
    }

    for (const service of order.internalServices) {
      const status: ServiceProgressStatus = service.completedAt ? "CONCLUIDO" : "PENDENTE";
      const card: DashboardCard = {
        key: `internal-${service.id}`,
        kind: "internal",
        orderId: order.id,
        orderNumber: order.number,
        reference: order.product.reference ?? "—",
        productName: order.product.name,
        customerName: order.customer.name,
        color: order.product.color ?? "sem cor",
        quantity: order.quantity,
        serviceName: service.service.name,
        responsibleName: service.internalSector.name,
        progressLabel: status === "CONCLUIDO" ? "Concluído" : "Operacional interno",
        pendingLabel: service.plannedQuantity ? `Previsto ${service.plannedQuantity}` : null,
        expectedDate: null,
        status,
        isLate: false,
        isUrgent: order.isUrgent,
        isBlocked: false,
        hasIssue: false,
        waitingNames: [],
        completedNames: [],
        priority: 0,
      };
      card.priority = priority(card);
      if (!internalMap.has(service.internalSector.id)) internalMap.set(service.internalSector.id, { id: service.internalSector.id, title: service.internalSector.name, group: "internal", cards: [] });
      if (matchesCardFilter(card, filter, Boolean(filters.showCompleted))) internalMap.get(service.internalSector.id)!.cards.push(card);
    }

    if (mounting !== "NOT_AVAILABLE") {
      const status = mounting === "FULLY_AVAILABLE" ? "COMPLETA_PARA_MONTAGEM" : "AGUARDANDO_COMPLEMENTO";
      const card: DashboardCard = {
        key: `assembly-${order.id}`,
        kind: "assembly",
        orderId: order.id,
        orderNumber: order.number,
        reference: order.product.reference ?? "—",
        productName: order.product.name,
        customerName: order.customer.name,
        color: order.product.color ?? "sem cor",
        quantity: order.quantity,
        serviceName: "Montagem",
        responsibleName: "Montagem",
        progressLabel: `${completed.length} de ${externalInfo.length} concluídos`,
        pendingLabel: pending.length ? `Aguardando ${pending.map((item) => item.service.contractor.name).join(", ")}` : null,
        expectedDate: order.expectedCompletionDate,
        status,
        isLate: false,
        isUrgent: order.isUrgent,
        isBlocked: false,
        hasIssue: orderIssueCount > 0,
        waitingNames: pending.map((item) => item.service.contractor.name),
        completedNames: completed.map((item) => item.service.contractor.name),
        priority: 0,
      };
      card.priority = priority(card);
      if (matchesCardFilter(card, filter, Boolean(filters.showCompleted))) assemblyCards.push(card);
    }
  }

  const internalColumns = [...internalMap.values()].map((column) => ({ ...column, cards: sortCards(column.cards) })).filter((column) => column.cards.length > 0 || column.title.toLowerCase() !== "montagem");
  const contractorColumns = [...contractorMap.values()].sort((a, b) => a.title.localeCompare(b.title)).map((column) => ({ ...column, cards: sortCards(column.cards) })).filter((column) => column.cards.length > 0);
  const assemblyColumn = { id: "assembly", title: "Montagem", group: "assembly" as const, cards: sortCards(assemblyCards) };
  return {
    indicators: {
      activeOrders: candidateOrders.filter((order) => productionOrderLifecycleStatus(order) === "EM_PRODUCAO").length,
      urgentOrders: candidateOrders.filter((order) => order.isUrgent && productionOrderLifecycleStatus(order) === "EM_PRODUCAO").length,
      lateItems,
      waitingComplement,
      openIssues,
    },
    attention: [...attention.values()].sort((a, b) => a.priority - b.priority || a.orderNumber.localeCompare(b.orderNumber)).slice(0, 12),
    internalColumns,
    contractorColumns,
    assemblyColumn,
    totalCards: internalColumns.reduce((sum, column) => sum + column.cards.length, 0) + contractorColumns.reduce((sum, column) => sum + column.cards.length, 0) + assemblyColumn.cards.length,
  };
}
