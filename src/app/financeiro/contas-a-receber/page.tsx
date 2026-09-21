import Link from "next/link";
import { FinanceNav } from "@/components/finance-nav";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { StatusChip } from "@/components/ui/status-chip";
import { formatCurrency, formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { receivableRemainingAmount, receivableStatus, receivedAmount } from "@/modules/accounts-receivable/domain";

type Params = { companyId?: string; customerId?: string; from?: string; to?: string; status?: string; q?: string };

const statusToVariant = {
  "Em aberto": "info",
  Vencida: "danger",
  Parcial: "warning",
  Recebida: "success",
} as const;

function statusHref(status?: string) {
  return status ? `/financeiro/contas-a-receber?status=${encodeURIComponent(status)}` : "/financeiro/contas-a-receber";
}

export default async function Page({ searchParams }: { searchParams: Promise<Params> }) {
  const p = await searchParams;
  const today = new Date();
  const dueDate = p.from || p.to ? { gte: p.from ? new Date(`${p.from}T00:00:00Z`) : undefined, lte: p.to ? new Date(`${p.to}T00:00:00Z`) : undefined } : undefined;
  const [rows, companies, customers] = await Promise.all([
    prisma.accountReceivable.findMany({
      where: {
        companyId: p.companyId || undefined,
        customerId: p.customerId || undefined,
        dueDate,
        billing: p.q ? { OR: [{ invoiceNumber: { contains: p.q, mode: "insensitive" } }, { productionOrder: { number: { contains: p.q, mode: "insensitive" } } }] } : undefined,
      },
      include: {
        company: true,
        customer: true,
        allocations: { select: { amount: true, receipt: { select: { reversal: { select: { id: true } } } } } },
        billing: { include: { productionOrder: true } },
      },
      orderBy: { dueDate: "asc" },
    }),
    prisma.company.findMany({ orderBy: { name: "asc" } }),
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
  ]);
  const filtered = rows.filter((row) => !p.status || receivableStatus(row.originalAmount, row.dueDate, row.allocations, today) === p.status);
  const open = rows.filter((row) => receivableStatus(row.originalAmount, row.dueDate, row.allocations, today) === "Em aberto").length;
  const partial = rows.filter((row) => receivableStatus(row.originalAmount, row.dueDate, row.allocations, today) === "Parcial").length;
  const overdue = rows.filter((row) => receivableStatus(row.originalAmount, row.dueDate, row.allocations, today) === "Vencida").length;
  const received = rows.filter((row) => receivableStatus(row.originalAmount, row.dueDate, row.allocations, today) === "Recebida").length;
  const balance = filtered.reduce((sum, row) => sum + Number(receivableRemainingAmount(row.originalAmount, row.allocations)), 0);

  return <>
    <PageHeader title="Contas a Receber" description="Obrigações dos clientes por faturamento. Recebimentos e estornos alteram saldo e caixa, sem alterar a DRE." />
    <FinanceNav active="receivables"/>
    <section className="finance-stat-grid">
      <StatCard label="Saldo no filtro" value={formatCurrency(balance.toFixed(4))} helper="Valor ainda a receber" variant={balance > 0 ? "info" : "neutral"}/>
      <StatCard label="Em aberto" value={open} helper="Sem recebimento efetivo" variant="info"/>
      <StatCard label="Parciais" value={partial} helper="Com saldo restante" variant={partial ? "warning" : "neutral"}/>
      <StatCard label="Vencidas" value={overdue} helper="Saldo vencido" variant={overdue ? "danger" : "neutral"}/>
      <StatCard label="Recebidas" value={received} helper="Sem saldo" variant={received ? "success" : "neutral"}/>
    </section>
    <form className="panel mb-5 form-grid">
      <label className="field">Empresa<select defaultValue={p.companyId || ""} name="companyId"><option value="">Todas</option>{companies.map((x) => <option key={x.id} value={x.id}>{x.tradeName || x.name}</option>)}</select></label>
      <label className="field">Cliente<select defaultValue={p.customerId || ""} name="customerId"><option value="">Todos</option>{customers.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
      <label className="field">OP / NFe<input defaultValue={p.q} name="q" /></label>
      <label className="field">Vencimento de<input defaultValue={p.from} name="from" type="date" /></label>
      <label className="field">Vencimento até<input defaultValue={p.to} name="to" type="date" /></label>
      <label className="field">Situação<select defaultValue={p.status || ""} name="status"><option value="">Todas</option>{["Em aberto", "Vencida", "Parcial", "Recebida"].map((x) => <option key={x}>{x}</option>)}</select></label>
      <div className="flex items-end gap-2"><button className="button-primary">Filtrar</button><Link className="button-secondary" href="/financeiro/contas-a-receber">Limpar filtros</Link></div>
    </form>
    <nav className="filter-tabs mb-4" aria-label="Filtros rápidos de contas a receber">{["", "Em aberto", "Parcial", "Vencida", "Recebida"].map((status) => <Link className={(p.status || "") === status ? "active" : ""} href={statusHref(status || undefined)} key={status || "all"}>{status || "Todas"}</Link>)}</nav>
    <section className="panel">{filtered.length ? <><div className="finance-card-list">{filtered.map((row) => { const status = receivableStatus(row.originalAmount, row.dueDate, row.allocations, today); return <article className="finance-list-card" key={row.id}><div className="finance-card-head"><div><strong>{row.customer.name}</strong><p>NFe {row.billing.invoiceNumber} • OP {row.billing.productionOrder.number}</p></div><StatusChip variant={statusToVariant[status]}>{status}</StatusChip></div><dl className="finance-facts"><div><dt>Vencimento</dt><dd>{formatDate(row.dueDate)}</dd></div><div><dt>Competência</dt><dd>{formatDate(row.competenceDate)}</dd></div><div><dt>Original</dt><dd>{formatCurrency(row.originalAmount)}</dd></div><div><dt>Recebido</dt><dd>{formatCurrency(receivedAmount(row.allocations))}</dd></div><div><dt>Saldo</dt><dd>{formatCurrency(receivableRemainingAmount(row.originalAmount, row.allocations))}</dd></div></dl><Button href={`/financeiro/contas-a-receber/${row.id}`} variant="secondary" size="sm">Abrir conta</Button></article>; })}</div><div className="finance-table-desktop table-wrap"><table><thead><tr><th>Empresa</th><th>Cliente</th><th>Vencimento</th><th>Descrição</th><th>OP</th><th>NFe</th><th>Competência</th><th>Original</th><th>Recebido</th><th>Saldo</th><th>Situação</th></tr></thead><tbody>{filtered.map((row) => { const status = receivableStatus(row.originalAmount, row.dueDate, row.allocations, today); return <tr key={row.id}><td>{row.company.tradeName || row.company.name}</td><td>{row.customer.name}</td><td>{formatDate(row.dueDate)}</td><td><Link className="link-button" href={`/financeiro/contas-a-receber/${row.id}`}>{row.description}</Link></td><td>{row.billing.productionOrder.number}</td><td>{row.billing.invoiceNumber}</td><td>{formatDate(row.competenceDate)}</td><td>{formatCurrency(row.originalAmount)}</td><td>{formatCurrency(receivedAmount(row.allocations))}</td><td>{formatCurrency(receivableRemainingAmount(row.originalAmount, row.allocations))}</td><td><StatusChip variant={statusToVariant[status]}>{status}</StatusChip></td></tr>; })}</tbody></table></div></> : <p className="empty-state">Nenhuma Conta a Receber encontrada.</p>}</section>
  </>;
}
