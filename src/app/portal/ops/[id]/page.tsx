import Link from "next/link";
import { Feedback } from "@/components/feedback";
import { SubmitButton } from "@/components/submit-button";
import { formatCurrency, formatDate } from "@/lib/format";
import { currentUser } from "@/modules/auth/session";
import { createContractorIssue } from "@/modules/contractor-portal/actions";
import { getContractorServiceDetail, requireContractorPortalUser } from "@/modules/contractor-portal/queries";
import { issueLabels, issueStatusLabels, serviceStatusLabels } from "@/modules/contractor-portal/domain";

export default async function ContractorServiceDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ success?: string; error?: string }> }) {
  const [user, route, query] = await Promise.all([currentUser(), params, searchParams]);
  requireContractorPortalUser(user);
  const { service, card } = await getContractorServiceDetail(user, route.id);
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <Link className="link-button" href="/portal#minhas-ops">← Voltar ao portal</Link>
        <h1 className="mt-2 text-2xl font-bold">OP {card.orderNumber} • {card.serviceName}</h1>
        <p className="text-sm text-slate-500">{card.reference} • {card.productName} • {card.color}</p>
      </div>
      <span className={card.status === "COMPLETED" ? "status-active" : card.status === "LATE" ? "status-danger" : card.status === "BLOCKED_BY_ISSUE" || card.status === "PARTIAL" ? "status-warning" : "status-inactive"}>{serviceStatusLabels[card.status]}</span>
    </div>
    <Feedback success={query.success} error={query.error}/>
    <section className="panel">
      <h2 className="section-title mb-3">Detalhe restrito do serviço</h2>
      <dl className="detail-grid">
        <div><dt>OP</dt><dd>{card.orderNumber}</dd></div>
        <div><dt>Referência</dt><dd>{card.reference}</dd></div>
        <div><dt>Produto</dt><dd>{card.productName}</dd></div>
        <div><dt>Cor</dt><dd>{card.color}</dd></div>
        <div><dt>Serviço</dt><dd>{card.serviceName}</dd></div>
        <div><dt>Quantidade da OP</dt><dd>{card.orderQuantity.toLocaleString("pt-BR")}</dd></div>
        <div><dt>Quantidade prevista do serviço</dt><dd>{card.plannedQuantity?.toLocaleString("pt-BR") ?? "—"}</dd></div>
        <div><dt>Data de envio</dt><dd>{card.lastDepartureDate ? formatDate(card.lastDepartureDate) : "—"}</dd></div>
        <div><dt>Prazo previsto</dt><dd>{card.expectedReturnDate ? formatDate(card.expectedReturnDate) : "—"}</dd></div>
        <div><dt>Enviado</dt><dd>{card.sentQuantity.toLocaleString("pt-BR")}</dd></div>
        <div><dt>Entregue confirmado pela Genect</dt><dd>{card.returnedQuantity.toLocaleString("pt-BR")}</dd></div>
        <div><dt>Saldo</dt><dd>{card.pendingQuantity.toLocaleString("pt-BR")}</dd></div>
        <div><dt>Valor produzido aprovado</dt><dd>{formatCurrency(card.producedValue)}</dd></div>
      </dl>
    </section>
    <section className="grid gap-5 lg:grid-cols-2">
      <div className="panel">
        <h2 className="section-title mb-3">Entregas confirmadas</h2>
        {service.returns.length ? <div className="table-wrap"><table><thead><tr><th>Data</th><th>Quantidade</th><th>Observação</th></tr></thead><tbody>{service.returns.map((item) => <tr key={`${item.returnDate.toISOString()}-${item.quantity}`}><td>{formatDate(item.returnDate)}</td><td>{item.quantity}</td><td>{item.notes ?? "—"}</td></tr>)}</tbody></table></div> : <p className="empty-state">A Genect ainda não confirmou retorno deste serviço.</p>}
      </div>
      <div className="panel">
        <h2 className="section-title mb-3">Informar pendência</h2>
        <p className="mb-3 text-sm text-slate-500">A pendência será enviada para acompanhamento interno da Genect. O terceirizado não resolve pendências nesta etapa.</p>
        <form action={createContractorIssue} className="form-grid">
          <input name="outsourcedServiceId" type="hidden" value={service.id}/>
          <label className="field sm:col-span-2">Tipo<select name="type" required><option value="MISSING_THREAD">Falta de linha</option><option value="MISSING_TRIM">Falta de aviamento</option><option value="MISSING_COMPONENT">Falta de peça/componente</option><option value="QUANTITY_ISSUE">Problema com quantidade</option><option value="EXECUTION_QUESTION">Dúvida sobre execução</option><option value="OTHER">Outro</option></select></label>
          <label className="field sm:col-span-2">Descrição<textarea name="description" required rows={4}/></label>
          <div><SubmitButton>Registrar pendência</SubmitButton></div>
        </form>
      </div>
    </section>
    <section className="panel">
      <h2 className="section-title mb-3">Pendências deste serviço</h2>
      {service.operationalIssues.length ? <div className="table-wrap"><table><thead><tr><th>Tipo</th><th>Descrição</th><th>Data</th><th>Status</th></tr></thead><tbody>{service.operationalIssues.map((issue) => <tr key={issue.id}><td>{issueLabels[issue.type]}</td><td>{issue.description}</td><td>{formatDate(issue.createdAt)}</td><td><span className={issue.status === "RESOLVED" ? "status-active" : issue.status === "IN_PROGRESS" ? "status-warning" : "status-danger"}>{issueStatusLabels[issue.status]}</span></td></tr>)}</tbody></table></div> : <p className="empty-state">Nenhuma pendência registrada para este serviço.</p>}
    </section>
  </div>;
}
