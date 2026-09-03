import { notFound } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { deliveryNoteTotal } from "@/modules/delivery-notes/domain";

type Note = NonNullable<Awaited<ReturnType<typeof loadNote>>>;
function loadNote(id: string) { return prisma.deliveryNote.findUnique({ where: { id }, include: { contractor: true, items: { include: { outsourcedService: { include: { service: true, productionOrder: { include: { customer: true, product: true } } } } } } } }); }
function Copy({ note, label }: { note: Note; label: string }) {
  return <section className="delivery-note-copy"><div className="flex items-start justify-between"><div><p className="text-lg font-bold">GENECT CONFECÇÕES</p><h1 className="text-base font-semibold">ROMANEIO DE MOVIMENTAÇÃO DE OP</h1></div><strong>{label}</strong></div><dl className="print-details"><div><dt>Romaneio</dt><dd>{note.number}</dd></div><div><dt>Data</dt><dd>{formatDate(note.departureDate)}</dd></div><div><dt>Terceirizado</dt><dd>{note.contractor.name}</dd></div><div><dt>Responsável Genect</dt><dd>{note.responsibleName || "—"}</dd></div></dl><table><thead><tr><th>OP</th><th>Serviço</th><th>Cliente</th><th>Referência / produto</th><th>Qtd.</th></tr></thead><tbody>{note.items.map((item) => { const order = item.outsourcedService.productionOrder; return <tr key={item.id}><td>{order.number}</td><td>{item.outsourcedService.service.name}</td><td>{order.customer.name}</td><td>{order.product.reference || order.product.name}</td><td>{item.quantity.toLocaleString("pt-BR")}</td></tr>; })}</tbody><tfoot><tr><th colSpan={4}>Total de peças</th><th>{deliveryNoteTotal(note.items).toLocaleString("pt-BR")}</th></tr></tfoot></table>{note.notes ? <p className="mt-2 text-xs"><strong>Observações:</strong> {note.notes}</p> : null}<div className="signature-grid"><div>Assinatura/conferência Genect</div><div>Assinatura/conferência Terceirizada</div></div></section>;
}
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const note = await loadNote(id); if (!note) notFound();
  return <div className="delivery-note-print"><div className="no-print mb-4 flex items-center justify-between"><p>Pré-visualização das duas vias em folha A4.</p><PrintButton/></div><Copy label="1ª VIA — GENECT" note={note}/><div className="cut-line">✂ linha de corte</div><Copy label="2ª VIA — TERCEIRIZADA" note={note}/></div>;
}
