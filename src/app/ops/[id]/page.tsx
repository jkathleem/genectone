import { notFound } from "next/navigation";
import { Feedback } from "@/components/feedback";
import { OpServiceForm } from "@/components/op-service-form";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { AlertPanel } from "@/components/ui/alert-panel";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { FormSection } from "@/components/ui/form-section";
import { StatCard } from "@/components/ui/stat-card";
import { StatusChip } from "@/components/ui/status-chip";
import { Tabs } from "@/components/ui/tabs";
import { prisma } from "@/lib/prisma";
import { dateInputValue, formatCurrency, formatDate, fortalezaDateInputValue } from "@/lib/format";
import { receivableRemainingAmount, receivableStatus, receivedAmount } from "@/modules/accounts-receivable/domain";
import { currentUser } from "@/modules/auth/session";
import { hasPermission } from "@/modules/auth/permissions";
import { derivedQuantities, mountingAvailability } from "@/modules/outsourcing/domain";
import { externalServiceProgress, isOutsourcedServiceLate, productionOrderLifecycleStatus, serviceProgressSummary } from "@/modules/production-orders/domain";
import { calculateOrderTotal } from "@/modules/production-orders/validation";
import { completeProductionOrder, updateProductionOrder, updateProductionOrderSupply } from "@/modules/production-orders/actions";
import {
  addExternalServiceFromOrder,
  addInternalServiceFromOrder,
  approveOutsourcedServiceFromOrder,
  changeIssueFromOrder,
  completeInternalService,
  createIssueFromOrder,
  receiveOutsourcedServiceFromOrder,
  sendOutsourcedServiceFromOrder,
} from "@/modules/production-orders/workspace-actions";

const tabs = [
  { id: "summary", label: "Resumo" },
  { id: "services", label: "Serviços" },
  { id: "supplies", label: "Insumos" },
  { id: "financial", label: "Financeiro" },
  { id: "history", label: "Histórico" },
] as const;

const statusLabel = {
  EM_PRODUCAO: "Em produção",
  CONCLUIDA: "Concluída / a faturar",
  FATURADA: "Faturada / aguardando recebimento",
  RECEBIDA: "Recebida",
};

const issueStatus = { OPEN: "Aberta", IN_PROGRESS: "Em tratamento", RESOLVED: "Resolvida" };
const issueType = {
  MISSING_THREAD: "Falta de linha",
  MISSING_TRIM: "Falta de aviamento",
  MISSING_COMPONENT: "Falta de componente",
  QUANTITY_ISSUE: "Divergência de quantidade",
  EXECUTION_QUESTION: "Dúvida de execução",
  OTHER: "Outra",
};

function serviceStatusLabel(status: "PENDENTE" | "PARCIAL" | "CONCLUIDO") {
  if (status === "CONCLUIDO") return "Concluído";
  if (status === "PARCIAL") return "Parcial";
  return "Pendente";
}

function mountingLabel(status: "NOT_AVAILABLE" | "PARTIALLY_AVAILABLE" | "FULLY_AVAILABLE") {
  if (status === "FULLY_AVAILABLE") return "Completa para montagem";
  if (status === "PARTIALLY_AVAILABLE") return "Aguardando complemento";
  return "Não liberada";
}

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; success?: string; error?: string }> }) {
  const { id } = await params;
  const [order, messages, user, capabilities] = await Promise.all([
    prisma.productionOrder.findUnique({
      where: { id },
      include: {
        company: true,
        customer: true,
        product: true,
        createdBy: { select: { name: true } },
        completedBy: { select: { name: true } },
        supplies: { orderBy: { supplyNameSnapshot: "asc" } },
        internalServices: { include: { service: true, internalSector: true, createdBy: { select: { name: true } }, completedBy: { select: { name: true } } }, orderBy: { createdAt: "asc" } },
        outsourcedServices: {
          include: {
            service: true,
            contractor: true,
            createdBy: { select: { name: true } },
            deliveryNoteItems: { include: { deliveryNote: true }, orderBy: { createdAt: "asc" } },
            returns: { orderBy: [{ returnDate: "asc" }, { createdAt: "asc" }] },
          },
          orderBy: { createdAt: "asc" },
        },
        operationalIssues: { include: { contractor: true, outsourcedService: { include: { service: true } }, createdBy: { select: { name: true } }, resolvedBy: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
        billing: { include: { accountReceivable: { include: { allocations: { include: { receipt: { include: { reversal: true } } }, orderBy: { createdAt: "asc" } } } } } },
      },
    }),
    searchParams,
    currentUser(),
    Promise.all([
      prisma.service.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
      prisma.contractor.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
      prisma.internalSector.findMany({ where: { active: true }, orderBy: [{ displayOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
      prisma.serviceContractor.findMany({ where: { active: true, unitPrice: { not: null }, service: { active: true }, contractor: { active: true } }, select: { serviceId: true, contractorId: true, unitPrice: true } }),
      prisma.serviceInternalSector.findMany({ where: { service: { active: true }, internalSector: { active: true } }, select: { serviceId: true, internalSectorId: true } }),
    ]),
  ]);

  if (!order || !user) notFound();

  const canOperate = hasPermission(user.role, "OPERATION_MUTATE");
  const canFinance = hasPermission(user.role, "FINANCE_MUTATE");
  const tab = tabs.some((item) => item.id === messages.tab) ? messages.tab! : "summary";
  const [services, contractors, sectors, externalCapabilities, internalCapabilities] = capabilities;
  const today = fortalezaDateInputValue();

  const external = order.outsourcedServices.map((item) => ({ item, quantities: derivedQuantities(item.deliveryNoteItems, item.returns) }));
  const statuses = [
    ...external.map(({ quantities }) => externalServiceProgress(quantities.sentQuantity, quantities.returnedQuantity)),
    ...order.internalServices.map((item) => (item.completedAt ? ("CONCLUIDO" as const) : ("PENDENTE" as const))),
  ];
  const progress = serviceProgressSummary(statuses);
  const mounting = mountingAvailability(order.outsourcedServices);
  const completeExternal = external.filter(({ quantities }) => quantities.sentQuantity > 0 && quantities.pendingQuantity <= 0);
  const pendingExternal = external.filter(({ quantities }) => !(quantities.sentQuantity > 0 && quantities.pendingQuantity <= 0));
  const activeIssues = order.operationalIssues.filter((item) => item.status !== "RESOLVED");
  const activeIssueCount = activeIssues.length;
  const total = calculateOrderTotal(order.quantity, order.unitPrice);
  const lifecycle = productionOrderLifecycleStatus(order);
  const account = order.billing?.accountReceivable;
  const received = account ? receivedAmount(account.allocations) : null;
  const balance = account ? receivableRemainingAmount(account.originalAmount, account.allocations) : null;
  const overdueOrder = Boolean(order.expectedCompletionDate && !order.completedAt && order.expectedCompletionDate < new Date());
  const lateExternal = external.filter(({ item, quantities }) => isOutsourcedServiceLate(item.expectedReturnDate, quantities.sentQuantity, quantities.returnedQuantity));
  const billedStatus = account ? receivableStatus(account.originalAmount, account.dueDate, account.allocations) : order.billing ? "Faturada" : "Ainda não faturada";
  const nextAction = order.completedAt ? (order.billing ? "Acompanhar recebimento" : "Registrar faturamento") : activeIssueCount ? "Tratar pendências" : mounting === "PARTIALLY_AVAILABLE" ? "Aguardar complemento" : mounting === "FULLY_AVAILABLE" ? "Concluir produção" : "Avançar serviços";

  const timeline: { at: Date; label: string; detail: string }[] = [{ at: order.createdAt, label: "OP criada", detail: order.createdBy?.name || "Autor histórico não identificado" }];
  for (const item of order.outsourcedServices) {
    timeline.push({ at: item.createdAt, label: "Serviço terceirizado adicionado", detail: `${item.service.name} — ${item.contractor.name} · ${item.createdBy?.name || "Autor histórico não identificado"}` });
    for (const sent of item.deliveryNoteItems) timeline.push({ at: sent.deliveryNote.departureDate, label: "Envio registrado", detail: `${item.contractor.name} · ${sent.quantity} peça(s) · Romaneio ${sent.deliveryNote.number}` });
    for (const returned of item.returns) timeline.push({ at: returned.returnDate, label: "Retorno registrado", detail: `${item.contractor.name} · ${returned.quantity} peça(s)${returned.notes ? ` · ${returned.notes}` : ""}` });
    if (item.approvedQuantity > 0) timeline.push({ at: item.updatedAt, label: "Quantidade aprovada", detail: `${item.service.name} · ${item.approvedQuantity} peça(s)` });
  }
  for (const item of order.internalServices) {
    timeline.push({ at: item.createdAt, label: "Serviço interno adicionado", detail: `${item.service.name} — ${item.internalSector.name} · ${item.createdBy?.name || "Autor histórico não identificado"}` });
    if (item.completedAt) timeline.push({ at: item.completedAt, label: "Serviço interno concluído", detail: `${item.service.name} · ${item.completedBy?.name || "Autor histórico não identificado"}` });
  }
  for (const issue of order.operationalIssues) {
    timeline.push({ at: issue.createdAt, label: "Pendência aberta", detail: `${issueType[issue.type]} · ${issue.description} · ${issue.createdBy.name}` });
    if (issue.status === "IN_PROGRESS") timeline.push({ at: issue.updatedAt, label: "Pendência em tratamento", detail: issue.description });
    if (issue.resolvedAt) timeline.push({ at: issue.resolvedAt, label: "Pendência resolvida", detail: `${issue.description} · ${issue.resolvedBy?.name || "Autor não identificado"}` });
  }
  if (order.completedAt) timeline.push({ at: order.completedAt, label: "Produção concluída", detail: order.completedBy?.name || "Autor histórico não identificado" });
  if (order.billing) timeline.push({ at: order.billing.issueDate, label: "Faturamento registrado", detail: `NFe ${order.billing.invoiceNumber} · ${formatCurrency(order.billing.amount)}` });
  if (account) {
    for (const allocation of account.allocations) {
      timeline.push({ at: allocation.receipt.receiptDate, label: allocation.receipt.reversal ? "Recebimento estornado" : "Recebimento registrado", detail: `${formatCurrency(allocation.amount)}${allocation.receipt.notes ? ` · ${allocation.receipt.notes}` : ""}` });
    }
  }
  timeline.sort((a, b) => b.at.getTime() - a.at.getTime());

  return (
    <>
      <PageHeader
        title={`OP ${order.number}`}
        description="Workspace operacional da ordem, da entrada ao recebimento."
        breadcrumb={[
          { label: "OPs", href: "/ops" },
          { label: `OP ${order.number}` },
        ]}
        secondaryActions={[{ label: "Voltar ao Cadastro de OPs", href: "/ops" }]}
      />
      <Feedback success={messages.success} error={messages.error} />

      <section className="op-entity-header">
        <div className="op-entity-main">
          <div>
            <div className="op-title-row">
              <h2>OP {order.number}</h2>
              <StatusChip variant={lifecycle === "RECEBIDA" ? "success" : lifecycle === "EM_PRODUCAO" ? "info" : "warning"}>{statusLabel[lifecycle]}</StatusChip>
              {order.isUrgent ? <StatusChip variant="danger">URGENTE</StatusChip> : null}
              {overdueOrder ? <StatusChip variant="danger">Atrasada</StatusChip> : null}
            </div>
            <p className="op-subtitle">
              {order.product.name} {order.product.reference ? `· ${order.product.reference}` : ""} {order.product.color ? `· ${order.product.color}` : ""}
            </p>
          </div>
          <div className="op-primary-actions">
            {canOperate && !order.completedAt ? <Button href={`/ops/${id}?tab=services`} variant="primary">Operar serviços</Button> : null}
            {canFinance && order.completedAt && !order.billing ? <Button href={`/ops/${id}/faturamento/novo`} variant="primary">Registrar faturamento</Button> : null}
            {order.billing && account ? <Button href={`/financeiro/contas-a-receber/${account.id}`} variant="secondary">Conta a Receber</Button> : null}
          </div>
        </div>
        <dl className="op-meta-grid">
          <div><dt>Cliente</dt><dd>{order.customer.name}</dd></div>
          <div><dt>Quantidade</dt><dd>{order.quantity.toLocaleString("pt-BR")} peças</dd></div>
          <div><dt>Prazo geral</dt><dd>{order.expectedCompletionDate ? formatDate(order.expectedCompletionDate) : "Não informado"}</dd></div>
          <div><dt>Conclusão</dt><dd>{order.completedAt ? formatDate(order.completedAt) : "Em produção"}</dd></div>
          <div><dt>Próxima ação</dt><dd>{nextAction}</dd></div>
        </dl>
      </section>

      <section className="op-first-fold">
        <StatCard label="Serviços" value={`${progress.completed} de ${progress.total}`} helper="concluídos" variant={progress.total > 0 && progress.completed === progress.total ? "success" : "info"} />
        <StatCard label="Pendências" value={activeIssueCount} helper={activeIssueCount ? "exigem atenção" : "sem bloqueio ativo"} variant={activeIssueCount ? "warning" : "success"} />
        <StatCard label="Montagem" value={mountingLabel(mounting)} helper={pendingExternal.length ? `Aguardando ${pendingExternal.map(({ item }) => item.contractor.name).join(", ")}` : "sem complemento pendente"} variant={mounting === "FULLY_AVAILABLE" ? "success" : mounting === "PARTIALLY_AVAILABLE" ? "warning" : "neutral"} />
        <StatCard label="Financeiro" value={billedStatus} helper={order.billing ? formatCurrency(order.billing.amount) : formatCurrency(total)} variant={account && balance?.lte(0) ? "success" : order.billing ? "info" : "neutral"} />
      </section>

      {(order.isUrgent || overdueOrder || activeIssueCount || lateExternal.length || mounting === "PARTIALLY_AVAILABLE") ? (
        <AlertPanel title="Atenção operacional" variant={activeIssueCount || overdueOrder || lateExternal.length ? "warning" : "info"}>
          <ul className="op-alert-list">
            {order.isUrgent ? <li>OP marcada como urgente.</li> : null}
            {overdueOrder ? <li>Prazo geral da OP vencido.</li> : null}
            {activeIssueCount ? <li>{activeIssueCount} pendência(s) aberta(s) ou em tratamento.</li> : null}
            {mounting === "PARTIALLY_AVAILABLE" ? <li>Aguardando complemento de: {pendingExternal.map(({ item }) => `${item.contractor.name} — ${item.service.name}`).join(", ")}.</li> : null}
            {lateExternal.map(({ item }) => <li key={item.id}>{item.service.name} com {item.contractor.name} está atrasado.</li>)}
          </ul>
        </AlertPanel>
      ) : null}

      <Tabs
        items={tabs.map((item) => ({
          label: item.label,
          href: `/ops/${id}?tab=${item.id}`,
          active: tab === item.id,
          badge: item.id === "services" ? `${progress.completed}/${progress.total}` : item.id === "supplies" ? order.supplies.length : item.id === "history" ? timeline.length : undefined,
        }))}
        label="Seções da OP"
      />

      {tab === "summary" ? (
        <div className="op-workspace-grid">
          <section className="panel">
            <h2 className="section-title">Situação da OP</h2>
            <dl className="op-fact-list">
              <div><dt>Status</dt><dd>{statusLabel[lifecycle]}</dd></div>
              <div><dt>Prazo</dt><dd>{order.expectedCompletionDate ? formatDate(order.expectedCompletionDate) : "Não informado"}</dd></div>
              <div><dt>Prioridade</dt><dd>{order.isUrgent ? "Urgente" : "Normal"}</dd></div>
              <div><dt>Conclusão</dt><dd>{order.completedAt ? formatDate(order.completedAt) : "Ainda em produção"}</dd></div>
            </dl>
          </section>
          <section className="panel">
            <h2 className="section-title">Produto</h2>
            <dl className="op-fact-list">
              <div><dt>Referência</dt><dd>{order.product.reference || "—"}</dd></div>
              <div><dt>Descrição</dt><dd>{order.product.name}</dd></div>
              <div><dt>Cor</dt><dd>{order.product.color || "—"}</dd></div>
              <div><dt>Quantidade</dt><dd>{order.quantity.toLocaleString("pt-BR")} peças</dd></div>
              <div><dt>Preço aplicado nesta OP</dt><dd>{formatCurrency(order.unitPrice)}</dd></div>
              <div><dt>Valor previsto</dt><dd>{formatCurrency(total)}</dd></div>
            </dl>
          </section>
          <section className="panel">
            <h2 className="section-title">Produção</h2>
            <dl className="op-fact-list">
              <div><dt>Terceirizados</dt><dd>{external.length || "Nenhum"}</dd></div>
              <div><dt>Setores internos</dt><dd>{order.internalServices.length || "Nenhum"}</dd></div>
              <div><dt>Montagem</dt><dd>{mountingLabel(mounting)}</dd></div>
              <div><dt>Pendências</dt><dd>{activeIssueCount ? `${activeIssueCount} ativa(s)` : "Sem pendência ativa"}</dd></div>
            </dl>
          </section>
          <section className="panel">
            <h2 className="section-title">Financeiro resumido</h2>
            <dl className="op-fact-list">
              <div><dt>Valor previsto</dt><dd>{formatCurrency(total)}</dd></div>
              <div><dt>Faturamento</dt><dd>{order.billing ? `${order.billing.invoiceNumber} · ${formatCurrency(order.billing.amount)}` : "Ainda não faturada"}</dd></div>
              <div><dt>Recebido</dt><dd>{received ? formatCurrency(received) : "—"}</dd></div>
              <div><dt>Saldo a receber</dt><dd>{balance ? formatCurrency(balance) : "—"}</dd></div>
            </dl>
            <p className="op-helper">Valor previsto não representa receita realizada. Receita nasce somente no faturamento.</p>
          </section>
          {canOperate ? (
            <section className="panel op-span-2">
              <div className="op-section-heading">
                <div>
                  <h2 className="section-title">Ações operacionais</h2>
                  <p>Campos editáveis enquanto a OP segue operacionalmente aberta.</p>
                </div>
              </div>
              <div className="op-action-grid">
                <FormSection title="Editar dados operacionais" description="Ajuste previsão, urgência e observações sem alterar fatos históricos.">
                  <form action={updateProductionOrder} className="form-grid">
                    <input name="id" type="hidden" value={order.id} />
                    <label className="field">Previsão de conclusão<input defaultValue={order.expectedCompletionDate ? dateInputValue(order.expectedCompletionDate) : ""} name="expectedCompletionDate" type="date" /></label>
                    <label className="op-checkbox"><input defaultChecked={order.isUrgent} name="isUrgent" type="checkbox" /> Marcar como urgente</label>
                    <label className="field sm:col-span-2 lg:col-span-3">Observações<textarea defaultValue={order.notes || ""} name="notes" rows={3} /></label>
                    <div><SubmitButton>Salvar dados operacionais</SubmitButton></div>
                  </form>
                </FormSection>
                {!order.completedAt ? (
                  <FormSection title="Concluir produção" description="A conclusão não cria faturamento, Conta a Receber ou receita.">
                    <form action={completeProductionOrder} className="op-inline-form">
                      <input name="id" type="hidden" value={order.id} />
                      <label className="field">Data da conclusão<input defaultValue={today} name="completionDate" required type="date" /></label>
                      <SubmitButton>Concluir produção</SubmitButton>
                    </form>
                  </FormSection>
                ) : null}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}

      {tab === "services" ? (
        <div className="op-tab-stack">
          <section className={`panel op-mounting-panel op-mounting-${mounting.toLowerCase().replace("_", "-")}`}>
            <div className="op-section-heading">
              <div>
                <h2 className="section-title">Disponibilidade para Montagem</h2>
                <p>{mountingLabel(mounting)}</p>
              </div>
              <StatusChip variant={mounting === "FULLY_AVAILABLE" ? "success" : mounting === "PARTIALLY_AVAILABLE" ? "warning" : "neutral"}>{mountingLabel(mounting)}</StatusChip>
            </div>
            <div className="op-mounting-details">
              {completeExternal.length ? <p><strong>Concluídos:</strong> {completeExternal.map(({ item }) => `${item.contractor.name} — ${item.service.name}`).join(", ")}</p> : <p><strong>Concluídos:</strong> nenhum serviço terceirizado completo ainda.</p>}
              {pendingExternal.length ? <p><strong>Aguardando:</strong> {pendingExternal.map(({ item }) => `${item.contractor.name} — ${item.service.name}`).join(", ")}</p> : <p><strong>Aguardando:</strong> nenhum complemento pendente.</p>}
            </div>
          </section>

          {canOperate && !order.completedAt ? (
            <section className="panel">
              <details>
                <summary className="op-details-summary">Adicionar serviço à OP</summary>
                <div className="op-details-body">
                  <OpServiceForm orderId={id} orderQuantity={order.quantity} services={services} contractors={contractors} sectors={sectors} externalCapabilities={externalCapabilities.map((item) => ({ ...item, price: item.unitPrice!.toFixed(4) }))} internalCapabilities={internalCapabilities} externalAction={addExternalServiceFromOrder} internalAction={addInternalServiceFromOrder} />
                </div>
              </details>
            </section>
          ) : null}

          <section className="op-service-list">
            <div className="op-section-heading">
              <div>
                <h2 className="section-title">Serviços terceirizados</h2>
                <p>Envios, retornos, aprovação e pendências ficam separados para reduzir risco operacional.</p>
              </div>
            </div>
            {!external.length ? (
              <EmptyState title="Nenhum serviço terceirizado" description="Adicione serviços quando a OP precisar de execução externa." />
            ) : (
              external.map(({ item, quantities }) => {
                const status = externalServiceProgress(quantities.sentQuantity, quantities.returnedQuantity);
                const planned = item.plannedQuantity ?? order.quantity;
                const availableToSend = Math.max(0, planned - quantities.sentQuantity);
                const availableToApprove = Math.max(0, quantities.returnedQuantity - item.approvedQuantity);
                const serviceIssues = order.operationalIssues.filter((issue) => issue.outsourcedServiceId === item.id);
                return (
                  <article className="op-service-card" key={item.id}>
                    <div className="op-service-card-header">
                      <div>
                        <div className="op-service-title">
                          <h3>{item.service.name}</h3>
                          <StatusChip variant={status === "CONCLUIDO" ? "success" : status === "PARCIAL" ? "warning" : "neutral"}>{serviceStatusLabel(status)}</StatusChip>
                          {isOutsourcedServiceLate(item.expectedReturnDate, quantities.sentQuantity, quantities.returnedQuantity) ? <StatusChip variant="danger">Atrasado</StatusChip> : null}
                        </div>
                        <p>Terceirizado · {item.contractor.name}</p>
                      </div>
                      <Button href={`/ops/${id}/servicos/${item.id}/editar`} variant="secondary" size="sm">Editar</Button>
                    </div>

                    <div className="op-service-metrics">
                      <div><span>Prevista</span><strong>{planned}</strong></div>
                      <div><span>Enviada</span><strong>{quantities.sentQuantity}</strong></div>
                      <div><span>Retornada</span><strong>{quantities.returnedQuantity}</strong></div>
                      <div><span>Aprovada</span><strong>{item.approvedQuantity}</strong></div>
                      <div><span>Pendente fora</span><strong>{quantities.pendingQuantity}</strong></div>
                      <div><span>Prazo</span><strong>{item.expectedReturnDate ? formatDate(item.expectedReturnDate) : "—"}</strong></div>
                      <div><span>Preço aplicado</span><strong>{formatCurrency(item.appliedUnitPrice)}</strong></div>
                      <div><span>Valor elegível</span><strong>{formatCurrency(item.appliedUnitPrice.mul(item.approvedQuantity))}</strong></div>
                    </div>

                    {serviceIssues.length ? (
                      <div className="op-service-issues">
                        {serviceIssues.map((issue) => (
                          <AlertPanel key={issue.id} variant={issue.status === "RESOLVED" ? "success" : "warning"} title={`${issueType[issue.type]} · ${issueStatus[issue.status]}`}>
                            <p>{issue.description}</p>
                          </AlertPanel>
                        ))}
                      </div>
                    ) : null}

                    {canOperate && !order.completedAt ? (
                      <div className="op-service-actions">
                        {availableToSend > 0 ? (
                          <form action={sendOutsourcedServiceFromOrder} className="op-action-panel">
                            <h4>Registrar envio</h4>
                            <p>Disponível para envio: {availableToSend} peça(s).</p>
                            <input name="orderId" type="hidden" value={id} />
                            <input name="outsourcedServiceId" type="hidden" value={item.id} />
                            <label className="field">Quantidade a enviar<input max={availableToSend} min="1" name="quantity" required type="number" /></label>
                            <label className="field">Data do envio<input defaultValue={today} name="departureDate" required type="date" /></label>
                            <label className="field">Observação<input name="notes" /></label>
                            <SubmitButton>Registrar envio</SubmitButton>
                          </form>
                        ) : null}

                        {quantities.pendingQuantity > 0 ? (
                          <form action={receiveOutsourcedServiceFromOrder} className="op-action-panel">
                            <h4>Registrar retorno</h4>
                            <p>Quantidade fora da empresa: {quantities.pendingQuantity} peça(s).</p>
                            <input name="orderId" type="hidden" value={id} />
                            <input name="outsourcedServiceId" type="hidden" value={item.id} />
                            <label className="field">Quantidade retornada<input max={quantities.pendingQuantity} min="1" name="quantity" required type="number" /></label>
                            <label className="field">Data do retorno<input defaultValue={today} name="returnDate" required type="date" /></label>
                            <label className="field">Observação<input name="notes" /></label>
                            <label className="op-approval-checkbox">
                              <input name="approve" type="checkbox" />
                              <span><strong>Aprovar esta quantidade para pagamento após o retorno</strong><small>Use somente quando a quantidade já foi validada operacionalmente.</small></span>
                            </label>
                            <SubmitButton>Registrar retorno</SubmitButton>
                          </form>
                        ) : null}

                        <form action={approveOutsourcedServiceFromOrder} className="op-action-panel">
                          <h4>Aprovação para pagamento</h4>
                          <p>Retornada: {quantities.returnedQuantity} · já aprovada: {item.approvedQuantity} · disponível: {availableToApprove}</p>
                          <input name="orderId" type="hidden" value={id} />
                          <input name="outsourcedServiceId" type="hidden" value={item.id} />
                          <label className="field">Quantidade aprovada<input defaultValue={item.approvedQuantity} max={quantities.returnedQuantity} min="0" name="approvedQuantity" required type="number" /></label>
                          <SubmitButton>Atualizar aprovação</SubmitButton>
                        </form>

                        <form action={createIssueFromOrder} className="op-action-panel op-action-panel-warning">
                          <h4>Abrir pendência</h4>
                          <input name="orderId" type="hidden" value={id} />
                          <input name="outsourcedServiceId" type="hidden" value={item.id} />
                          <label className="field">Tipo<select name="type"><option value="MISSING_THREAD">Falta de linha</option><option value="MISSING_TRIM">Falta de aviamento</option><option value="MISSING_COMPONENT">Falta de componente</option><option value="QUANTITY_ISSUE">Divergência de quantidade</option><option value="EXECUTION_QUESTION">Dúvida de execução</option><option value="OTHER">Outra</option></select></label>
                          <label className="field">Descrição<input name="description" required /></label>
                          <SubmitButton>Registrar pendência</SubmitButton>
                        </form>
                      </div>
                    ) : null}
                  </article>
                );
              })
            )}
          </section>

          <section className="panel">
            <h2 className="section-title">Serviços internos</h2>
            {!order.internalServices.length ? (
              <EmptyState title="Nenhum serviço interno" description="Serviços internos são apenas operacionais e não possuem preço terceirizado." />
            ) : (
              <div className="op-internal-list">
                {order.internalServices.map((item) => (
                  <article className="op-internal-card" key={item.id}>
                    <div>
                      <h3>{item.service.name}</h3>
                      <p>Setor · {item.internalSector.name}</p>
                    </div>
                    <div className="op-internal-meta">
                      <span>Quantidade: {item.plannedQuantity ?? "—"}</span>
                      <StatusChip variant={item.completedAt ? "success" : "neutral"}>{item.completedAt ? "Concluído" : "Pendente"}</StatusChip>
                      {canOperate && !item.completedAt && !order.completedAt ? (
                        <form action={completeInternalService}>
                          <input name="orderId" type="hidden" value={id} />
                          <input name="internalServiceId" type="hidden" value={item.id} />
                          <button className="button-secondary button-sm">Concluir interno</button>
                        </form>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="panel">
            <h2 className="section-title">Pendências operacionais</h2>
            {!order.operationalIssues.length ? (
              <EmptyState title="Nenhuma pendência registrada" description="Pendências abertas por equipe interna ou terceirizado aparecem aqui." />
            ) : (
              <div className="op-issue-list">
                {order.operationalIssues.map((issue) => (
                  <article className="op-issue-card" key={issue.id}>
                    <div>
                      <div className="op-service-title">
                        <h3>{issueType[issue.type]}</h3>
                        <StatusChip variant={issue.status === "RESOLVED" ? "success" : issue.status === "IN_PROGRESS" ? "warning" : "danger"}>{issueStatus[issue.status]}</StatusChip>
                      </div>
                      <p>{issue.description}</p>
                      <dl>
                        <div><dt>Responsável</dt><dd>{issue.contractor.name}</dd></div>
                        <div><dt>Serviço</dt><dd>{issue.outsourcedService?.service.name ?? "OP"}</dd></div>
                        <div><dt>Autor</dt><dd>{issue.createdBy.name}</dd></div>
                        <div><dt>Registro</dt><dd>{formatDate(issue.createdAt)}</dd></div>
                        <div><dt>Resolução</dt><dd>{issue.resolvedAt ? `${formatDate(issue.resolvedAt)} · ${issue.resolvedBy?.name || "Autor não identificado"}` : "Pendente"}</dd></div>
                      </dl>
                    </div>
                    {canOperate && issue.status !== "RESOLVED" ? (
                      <div className="op-issue-actions">
                        {issue.status === "OPEN" ? (
                          <form action={changeIssueFromOrder}>
                            <input name="orderId" type="hidden" value={id} />
                            <input name="issueId" type="hidden" value={issue.id} />
                            <input name="status" type="hidden" value="IN_PROGRESS" />
                            <button className="button-secondary button-sm">Colocar em tratamento</button>
                          </form>
                        ) : null}
                        <form action={changeIssueFromOrder}>
                          <input name="orderId" type="hidden" value={id} />
                          <input name="issueId" type="hidden" value={issue.id} />
                          <input name="status" type="hidden" value="RESOLVED" />
                          <button className="button-primary button-sm">Resolver</button>
                        </form>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}

      {tab === "supplies" ? (
        <section className="panel">
          <div className="op-section-heading">
            <div>
              <h2 className="section-title">Insumos registrados nesta OP</h2>
              <p>Registro histórico criado com a OP. Ajustes aqui não alteram o Produto.</p>
            </div>
          </div>
          {!order.supplies.length ? (
            <EmptyState title="Sem insumos registrados" description="O Produto não possuía insumos configurados na criação desta OP." />
          ) : (
            <DataTable>
              <table>
                <thead><tr><th>Insumo</th><th>Unidade</th><th>Base preservada</th><th>Previsto nesta OP</th><th>Observação / ajuste</th></tr></thead>
                <tbody>
                  {order.supplies.map((item) => (
                    <tr key={item.id}>
                      <td>{item.supplyNameSnapshot}</td>
                      <td>{item.unitSnapshot}</td>
                      <td>{item.quantityPerBaseSnapshot && item.baseQuantitySnapshot ? `${item.quantityPerBaseSnapshot.toFixed(4)} / ${item.baseQuantitySnapshot.toLocaleString("pt-BR")} peças` : "Sem regra de consumo"}</td>
                      <td><strong>{item.plannedQuantity?.toFixed(4) ?? "Não calculado"}</strong></td>
                      <td>
                        {canOperate && !order.completedAt ? (
                          <form action={updateProductionOrderSupply} className="op-inline-form">
                            <input name="orderId" type="hidden" value={id} />
                            <input name="itemId" type="hidden" value={item.id} />
                            <input defaultValue={item.plannedQuantity?.toFixed(4) ?? ""} name="plannedQuantity" required />
                            <button className="link-button">Salvar</button>
                          </form>
                        ) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DataTable>
          )}
        </section>
      ) : null}

      {tab === "financial" ? (
        <div className="op-tab-stack">
          <section className="op-first-fold">
            <StatCard label="OP" value={formatCurrency(total)} helper="valor previsto" />
            <StatCard label="Faturamento" value={order.billing ? formatCurrency(order.billing.amount) : "R$ 0,00"} helper={order.billing ? `NFe ${order.billing.invoiceNumber}` : "ainda não faturada"} variant={order.billing ? "info" : "neutral"} />
            <StatCard label="Recebimento" value={received ? formatCurrency(received) : "R$ 0,00"} helper={balance ? `Saldo ${formatCurrency(balance)}` : "sem Conta a Receber"} variant={account && balance?.lte(0) ? "success" : "neutral"} />
          </section>
          <section className="panel">
            <div className="op-section-heading">
              <div>
                <h2 className="section-title">Faturamento e recebimento</h2>
                <p>Conclusão, faturamento e recebimento permanecem fatos distintos.</p>
              </div>
              {canFinance && !order.billing ? <Button href={`/ops/${id}/faturamento/novo`}>Registrar faturamento</Button> : null}
            </div>
            {order.billing && account ? (
              <>
                <dl className="detail-grid">
                  <div><dt>Nº da NFe</dt><dd>{order.billing.invoiceNumber}</dd></div>
                  <div><dt>Emissão</dt><dd>{formatDate(order.billing.issueDate)}</dd></div>
                  <div><dt>Competência</dt><dd>{formatDate(order.billing.competenceDate)}</dd></div>
                  <div><dt>Valor faturado</dt><dd>{formatCurrency(order.billing.amount)}</dd></div>
                  <div><dt>Vencimento</dt><dd>{formatDate(account.dueDate)}</dd></div>
                  <div><dt>Recebido</dt><dd>{formatCurrency(received!)}</dd></div>
                  <div><dt>Saldo</dt><dd>{formatCurrency(balance!)}</dd></div>
                  <div><dt>Situação</dt><dd>{receivableStatus(account.originalAmount, account.dueDate, account.allocations)}</dd></div>
                </dl>
                <div className="op-button-row">
                  <Button href={`/financeiro/contas-a-receber/${account.id}`} variant="secondary">Abrir Conta a Receber</Button>
                  {canFinance && balance?.gt(0) ? <Button href={`/financeiro/recebimentos/novo?companyId=${order.companyId}&customerId=${order.customerId}`}>Registrar recebimento</Button> : null}
                </div>
                <h3 className="op-subsection-title">Recebimentos</h3>
                {account.allocations.length ? (
                  <DataTable>
                    <table>
                      <thead><tr><th>Data</th><th>Valor</th><th>Situação</th></tr></thead>
                      <tbody>{account.allocations.map((item) => <tr key={item.id}><td>{formatDate(item.receipt.receiptDate)}</td><td>{formatCurrency(item.amount)}</td><td>{item.receipt.reversal ? "Estornado" : "Ativo"}</td></tr>)}</tbody>
                    </table>
                  </DataTable>
                ) : <EmptyState title="Nenhum recebimento" description="Recebimentos serão listados após baixa da Conta a Receber." />}
              </>
            ) : (
              <EmptyState title="Ainda não faturada" description="Nenhuma Conta a Receber foi criada. O valor previsto da OP não é receita realizada." />
            )}
          </section>
        </div>
      ) : null}

      {tab === "history" ? (
        <section className="panel">
          <h2 className="section-title">Linha do tempo da OP</h2>
          <ol className="op-timeline">
            {timeline.map((event, index) => (
              <li key={`${event.label}-${event.at.toISOString()}-${index}`}>
                <time>{event.at.toLocaleString("pt-BR")}</time>
                <strong>{event.label}</strong>
                <p>{event.detail}</p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </>
  );
}
