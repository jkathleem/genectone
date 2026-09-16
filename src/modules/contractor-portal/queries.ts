import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { AuthenticatedUser } from "@/modules/auth/session";
import { buildPortalFinancialView, buildPortalServiceCard, serviceMatchesFilter, type PortalServiceFilter } from "./domain";

export type ContractorPortalParams = {
  q?: string;
  filter?: string;
};

const validFilters = new Set<PortalServiceFilter>(["all", "active", "partial", "late", "completed", "issue"]);

function daysUntil(value: Date, today = new Date()) {
  const day = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Fortaleza" }).format(date).split("-").map(Number);
  const [vy, vm, vd] = day(value);
  const [ty, tm, td] = day(today);
  return Math.floor((Date.UTC(vy, vm - 1, vd) - Date.UTC(ty, tm - 1, td)) / 86400000);
}

export function requireContractorPortalUser(user: AuthenticatedUser | null): asserts user is AuthenticatedUser & { role: "CONTRACTOR"; contractorId: string } {
  if (!user) redirect("/login");
  if (user.role !== "CONTRACTOR" || !user.contractorId) notFound();
}

export async function getContractorPortal(user: AuthenticatedUser & { contractorId: string }, params: ContractorPortalParams = {}) {
  const contractorId = user.contractorId;
  const filter = validFilters.has(params.filter as PortalServiceFilter) ? params.filter as PortalServiceFilter : "all";
  const search = params.q?.trim().toLowerCase() || "";
  const [contractor, services, approvedSettlements] = await Promise.all([
    prisma.contractor.findUniqueOrThrow({ where: { id: contractorId }, select: { id: true, name: true } }),
    prisma.outsourcedService.findMany({
      where: { contractorId },
      include: {
        productionOrder: { select: { id: true, number: true, quantity: true, isUrgent: true, product: { select: { reference: true, name: true, color: true } } } },
        service: { select: { name: true } },
        deliveryNoteItems: { select: { quantity: true, deliveryNote: { select: { departureDate: true } } } },
        returns: { select: { quantity: true, returnDate: true, notes: true }, orderBy: { returnDate: "desc" } },
        operationalIssues: { select: { id: true, type: true, description: true, status: true, createdAt: true, updatedAt: true }, orderBy: { createdAt: "desc" } },
        settlementItems: { select: { approvedQuantityIncluded: true, settlement: { select: { status: true } } } },
      },
      orderBy: [{ expectedReturnDate: "asc" }, { createdAt: "desc" }],
      take: 250,
    }),
    prisma.contractorSettlement.findMany({
      where: { contractorId, status: "APPROVED" },
      include: {
        items: { select: { approvedQuantityIncluded: true, appliedUnitPriceSnapshot: true } },
        accountPayable: { select: { id: true, dueDate: true, originalAmount: true, payments: { select: { id: true, paymentDate: true, amount: true, notes: true, reversal: { select: { id: true } } }, orderBy: { paymentDate: "desc" } } } },
      },
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
      take: 120,
    }),
  ]);
  const allServiceCards = services.map((service) => buildPortalServiceCard(service));
  const visibleServiceCards = allServiceCards.filter((card) => {
    const matchesSearch = !search || [card.orderNumber, card.reference, card.productName, card.serviceName].some((value) => value.toLowerCase().includes(search));
    return matchesSearch && serviceMatchesFilter(card, filter);
  });
  const financial = buildPortalFinancialView({ services, approvedSettlements });
  return {
    contractor,
    filters: { q: params.q?.trim() || "", filter },
    indicators: {
      inProgress: allServiceCards.filter((card) => card.status === "AWAITING_SHIPMENT" || card.status === "IN_PROGRESS" || card.status === "PARTIAL" || card.status === "LATE" || card.status === "BLOCKED_BY_ISSUE").length,
      dueSoon: allServiceCards.filter((card) => card.expectedReturnDate && card.pendingQuantity > 0 && card.status !== "COMPLETED" && daysUntil(card.expectedReturnDate) >= 0 && daysUntil(card.expectedReturnDate) <= 3).length,
      late: allServiceCards.filter((card) => card.status === "LATE" || card.status === "BLOCKED_BY_ISSUE").length,
      openIssues: services.reduce((sum, service) => sum + service.operationalIssues.filter((issue) => issue.status === "OPEN" || issue.status === "IN_PROGRESS").length, 0),
    },
    services: visibleServiceCards,
    issues: services.flatMap((service) => service.operationalIssues.map((issue) => ({ ...issue, outsourcedServiceId: service.id, orderNumber: service.productionOrder.number, serviceName: service.service.name }))).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    financial,
  };
}

export async function getContractorServiceDetail(user: AuthenticatedUser & { contractorId: string }, outsourcedServiceId: string) {
  const service = await prisma.outsourcedService.findFirst({
    where: { id: outsourcedServiceId, contractorId: user.contractorId },
    include: {
      productionOrder: { select: { id: true, number: true, quantity: true, isUrgent: true, product: { select: { reference: true, name: true, color: true } } } },
      service: { select: { name: true } },
      deliveryNoteItems: { select: { quantity: true, deliveryNote: { select: { number: true, departureDate: true } } }, orderBy: { deliveryNote: { departureDate: "desc" } } },
      returns: { select: { quantity: true, returnDate: true, notes: true }, orderBy: { returnDate: "desc" } },
      operationalIssues: { select: { id: true, type: true, description: true, status: true, createdAt: true, updatedAt: true }, orderBy: { createdAt: "desc" } },
      settlementItems: { select: { approvedQuantityIncluded: true, settlement: { select: { status: true } } } },
    },
  });
  if (!service) notFound();
  return { service, card: buildPortalServiceCard(service) };
}
