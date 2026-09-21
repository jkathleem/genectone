import Link from "next/link";
import { Feedback } from "@/components/feedback";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/format";
import { currentUser } from "@/modules/auth/session";
import { getContractorPortal, requireContractorPortalUser, type ContractorPortalParams } from "@/modules/contractor-portal/queries";
import { issueLabels, issueStatusLabels, serviceStatusLabels, type PortalServiceCard, type PortalServiceFilter } from "@/modules/contractor-portal/domain";

const filters: [PortalServiceFilter, string][] = [
  ["all", "Todos"],
  ["active", "Em andamento"],
  ["partial", "Parciais"],
  ["late", "Atrasados"],
  ["completed", "Concluídos"],
  ["issue", "Com pendência"],
];

const statusTone: Record<PortalServiceCard["status"], "success" | "danger" | "warning" | "neutral"> = {
  AWAITING_SHIPMENT: "neutral",
  IN_PROGRESS: "warning",
  PARTIAL: "warning",
  COMPLETED: "success",
  LATE: "danger",
  BLOCKED_BY_ISSUE: "warning",
};

function statusClass(status: PortalServiceCard["status"]) {
  const tone = statusTone[status];
  if (tone === "success") return "status-active";
  if (tone === "danger") return "status-danger";
  if (tone === "warning") return "status-warning";
  return "status-inactive";
}

function filterHref(params: ContractorPortalParams, filter: PortalServiceFilter) {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  query.set("filter", filter);
  return `/portal?${query.toString()}#minhas-ops`;
}

function formatNumber(value: number | null | undefined) {
  return value == null ? "—" : value.toLocaleString("pt-BR");
}

export default async function ContractorPortalPage({ searchParams }: { searchParams: Promise<ContractorPortalParams & { success?: string; error?: string }> }) {
  const [user, params] = await Promise.all([currentUser(), searchParams]);
  requireContractorPortalUser(user);
  const portal = await getContractorPortal(user, params);
  return <div className="space-y-5">
    <PageHeader title={`Olá, ${portal.contractor.name}`} description="Aqui estão seus serviços, pendências e pagamentos."/>
    <Feedback success={params.success} error={params.error}/>
    <section className="portal-hero-grid" aria-label="Resumo do portal">
      <article className="portal-summary-card"><span>Serviços em andamento</span><strong>{portal.indicators.inProgress}</strong></article>
      <article className="portal-summary-card"><span>Pendências abertas</span><strong>{portal.indicators.openIssues}</strong></article>
      <article className="portal-summary-card"><span>Produzido ainda não fechado</span><strong>{formatCurrency(portal.financial.summary.waitingSettlement)}</strong></article>
      <article className="portal-summary-card"><span>Fechado, aguardando pagamento</span><strong>{formatCurrency(portal.financial.summary.waitingPayment)}</strong></article>
    </section>
    <section className="panel" id="minhas-ops">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="section-title">Minhas OPs em andamento</h2>
          <p className="text-sm text-slate-500">Cada card mostra um serviço vinculado ao seu cadastro.</p>
        </div>
        <form className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-80 sm:flex-row">
          <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" defaultValue={portal.filters.q} name="q" placeholder="Buscar OP, referência, produto ou serviço"/>
          <input name="filter" type="hidden" value={portal.filters.filter}/>
          <button className="button-primary" type="submit">Buscar</button>
        </form>
      </div>
      <nav className="filter-tabs mb-4" aria-label="Filtros do portal">{filters.map(([value, label]) => <Link className={portal.filters.filter === value ? "active" : ""} href={filterHref(params, value)} key={value}>{label}</Link>)}</nav>
      {portal.services.length ? <div className="portal-card-grid">{portal.services.map((service) => <Link className="portal-service-card" href={`/portal/ops/${service.id}`} key={service.id}>
        <div className="portal-service-card-header">
          <div><strong>OP {service.orderNumber}</strong><p>{service.reference} • {service.productName}</p></div>
          <span className={statusClass(service.status)}>{serviceStatusLabels[service.status]}</span>
        </div>
        <p className="portal-service-name">{service.serviceName}</p>
        <dl className="portal-card-facts">
          <div><dt>Cor</dt><dd>{service.color}</dd></div>
          <div><dt>Quantidade</dt><dd>{formatNumber(service.plannedQuantity ?? service.orderQuantity)}</dd></div>
          <div><dt>Enviado</dt><dd>{formatNumber(service.sentQuantity)}</dd></div>
          <div><dt>Retornado</dt><dd>{formatNumber(service.returnedQuantity)}</dd></div>
          <div><dt>Pendente</dt><dd>{formatNumber(service.pendingQuantity)}</dd></div>
          <div><dt>Envio</dt><dd>{service.lastDepartureDate ? formatDate(service.lastDepartureDate) : "—"}</dd></div>
          <div><dt>Prazo</dt><dd>{service.expectedReturnDate ? formatDate(service.expectedReturnDate) : "—"}</dd></div>
        </dl>
        {service.hasOpenIssue ? <p className="portal-card-alert">{service.openIssueCount} pendência(s) aberta(s)</p> : null}
        <span className="portal-card-cta">Ver serviço</span>
      </Link>)}</div> : <p className="empty-state">Nenhum serviço encontrado para os filtros atuais.</p>}
    </section>
    <section className="panel" id="pendencias">
      <h2 className="section-title mb-3">Minhas pendências</h2>
      {portal.issues.length ? <div className="portal-list">{portal.issues.map((issue) => <article className="portal-list-card" key={issue.id}>
        <div className="portal-list-card-head">
          <div><strong>OP {issue.orderNumber}</strong><p>{issue.serviceName}</p></div>
          <span className={issue.status === "RESOLVED" ? "status-active" : issue.status === "IN_PROGRESS" ? "status-warning" : "status-danger"}>{issueStatusLabels[issue.status]}</span>
        </div>
        <p className="portal-list-card-title">{issueLabels[issue.type]}</p>
        <p>{issue.description}</p>
        <small>{formatDate(issue.createdAt)}</small>
      </article>)}</div> : <p className="empty-state">Nenhuma pendência registrada.</p>}
    </section>
    <section className="panel" id="financeiro">
      <h2 className="section-title mb-4">Financeiro</h2>
      <div className="portal-finance-grid">
        <div className="portal-finance-block">
          <span>Produzido</span>
          <strong>{formatCurrency(portal.financial.summary.waitingSettlement)}</strong>
          <p>Produzido ainda não fechado</p>
          {portal.financial.waitingSettlementItems.length ? <div className="portal-mini-list">{portal.financial.waitingSettlementItems.map((item) => <article key={item.outsourcedServiceId}>
            <div><strong>OP {item.orderNumber}</strong><span>{item.serviceName}</span></div>
            <strong>{formatCurrency(item.value)}</strong>
            <small>{item.quantity} un. × {formatCurrency(item.unitPrice)}</small>
          </article>)}</div> : <p className="empty-state">Nenhum valor aguardando fechamento.</p>}
        </div>
        <div className="portal-finance-block">
          <span>Fechado</span>
          <strong>{formatCurrency(portal.financial.summary.waitingPayment)}</strong>
          <p>Fechado, aguardando pagamento</p>
          {portal.financial.waitingPaymentItems.length ? <div className="portal-mini-list">{portal.financial.waitingPaymentItems.map((item) => <article key={item.accountPayableId}>
            <div><strong>{item.reference}</strong><span>Vence em {formatDate(item.dueDate)}</span></div>
            <strong>{formatCurrency(item.balance)}</strong>
            <small>Pago: {formatCurrency(item.paidAmount)} de {formatCurrency(item.originalAmount)}</small>
          </article>)}</div> : <p className="empty-state">Nenhum fechamento aprovado aguardando pagamento.</p>}
        </div>
        <div className="portal-finance-block">
          <span>Pago</span>
          <strong>{formatCurrency(portal.financial.summary.paidThisMonth)}</strong>
          <p>Pago neste mês</p>
          <Button href="/portal#pagamentos" variant="secondary" size="sm">Ver pagamentos</Button>
        </div>
      </div>
      <div className="mt-5" id="pagamentos">
        <h3 className="mb-2 text-sm font-semibold">Histórico de pagamentos</h3>
        {portal.financial.paymentHistory.length ? <div className="portal-list">{portal.financial.paymentHistory.map((payment) => <article className="portal-list-card" key={payment.id}>
          <div className="portal-list-card-head">
            <div><strong>{formatCurrency(payment.amount)}</strong><p>Fechamento {payment.reference}</p></div>
            <span className={payment.effective ? "status-active" : "status-danger"}>{payment.effective ? "Pago" : "Estornado"}</span>
          </div>
          <p>{formatDate(payment.paymentDate)}</p>
          <small>{payment.notes ?? "Sem observação"}</small>
        </article>)}</div> : <p className="empty-state">Nenhum pagamento registrado.</p>}
      </div>
    </section>
  </div>;
}
