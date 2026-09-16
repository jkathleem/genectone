import { prisma } from "@/lib/prisma";
import { buildOperationalDashboard, type DashboardFilter, type DashboardFilters } from "./dashboard";

export type OperationalDashboardParams = {
  q?: string;
  filter?: string;
  customerId?: string;
  productId?: string;
  contractorId?: string;
  serviceId?: string;
  showCompleted?: string;
};

const validFilters = new Set<DashboardFilter>(["all", "pending", "partial", "late", "urgent", "issue", "assembly-waiting", "completed"]);

export function parseDashboardFilters(params: OperationalDashboardParams): DashboardFilters {
  const filter = validFilters.has(params.filter as DashboardFilter) ? params.filter as DashboardFilter : "all";
  return {
    q: params.q?.trim() || undefined,
    filter,
    customerId: params.customerId || undefined,
    productId: params.productId || undefined,
    contractorId: params.contractorId || undefined,
    serviceId: params.serviceId || undefined,
    showCompleted: params.showCompleted === "yes" || filter === "completed",
  };
}

export async function getOperationalDashboard(params: OperationalDashboardParams) {
  const filters = parseDashboardFilters(params);
  const includeFinished = filters.showCompleted || filters.filter === "completed";
  const [orders, sectors, customers, products, contractors, services] = await Promise.all([
    prisma.productionOrder.findMany({
      where: includeFinished ? undefined : { completedAt: null },
      include: {
        customer: true,
        product: true,
        billing: { include: { accountReceivable: { include: { allocations: { include: { receipt: { include: { reversal: true } } } } } } } },
        outsourcedServices: {
          include: {
            service: true,
            contractor: true,
            deliveryNoteItems: { include: { deliveryNote: true } },
            returns: true,
            operationalIssues: true,
          },
        },
        internalServices: { include: { service: true, internalSector: true } },
        operationalIssues: { include: { contractor: true } },
      },
      orderBy: [{ isUrgent: "desc" }, { entryDate: "desc" }, { number: "asc" }],
      take: includeFinished ? 250 : 160,
    }),
    prisma.internalSector.findMany({ where: { active: true }, orderBy: [{ displayOrder: "asc" }, { name: "asc" }] }),
    prisma.customer.findMany({ where: { productionOrders: { some: {} } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.product.findMany({ where: { productionOrders: { some: {} } }, orderBy: [{ reference: "asc" }, { name: "asc" }], select: { id: true, reference: true, name: true } }),
    prisma.contractor.findMany({ where: { active: true, outsourcedServices: { some: {} } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.service.findMany({ where: { OR: [{ outsourcedServices: { some: {} } }, { internalProductionServices: { some: {} } }] }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return {
    dashboard: buildOperationalDashboard(orders, sectors, filters),
    filters,
    options: { customers, products, contractors, services },
  };
}
