import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { formatCurrency, formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { operationalDre } from "@/modules/dre/queries";

type Params = { companyId?: string; month?: string; year?: string };
const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function percentage(value: { toFixed(decimals: number): string } | null) {
  return value ? `${value.toFixed(1).replace(".", ",")}%` : "—";
}

export default async function Page({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const current = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Fortaleza", year: "numeric", month: "2-digit" }).format(new Date());
  const requestedMonth = Number(params.month);
  const requestedYear = Number(params.year);
  const month = Number.isInteger(requestedMonth) && requestedMonth >= 1 && requestedMonth <= 12 ? requestedMonth : Number(current.slice(5, 7));
  const year = Number.isInteger(requestedYear) && requestedYear >= 1900 ? requestedYear : Number(current.slice(0, 4));
  const companies = await prisma.company.findMany({ orderBy: { name: "asc" } });
  const activeCompanies = companies.filter((company) => company.active);
  const defaultCompanyId = activeCompanies.length === 1 ? activeCompanies[0].id : "";
  const companyId = params.companyId || defaultCompanyId;
  const selectedCompany = companies.find((company) => company.id === companyId);
  const dre = selectedCompany ? await operationalDre(selectedCompany.id, year, month) : null;

  return <>
    <PageHeader title="DRE Gerencial" description="Resultado operacional derivado por competência, separado do Fluxo de Caixa." />
    <form className="panel mb-5 form-grid">
      <label className="field">Empresa<select defaultValue={selectedCompany?.id || ""} name="companyId" required><option disabled value="">Selecione</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.tradeName || company.name}{company.active ? "" : " (inativa)"}</option>)}</select></label>
      <label className="field">Mês<select defaultValue={month} name="month">{monthNames.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}</select></label>
      <label className="field">Ano<input defaultValue={year} min={1900} name="year" required type="number" /></label>
      <div className="flex items-end"><button className="button-primary">Consultar</button></div>
    </form>

    {!dre || !selectedCompany ? <section className="panel"><p className="empty-state">Selecione uma empresa para consultar a DRE sem consolidar Companies diferentes.</p></section> : <>
      <section className="panel mb-5">
        <p className="text-sm text-slate-500">{selectedCompany.tradeName || selectedCompany.name} · Competência: {monthNames[month - 1]}/{year}</p>
        <div className="mt-5 grid gap-3">
          <div className="rounded-lg bg-slate-50 p-4"><p className="font-semibold">Receita Bruta</p><strong className="mt-1 block text-2xl">{formatCurrency(dre.grossRevenue)}</strong></div>
          <div className="rounded-lg border-l-4 border-amber-400 bg-amber-50 p-4"><p className="font-semibold">(-) Custos e Despesas Variáveis</p><strong className="mt-1 block text-xl">{formatCurrency(dre.variableExpenses)}</strong></div>
          <div className="rounded-lg bg-blue-50 p-4"><p className="font-semibold">(=) Margem de Contribuição</p><strong className="mt-1 block text-2xl">{formatCurrency(dre.contributionMargin)}</strong><span className="text-sm text-slate-600">{percentage(dre.contributionMarginPercentage)}</span></div>
          <div className="rounded-lg border-l-4 border-orange-400 bg-orange-50 p-4"><p className="font-semibold">(-) Custos e Despesas Fixas</p><strong className="mt-1 block text-xl">{formatCurrency(dre.fixedExpenses)}</strong></div>
          <div className="rounded-lg bg-emerald-50 p-4"><p className="font-semibold">(=) Lucro Operacional</p><strong className="mt-1 block text-2xl">{formatCurrency(dre.operatingProfit)}</strong><span className="text-sm text-slate-600">{percentage(dre.operatingMarginPercentage)}</span></div>
        </div>
        <p className="mt-5 text-sm text-slate-500">Esta versão da DRE apresenta o resultado operacional gerencial. Resultado líquido e grupos pós-operacionais ainda não estão incluídos; não se trata de demonstração contábil ou fiscal oficial.</p>
      </section>

      <section className="panel mb-5"><h2 className="section-title mb-4">Composição da Receita Bruta</h2>{dre.billings.length ? <div className="table-wrap"><table><thead><tr><th>OP</th><th>NFe</th><th>Cliente</th><th>Emissão</th><th>Valor</th><th /></tr></thead><tbody>{dre.billings.map((billing) => <tr key={billing.id}><td>{billing.productionOrder.number}</td><td>{billing.invoiceNumber}</td><td>{billing.productionOrder.customer.name}</td><td>{formatDate(billing.issueDate)}</td><td>{formatCurrency(billing.amount)}</td><td><Link className="link-button" href={billing.accountReceivable ? `/financeiro/contas-a-receber/${billing.accountReceivable.id}` : `/ops/${billing.productionOrderId}`}>Abrir</Link></td></tr>)}</tbody></table></div> : <p className="empty-state">Nenhum faturamento nesta competência.</p>}</section>

      <ExpenseDetails title="Custos e Despesas Variáveis" groups={dre.variableGroups} />
      <ExpenseDetails title="Custos e Despesas Fixas" groups={dre.fixedGroups} />
    </>}
  </>;
}

type Groups = Awaited<ReturnType<typeof operationalDre>>["variableGroups"];

function ExpenseDetails({ title, groups }: { title: string; groups: Groups }) {
  return <section className="panel mb-5"><h2 className="section-title mb-4">{title}</h2>{groups.length ? <div className="grid gap-4">{groups.map((group) => <details className="rounded-lg border border-slate-200 p-4" key={`${group.classificationCode}-${group.classificationName}`} open><summary className="cursor-pointer font-semibold">{group.classificationName} <span className="float-right">{formatCurrency(group.total)}</span><span className="mt-1 block text-xs font-normal text-slate-500">{group.classificationCode}</span></summary><div className="table-wrap mt-4"><table><thead><tr><th>Beneficiário</th><th>Descrição</th><th>Origem</th><th>Competência</th><th>Vencimento</th><th>Valor original</th><th>Classificação snapshot</th><th /></tr></thead><tbody>{group.items.map((item) => { const account = item.detail!; return <tr key={account.id}><td>{account.payeeName}</td><td>{account.description}</td><td>{account.source === "MANUAL" ? "Lançamento manual" : "Fechamento de Terceirizados"}</td><td>{formatDate(account.competenceDate)}</td><td>{formatDate(account.dueDate)}</td><td>{formatCurrency(account.originalAmount)}</td><td>{account.classificationNameSnapshot}</td><td><Link className="link-button" href={`/financeiro/contas-a-pagar/${account.id}`}>Abrir</Link></td></tr>; })}</tbody></table></div></details>)}</div> : <p className="empty-state">Nenhuma despesa deste grupo nesta competência.</p>}</section>;
}
