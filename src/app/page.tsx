import Link from "next/link";
import { redirect } from "next/navigation";
import { Feedback } from "@/components/feedback";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageToolbar } from "@/components/ui/page-toolbar";
import { StatCard } from "@/components/ui/stat-card";
import { StatusChip } from "@/components/ui/status-chip";
import { formatDate } from "@/lib/format";
import { currentUser } from "@/modules/auth/session";
import { getOperationalDashboard, type OperationalDashboardParams } from "@/modules/production-orders/dashboard-queries";
import type { DashboardCard, DashboardColumn } from "@/modules/production-orders/dashboard";

const quickFilters = [
  ["all", "Todos"],
  ["urgent", "Urgentes"],
  ["late", "Atrasadas"],
  ["issue", "Com pendência"],
  ["assembly-waiting", "Aguardando complemento"],
  ["pending", "Pendentes"],
  ["partial", "Parciais"],
  ["completed", "Concluídos"],
] as const;

const statusLabel: Record<DashboardCard["status"], string> = {
  PENDENTE: "Pendente",
  PARCIAL: "Parcial",
  CONCLUIDO: "Concluído",
  AGUARDANDO_COMPLEMENTO: "Aguardando complemento",
  COMPLETA_PARA_MONTAGEM: "Completa para montagem",
};

const columnTypeLabel: Record<DashboardColumn["group"], string> = {
  internal: "Interno",
  contractor: "Terceirizado",
  assembly: "Montagem",
};

function cardStatusVariant(card: DashboardCard) {
  if (card.isBlocked || card.isLate) return "danger";
  if (card.status === "CONCLUIDO" || card.status === "COMPLETA_PARA_MONTAGEM") return "success";
  if (card.status === "PARCIAL" || card.status === "AGUARDANDO_COMPLEMENTO") return "warning";
  return "neutral";
}

function cardStatusLabel(card: DashboardCard) {
  if (card.isBlocked) return "Bloqueado por pendência";
  return statusLabel[card.status];
}

function cardTone(card: DashboardCard) {
  if (card.isBlocked) return "is-blocked";
  if (card.isLate) return "is-late";
  if (card.isUrgent) return "is-urgent";
  if (card.status === "COMPLETA_PARA_MONTAGEM") return "is-ready";
  if (card.status === "AGUARDANDO_COMPLEMENTO") return "is-waiting";
  return "";
}

function attentionAction(title: string) {
  if (title.includes("Pendência") || title.includes("Bloqueado")) return "Tratar pendência";
  if (title.includes("atrasado") || title.includes("vencida")) return "Cobrar responsável";
  if (title.includes("Aguardando complemento")) return "Acompanhar complemento";
  if (title.includes("urgente")) return "Priorizar OP";
  return "Abrir OP";
}

function KanbanCard({ card }: { card: DashboardCard }) {
  return (
    <Link className={`kanban-card ${cardTone(card)}`} href={`/ops/${card.orderId}`}>
      <div className="kanban-card-top">
        <strong>OP {card.orderNumber}</strong>
        <div>
          {card.isUrgent ? <StatusChip variant="danger">URGENTE</StatusChip> : null}
        </div>
      </div>
      <div className="kanban-card-product">
        <span>{card.reference}</span>
        <p>{card.productName}</p>
      </div>
      <p className="kanban-card-customer">{card.customerName}</p>
      <div className="kanban-card-service">
        <span>{card.kind === "assembly" ? "Montagem" : card.serviceName}</span>
        <strong>{card.responsibleName}</strong>
      </div>
      <div className="kanban-card-facts">
        <span>{card.quantity.toLocaleString("pt-BR")} peças</span>
        <span>{card.expectedDate ? `Prazo ${formatDate(card.expectedDate)}` : "Sem prazo específico"}</span>
      </div>
      <div className="kanban-card-status">
        <StatusChip variant={cardStatusVariant(card)}>{cardStatusLabel(card)}</StatusChip>
        {card.hasIssue && !card.isBlocked ? <StatusChip variant="warning">Pendência</StatusChip> : null}
        {card.isLate && !card.isBlocked ? <StatusChip variant="danger">Atrasado</StatusChip> : null}
      </div>
      <p className="kanban-card-progress">{card.progressLabel}</p>
      {card.pendingLabel ? <p className="kanban-card-note">{card.pendingLabel}</p> : null}
      {card.kind === "assembly" && card.completedNames.length ? <p className="kanban-card-note success">Chegou: {card.completedNames.join(", ")}</p> : null}
      {card.kind === "assembly" && card.waitingNames.length ? <p className="kanban-card-note warning">Aguardando: {card.waitingNames.join(", ")}</p> : null}
      <span className="kanban-card-cta">Abrir OP</span>
    </Link>
  );
}

function Column({ column, accent }: { column: DashboardColumn; accent?: boolean }) {
  const lateCount = column.cards.filter((card) => card.isLate && !card.isBlocked).length;
  const blockedCount = column.cards.filter((card) => card.isBlocked).length;

  return (
    <section className={`kanban-column ${accent ? "kanban-column-accent" : ""}`}>
      <div className="kanban-column-header">
        <div>
          <h3>{column.title}</h3>
          <p>{columnTypeLabel[column.group]}</p>
        </div>
        <div className="kanban-column-counters">
          {blockedCount ? <span className="danger">{blockedCount}</span> : null}
          {lateCount ? <span className="warning">{lateCount}</span> : null}
          <span>{column.cards.length}</span>
        </div>
      </div>
      <div className="kanban-column-scroll">
        {column.cards.length ? column.cards.map((card) => <KanbanCard card={card} key={card.key} />) : <p className="empty-kanban">Nenhuma OP neste responsável.</p>}
      </div>
    </section>
  );
}

export default async function Home({ searchParams }: { searchParams: Promise<OperationalDashboardParams & { error?: string }> }) {
  const [user, params] = await Promise.all([currentUser(), searchParams]);
  if (!user) return null;
  const accessError = params.error === "acesso-negado" ? "Você não possui permissão para acessar essa área." : undefined;
  if (user.role === "CONTRACTOR") {
    redirect(params.error === "acesso-negado" ? "/portal?error=acesso-negado" : "/portal");
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

  return (
    <div className="home-dashboard">
      <PageHeader title="Produção" description="Acompanhe OPs, responsáveis, pendências e montagem em tempo real." primaryAction={mayCreate ? { label: "Nova OP", href: "/ops/nova" } : undefined} />
      <Feedback error={accessError} />

      <section className="home-indicators">
        <StatCard label="Em produção" value={dashboard.indicators.activeOrders} helper="OPs abertas" variant="info" />
        <StatCard label="Urgentes" value={dashboard.indicators.urgentOrders} helper="prioridade marcada" variant={dashboard.indicators.urgentOrders ? "warning" : "neutral"} />
        <StatCard label="Atrasadas" value={dashboard.indicators.lateItems} helper="serviços ou prazos" variant={dashboard.indicators.lateItems ? "danger" : "neutral"} />
        <StatCard label="Aguardando complemento" value={dashboard.indicators.waitingComplement} helper="montagem parcial" variant={dashboard.indicators.waitingComplement ? "warning" : "neutral"} />
        <StatCard label="Pendências abertas" value={dashboard.indicators.openIssues} helper="bloqueios ativos" variant={dashboard.indicators.openIssues ? "warning" : "success"} />
      </section>

      <section className="panel home-attention">
        <div className="home-section-heading">
          <div>
            <h2 className="section-title">Precisam de atenção</h2>
            <p>Priorizado por bloqueio, atraso, complemento e urgência.</p>
          </div>
          <StatusChip variant={dashboard.attention.length ? "warning" : "success"}>{dashboard.attention.length} ocorrência(s)</StatusChip>
        </div>
        {dashboard.attention.length ? (
          <div className="attention-list">
            {dashboard.attention.map((item) => (
              <Link className={`attention-row attention-${item.severity}`} href={`/ops/${item.orderId}`} key={item.key}>
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.detail}</span>
                </div>
                <em>{attentionAction(item.title)}</em>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState title="Nenhuma exceção relevante" description="Não há bloqueios, atrasos ou complementos pendentes pelos filtros atuais." />
        )}
      </section>

      <PageToolbar>
        <form className="home-filters">
          <label className="field">Busca<input defaultValue={filters.q ?? ""} name="q" placeholder="OP, referência, Produto ou Cliente" /></label>
          <label className="field">Cliente<select defaultValue={filters.customerId ?? ""} name="customerId"><option value="">Todos</option>{options.customers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="field">Produto<select defaultValue={filters.productId ?? ""} name="productId"><option value="">Todos</option>{options.products.map((item) => <option key={item.id} value={item.id}>{item.reference ? `${item.reference} — ${item.name}` : item.name}</option>)}</select></label>
          <label className="field">Responsável<select defaultValue={filters.contractorId ?? ""} name="contractorId"><option value="">Todos os terceirizados</option>{options.contractors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="field">Serviço<select defaultValue={filters.serviceId ?? ""} name="serviceId"><option value="">Todos</option>{options.services.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <input name="filter" type="hidden" value={filters.filter ?? "all"} />
          <label className="home-checkbox"><input defaultChecked={filters.showCompleted} name="showCompleted" type="checkbox" value="yes" /> Mostrar concluídos</label>
          <div className="home-filter-actions">
            <button className="button-primary" type="submit">Filtrar</button>
            <Button href="/" variant="secondary">Limpar</Button>
          </div>
        </form>
        <nav className="home-quick-filters" aria-label="Filtros rápidos">
          {quickFilters.map(([value, label]) => (
            <Link className={filters.filter === value ? "active" : ""} href={filterHref(value)} key={value}>{label}</Link>
          ))}
        </nav>
      </PageToolbar>

      <section className="kanban-board">
        <div className="kanban-board-header">
          <div>
            <h2 className="section-title">Kanban operacional</h2>
            <p>A mesma OP pode aparecer em mais de uma coluna porque o quadro representa responsáveis e serviços.</p>
          </div>
          <StatusChip variant="info">{dashboard.totalCards} card(s)</StatusChip>
        </div>

        <div className="kanban-group">
          <div className="kanban-group-heading"><h3>Setores internos</h3><span>{dashboard.internalColumns.length} coluna(s)</span></div>
          <div className="kanban-row">
            {dashboard.internalColumns.length ? dashboard.internalColumns.map((column) => <Column column={column} key={column.id} />) : <div className="kanban-empty-wide"><EmptyState title="Nenhum serviço interno" description="Não há serviços internos ativos pelos filtros atuais." /></div>}
          </div>
        </div>

        <div className="kanban-group">
          <div className="kanban-group-heading"><h3>Terceirizados</h3><span>{dashboard.contractorColumns.length} coluna(s)</span></div>
          <div className="kanban-row">
            {dashboard.contractorColumns.length ? dashboard.contractorColumns.map((column) => <Column column={column} key={column.id} />) : <div className="kanban-empty-wide"><EmptyState title="Nenhum terceirizado" description="Não há serviços terceirizados pelos filtros atuais." /></div>}
          </div>
        </div>

        <div className="kanban-group">
          <div className="kanban-group-heading"><h3>Montagem</h3><span>{dashboard.assemblyColumn.cards.length} card(s)</span></div>
          <div className="kanban-row"><Column accent column={dashboard.assemblyColumn} /></div>
        </div>
      </section>
    </div>
  );
}
