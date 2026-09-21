import Link from "next/link";
import { FinanceNav } from "@/components/finance-nav";
import { PageHeader } from "@/components/page-header";
import { formatCurrency, formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { operationalDre } from "@/modules/dre/queries";
import { dreGroupLabels } from "@/modules/finance/labels";

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
  const previous = month === 1 ? { month: 12, year: year - 1 } : { month: month - 1, year };
  const next = month === 12 ? { month: 1, year: year + 1 } : { month: month + 1, year };
  const companyQuery = selectedCompany ? `companyId=${selectedCompany.id}` : "";

  return <>
    <PageHeader title="DRE Gerencial" description="Resultado por competência. Não mistura caixa, pagamentos, recebimentos nem carteira de produção." />
    <FinanceNav active="dre"/>
    <form className="panel mb-5 form-grid">
      <label className="field">Empresa<select defaultValue={selectedCompany?.id || ""} name="companyId" required><option disabled value="">Selecione</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.tradeName || company.name}{company.active ? "" : " (inativa)"}</option>)}</select></label>
      <label className="field">Mês<select defaultValue={month} name="month">{monthNames.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}</select></label>
      <label className="field">Ano<input defaultValue={year} min={1900} name="year" required type="number" /></label>
      <div className="flex items-end"><button className="button-primary">Consultar</button></div>
    </form>

    {!dre || !selectedCompany ? <section className="panel"><p className="empty-state">Selecione uma empresa para consultar a DRE sem consolidar empresas diferentes.</p></section> : <>
      <section className="panel mb-5">
        <p className="text-sm text-slate-500">{selectedCompany.tradeName || selectedCompany.name} · Competência: {monthNames[month - 1]}/{year}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link className="button-secondary" href={`/financeiro/dre?${companyQuery}&month=${previous.month}&year=${previous.year}`}>Mês anterior</Link>
          <Link className="button-secondary" href={`/financeiro/dre?${companyQuery}&month=${next.month}&year=${next.year}`}>Próximo mês</Link>
          <Link className="button-secondary" href={`/financeiro/previsto-realizado?${companyQuery}&month=${month}&year=${year}`}>Ver orçamento x realizado</Link>
        </div>
        <div className="mt-5 dre-table-wrap"><table className="dre-table"><tbody>
          <DreRow label="Receita Bruta" helper="Receita operacional faturada" value={dre.grossRevenue}/>
          <DreRow label="(-) Custos e Despesas Variáveis" value={dre.variableExpenses}/>
          <DreRow label="(=) Margem de Contribuição" value={dre.contributionMargin} percent={percentage(dre.contributionMarginPercentage)} subtotal/>
          <DreRow label="(-) Custos e Despesas Fixas" value={dre.fixedExpenses}/>
          <DreRow label="(=) Lucro Operacional" value={dre.operatingProfit} percent={percentage(dre.operatingMarginPercentage)} subtotal/>
          <DreRow label="(+) Receitas Financeiras" value={dre.financialRevenue}/>
          <DreRow label="(-) Despesas Financeiras" value={dre.financialExpenses}/>
          <DreRow label="(=) Resultado Antes dos Tributos" value={dre.resultBeforeTaxes} subtotal/>
          <DreRow label="(-) Tributos sobre o Resultado" value={dre.incomeTaxExpenses}/>
          <DreRow label="(=) Resultado Líquido Gerencial" value={dre.managerialNetIncome} percent={`Margem Líquida: ${percentage(dre.managerialNetMarginPercentage)}`} final/>
        </tbody></table></div>
        <p className="mt-5 text-sm text-slate-500">Receitas Financeiras permanecem em R$ 0,00 nesta versão porque ainda não existe fato de origem adequado. Billing e Receipt não são usados artificialmente. Esta é uma visão gerencial, não uma demonstração contábil ou fiscal oficial.</p>
      </section>

      <section className="panel mb-5"><h2 className="section-title mb-4">Composição da Receita Bruta</h2>{dre.billings.length ? <div className="table-wrap"><table><thead><tr><th>OP</th><th>NFe</th><th>Cliente</th><th>Emissão</th><th>Valor</th><th /></tr></thead><tbody>{dre.billings.map((billing) => <tr key={billing.id}><td>{billing.productionOrder.number}</td><td>{billing.invoiceNumber}</td><td>{billing.productionOrder.customer.name}</td><td>{formatDate(billing.issueDate)}</td><td>{formatCurrency(billing.amount)}</td><td><Link className="link-button" href={billing.accountReceivable ? `/financeiro/contas-a-receber/${billing.accountReceivable.id}` : `/ops/${billing.productionOrderId}`}>Abrir</Link></td></tr>)}</tbody></table></div> : <p className="empty-state">Nenhum faturamento nesta competência.</p>}</section>

      <ExpenseDetails group="VARIABLE_COST_EXPENSE" groups={dre.variableGroups} />
      <ExpenseDetails group="FIXED_COST_EXPENSE" groups={dre.fixedGroups} />
      <ExpenseDetails group="FINANCIAL_REVENUE" groups={dre.financialRevenueGroups} />
      <ExpenseDetails group="FINANCIAL_EXPENSE" groups={dre.financialExpenseGroups} />
      <ExpenseDetails group="INCOME_TAX_EXPENSE" groups={dre.incomeTaxGroups} />
    </>}
  </>;
}

type Groups = Awaited<ReturnType<typeof operationalDre>>["variableGroups"];

function ExpenseDetails({ group, groups }: { group: keyof typeof dreGroupLabels; groups: Groups }) {
  const title = dreGroupLabels[group];
  return <section className="panel mb-5"><h2 className="section-title mb-4">{title}</h2>{groups.length ? <div className="grid gap-4">{groups.map((expenseGroup) => <details className="rounded-lg border border-slate-200 p-4" key={`${expenseGroup.classificationCode}-${expenseGroup.classificationName}`}><summary className="cursor-pointer font-semibold">{expenseGroup.classificationName} <span className="float-right">{formatCurrency(expenseGroup.total)}</span></summary><div className="table-wrap mt-4"><table><thead><tr><th>Beneficiário</th><th>Descrição</th><th>Origem</th><th>Competência</th><th>Vencimento</th><th>Valor original</th><th /></tr></thead><tbody>{expenseGroup.items.map((item) => { const account = item.detail!; return <tr key={account.id}><td>{account.payeeName}</td><td>{account.description}</td><td>{account.source === "MANUAL" ? "Lançamento manual" : "Fechamento de Terceirizados"}</td><td>{formatDate(account.competenceDate)}</td><td>{formatDate(account.dueDate)}</td><td>{formatCurrency(account.originalAmount)}</td><td><Link className="link-button" href={`/financeiro/contas-a-pagar/${account.id}`}>Abrir</Link></td></tr>; })}</tbody></table></div></details>)}</div> : <p className="empty-state">Nenhum lançamento deste grupo nesta competência.</p>}</section>;
}

function DreRow({ label, helper, value, percent, subtotal, final }: { label: string; helper?: string; value: Parameters<typeof formatCurrency>[0]; percent?: string; subtotal?: boolean; final?: boolean }) {
  return <tr className={final ? "dre-row-final" : subtotal ? "dre-row-subtotal" : ""}><td><strong>{label}</strong>{helper ? <span>{helper}</span> : null}</td><td>{formatCurrency(value)}</td><td>{percent ?? "—"}</td></tr>;
}
