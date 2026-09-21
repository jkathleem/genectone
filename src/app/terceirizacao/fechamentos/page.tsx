import Link from "next/link";
import { OutsourcingFlowNav } from "@/components/outsourcing-flow-nav";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { StatusChip } from "@/components/ui/status-chip";
import { formatCurrency } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { settlementStatusLabel, settlementTotal } from "@/modules/contractor-settlements/domain";

type Params = { periodMonth?: string; periodYear?: string; contractorId?: string; status?: "DRAFT" | "APPROVED" };

export default async function Page({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const [rows, contractors] = await Promise.all([
    prisma.contractorSettlement.findMany({
      where: { periodMonth: params.periodMonth ? Number(params.periodMonth) : undefined, periodYear: params.periodYear ? Number(params.periodYear) : undefined, contractorId: params.contractorId || undefined, status: params.status || undefined },
      include: { contractor: true, accountPayable: { include: { payments: { select: { amount: true, reversal: { select: { id: true } } } } } }, items: { include: { outsourcedService: { include: { productionOrder: true } } } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.contractor.findMany({ orderBy: { name: "asc" } }),
  ]);
  const approved = rows.filter((row) => row.status === "APPROVED").length;
  const withPayable = rows.filter((row) => row.accountPayable).length;
  const paid = rows.filter((row) => {
    if (!row.accountPayable) return false;
    const paidAmount = row.accountPayable.payments.filter((payment) => !payment.reversal).reduce((sum, payment) => sum + Number(payment.amount), 0);
    return paidAmount >= Number(row.accountPayable.originalAmount);
  }).length;
  return <><PageHeader title="Fechamentos" description="Quantidades aprovadas para terceirizados, antes do pagamento." action={{ label: "Novo Fechamento", href: "/terceirizacao/fechamentos/novo" }}/>
    <OutsourcingFlowNav active="settlements"/>
    <section className="outsourcing-stat-grid"><StatCard label="Fechamentos" value={rows.length} helper="No filtro atual"/><StatCard label="Aprovados" value={approved} helper="Imutáveis" variant={approved ? "success" : "neutral"}/><StatCard label="Com A/P" value={withPayable} helper="Viraram obrigação financeira" variant={withPayable ? "info" : "neutral"}/><StatCard label="Pagos" value={paid} helper="Conta quitada" variant={paid ? "success" : "neutral"}/></section>
    <form className="panel mb-5 form-grid"><label className="field">Mês<input defaultValue={params.periodMonth} max={12} min={1} name="periodMonth" type="number"/></label><label className="field">Ano<input defaultValue={params.periodYear} name="periodYear" type="number"/></label><label className="field">Terceirizado<select defaultValue={params.contractorId ?? ""} name="contractorId"><option value="">Todos</option>{contractors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="field">Status<select defaultValue={params.status ?? ""} name="status"><option value="">Todos</option><option value="DRAFT">Rascunho</option><option value="APPROVED">Aprovado</option></select></label><div className="flex items-end gap-2"><button className="button-primary">Filtrar</button><Link className="button-secondary" href="/terceirizacao/fechamentos">Limpar filtros</Link></div></form>
    <nav className="filter-tabs mb-4" aria-label="Filtros rápidos dos fechamentos"><Link className={!params.status ? "active" : ""} href="/terceirizacao/fechamentos">Todos</Link><Link className={params.status === "DRAFT" ? "active" : ""} href="/terceirizacao/fechamentos?status=DRAFT">Rascunho</Link><Link className={params.status === "APPROVED" ? "active" : ""} href="/terceirizacao/fechamentos?status=APPROVED">Aprovados</Link></nav>
    <section className="panel">{!rows.length ? <p className="empty-state">Nenhum fechamento encontrado.</p> : <>
      <div className="outsourcing-card-list">{rows.map((row) => { const pieces = row.items.reduce((sum, item) => sum + item.approvedQuantityIncluded, 0); const total = settlementTotal(row.items.map((item) => ({ quantity: item.approvedQuantityIncluded, price: item.appliedUnitPriceSnapshot }))); return <article className="outsourcing-card" key={row.id}><div className="outsourcing-card-head"><div><strong>{row.contractor.name}</strong><p>{String(row.periodMonth).padStart(2, "0")}/{row.periodYear}</p></div><StatusChip variant={row.status === "APPROVED" ? "success" : "neutral"}>{settlementStatusLabel(row.status)}</StatusChip></div><dl className="outsourcing-facts"><div><dt>OPs</dt><dd>{new Set(row.items.map((item) => item.outsourcedService.productionOrderId)).size}</dd></div><div><dt>Itens</dt><dd>{row.items.length}</dd></div><div><dt>Peças</dt><dd>{pieces.toLocaleString("pt-BR")}</dd></div><div><dt>Total</dt><dd>{formatCurrency(total)}</dd></div><div><dt>A/P</dt><dd>{row.accountPayable ? "Gerada" : "Não gerada"}</dd></div></dl><Button href={`/terceirizacao/fechamentos/${row.id}`}>Abrir fechamento</Button></article>; })}</div>
      <div className="outsourcing-table-desktop table-wrap"><table><thead><tr><th>Competência</th><th>Terceirizado</th><th>Status</th><th>OPs</th><th>Itens</th><th>Peças</th><th>Total</th><th>A/P</th><th>Ação</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td>{String(row.periodMonth).padStart(2, "0")}/{row.periodYear}</td><td>{row.contractor.name}</td><td><StatusChip variant={row.status === "APPROVED" ? "success" : "neutral"}>{settlementStatusLabel(row.status)}</StatusChip></td><td>{new Set(row.items.map((item) => item.outsourcedService.productionOrderId)).size}</td><td>{row.items.length}</td><td>{row.items.reduce((sum, item) => sum + item.approvedQuantityIncluded, 0).toLocaleString("pt-BR")}</td><td>{formatCurrency(settlementTotal(row.items.map((item) => ({ quantity: item.approvedQuantityIncluded, price: item.appliedUnitPriceSnapshot }))))}</td><td>{row.accountPayable ? "Gerada" : "—"}</td><td><Link className="link-button" href={`/terceirizacao/fechamentos/${row.id}`}>Abrir</Link></td></tr>)}</tbody></table></div>
    </>}</section></>;
}
