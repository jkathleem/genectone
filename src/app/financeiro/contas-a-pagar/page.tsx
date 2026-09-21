import Link from "next/link";
import { FinanceNav } from "@/components/finance-nav";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { StatusChip } from "@/components/ui/status-chip";
import { formatCurrency, formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { financialStatus, paidAmount, remainingAmount } from "@/modules/accounts-payable/domain";
import { dreGroupLabels, financialNatureLabels } from "@/modules/finance/labels";

type Params = { companyId?: string; contractorId?: string; classificationId?: string; source?: string; from?: string; to?: string; status?: string };

const statusToVariant = {
  "Em aberto": "info",
  Vencida: "danger",
  Parcial: "warning",
  Pago: "success",
} as const;

function statusHref(status?: string) {
  return status ? `/financeiro/contas-a-pagar?status=${encodeURIComponent(status)}` : "/financeiro/contas-a-pagar";
}

export default async function Page({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const today = new Date();
  const dueDate = params.from || params.to ? { gte: params.from ? new Date(`${params.from}T00:00:00Z`) : undefined, lte: params.to ? new Date(`${params.to}T00:00:00Z`) : undefined } : undefined;
  const source = params.source === "MANUAL" || params.source === "CONTRACTOR_SETTLEMENT" ? params.source : undefined;
  const [rows, companies, contractors, classifications] = await Promise.all([
    prisma.accountPayable.findMany({
      where: {
        companyId: params.companyId || undefined,
        classificationId: params.classificationId || undefined,
        source,
        dueDate,
        contractorSettlement: params.contractorId ? { contractorId: params.contractorId } : undefined,
      },
      include: { company: true, payments: { select: { amount: true, reversal: { select: { id: true } } } } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.company.findMany({ orderBy: { name: "asc" } }),
    prisma.contractor.findMany({ orderBy: { name: "asc" } }),
    prisma.financialClassification.findMany({ orderBy: { name: "asc" } }),
  ]);
  const filtered = rows.filter((row) => !params.status || financialStatus(row.originalAmount, row.dueDate, row.payments, today) === params.status);
  const open = rows.filter((row) => financialStatus(row.originalAmount, row.dueDate, row.payments, today) === "Em aberto").length;
  const partial = rows.filter((row) => financialStatus(row.originalAmount, row.dueDate, row.payments, today) === "Parcial").length;
  const overdue = rows.filter((row) => financialStatus(row.originalAmount, row.dueDate, row.payments, today) === "Vencida").length;
  const paid = rows.filter((row) => financialStatus(row.originalAmount, row.dueDate, row.payments, today) === "Pago").length;
  const balance = filtered.reduce((sum, row) => sum + Number(remainingAmount(row.originalAmount, row.payments)), 0);

  return <>
    <PageHeader title="Contas a Pagar" description="Obrigações por competência e pagamentos como fatos distintos. Pagamento e estorno afetam saldo e caixa, não reescrevem a DRE." action={{ label: "Nova Conta manual", href: "/financeiro/contas-a-pagar/nova" }} />
    <FinanceNav active="payables"/>
    <section className="finance-stat-grid">
      <StatCard label="Saldo no filtro" value={formatCurrency(balance.toFixed(4))} helper="Valor ainda a pagar" variant={balance > 0 ? "warning" : "neutral"}/>
      <StatCard label="Em aberto" value={open} helper="Sem pagamento efetivo" variant="info"/>
      <StatCard label="Parciais" value={partial} helper="Com saldo restante" variant={partial ? "warning" : "neutral"}/>
      <StatCard label="Vencidas" value={overdue} helper="Saldo vencido" variant={overdue ? "danger" : "neutral"}/>
      <StatCard label="Pagas" value={paid} helper="Sem saldo" variant={paid ? "success" : "neutral"}/>
    </section>
    <form className="panel mb-5 form-grid">
      <label className="field">Empresa<select name="companyId" defaultValue={params.companyId || ""}><option value="">Todas</option>{companies.map((item) => <option key={item.id} value={item.id}>{item.tradeName || item.name}</option>)}</select></label>
      <label className="field">Origem<select name="source" defaultValue={params.source || ""}><option value="">Todas</option><option value="CONTRACTOR_SETTLEMENT">Fechamento de Terceirizados</option><option value="MANUAL">Lançamento manual</option></select></label>
      <label className="field">Beneficiário terceirizado<select name="contractorId" defaultValue={params.contractorId || ""}><option value="">Todos</option>{contractors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="field">Categoria<select name="classificationId" defaultValue={params.classificationId || ""}><option value="">Todas</option>{classifications.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="field">Vencimento de<input name="from" type="date" defaultValue={params.from} /></label>
      <label className="field">Até<input name="to" type="date" defaultValue={params.to} /></label>
      <label className="field">Situação<select name="status" defaultValue={params.status || ""}><option value="">Todas</option>{["Em aberto", "Vencida", "Parcial", "Pago"].map((item) => <option key={item}>{item}</option>)}</select></label>
      <div className="flex items-end gap-2"><button className="button-primary">Filtrar</button><Link className="button-secondary" href="/financeiro/contas-a-pagar">Limpar</Link></div>
    </form>
    <nav className="filter-tabs mb-4" aria-label="Filtros rápidos de contas a pagar">{["", "Em aberto", "Parcial", "Vencida", "Pago"].map((status) => <Link className={(params.status || "") === status ? "active" : ""} href={statusHref(status || undefined)} key={status || "all"}>{status || "Todas"}</Link>)}</nav>
    <section className="panel">
      {!filtered.length ? <p className="empty-state">Nenhuma Conta a Pagar encontrada.</p> : <>
      <div className="finance-card-list">{filtered.map((row) => { const status = financialStatus(row.originalAmount, row.dueDate, row.payments, today); return <article className="finance-list-card" key={row.id}><div className="finance-card-head"><div><strong>{row.description}</strong><p>{row.payeeName} • {row.source === "MANUAL" ? "Manual" : "Fechamento"}</p></div><StatusChip variant={statusToVariant[status]}>{status}</StatusChip></div><dl className="finance-facts"><div><dt>Vencimento</dt><dd>{formatDate(row.dueDate)}</dd></div><div><dt>Competência</dt><dd>{formatDate(row.competenceDate)}</dd></div><div><dt>Original</dt><dd>{formatCurrency(row.originalAmount)}</dd></div><div><dt>Pago</dt><dd>{formatCurrency(paidAmount(row.payments))}</dd></div><div><dt>Saldo</dt><dd>{formatCurrency(remainingAmount(row.originalAmount, row.payments))}</dd></div></dl><Button href={`/financeiro/contas-a-pagar/${row.id}`} variant="secondary" size="sm">Abrir conta</Button></article>; })}</div>
      <div className="finance-table-desktop table-wrap">
        <table>
          <thead><tr><th>Empresa</th><th>Vencimento</th><th>Descrição</th><th>Origem</th><th>Beneficiário</th><th>Categoria</th><th>Tipo</th><th>Grupo da DRE</th><th>Competência</th><th>Original</th><th>Pago</th><th>Saldo</th><th>Situação</th></tr></thead>
          <tbody>{filtered.map((row) => { const status = financialStatus(row.originalAmount, row.dueDate, row.payments, today); return <tr key={row.id}><td>{row.company.tradeName || row.company.name}</td><td>{formatDate(row.dueDate)}</td><td><Link className="link-button" href={`/financeiro/contas-a-pagar/${row.id}`}>{row.description}</Link></td><td>{row.source === "MANUAL" ? "Lançamento manual" : "Fechamento"}</td><td>{row.payeeName}</td><td>{row.classificationNameSnapshot}</td><td>{financialNatureLabels[row.financialNatureSnapshot]}</td><td>{row.dreGroupSnapshot ? dreGroupLabels[row.dreGroupSnapshot] : "Fora da DRE"}</td><td>{formatDate(row.competenceDate)}</td><td>{formatCurrency(row.originalAmount)}</td><td>{formatCurrency(paidAmount(row.payments))}</td><td>{formatCurrency(remainingAmount(row.originalAmount, row.payments))}</td><td><StatusChip variant={statusToVariant[status]}>{status}</StatusChip></td></tr>; })}</tbody>
        </table>
      </div>
      </>}
    </section>
  </>;
}
