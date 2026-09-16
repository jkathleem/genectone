import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { formatCurrency, formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { financialStatus, paidAmount, remainingAmount } from "@/modules/accounts-payable/domain";
import { dreGroupLabels, financialNatureLabels } from "@/modules/finance/labels";

type Params = { companyId?: string; contractorId?: string; classificationId?: string; source?: string; from?: string; to?: string; status?: string };

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

  return <>
    <PageHeader title="Contas a Pagar" description="Obrigações por competência e pagamentos como fatos distintos. Pagamento e estorno afetam saldo e caixa, não reescrevem a DRE." action={{ label: "Nova Conta manual", href: "/financeiro/contas-a-pagar/nova" }} />
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
    <section className="panel">
      <div className="table-wrap">
        <table>
          <thead><tr><th>Empresa</th><th>Vencimento</th><th>Descrição</th><th>Origem</th><th>Beneficiário</th><th>Categoria</th><th>Tipo</th><th>Grupo da DRE</th><th>Competência</th><th>Original</th><th>Pago</th><th>Saldo</th><th>Situação</th></tr></thead>
          <tbody>{filtered.map((row) => <tr key={row.id}><td>{row.company.tradeName || row.company.name}</td><td>{formatDate(row.dueDate)}</td><td><Link className="link-button" href={`/financeiro/contas-a-pagar/${row.id}`}>{row.description}</Link></td><td>{row.source === "MANUAL" ? "Lançamento manual" : "Fechamento"}</td><td>{row.payeeName}</td><td>{row.classificationNameSnapshot}</td><td>{financialNatureLabels[row.financialNatureSnapshot]}</td><td>{row.dreGroupSnapshot ? dreGroupLabels[row.dreGroupSnapshot] : "Fora da DRE"}</td><td>{formatDate(row.competenceDate)}</td><td>{formatCurrency(row.originalAmount)}</td><td>{formatCurrency(paidAmount(row.payments))}</td><td>{formatCurrency(remainingAmount(row.originalAmount, row.payments))}</td><td>{financialStatus(row.originalAmount, row.dueDate, row.payments, today)}</td></tr>)}</tbody>
        </table>
      </div>
    </section>
  </>;
}
