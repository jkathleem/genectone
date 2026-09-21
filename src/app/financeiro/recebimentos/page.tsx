import Link from "next/link";
import { FinanceNav } from "@/components/finance-nav";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { StatusChip } from "@/components/ui/status-chip";
import { formatCurrency, formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

type Params = { companyId?: string; customerId?: string; from?: string; to?: string };

export default async function Page({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const receiptDate = params.from || params.to ? { gte: params.from ? new Date(`${params.from}T00:00:00Z`) : undefined, lte: params.to ? new Date(`${params.to}T00:00:00Z`) : undefined } : undefined;
  const [rows, companies, customers] = await Promise.all([
    prisma.receipt.findMany({
      where: { companyId: params.companyId || undefined, customerId: params.customerId || undefined, receiptDate },
      include: { company: true, customer: true, reversal: { select: { id: true } }, allocations: { select: { id: true } } },
      orderBy: [{ receiptDate: "desc" }, { createdAt: "desc" }],
    }),
    prisma.company.findMany({ orderBy: { name: "asc" } }),
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
  ]);
  const effective = rows.filter((row) => !row.reversal);
  const reversed = rows.length - effective.length;
  const total = effective.reduce((sum, row) => sum + Number(row.amount), 0);
  return (
    <>
      <PageHeader title="Recebimentos" description="Entradas financeiras reais, integralmente alocadas às Contas a Receber." action={{ label: "Novo recebimento", href: "/financeiro/recebimentos/novo" }}/>
      <FinanceNav active="receivables"/>
      <section className="finance-stat-grid">
        <StatCard label="Recebido efetivo" value={formatCurrency(total.toFixed(4))} helper="Desconsidera estornos" variant="success"/>
        <StatCard label="Recebimentos" value={rows.length} helper="No filtro atual"/>
        <StatCard label="Estornados" value={reversed} helper="Movimento inverso no caixa" variant={reversed ? "danger" : "neutral"}/>
      </section>
      <form className="panel mb-5 form-grid">
        <label className="field">Empresa<select defaultValue={params.companyId || ""} name="companyId"><option value="">Todas</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.tradeName || company.name}</option>)}</select></label>
        <label className="field">Cliente<select defaultValue={params.customerId || ""} name="customerId"><option value="">Todos</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
        <label className="field">Recebimento de<input defaultValue={params.from} name="from" type="date"/></label>
        <label className="field">Recebimento até<input defaultValue={params.to} name="to" type="date"/></label>
        <div className="flex items-end gap-2"><button className="button-primary">Filtrar</button><Link className="button-secondary" href="/financeiro/recebimentos">Limpar</Link></div>
      </form>
      <section className="panel">
        {rows.length ? <>
          <div className="finance-card-list">{rows.map((row) => <article className="finance-list-card" key={row.id}><div className="finance-card-head"><div><strong>{row.customer.name}</strong><p>{formatDate(row.receiptDate)} • {row.allocations.length} conta(s)</p></div><StatusChip variant={row.reversal ? "danger" : "success"}>{row.reversal ? "Estornado" : "Efetivo"}</StatusChip></div><dl className="finance-facts"><div><dt>Valor</dt><dd>{formatCurrency(row.amount)}</dd></div><div><dt>Empresa</dt><dd>{row.company.tradeName || row.company.name}</dd></div></dl><Button href={`/financeiro/recebimentos/${row.id}`} variant="secondary" size="sm">Abrir recebimento</Button></article>)}</div>
          <div className="finance-table-desktop table-wrap"><table><thead><tr><th>Data</th><th>Empresa</th><th>Cliente</th><th>Valor</th><th>Contas</th><th>Situação</th><th>Observações</th><th>Criado em</th><th/></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td>{formatDate(row.receiptDate)}</td><td>{row.company.tradeName || row.company.name}</td><td>{row.customer.name}</td><td>{formatCurrency(row.amount)}</td><td>{row.allocations.length}</td><td><StatusChip variant={row.reversal ? "danger" : "success"}>{row.reversal ? "Estornado" : "Efetivo"}</StatusChip></td><td>{row.notes || "—"}</td><td>{row.createdAt.toLocaleString("pt-BR")}</td><td><Link className="link-button" href={`/financeiro/recebimentos/${row.id}`}>Abrir</Link></td></tr>)}</tbody></table></div>
        </> : <p className="empty-state">Nenhum recebimento registrado.</p>}
      </section>
    </>
  );
}
