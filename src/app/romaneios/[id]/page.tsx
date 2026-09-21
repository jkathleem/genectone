import { notFound } from "next/navigation";
import { Feedback } from "@/components/feedback";
import { OutsourcingFlowNav } from "@/components/outsourcing-flow-nav";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { deliveryNoteTotal } from "@/modules/delivery-notes/domain";

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ success?: string }> }) {
  const { id } = await params; const [note, messages] = await Promise.all([prisma.deliveryNote.findUnique({ where: { id }, include: { contractor: true, items: { include: { outsourcedService: { include: { service: true, productionOrder: { include: { customer: true, product: true } } } } } } } }), searchParams]); if (!note) notFound();
  const total = deliveryNoteTotal(note.items);
  return <><PageHeader title={`Romaneio ${note.number}`} description="Movimentação física emitida, disponível somente para consulta e impressão." action={{ label: "Voltar aos Romaneios", href: "/romaneios" }}/>
    <OutsourcingFlowNav active="delivery-notes"/>
    <Feedback {...messages}/>
    <section className="outsourcing-stat-grid">
      <StatCard label="Terceirizado" value={note.contractor.name} helper="Responsável pela execução"/>
      <StatCard label="Data de saída" value={formatDate(note.departureDate)} helper={note.responsibleName || "Responsável não informado"}/>
      <StatCard label="Itens" value={note.items.length} helper={`${total.toLocaleString("pt-BR")} peças`} variant="info"/>
    </section>
    <section className="panel mb-5"><dl className="detail-grid"><div><dt>Romaneio</dt><dd>{note.number}</dd></div><div><dt>Terceirizado</dt><dd>{note.contractor.name}</dd></div><div><dt>Data de saída</dt><dd>{formatDate(note.departureDate)}</dd></div><div><dt>Responsável</dt><dd>{note.responsibleName || "—"}</dd></div><div><dt>Criação</dt><dd>{note.createdAt.toLocaleString("pt-BR")}</dd></div><div className="sm:col-span-2"><dt>Observações</dt><dd>{note.notes || "—"}</dd></div></dl></section>
    <section className="panel"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="section-title">Itens enviados</h2><Button href={`/romaneios/${id}/imprimir`}>Versão para impressão</Button></div>
      <div className="outsourcing-card-list">{note.items.map((item) => <article className="outsourcing-card" key={item.id}><div className="outsourcing-card-head"><div><strong>OP {item.outsourcedService.productionOrder.number}</strong><p>{item.outsourcedService.productionOrder.customer.name}</p></div><span className="status-info">{item.quantity.toLocaleString("pt-BR")} peças</span></div><p className="outsourcing-card-title">{item.outsourcedService.service.name}</p><p>{item.outsourcedService.productionOrder.product.name}{item.outsourcedService.productionOrder.product.reference ? ` — ${item.outsourcedService.productionOrder.product.reference}` : ""}</p></article>)}</div>
      <div className="outsourcing-table-desktop table-wrap"><table><thead><tr><th>OP</th><th>Cliente</th><th>Produto / referência</th><th>Serviço</th><th>Quantidade</th></tr></thead><tbody>{note.items.map((item) => <tr key={item.id}><td>{item.outsourcedService.productionOrder.number}</td><td>{item.outsourcedService.productionOrder.customer.name}</td><td>{item.outsourcedService.productionOrder.product.name}{item.outsourcedService.productionOrder.product.reference ? ` — ${item.outsourcedService.productionOrder.product.reference}` : ""}</td><td>{item.outsourcedService.service.name}</td><td>{item.quantity.toLocaleString("pt-BR")}</td></tr>)}</tbody><tfoot><tr><th colSpan={4}>Total de peças</th><th>{total.toLocaleString("pt-BR")}</th></tr></tfoot></table></div>
    </section></>;
}
