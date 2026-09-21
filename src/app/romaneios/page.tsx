import Link from "next/link";
import { OutsourcingFlowNav } from "@/components/outsourcing-flow-nav";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { deliveryNoteTotal } from "@/modules/delivery-notes/domain";

type Params = { q?: string; contractorId?: string; from?: string; to?: string; outsourcedServiceId?: string };
export default async function Page({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams; const from = params.from ? new Date(`${params.from}T00:00:00.000Z`) : undefined; const to = params.to ? new Date(`${params.to}T00:00:00.000Z`) : undefined;
  const [notes, contractors] = await Promise.all([
    prisma.deliveryNote.findMany({ where: { number: params.q ? { contains: params.q } : undefined, contractorId: params.contractorId || undefined, departureDate: from || to ? { gte: from, lte: to } : undefined, items: params.outsourcedServiceId ? { some: { outsourcedServiceId: params.outsourcedServiceId } } : undefined }, include: { contractor: true, items: { select: { quantity: true } } }, orderBy: [{ departureDate: "desc" }, { createdAt: "desc" }] }),
    prisma.contractor.findMany({ orderBy: { name: "asc" } }),
  ]);
  const totalPieces = notes.reduce((sum, note) => sum + deliveryNoteTotal(note.items), 0);
  return <><PageHeader title="Romaneios" description="Saídas físicas oficiais para terceirizados." action={{ label: "Novo Romaneio", href: "/romaneios/novo" }}/>
    <OutsourcingFlowNav active="delivery-notes"/>
    <section className="outsourcing-stat-grid">
      <StatCard label="Romaneios" value={notes.length} helper="No filtro atual"/>
      <StatCard label="Peças enviadas" value={totalPieces.toLocaleString("pt-BR")} helper="Total do filtro" variant={totalPieces ? "info" : "neutral"}/>
      <StatCard label="Terceirizados" value={new Set(notes.map((note) => note.contractorId)).size} helper="Com saída listada"/>
    </section>
    <form className="panel mb-5 form-grid"><label className="field">Número<input defaultValue={params.q} name="q" placeholder="Ex.: 000125"/></label><label className="field">Terceirizado<select defaultValue={params.contractorId ?? ""} name="contractorId"><option value="">Todos</option>{contractors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="field">Saída a partir de<input defaultValue={params.from} name="from" type="date"/></label><label className="field">Saída até<input defaultValue={params.to} name="to" type="date"/></label><div className="flex items-end gap-2"><button className="button-primary">Filtrar</button><Link className="button-secondary" href="/romaneios">Limpar</Link></div></form>
    <section className="panel">{!notes.length ? <p className="empty-state">Nenhum Romaneio encontrado.</p> : <>
      <div className="outsourcing-card-list">{notes.map((note) => <article className="outsourcing-card" key={note.id}><div className="outsourcing-card-head"><div><strong>Romaneio {note.number}</strong><p>{note.contractor.name}</p></div><span className="status-info">{formatDate(note.departureDate)}</span></div><dl className="outsourcing-facts"><div><dt>Itens</dt><dd>{note.items.length}</dd></div><div><dt>Total enviado</dt><dd>{deliveryNoteTotal(note.items).toLocaleString("pt-BR")}</dd></div><div><dt>Responsável</dt><dd>{note.responsibleName || "—"}</dd></div><div><dt>Criação</dt><dd>{note.createdAt.toLocaleString("pt-BR")}</dd></div></dl><Button href={`/romaneios/${note.id}`}>Abrir romaneio</Button></article>)}</div>
      <div className="outsourcing-table-desktop table-wrap"><table><thead><tr><th>Número</th><th>Saída</th><th>Terceirizado</th><th>Itens</th><th>Total enviado</th><th>Responsável</th><th>Criação</th><th>Ação</th></tr></thead><tbody>{notes.map((note) => <tr key={note.id}><td className="font-semibold">{note.number}</td><td>{formatDate(note.departureDate)}</td><td>{note.contractor.name}</td><td>{note.items.length}</td><td>{deliveryNoteTotal(note.items).toLocaleString("pt-BR")}</td><td>{note.responsibleName || "—"}</td><td>{note.createdAt.toLocaleString("pt-BR")}</td><td><Link className="link-button" href={`/romaneios/${note.id}`}>Abrir</Link></td></tr>)}</tbody></table></div>
    </>}</section></>;
}
