import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { formatCurrency, formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { receivableRemainingAmount, receivableStatus, receivedAmount } from "@/modules/accounts-receivable/domain";

type Params = { companyId?: string; customerId?: string; from?: string; to?: string; status?: string; q?: string };

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

  return <>
    <PageHeader title="Contas a Receber" description="Obrigações dos clientes por faturamento. Recebimentos e estornos alteram saldo e caixa, sem alterar a DRE." />
    <form className="panel mb-5 form-grid">
      <label className="field">Empresa<select defaultValue={p.companyId || ""} name="companyId"><option value="">Todas</option>{companies.map((x) => <option key={x.id} value={x.id}>{x.tradeName || x.name}</option>)}</select></label>
      <label className="field">Cliente<select defaultValue={p.customerId || ""} name="customerId"><option value="">Todos</option>{customers.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
      <label className="field">OP / NFe<input defaultValue={p.q} name="q" /></label>
      <label className="field">Vencimento de<input defaultValue={p.from} name="from" type="date" /></label>
      <label className="field">Vencimento até<input defaultValue={p.to} name="to" type="date" /></label>
      <label className="field">Situação<select defaultValue={p.status || ""} name="status"><option value="">Todas</option>{["Em aberto", "Vencida", "Parcial", "Recebida"].map((x) => <option key={x}>{x}</option>)}</select></label>
      <div className="flex items-end gap-2"><button className="button-primary">Filtrar</button><Link className="button-secondary" href="/financeiro/contas-a-receber">Limpar filtros</Link></div>
    </form>
    <section className="panel">{filtered.length ? <div className="table-wrap"><table><thead><tr><th>Empresa</th><th>Cliente</th><th>Vencimento</th><th>Descrição</th><th>OP</th><th>NFe</th><th>Competência</th><th>Original</th><th>Recebido</th><th>Saldo</th><th>Situação</th></tr></thead><tbody>{filtered.map((row) => <tr key={row.id}><td>{row.company.tradeName || row.company.name}</td><td>{row.customer.name}</td><td>{formatDate(row.dueDate)}</td><td><Link className="link-button" href={`/financeiro/contas-a-receber/${row.id}`}>{row.description}</Link></td><td>{row.billing.productionOrder.number}</td><td>{row.billing.invoiceNumber}</td><td>{formatDate(row.competenceDate)}</td><td>{formatCurrency(row.originalAmount)}</td><td>{formatCurrency(receivedAmount(row.allocations))}</td><td>{formatCurrency(receivableRemainingAmount(row.originalAmount, row.allocations))}</td><td>{receivableStatus(row.originalAmount, row.dueDate, row.allocations, today)}</td></tr>)}</tbody></table></div> : <p className="empty-state">Nenhuma Conta a Receber encontrada.</p>}</section>
  </>;
}
