import Link from "next/link";
import { OutsourcingFlowNav } from "@/components/outsourcing-flow-nav";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { StatusChip } from "@/components/ui/status-chip";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { appearsInCollections, daysOutside, derivedQuantities, operationalStatus } from "@/modules/outsourcing/domain";

type Params = { q?: string; contractorId?: string; serviceId?: string };

function number(value: number) {
  return value.toLocaleString("pt-BR");
}

export default async function Page({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const [all, contractors, services] = await Promise.all([
    prisma.outsourcedService.findMany({
      where: {
        productionOrder: { number: params.q ? { contains: params.q, mode: "insensitive" } : undefined },
        contractorId: params.contractorId || undefined,
        serviceId: params.serviceId || undefined,
      },
      include: {
        contractor: true,
        service: true,
        returns: { select: { quantity: true } },
        operationalIssues: { select: { status: true, type: true, description: true } },
        deliveryNoteItems: { include: { deliveryNote: { select: { departureDate: true } } } },
        productionOrder: { include: { customer: true, product: true } },
      },
    }),
    prisma.contractor.findMany({ orderBy: { name: "asc" } }),
    prisma.service.findMany({ orderBy: { name: "asc" } }),
  ]);

  const items = all.flatMap((item) => {
    const quantities = derivedQuantities(item.deliveryNoteItems, item.returns);
    const lastDepartureDate = item.deliveryNoteItems.map((deliveryItem) => deliveryItem.deliveryNote.departureDate).sort((a, b) => b.getTime() - a.getTime())[0];
    const openIssue = item.operationalIssues.find((issue) => issue.status === "OPEN" || issue.status === "IN_PROGRESS");
    return appearsInCollections(quantities.sentQuantity, quantities.returnedQuantity) && lastDepartureDate ? [{ item, quantities, lastDepartureDate, openIssue }] : [];
  });

  const totalPending = items.reduce((sum, row) => sum + row.quantities.pendingQuantity, 0);
  const oldest = items.reduce<number | null>((max, row) => {
    const days = daysOutside(row.lastDepartureDate, new Date());
    return max == null || days > max ? days : max;
  }, null);
  const issueCount = items.filter((row) => row.openIssue).length;

  return (
    <>
      <PageHeader title="Cobranças de terceirização" description="O que está fora, com quem está e o que precisa ser cobrado." action={{ label: "Visão geral", href: "/terceirizacao" }}/>
      <OutsourcingFlowNav active="collections"/>
      <section className="outsourcing-stat-grid">
        <StatCard label="Serviços fora" value={items.length} helper="Com saldo pendente" variant={items.length ? "warning" : "neutral"}/>
        <StatCard label="Peças pendentes" value={number(totalPending)} helper="Ainda fora da Genect" variant={totalPending ? "warning" : "neutral"}/>
        <StatCard label="Maior tempo fora" value={oldest == null ? "—" : `${oldest}d`} helper="Desde a última saída" variant={oldest && oldest > 7 ? "danger" : "neutral"}/>
        <StatCard label="Com pendência" value={issueCount} helper="Aberta ou em tratamento" variant={issueCount ? "danger" : "neutral"}/>
      </section>
      <form className="panel mb-5 form-grid">
        <label className="field">OP<input defaultValue={params.q} name="q" placeholder="Número da OP"/></label>
        <label className="field">Terceirizado<select defaultValue={params.contractorId || ""} name="contractorId"><option value="">Todos</option>{contractors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="field">Serviço<select defaultValue={params.serviceId || ""} name="serviceId"><option value="">Todos</option>{services.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <div className="flex items-end gap-2"><button className="button-primary">Filtrar</button><Link className="button-secondary" href="/terceirizacao/cobrancas">Limpar</Link></div>
      </form>
      <section className="panel">
        {!items.length ? <p className="empty-state">Nenhum serviço pendente fora da Genect.</p> : <div className="collection-card-grid">
          {items.map(({ item, quantities, lastDepartureDate, openIssue }) => {
            const outsideDays = daysOutside(lastDepartureDate, new Date());
            return (
              <article className="collection-card" key={item.id}>
                <div className="collection-card-head">
                  <div><span>Cobrar {item.contractor.name}</span><strong>{item.service.name}</strong></div>
                  <StatusChip variant={openIssue ? "danger" : outsideDays > 7 ? "warning" : "info"}>{openIssue ? "Com pendência" : `${outsideDays} dias fora`}</StatusChip>
                </div>
                <p>OP {item.productionOrder.number} • {item.productionOrder.customer.name}</p>
                <p>{item.productionOrder.product.reference || item.productionOrder.product.name}</p>
                <dl className="outsourcing-facts">
                  <div><dt>Enviado</dt><dd>{number(quantities.sentQuantity)}</dd></div>
                  <div><dt>Retornado</dt><dd>{number(quantities.returnedQuantity)}</dd></div>
                  <div><dt>Pendente</dt><dd>{number(quantities.pendingQuantity)}</dd></div>
                  <div><dt>Última saída</dt><dd>{formatDate(lastDepartureDate)}</dd></div>
                  <div><dt>Prazo</dt><dd>{item.expectedReturnDate ? formatDate(item.expectedReturnDate) : "—"}</dd></div>
                  <div><dt>Situação</dt><dd>{operationalStatus(quantities.sentQuantity, quantities.returnedQuantity)}</dd></div>
                </dl>
                {openIssue ? <p className="collection-warning">{openIssue.description}</p> : null}
                <Button href={`/terceirizacao/${item.id}/retorno`} variant={openIssue ? "danger" : "primary"}>Registrar retorno</Button>
              </article>
            );
          })}
        </div>}
      </section>
    </>
  );
}
