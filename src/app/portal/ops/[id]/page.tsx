import Link from "next/link";
import { Feedback } from "@/components/feedback";
import { SubmitButton } from "@/components/submit-button";
import { AlertPanel } from "@/components/ui/alert-panel";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/format";
import { currentUser } from "@/modules/auth/session";
import { createContractorIssue } from "@/modules/contractor-portal/actions";
import { getContractorServiceDetail, requireContractorPortalUser } from "@/modules/contractor-portal/queries";
import { issueLabels, issueStatusLabels, serviceStatusLabels } from "@/modules/contractor-portal/domain";

function formatNumber(value: number | null | undefined) {
  return value == null ? "—" : value.toLocaleString("pt-BR");
}

export default async function ContractorServiceDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ success?: string; error?: string }> }) {
  const [user, route, query] = await Promise.all([currentUser(), params, searchParams]);
  requireContractorPortalUser(user);
  const { service, card } = await getContractorServiceDetail(user, route.id);
  const activeIssue = service.operationalIssues.find((issue) => issue.status === "OPEN" || issue.status === "IN_PROGRESS");
  const statusClass = card.status === "COMPLETED" ? "status-active" : card.status === "LATE" ? "status-danger" : card.status === "BLOCKED_BY_ISSUE" || card.status === "PARTIAL" ? "status-warning" : "status-inactive";
  const isLate = card.status === "LATE" || card.status === "BLOCKED_BY_ISSUE";
  const timeline = [
    ...service.deliveryNoteItems.map((item) => ({ date: item.deliveryNote.departureDate, title: `Envio ${item.deliveryNote.number}`, detail: `${formatNumber(item.quantity)} unidade(s) enviada(s)` })),
    ...service.returns.map((item) => ({ date: item.returnDate, title: "Retorno confirmado", detail: `${formatNumber(item.quantity)} unidade(s) • ${item.notes ?? "sem observação"}` })),
    ...service.operationalIssues.map((issue) => ({ date: issue.createdAt, title: issueLabels[issue.type], detail: `${issueStatusLabels[issue.status]} • ${issue.description}` })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());
  return <div className="space-y-5">
    <div className="portal-detail-header">
      <div>
        <Link className="link-button" href="/portal#minhas-ops">← Voltar ao portal</Link>
        <h1>OP {card.orderNumber}</h1>
        <p>{card.serviceName}</p>
        <small>{card.reference} • {card.productName} • {card.color}</small>
      </div>
      <span className={statusClass}>{serviceStatusLabels[card.status]}</span>
    </div>
    <Feedback success={query.success} error={query.error}/>
    {activeIssue ? <AlertPanel title="Pendência aberta" variant="warning">
      <p>{issueLabels[activeIssue.type]} — {activeIssue.description}</p>
      <p>Status: {issueStatusLabels[activeIssue.status]}</p>
    </AlertPanel> : null}
    <section className="portal-detail-grid">
      <article className="panel portal-detail-card">
        <h2 className="section-title">Situação</h2>
        <p className="portal-detail-status">{serviceStatusLabels[card.status]}</p>
        {isLate ? <p className="portal-late-text">Prazo vencido</p> : null}
        <p>Prazo: {card.expectedReturnDate ? formatDate(card.expectedReturnDate) : "não informado"}</p>
        <p>Último envio: {card.lastDepartureDate ? formatDate(card.lastDepartureDate) : "ainda sem envio"}</p>
      </article>
      <article className="panel portal-detail-card">
        <h2 className="section-title">Quantidades</h2>
        <dl className="portal-quantity-grid">
          <div><dt>Quantidade do serviço</dt><dd>{formatNumber(card.plannedQuantity ?? card.orderQuantity)}</dd></div>
          <div><dt>Enviado</dt><dd>{formatNumber(card.sentQuantity)}</dd></div>
          <div><dt>Retornado</dt><dd>{formatNumber(card.returnedQuantity)}</dd></div>
          <div><dt>Pendente</dt><dd>{formatNumber(card.pendingQuantity)}</dd></div>
          <div><dt>Aprovado</dt><dd>{formatNumber(service.approvedQuantity)}</dd></div>
        </dl>
      </article>
      <article className="panel portal-detail-card">
        <h2 className="section-title">Financeiro relacionado</h2>
        <p className="portal-money">{formatCurrency(card.producedValue)}</p>
        <p>Valor produzido aprovado para fechamento.</p>
      </article>
    </section>
    <section className="grid gap-5 lg:grid-cols-2">
      <div className="panel">
        <h2 className="section-title mb-3">Entregas confirmadas</h2>
        {service.returns.length ? <div className="portal-list">{service.returns.map((item) => <article className="portal-list-card" key={`${item.returnDate.toISOString()}-${item.quantity}`}>
          <div className="portal-list-card-head"><strong>{formatNumber(item.quantity)} unidade(s)</strong><span className="status-active">Confirmado</span></div>
          <p>{formatDate(item.returnDate)}</p>
          <small>{item.notes ?? "Sem observação"}</small>
        </article>)}</div> : <p className="empty-state">A Genect ainda não confirmou retorno deste serviço.</p>}
      </div>
      <div className="panel">
        <h2 className="section-title mb-3">Informar problema</h2>
        <p className="mb-3 text-sm text-slate-500">Conte o que está impedindo o serviço de continuar. A Genect vai acompanhar a pendência internamente.</p>
        <form action={createContractorIssue} className="form-grid">
          <input name="outsourcedServiceId" type="hidden" value={service.id}/>
          <label className="field sm:col-span-2">Tipo<select name="type" required><option value="MISSING_THREAD">Falta de linha</option><option value="MISSING_TRIM">Falta de aviamento</option><option value="MISSING_COMPONENT">Falta de peça/componente</option><option value="QUANTITY_ISSUE">Problema com quantidade</option><option value="EXECUTION_QUESTION">Dúvida sobre execução</option><option value="OTHER">Outro</option></select></label>
          <label className="field sm:col-span-2">Descrição<textarea name="description" required rows={4}/></label>
          <div className="sm:col-span-2"><SubmitButton>Enviar pendência</SubmitButton></div>
        </form>
      </div>
    </section>
    <section className="panel">
      <h2 className="section-title mb-3">Pendências deste serviço</h2>
      {service.operationalIssues.length ? <div className="portal-list">{service.operationalIssues.map((issue) => <article className="portal-list-card" key={issue.id}>
        <div className="portal-list-card-head">
          <strong>{issueLabels[issue.type]}</strong>
          <span className={issue.status === "RESOLVED" ? "status-active" : issue.status === "IN_PROGRESS" ? "status-warning" : "status-danger"}>{issueStatusLabels[issue.status]}</span>
        </div>
        <p>{issue.description}</p>
        <small>{formatDate(issue.createdAt)}</small>
      </article>)}</div> : <p className="empty-state">Nenhuma pendência registrada para este serviço.</p>}
    </section>
    <section className="panel">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="section-title">Histórico básico</h2>
        <Button href="/portal#minhas-ops" variant="secondary" size="sm">Voltar às minhas OPs</Button>
      </div>
      {timeline.length ? <ol className="portal-timeline">{timeline.map((event) => <li key={`${event.title}-${event.date.toISOString()}-${event.detail}`}>
        <time>{formatDate(event.date)}</time>
        <strong>{event.title}</strong>
        <p>{event.detail}</p>
      </li>)}</ol> : <p className="empty-state">Ainda não há movimentações registradas para este serviço.</p>}
    </section>
  </div>;
}
