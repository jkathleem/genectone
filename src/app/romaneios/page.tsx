import Link from "next/link";
import { PageHeader } from "@/components/page-header";
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
  return <><PageHeader title="Romaneios" description="Histórico das saídas físicas para terceirização." action={{ label: "Novo Romaneio", href: "/romaneios/novo" }}/><form className="panel mb-5 form-grid"><label className="field">Número<input defaultValue={params.q} name="q"/></label><label className="field">Terceirizado<select defaultValue={params.contractorId ?? ""} name="contractorId"><option value="">Todos</option>{contractors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="field">Saída a partir de<input defaultValue={params.from} name="from" type="date"/></label><label className="field">Saída até<input defaultValue={params.to} name="to" type="date"/></label><div className="flex items-end gap-2"><button className="button-primary">Filtrar</button><Link className="button-secondary" href="/romaneios">Limpar</Link></div></form><section className="panel">{!notes.length ? <p className="empty-state">Nenhum Romaneio encontrado.</p> : <div className="table-wrap"><table><thead><tr><th>Número</th><th>Saída</th><th>Terceirizado</th><th>Itens</th><th>Total enviado</th><th>Responsável</th><th>Criação</th><th>Ação</th></tr></thead><tbody>{notes.map((note) => <tr key={note.id}><td className="font-semibold">{note.number}</td><td>{formatDate(note.departureDate)}</td><td>{note.contractor.name}</td><td>{note.items.length}</td><td>{deliveryNoteTotal(note.items).toLocaleString("pt-BR")}</td><td>{note.responsibleName || "—"}</td><td>{note.createdAt.toLocaleString("pt-BR")}</td><td><Link className="link-button" href={`/romaneios/${note.id}`}>Abrir</Link></td></tr>)}</tbody></table></div>}</section></>;
}
