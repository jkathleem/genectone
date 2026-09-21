import Link from "next/link";
import { OutsourcingFlowNav } from "@/components/outsourcing-flow-nav";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { StatusChip } from "@/components/ui/status-chip";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { derivedQuantities, operationalStatus } from "@/modules/outsourcing/domain";
import { isOutsourcedServiceLate } from "@/modules/production-orders/domain";

type Params = { q?: string; contractorId?: string; serviceId?: string; view?: "all" | "outside" | "late" | "issue" | "returned" | "eligible" | "closed" };

function number(value: number | null | undefined) {
  return value == null ? "—" : value.toLocaleString("pt-BR");
}

function withViewHref(params: Params, view: NonNullable<Params["view"]>) {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.contractorId) query.set("contractorId", params.contractorId);
  if (params.serviceId) query.set("serviceId", params.serviceId);
  query.set("view", view);
  return `/terceirizacao?${query.toString()}`;
}

export default async function Page({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const [rawItems, contractors, services] = await Promise.all([
    prisma.outsourcedService.findMany({
      where: {
        productionOrder: { number: params.q ? { contains: params.q, mode: "insensitive" } : undefined },
        contractorId: params.contractorId || undefined,
        serviceId: params.serviceId || undefined,
      },
      include: {
        contractor: true,
        service: true,
        deliveryNoteItems: { select: { quantity: true, deliveryNote: { select: { departureDate: true } } } },
        returns: { select: { quantity: true } },
        operationalIssues: { select: { status: true } },
        settlementItems: { select: { approvedQuantityIncluded: true, settlement: { select: { status: true } } } },
        productionOrder: { include: { customer: true, product: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.contractor.findMany({ orderBy: { name: "asc" } }),
    prisma.service.findMany({ orderBy: { name: "asc" } }),
  ]);

  const cards = rawItems.map((item) => {
    const quantities = derivedQuantities(item.deliveryNoteItems, item.returns);
    const hasOpenIssue = item.operationalIssues.some((issue) => issue.status === "OPEN" || issue.status === "IN_PROGRESS");
    const isLate = isOutsourcedServiceLate(item.expectedReturnDate, quantities.sentQuantity, quantities.returnedQuantity);
    const settled = item.settlementItems.filter((settlementItem) => settlementItem.settlement.status === "APPROVED").reduce((sum, settlementItem) => sum + settlementItem.approvedQuantityIncluded, 0);
    const availableToSettle = Math.max(0, item.approvedQuantity - settled);
    const lastDepartureDate = item.deliveryNoteItems.reduce<Date | null>((latest, deliveryItem) => {
      const departureDate = deliveryItem.deliveryNote.departureDate;
      return !latest || departureDate > latest ? departureDate : latest;
    }, null);
    const status = hasOpenIssue ? "Com pendência" : isLate ? "Com atraso" : quantities.pendingQuantity <= 0 && quantities.sentQuantity > 0 ? "Retornado" : quantities.sentQuantity > 0 ? "Fora" : "Aguardando envio";
    const nextAction = quantities.sentQuantity <= 0
      ? { label: "Gerar romaneio", href: "/romaneios/novo" }
      : quantities.pendingQuantity > 0
        ? { label: isLate || hasOpenIssue ? "Cobrar retorno" : "Registrar retorno", href: `/terceirizacao/${item.id}/retorno` }
        : availableToSettle > 0
          ? { label: "Fechar serviço", href: "/terceirizacao/fechamentos/novo" }
          : { label: "Consultar OP", href: `/ops/${item.productionOrderId}` };
    return { item, quantities, hasOpenIssue, isLate, availableToSettle, lastDepartureDate, status, nextAction };
  });

  const view = params.view ?? "all";
  const filteredCards = cards.filter((card) => {
    if (view === "outside") return card.quantities.sentQuantity > card.quantities.returnedQuantity;
    if (view === "late") return card.isLate;
    if (view === "issue") return card.hasOpenIssue;
    if (view === "returned") return card.quantities.sentQuantity > 0 && card.quantities.pendingQuantity <= 0;
    if (view === "eligible") return card.availableToSettle > 0;
    if (view === "closed") return card.availableToSettle <= 0 && card.item.approvedQuantity > 0;
    return true;
  });

  const outside = cards.filter((card) => card.quantities.sentQuantity > card.quantities.returnedQuantity).length;
  const late = cards.filter((card) => card.isLate).length;
  const issues = cards.filter((card) => card.hasOpenIssue).length;
  const eligible = cards.filter((card) => card.availableToSettle > 0).length;

  return (
    <>
      <PageHeader title="Terceirização" description="OP → serviço → envio → retorno → aprovação → fechamento."/>
      <OutsourcingFlowNav active="services"/>
      <section className="outsourcing-stat-grid">
        <StatCard label="Fora da Genect" value={outside} helper="Com saldo pendente fora" variant={outside ? "warning" : "neutral"}/>
        <StatCard label="Com atraso" value={late} helper="Prazo vencido e pendente" variant={late ? "danger" : "neutral"}/>
        <StatCard label="Com pendência" value={issues} helper="Aberta ou em tratamento" variant={issues ? "warning" : "neutral"}/>
        <StatCard label="A fechar" value={eligible} helper="Produção aprovada disponível" variant={eligible ? "success" : "neutral"}/>
      </section>
      <form className="panel mb-5 form-grid">
        <label className="field">OP<input defaultValue={params.q} name="q" placeholder="Buscar por número da OP"/></label>
        <label className="field">Terceirizado<select defaultValue={params.contractorId ?? ""} name="contractorId"><option value="">Todos</option>{contractors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="field">Serviço<select defaultValue={params.serviceId ?? ""} name="serviceId"><option value="">Todos</option>{services.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <input name="view" type="hidden" value={view}/>
        <div className="flex items-end gap-2"><button className="button-primary">Filtrar</button><Link className="button-secondary" href="/terceirizacao">Limpar</Link></div>
      </form>
      <nav className="filter-tabs mb-4" aria-label="Filtros rápidos de terceirização">
        {[
          ["all", "Todos"],
          ["outside", "Fora"],
          ["late", "Atrasados"],
          ["issue", "Com pendência"],
          ["returned", "Retornados"],
          ["eligible", "Elegíveis para fechamento"],
          ["closed", "Fechados"],
        ].map(([value, label]) => <Link className={view === value ? "active" : ""} href={withViewHref(params, value as NonNullable<Params["view"]>)} key={value}>{label}</Link>)}
      </nav>
      <section className="panel">
        {!filteredCards.length ? <p className="empty-state">Nenhum serviço terceirizado encontrado.</p> : <>
          <div className="outsourcing-card-list">
            {filteredCards.map(({ item, quantities, hasOpenIssue, isLate, lastDepartureDate, status, nextAction }) => (
              <article className="outsourcing-card" key={item.id}>
                <div className="outsourcing-card-head">
                  <div><strong>OP {item.productionOrder.number}</strong><p>{item.productionOrder.customer.name}</p></div>
                  <StatusChip variant={hasOpenIssue ? "warning" : isLate ? "danger" : quantities.pendingQuantity <= 0 && quantities.sentQuantity > 0 ? "success" : "info"}>{status}</StatusChip>
                </div>
                <p className="outsourcing-card-title">{item.service.name} • {item.contractor.name}</p>
                <dl className="outsourcing-facts">
                  <div><dt>Quantidade</dt><dd>{number(item.plannedQuantity)}</dd></div>
                  <div><dt>Enviado</dt><dd>{number(quantities.sentQuantity)}</dd></div>
                  <div><dt>Retornado</dt><dd>{number(quantities.returnedQuantity)}</dd></div>
                  <div><dt>Pendente</dt><dd>{number(quantities.pendingQuantity)}</dd></div>
                  <div><dt>Última saída</dt><dd>{lastDepartureDate ? formatDate(lastDepartureDate) : "—"}</dd></div>
                  <div><dt>Prazo</dt><dd>{item.expectedReturnDate ? formatDate(item.expectedReturnDate) : "—"}</dd></div>
                </dl>
                <Button href={nextAction.href} variant={nextAction.label === "Cobrar retorno" ? "danger" : "primary"}>{nextAction.label}</Button>
              </article>
            ))}
          </div>
          <div className="outsourcing-table-desktop table-wrap">
            <table><thead><tr><th>OP</th><th>Cliente</th><th>Serviço</th><th>Terceirizado</th><th>Qtd.</th><th>Enviado</th><th>Retornado</th><th>Pendente</th><th>Prazo</th><th>Situação</th><th>Próxima ação</th></tr></thead><tbody>{filteredCards.map(({ item, quantities, hasOpenIssue, isLate, nextAction }) => <tr key={item.id}><td><Link className="link-button" href={`/ops/${item.productionOrderId}`}>{item.productionOrder.number}</Link></td><td>{item.productionOrder.customer.name}</td><td>{item.service.name}</td><td>{item.contractor.name}</td><td>{number(item.plannedQuantity)}</td><td>{number(quantities.sentQuantity)}</td><td>{number(quantities.returnedQuantity)}</td><td>{number(quantities.pendingQuantity)}</td><td>{item.expectedReturnDate ? formatDate(item.expectedReturnDate) : "—"}</td><td><StatusChip variant={hasOpenIssue ? "warning" : isLate ? "danger" : quantities.pendingQuantity <= 0 && quantities.sentQuantity > 0 ? "success" : "info"}>{operationalStatus(quantities.sentQuantity, quantities.returnedQuantity)}</StatusChip></td><td><Link className="link-button" href={nextAction.href}>{nextAction.label}</Link></td></tr>)}</tbody></table>
          </div>
        </>}
      </section>
    </>
  );
}
