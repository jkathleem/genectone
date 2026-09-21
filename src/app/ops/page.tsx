import Link from "next/link";
import type { Prisma } from "@/generated/prisma";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageToolbar } from "@/components/ui/page-toolbar";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StatusChip } from "@/components/ui/status-chip";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/format";
import { currentUser } from "@/modules/auth/session";
import { hasPermission } from "@/modules/auth/permissions";
import { derivedQuantities, mountingAvailability } from "@/modules/outsourcing/domain";
import { externalServiceProgress, isOutsourcedServiceLate, productionOrderLifecycleStatus, serviceProgressSummary } from "@/modules/production-orders/domain";
import { calculateOrderTotal } from "@/modules/production-orders/validation";
import { receivableRemainingAmount, receivableStatus } from "@/modules/accounts-receivable/domain";

type Params = {
  q?: string;
  customerId?: string;
  productId?: string;
  color?: string;
  urgent?: string;
  from?: string;
  to?: string;
  lifecycle?: string;
  pendingOutsourcing?: string;
  partialReturn?: string;
  issue?: string;
  late?: string;
  responsible?: string;
  assemblyWaiting?: string;
};

const lifecycleLabel = { EM_PRODUCAO: "Em produção", CONCLUIDA: "Concluída", FATURADA: "Faturada", RECEBIDA: "Recebida" };

function lifecycleVariant(lifecycle: keyof typeof lifecycleLabel) {
  if (lifecycle === "RECEBIDA") return "success";
  if (lifecycle === "EM_PRODUCAO") return "info";
  return "warning";
}

function daysLateLabel(date: Date, today: Date) {
  const start = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const end = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const days = Math.max(0, Math.floor((end - start) / 86400000));
  return days <= 1 ? "1 dia atrasada" : `${days} dias atrasada`;
}

function buildQuery(params: Params, overrides: Partial<Params>) {
  const query = new URLSearchParams();
  const next = { ...params, ...overrides };
  for (const [key, value] of Object.entries(next)) {
    if (value) query.set(key, value);
  }
  return `/ops${query.toString() ? `?${query.toString()}` : ""}`;
}

export default async function Page({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const where: Prisma.ProductionOrderWhereInput = {
    customerId: params.customerId || undefined,
    productId: params.productId || undefined,
    isUrgent: params.urgent === "yes" ? true : params.urgent === "no" ? false : undefined,
    entryDate: params.from || params.to ? { gte: params.from ? new Date(`${params.from}T00:00:00.000Z`) : undefined, lte: params.to ? new Date(`${params.to}T23:59:59.999Z`) : undefined } : undefined,
    product: params.color ? { color: params.color } : undefined,
    OR: params.q ? [
      { number: { contains: params.q, mode: "insensitive" } },
      { product: { reference: { contains: params.q, mode: "insensitive" } } },
      { product: { name: { contains: params.q, mode: "insensitive" } } },
      { customer: { name: { contains: params.q, mode: "insensitive" } } },
    ] : undefined,
  };
  const [rawOrders, customers, products, contractors, sectors, colors, user] = await Promise.all([
    prisma.productionOrder.findMany({ where, include: { customer: true, product: true, internalServices: { include: { internalSector: true } }, operationalIssues: true, outsourcedServices: { include: { contractor: true, deliveryNoteItems: { select: { quantity: true } }, returns: { select: { quantity: true } } } }, billing: { include: { accountReceivable: { include: { allocations: { include: { receipt: { include: { reversal: true } } } } } } } } }, orderBy: [{ isUrgent: "desc" }, { entryDate: "desc" }, { createdAt: "desc" }] }),
    prisma.customer.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.product.findMany({ orderBy: [{ reference: "asc" }, { name: "asc" }], select: { id: true, name: true, reference: true } }),
    prisma.contractor.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.internalSector.findMany({ orderBy: [{ displayOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
    prisma.product.findMany({ where: { color: { not: null } }, distinct: ["color"], orderBy: { color: "asc" }, select: { color: true } }),
    currentUser(),
  ]);
  const today = new Date();
  const enriched = rawOrders.map((order) => {
    const lifecycle = productionOrderLifecycleStatus(order);
    const quantities = order.outsourcedServices.map((item) => ({ item, ...derivedQuantities(item.deliveryNoteItems, item.returns) }));
    const externalLate = quantities.some((row) => isOutsourcedServiceLate(row.item.expectedReturnDate, row.sentQuantity, row.returnedQuantity, today));
    const orderLate = Boolean(order.expectedCompletionDate && !order.completedAt && order.expectedCompletionDate < today);
    const isLate = orderLate || externalLate;
    const hasIssue = order.operationalIssues.some((item) => item.status !== "RESOLVED");
    const mounting = mountingAvailability(order.outsourcedServices);
    const pendingOutsourcing = quantities.some((row) => (row.item.plannedQuantity || 0) > row.sentQuantity || row.sentQuantity > row.returnedQuantity);
    const partialReturn = quantities.some((item) => item.returnedQuantity > 0 && item.sentQuantity > item.returnedQuantity);
    const statuses = [
      ...order.outsourcedServices.map((item) => {
        const q = derivedQuantities(item.deliveryNoteItems, item.returns);
        return externalServiceProgress(q.sentQuantity, q.returnedQuantity);
      }),
      ...order.internalServices.map((item) => item.completedAt ? "CONCLUIDO" as const : "PENDENTE" as const),
    ];
    return { order, lifecycle, quantities, isLate, orderLate, hasIssue, mounting, pendingOutsourcing, partialReturn, progress: serviceProgressSummary(statuses) };
  });
  const orders = enriched.filter(({ order, lifecycle, quantities, isLate, hasIssue, mounting, pendingOutsourcing, partialReturn }) => {
    if (params.lifecycle && lifecycle !== params.lifecycle) return false;
    if (params.pendingOutsourcing === "yes" && !pendingOutsourcing) return false;
    if (params.partialReturn === "yes" && !partialReturn) return false;
    if (params.issue === "yes" && !hasIssue) return false;
    if (params.late === "yes" && !isLate) return false;
    if (params.assemblyWaiting === "yes" && mounting !== "PARTIALLY_AVAILABLE") return false;
    if (params.responsible?.startsWith("contractor:") && !order.outsourcedServices.some((item) => item.contractorId === params.responsible!.slice(11))) return false;
    if (params.responsible?.startsWith("sector:") && !order.internalServices.some((item) => item.internalSectorId === params.responsible!.slice(7))) return false;
    void quantities;
    return true;
  });
  const canCreate = Boolean(user && hasPermission(user.role, "OPERATION_MUTATE"));
  const hasFilters = Object.values(params).some(Boolean);

  return (
    <div className="ops-list-page">
      <PageHeader title="OPs" description="Acompanhe ordens de produção, prioridades, prazos e situação operacional." primaryAction={canCreate ? { label: "Nova OP", href: "/ops/nova" } : undefined} />
      <section className="ops-list-indicators">
        <StatCard label="Encontradas" value={orders.length} helper={`${rawOrders.length} carregada(s)`} variant="info" />
        <StatCard label="Urgentes" value={orders.filter(({ order }) => order.isUrgent).length} helper="pelos filtros" variant={orders.some(({ order }) => order.isUrgent) ? "warning" : "neutral"} />
        <StatCard label="Atrasadas" value={orders.filter((item) => item.isLate).length} helper="prazo ou serviço" variant={orders.some((item) => item.isLate) ? "danger" : "neutral"} />
        <StatCard label="Pendências" value={orders.filter((item) => item.hasIssue).length} helper="ativas" variant={orders.some((item) => item.hasIssue) ? "warning" : "success"} />
      </section>
      <PageToolbar>
        <form className="ops-toolbar" method="get">
          <label className="field ops-search">Busca<input defaultValue={params.q} name="q" placeholder="OP, referência, produto ou cliente" /></label>
          <label className="field">Cliente<select defaultValue={params.customerId || ""} name="customerId"><option value="">Todos</option>{customers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="field">Produto<select defaultValue={params.productId || ""} name="productId"><option value="">Todos</option>{products.map((item) => <option key={item.id} value={item.id}>{item.reference ? `${item.reference} — ` : ""}{item.name}</option>)}</select></label>
          <label className="field">Cor<select defaultValue={params.color || ""} name="color"><option value="">Todas</option>{colors.flatMap((item) => item.color ? [<option key={item.color} value={item.color}>{item.color}</option>] : [])}</select></label>
          <label className="field">Situação<select defaultValue={params.lifecycle || ""} name="lifecycle"><option value="">Todas</option><option value="EM_PRODUCAO">Em produção</option><option value="CONCLUIDA">Concluída</option><option value="FATURADA">Faturada</option><option value="RECEBIDA">Recebida</option></select></label>
          <label className="field">Responsável<select defaultValue={params.responsible || ""} name="responsible"><option value="">Todos</option><optgroup label="Terceirizados">{contractors.map((item) => <option key={item.id} value={`contractor:${item.id}`}>{item.name}</option>)}</optgroup><optgroup label="Setores internos">{sectors.map((item) => <option key={item.id} value={`sector:${item.id}`}>{item.name}</option>)}</optgroup></select></label>
          <label className="field">Entrada de<input defaultValue={params.from} name="from" type="date" /></label>
          <label className="field">Entrada até<input defaultValue={params.to} name="to" type="date" /></label>
          <input name="urgent" type="hidden" value={params.urgent || ""} />
          <input name="pendingOutsourcing" type="hidden" value={params.pendingOutsourcing || ""} />
          <input name="partialReturn" type="hidden" value={params.partialReturn || ""} />
          <input name="issue" type="hidden" value={params.issue || ""} />
          <input name="late" type="hidden" value={params.late || ""} />
          <input name="assemblyWaiting" type="hidden" value={params.assemblyWaiting || ""} />
          <div className="ops-toolbar-actions"><button className="button-primary">Filtrar</button><Button href="/ops" variant="secondary">Limpar</Button></div>
        </form>
        <nav className="ops-quick-filters" aria-label="Filtros rápidos">
          <Link className={!hasFilters ? "active" : ""} href="/ops">Todas</Link>
          <Link className={params.urgent === "yes" ? "active" : ""} href={buildQuery(params, { urgent: "yes" })}>Urgentes</Link>
          <Link className={params.late === "yes" ? "active" : ""} href={buildQuery(params, { late: "yes" })}>Atrasadas</Link>
          <Link className={params.issue === "yes" ? "active" : ""} href={buildQuery(params, { issue: "yes" })}>Com pendência</Link>
          <Link className={params.assemblyWaiting === "yes" ? "active" : ""} href={buildQuery(params, { assemblyWaiting: "yes" })}>Aguardando complemento</Link>
          <Link className={params.lifecycle === "CONCLUIDA" ? "active" : ""} href={buildQuery(params, { lifecycle: "CONCLUIDA" })}>A faturar</Link>
          <Link className={params.lifecycle === "RECEBIDA" ? "active" : ""} href={buildQuery(params, { lifecycle: "RECEBIDA" })}>Recebidas</Link>
        </nav>
      </PageToolbar>

      <section className="panel ops-list-panel">
        {orders.length === 0 ? (
          <EmptyState title="Nenhuma OP encontrada" description={hasFilters ? "Nenhuma OP corresponde aos filtros selecionados." : "Cadastre a primeira OP para iniciar o acompanhamento."} action={hasFilters ? <Button href="/ops" variant="secondary">Limpar filtros</Button> : canCreate ? <Button href="/ops/nova">Nova OP</Button> : null} />
        ) : (
          <>
            <div className="ops-table-desktop">
              <DataTable>
                <table>
                  <thead><tr><th>OP</th><th>Cliente</th><th>Produto</th><th>Qtd.</th><th>Prazo</th><th>Situação</th><th>Atenção</th><th>Financeiro</th><th>Ação</th></tr></thead>
                  <tbody>
                    {orders.map(({ order, lifecycle, progress, isLate, orderLate, hasIssue, mounting }) => {
                      const account = order.billing?.accountReceivable;
                      const financial = account ? receivableStatus(account.originalAmount, account.dueDate, account.allocations) : order.billing ? "Faturada" : "Não faturada";
                      return (
                        <tr key={order.id}>
                          <td><Link className="ops-number-link" href={`/ops/${order.id}`}>OP {order.number}</Link><span className="ops-muted">{formatDate(order.entryDate)}</span></td>
                          <td>{order.customer.name}</td>
                          <td><strong>{order.product.reference || "—"}</strong><span className="ops-muted">{order.product.name} · {order.product.color || "sem cor"}</span></td>
                          <td>{order.quantity.toLocaleString("pt-BR")}</td>
                          <td>{order.expectedCompletionDate ? <><span>{formatDate(order.expectedCompletionDate)}</span>{orderLate ? <span className="ops-danger-note">{daysLateLabel(order.expectedCompletionDate, today)}</span> : null}</> : "—"}</td>
                          <td><StatusChip variant={lifecycleVariant(lifecycle)}>{lifecycleLabel[lifecycle]}</StatusChip><span className="ops-muted">Serviços {progress.completed}/{progress.total}</span></td>
                          <td><div className="ops-chip-list">{order.isUrgent ? <StatusChip variant="danger">URGENTE</StatusChip> : null}{isLate ? <StatusChip variant="danger">ATRASADA</StatusChip> : null}{hasIssue ? <StatusChip variant="warning">PENDÊNCIA</StatusChip> : null}{mounting === "PARTIALLY_AVAILABLE" ? <StatusChip variant="warning">COMPLEMENTO</StatusChip> : null}{lifecycle === "CONCLUIDA" ? <StatusChip variant="info">A FATURAR</StatusChip> : null}</div></td>
                          <td>{financial}<span className="ops-muted">Previsto {formatCurrency(calculateOrderTotal(order.quantity, order.unitPrice))}</span>{account ? <span className="ops-muted">Saldo {formatCurrency(receivableRemainingAmount(account.originalAmount, account.allocations))}</span> : null}</td>
                          <td><Button href={`/ops/${order.id}`} size="sm" variant="secondary">Abrir OP</Button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </DataTable>
            </div>
            <div className="ops-card-list">
              {orders.map(({ order, lifecycle, progress, isLate, orderLate, hasIssue, mounting }) => (
                <article className="ops-list-card" key={order.id}>
                  <div className="ops-list-card-header"><div><Link href={`/ops/${order.id}`}>OP {order.number}</Link><span>{order.customer.name}</span></div><StatusChip variant={lifecycleVariant(lifecycle)}>{lifecycleLabel[lifecycle]}</StatusChip></div>
                  <p><strong>{order.product.reference || "—"}</strong> · {order.product.name} · {order.product.color || "sem cor"}</p>
                  <dl><div><dt>Quantidade</dt><dd>{order.quantity.toLocaleString("pt-BR")}</dd></div><div><dt>Prazo</dt><dd>{order.expectedCompletionDate ? formatDate(order.expectedCompletionDate) : "—"}{orderLate && order.expectedCompletionDate ? ` · ${daysLateLabel(order.expectedCompletionDate, today)}` : ""}</dd></div><div><dt>Serviços</dt><dd>{progress.completed}/{progress.total}</dd></div></dl>
                  <div className="ops-chip-list">{order.isUrgent ? <StatusChip variant="danger">URGENTE</StatusChip> : null}{isLate ? <StatusChip variant="danger">ATRASADA</StatusChip> : null}{hasIssue ? <StatusChip variant="warning">PENDÊNCIA</StatusChip> : null}{mounting === "PARTIALLY_AVAILABLE" ? <StatusChip variant="warning">COMPLEMENTO</StatusChip> : null}</div>
                  <Button href={`/ops/${order.id}`} variant="secondary">Abrir OP</Button>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
