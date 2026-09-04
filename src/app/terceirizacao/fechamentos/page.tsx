import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { formatCurrency } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { settlementStatusLabel, settlementTotal } from "@/modules/contractor-settlements/domain";

type Params = { periodMonth?: string; periodYear?: string; contractorId?: string; status?: "DRAFT" | "APPROVED" };

export default async function Page({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const [rows, contractors] = await Promise.all([
    prisma.contractorSettlement.findMany({
      where: { periodMonth: params.periodMonth ? Number(params.periodMonth) : undefined, periodYear: params.periodYear ? Number(params.periodYear) : undefined, contractorId: params.contractorId || undefined, status: params.status || undefined },
      include: { contractor: true, items: { include: { outsourcedService: { include: { productionOrder: true } } } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.contractor.findMany({ orderBy: { name: "asc" } }),
  ]);
  return <><PageHeader title="Fechamentos" description="Apuração das quantidades aprovadas para terceirizados, sem representar pagamento." action={{ label: "Novo Fechamento", href: "/terceirizacao/fechamentos/novo" }}/><form className="panel mb-5 form-grid"><label className="field">Mês<input defaultValue={params.periodMonth} max={12} min={1} name="periodMonth" type="number"/></label><label className="field">Ano<input defaultValue={params.periodYear} name="periodYear" type="number"/></label><label className="field">Terceirizado<select defaultValue={params.contractorId ?? ""} name="contractorId"><option value="">Todos</option>{contractors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="field">Status<select defaultValue={params.status ?? ""} name="status"><option value="">Todos</option><option value="DRAFT">Rascunho</option><option value="APPROVED">Aprovado</option></select></label><div className="flex items-end gap-2"><button className="button-primary">Filtrar</button><Link className="button-secondary" href="/terceirizacao/fechamentos">Limpar filtros</Link></div></form><section className="panel">{!rows.length ? <p className="empty-state">Nenhum fechamento encontrado.</p> : <div className="table-wrap"><table><thead><tr><th>Competência</th><th>Terceirizado</th><th>Status</th><th>OPs</th><th>Peças</th><th>Total</th><th>Criado em</th><th>Aprovado em</th><th>Ação</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td>{String(row.periodMonth).padStart(2, "0")}/{row.periodYear}</td><td>{row.contractor.name}</td><td><span className={row.status === "APPROVED" ? "status-active" : "status-inactive"}>{settlementStatusLabel(row.status)}</span></td><td>{new Set(row.items.map((item) => item.outsourcedService.productionOrderId)).size}</td><td>{row.items.reduce((sum, item) => sum + item.approvedQuantityIncluded, 0).toLocaleString("pt-BR")}</td><td>{formatCurrency(settlementTotal(row.items.map((item) => ({ quantity: item.approvedQuantityIncluded, price: item.appliedUnitPriceSnapshot }))))}</td><td>{row.createdAt.toLocaleString("pt-BR")}</td><td>{row.approvedAt?.toLocaleString("pt-BR") ?? "—"}</td><td><Link className="link-button" href={`/terceirizacao/fechamentos/${row.id}`}>Abrir</Link></td></tr>)}</tbody></table></div>}</section></>;
}
