import { notFound } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { formatCurrency } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { settlementStatusLabel, settlementTotal, subtotal } from "@/modules/contractor-settlements/domain";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const settlement = await prisma.contractorSettlement.findUnique({ where: { id }, include: { contractor: true, items: { include: { outsourcedService: { include: { service: true, productionOrder: { include: { customer: true } } } } } } } });
  if (!settlement) notFound();
  const orders = new Set(settlement.items.map((item) => item.outsourcedService.productionOrderId)).size;
  const pieces = settlement.items.reduce((sum, item) => sum + item.approvedQuantityIncluded, 0);
  const total = settlementTotal(settlement.items.map((item) => ({ quantity: item.approvedQuantityIncluded, price: item.appliedUnitPriceSnapshot })));
  return <div className="delivery-note-print settlement-print"><PrintButton/><header className="mb-6 text-center"><h2 className="text-lg font-bold">GENECT CONFECÇÕES</h2><h1 className="mt-2 text-xl font-bold">DEMONSTRATIVO DE FECHAMENTO DE SERVIÇOS TERCEIRIZADOS</h1></header><dl className="print-details"><div><dt>Terceirizado</dt><dd>{settlement.contractor.name}</dd></div><div><dt>Competência</dt><dd>{String(settlement.periodMonth).padStart(2, "0")}/{settlement.periodYear}</dd></div><div><dt>Situação</dt><dd>{settlementStatusLabel(settlement.status)}</dd></div><div><dt>Data de criação</dt><dd>{settlement.createdAt.toLocaleString("pt-BR")}</dd></div><div><dt>Data de aprovação</dt><dd>{settlement.approvedAt?.toLocaleString("pt-BR") ?? "—"}</dd></div><div><dt>Observações</dt><dd>{settlement.notes || "—"}</dd></div></dl><table><thead><tr><th>OP</th><th>Cliente</th><th>Serviço</th><th>Quantidade</th><th>Valor unitário</th><th>Subtotal</th></tr></thead><tbody>{settlement.items.map((item) => <tr key={item.id}><td>{item.outsourcedService.productionOrder.number}</td><td>{item.outsourcedService.productionOrder.customer.name}</td><td>{item.outsourcedService.service.name}</td><td>{item.approvedQuantityIncluded.toLocaleString("pt-BR")}</td><td>{formatCurrency(item.appliedUnitPriceSnapshot)}</td><td>{formatCurrency(subtotal(item.approvedQuantityIncluded, item.appliedUnitPriceSnapshot))}</td></tr>)}</tbody><tfoot><tr><th colSpan={3}>{orders} OP(s)</th><th>{pieces.toLocaleString("pt-BR")} peças</th><th>Total</th><th>{formatCurrency(total)}</th></tr></tfoot></table><div className="signature-grid"><div>Conferência Genect</div><div>Assinatura do Terceirizado</div></div></div>;
}
