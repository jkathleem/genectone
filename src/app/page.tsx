import Link from "next/link";
import { Feedback } from "@/components/feedback";
import { PageHeader } from "@/components/page-header";
import { formatDate } from "@/lib/format";
import { currentUser } from "@/modules/auth/session";
import { getOperationalDashboard, type OperationalDashboardParams } from "@/modules/production-orders/dashboard-queries";
import type { DashboardCard } from "@/modules/production-orders/dashboard";

const filterOptions = [
  ["all", "Todos"],
  ["pending", "Pendentes"],
  ["partial", "Parciais"],
  ["late", "Atrasados"],
  ["urgent", "Urgentes"],
  ["issue", "Com pendência"],
  ["assembly-waiting", "Aguardando complemento"],
  ["completed", "Concluídos"],
] as const;

const statusLabel: Record<DashboardCard["status"], string> = {
  PENDENTE: "Pendente",
  PARCIAL: "Parcial",
  CONCLUIDO: "Concluído",
  AGUARDANDO_COMPLEMENTO: "Aguardando complemento",
  COMPLETA_PARA_MONTAGEM: "Completa para montagem",
};

function statusClass(card: DashboardCard) {
  if (card.isBlocked) return "status-warning";
  if (card.isLate) return "status-danger";
  if (card.status === "CONCLUIDO" || card.status === "COMPLETA_PARA_MONTAGEM") return "status-active";
  if (card.status === "PARCIAL" || card.status === "AGUARDANDO_COMPLEMENTO") return "status-warning";
  return "status-inactive";
}

function KanbanCard({ card }: { card: DashboardCard }) {
  return <Link className={`kanban-card ${card.isLate ? "kanban-card-danger" : ""} ${card.isBlocked ? "kanban-card-blocked" : ""}`} href={`/ops/${card.orderId}`}>
    <div className="flex items-start justify-between gap-2">
      <div>
        <strong>OP {card.orderNumber}</strong>
        <p>{card.reference} · {card.color} · {card.quantity.toLocaleString("pt-BR")}</p>
      </div>
      {card.isUrgent ? <span className="status-info">Urgente</span> : null}
    </div>
    <div className="mt-2">
      <p className="font-semibold text-slate-800">{card.serviceName}</p>
      <p className="text-slate-500">{card.responsibleName} · {card.customerName}</p>
    </div>
    <div className="mt-2 flex flex-wrap gap-1">
      <span className={statusClass(card)}>{card.isBlocked ? "Bloqueado por pendência" : statusLabel[card.status]}</span>
      {card.hasIssue && !card.isBlocked ? <span className="status-warning">Pendência</span> : null}
      {card.isLate && !card.isBlocked ? <span className="status-danger">Atrasado</span> : null}
    </div>
    <p className="mt-2 text-xs font-semibold text-slate-700">{card.progressLabel}</p>
    {card.pendingLabel ? <p className="text-xs text-amber-800">{card.pendingLabel}</p> : null}
    {card.completedNames.length ? <p className="mt-1 text-xs text-emerald-700">Concluídos: {card.completedNames.join(", ")}</p> : null}
    {card.waitingNames.length ? <p className="mt-1 text-xs text-amber-800">Aguardando: {card.waitingNames.join(", ")}</p> : null}
    {card.expectedDate ? <p className="mt-2 text-xs text-slate-500">Prazo {formatDate(card.expectedDate)}</p> : null}
  </Link>;
}

function Column({ title, cards, accent }: { title: string; cards: DashboardCard[]; accent?: boolean }) {
  return <section className={`kanban-column ${accent ? "kanban-column-accent" : ""}`}>
    <div className="kanban-column-header">
      <h3>{title}</h3>
      <span>{cards.length}</span>
    </div>
    <div className="kanban-column-scroll">
      {cards.length ? cards.map((card) => <KanbanCard card={card} key={card.key}/>) : <p className="empty-kanban">Sem cards pelos filtros atuais.</p>}
    </div>
  </section>;
}

export default async function Home({ searchParams }: { searchParams: Promise<OperationalDashboardParams & { error?: string }> }) {
  const [user, params] = await Promise.all([currentUser(), searchParams]);
  if (!user) return null;
  const accessError = params.error === "acesso-negado" ? "Você não possui permissão para acessar essa área." : undefined;
  if (user.role === "CONTRACTOR") {
    return <><PageHeader title="Genect" description="Acesso do terceirizado será tratado no portal próprio da próxima etapa."/><Feedback error={accessError}/><section className="panel"><p className="text-sm text-slate-600">O painel operacional geral é restrito à equipe interna da Genect.</p></section></>;
  }
  const { dashboard, filters, options } = await getOperationalDashboard(params);
  const mayCreate = user.role === "ADMIN" || user.role === "OPERATIONS";
  const filterHref = (filter: string) => {
    const query = new URLSearchParams();
    if (params.q) query.set("q", params.q);
    query.set("filter", filter);
    if (params.customerId) query.set("customerId", params.customerId);
    if (params.productId) query.set("productId", params.productId);
    if (params.contractorId) query.set("contractorId", params.contractorId);
    if (params.serviceId) query.set("serviceId", params.serviceId);
    if (params.showCompleted === "yes") query.set("showCompleted", "yes");
    return `/?${query.toString()}`;
  };
  return <div className="space-y-5">
    <PageHeader title="Painel de Produção" description="Home operacional derivada das OPs, serviços, retornos e pendências." action={mayCreate ? { label: "Nova OP", href: "/ops/nova" } : undefined}/>
    <Feedback error={accessError}/>
    <form className="panel operational-filters">
      <label className="field">Busca rápida<input defaultValue={filters.q ?? ""} name="q" placeholder="OP, referência, Produto ou Cliente"/></label>
      <label className="field">Cliente<select defaultValue={filters.customerId ?? ""} name="customerId"><option value="">Todos</option>{options.customers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="field">Produto<select defaultValue={filters.productId ?? ""} name="productId"><option value="">Todos</option>{options.products.map((item) => <option key={item.id} value={item.id}>{item.reference ? `${item.reference} — ${item.name}` : item.name}</option>)}</select></label>
      <label className="field">Terceirizado<select defaultValue={filters.contractorId ?? ""} name="contractorId"><option value="">Todos</option>{options.contractors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="field">Serviço<select defaultValue={filters.serviceId ?? ""} name="serviceId"><option value="">Todos</option>{options.services.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <input name="filter" type="hidden" value={filters.filter ?? "all"}/>
      <label className="mt-6 flex items-center gap-2 text-sm font-semibold text-slate-600"><input defaultChecked={filters.showCompleted} name="showCompleted" type="checkbox" value="yes"/> Mostrar concluídos</label>
      <div className="mt-6 flex gap-2"><button className="button-primary" type="submit">Filtrar</button><Link className="button-secondary" href="/">Limpar</Link></div>
    </form>
    <nav className="filter-tabs" aria-label="Filtros rápidos">{filterOptions.map(([value, label]) => <Link className={filters.filter === value ? "active" : ""} href={filterHref(value)} key={value}>{label}</Link>)}</nav>
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <article className="summary-card"><span>Em produção</span><strong>{dashboard.indicators.activeOrders}</strong></article>
      <article className="summary-card"><span>Urgentes</span><strong>{dashboard.indicators.urgentOrders}</strong></article>
      <article className="summary-card"><span>Atrasadas</span><strong>{dashboard.indicators.lateItems}</strong></article>
      <article className="summary-card"><span>Aguardando complemento</span><strong>{dashboard.indicators.waitingComplement}</strong></article>
      <article className="summary-card"><span>Pendências abertas</span><strong>{dashboard.indicators.openIssues}</strong></article>
    </section>
    <section className="panel">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><h2 className="section-title">Precisam de atenção</h2><span className="text-xs text-slate-500">{dashboard.attention.length} ocorrência(s)</span></div>
      {dashboard.attention.length ? <div className="attention-list">{dashboard.attention.map((item) => <Link className={`attention-row attention-${item.severity}`} href={`/ops/${item.orderId}`} key={item.key}><strong>{item.title}</strong><span>{item.detail}</span></Link>)}</div> : <p className="empty-state">Nenhuma exceção relevante pelos filtros atuais.</p>}
    </section>
    <section className="kanban-board">
      <div>
        <h2 className="section-title mb-3">Setores Internos</h2>
        <div className="kanban-row">{dashboard.internalColumns.length ? dashboard.internalColumns.map((column) => <Column cards={column.cards} key={column.id} title={column.title}/>) : <p className="empty-state min-w-80">Nenhum serviço interno ativo pelos filtros.</p>}</div>
      </div>
      <div>
        <h2 className="section-title mb-3">Terceirizados</h2>
        <div className="kanban-row">{dashboard.contractorColumns.length ? dashboard.contractorColumns.map((column) => <Column cards={column.cards} key={column.id} title={column.title}/>) : <p className="empty-state min-w-80">Nenhum serviço terceirizado pelos filtros.</p>}</div>
      </div>
      <div>
        <h2 className="section-title mb-3">Montagem</h2>
        <div className="kanban-row"><Column accent cards={dashboard.assemblyColumn.cards} title="Montagem"/></div>
      </div>
    </section>
  </div>;
}
