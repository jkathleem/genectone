import Link from "next/link";
import { Feedback } from "@/components/feedback";
import { PageHeader } from "@/components/page-header";
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

function statusClass(status: PortalServiceCard["status"]) {
  if (status === "COMPLETED") return "status-active";
  if (status === "LATE") return "status-danger";
  if (status === "BLOCKED_BY_ISSUE" || status === "PARTIAL") return "status-warning";
  return "status-inactive";
}

function filterHref(params: ContractorPortalParams, filter: PortalServiceFilter) {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  query.set("filter", filter);
  return `/portal?${query.toString()}#minhas-ops`;
}

export default async function ContractorPortalPage({ searchParams }: { searchParams: Promise<ContractorPortalParams & { success?: string; error?: string }> }) {
  const [user, params] = await Promise.all([currentUser(), searchParams]);
  requireContractorPortalUser(user);
  const portal = await getContractorPortal(user, params);
  return <div className="space-y-5">
    <PageHeader title={portal.contractor.name} description={`Portal do Terceirizado • ${user.name}`}/>
    <Feedback success={params.success} error={params.error}/>
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
      <article className="summary-card"><span>Serviços em andamento</span><strong>{portal.indicators.inProgress}</strong></article>
      <article className="summary-card"><span>Prazo próximo</span><strong>{portal.indicators.dueSoon}</strong></article>
      <article className="summary-card"><span>Atrasados</span><strong>{portal.indicators.late}</strong></article>
      <article className="summary-card"><span>Pendências abertas</span><strong>{portal.indicators.openIssues}</strong></article>
      <article className="summary-card"><span>Aguardando fechamento</span><strong>{formatCurrency(portal.financial.summary.waitingSettlement)}</strong></article>
      <article className="summary-card"><span>Aguardando pagamento</span><strong>{formatCurrency(portal.financial.summary.waitingPayment)}</strong></article>
      <article className="summary-card"><span>Pago no mês</span><strong>{formatCurrency(portal.financial.summary.paidThisMonth)}</strong></article>
    </section>
    <section className="panel" id="minhas-ops">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="section-title">Minhas OPs</h2>
          <p className="text-sm text-slate-500">Cada card representa uma OP + Serviço vinculado ao seu cadastro.</p>
        </div>
        <form className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-80 sm:flex-row">
          <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" defaultValue={portal.filters.q} name="q" placeholder="Buscar OP, referência, produto ou serviço"/>
          <input name="filter" type="hidden" value={portal.filters.filter}/>
          <button className="button-primary" type="submit">Buscar</button>
        </form>
      </div>
      <nav className="filter-tabs mb-4" aria-label="Filtros do portal">{filters.map(([value, label]) => <Link className={portal.filters.filter === value ? "active" : ""} href={filterHref(params, value)} key={value}>{label}</Link>)}</nav>
      {portal.services.length ? <div className="portal-card-grid">{portal.services.map((service) => <Link className="portal-service-card" href={`/portal/ops/${service.id}`} key={service.id}>
        <div className="flex items-start justify-between gap-2">
          <div><strong>OP {service.orderNumber}</strong><p>{service.reference} • {service.productName}</p></div>
          <span className={statusClass(service.status)}>{serviceStatusLabels[service.status]}</span>
        </div>
        <dl className="portal-card-facts">
          <div><dt>Cor</dt><dd>{service.color}</dd></div>
          <div><dt>Qtd.</dt><dd>{service.orderQuantity.toLocaleString("pt-BR")}</dd></div>
          <div><dt>Serviço</dt><dd>{service.serviceName}</dd></div>
          <div><dt>Enviado</dt><dd>{service.sentQuantity.toLocaleString("pt-BR")}</dd></div>
          <div><dt>Recebido</dt><dd>{service.returnedQuantity.toLocaleString("pt-BR")}</dd></div>
          <div><dt>Saldo</dt><dd>{service.pendingQuantity.toLocaleString("pt-BR")}</dd></div>
          <div><dt>Envio</dt><dd>{service.lastDepartureDate ? formatDate(service.lastDepartureDate) : "—"}</dd></div>
          <div><dt>Prazo</dt><dd>{service.expectedReturnDate ? formatDate(service.expectedReturnDate) : "—"}</dd></div>
        </dl>
        {service.hasOpenIssue ? <p className="mt-3 text-xs font-semibold text-amber-800">{service.openIssueCount} pendência(s) em acompanhamento</p> : null}
      </Link>)}</div> : <p className="empty-state">Nenhum serviço encontrado para os filtros atuais.</p>}
    </section>
    <section className="panel" id="pendencias">
      <h2 className="section-title mb-3">Minhas pendências</h2>
      {portal.issues.length ? <div className="table-wrap"><table><thead><tr><th>OP</th><th>Serviço</th><th>Tipo</th><th>Descrição</th><th>Data</th><th>Status</th></tr></thead><tbody>{portal.issues.map((issue) => <tr key={issue.id}><td>OP {issue.orderNumber}</td><td>{issue.serviceName}</td><td>{issueLabels[issue.type]}</td><td>{issue.description}</td><td>{formatDate(issue.createdAt)}</td><td><span className={issue.status === "RESOLVED" ? "status-active" : issue.status === "IN_PROGRESS" ? "status-warning" : "status-danger"}>{issueStatusLabels[issue.status]}</span></td></tr>)}</tbody></table></div> : <p className="empty-state">Nenhuma pendência registrada.</p>}
    </section>
    <section className="panel" id="financeiro">
      <h2 className="section-title mb-4">Financeiro</h2>
      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold">Disponível para fechamento</h3>
          {portal.financial.waitingSettlementItems.length ? <div className="table-wrap"><table><thead><tr><th>OP</th><th>Serviço</th><th>Qtd.</th><th>Preço</th><th>Valor</th></tr></thead><tbody>{portal.financial.waitingSettlementItems.map((item) => <tr key={item.outsourcedServiceId}><td>OP {item.orderNumber}</td><td>{item.serviceName}</td><td>{item.quantity}</td><td>{formatCurrency(item.unitPrice)}</td><td>{formatCurrency(item.value)}</td></tr>)}</tbody></table></div> : <p className="empty-state">Nenhum valor aguardando fechamento.</p>}
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold">Fechado aguardando pagamento</h3>
          {portal.financial.waitingPaymentItems.length ? <div className="table-wrap"><table><thead><tr><th>Fechamento</th><th>Vencimento previsto</th><th>Valor</th><th>Pago</th><th>Saldo</th></tr></thead><tbody>{portal.financial.waitingPaymentItems.map((item) => <tr key={item.accountPayableId}><td>{item.reference}</td><td>{formatDate(item.dueDate)}</td><td>{formatCurrency(item.originalAmount)}</td><td>{formatCurrency(item.paidAmount)}</td><td>{formatCurrency(item.balance)}</td></tr>)}</tbody></table></div> : <p className="empty-state">Nenhum fechamento aprovado aguardando pagamento.</p>}
        </div>
      </div>
      <div className="mt-5">
        <h3 className="mb-2 text-sm font-semibold">Histórico de pagamentos</h3>
        {portal.financial.paymentHistory.length ? <div className="table-wrap"><table><thead><tr><th>Data</th><th>Fechamento</th><th>Valor</th><th>Situação</th><th>Observação</th></tr></thead><tbody>{portal.financial.paymentHistory.map((payment) => <tr key={payment.id}><td>{formatDate(payment.paymentDate)}</td><td>{payment.reference}</td><td>{formatCurrency(payment.amount)}</td><td><span className={payment.effective ? "status-active" : "status-danger"}>{payment.effective ? "Efetivo" : "Estornado"}</span></td><td>{payment.notes ?? "—"}</td></tr>)}</tbody></table></div> : <p className="empty-state">Nenhum pagamento registrado.</p>}
      </div>
    </section>
  </div>;
}
