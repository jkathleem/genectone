import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { formatCurrency, formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { financialOverview } from "@/modules/finance/overview";
import { productionOrderPredictedValue } from "@/modules/finance/overview-domain";

type Params = { companyId?: string; month?: string; year?: string };
const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function fortalezaTodayKey() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Fortaleza" }).format(new Date());
}

function moneyCard(title: string, value: Parameters<typeof formatCurrency>[0], description: string, href?: string) {
  return <article className="panel">
    <p className="text-sm font-medium text-slate-500">{title}</p>
    <strong className="mt-2 block text-2xl">{formatCurrency(value)}</strong>
    <p className="mt-2 text-xs text-slate-500">{description}</p>
    {href ? <Link className="link-button mt-3 inline-block" href={href}>Abrir</Link> : null}
  </article>;
}

export default async function Page({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const current = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Fortaleza", year: "numeric", month: "2-digit" }).format(new Date());
  const requestedMonth = Number(params.month);
  const requestedYear = Number(params.year);
  const month = Number.isInteger(requestedMonth) && requestedMonth >= 1 && requestedMonth <= 12 ? requestedMonth : Number(current.slice(5, 7));
  const year = Number.isInteger(requestedYear) && requestedYear >= 1900 ? requestedYear : Number(current.slice(0, 4));
  const companies = await prisma.company.findMany({ orderBy: { name: "asc" } });
  const data = await financialOverview(params.companyId || undefined, year, month, fortalezaTodayKey());

  return <>
    <PageHeader title="Visão Geral Financeira" description="Resumo executivo: carteira é previsão, faturamento é fato financeiro e caixa é recebimento/pagamento." />
    <form className="panel mb-5 form-grid">
      <label className="field">Empresa<select defaultValue={params.companyId || ""} name="companyId"><option value="">Todas</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.tradeName || company.name}</option>)}</select></label>
      <label className="field">Mês<select defaultValue={month} name="month">{monthNames.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}</select></label>
      <label className="field">Ano<input defaultValue={year} min={1900} name="year" required type="number" /></label>
      <div className="flex items-end gap-2"><button className="button-primary">Atualizar</button><Link className="button-secondary" href="/financeiro">Limpar</Link></div>
    </form>

    <section className="mb-5 grid gap-4 md:grid-cols-3">
      {moneyCard("A pagar hoje", data.payableToday, "Saldo de contas vencendo hoje.", "/financeiro/contas-a-pagar")}
      {moneyCard("A receber hoje", data.receivableToday, "Saldo de clientes vencendo hoje.", "/financeiro/contas-a-receber")}
      {moneyCard("Caixa realizado no mês", data.cashActualNet, "Recebimentos − pagamentos, incluindo estornos.", "/financeiro/fluxo-de-caixa?view=actual")}
    </section>

    <section className="mb-5 grid gap-4 md:grid-cols-3">
      {moneyCard("A pagar no mês", data.payableMonth, "Saldo previsto por vencimento no mês.", "/financeiro/contas-a-pagar")}
      {moneyCard("A receber no mês", data.receivableMonth, "Saldo previsto por vencimento no mês.", "/financeiro/contas-a-receber")}
      {moneyCard("Faturado a receber", data.billedToReceiveBalance, `${data.billedToReceiveCount} conta(s) com saldo em aberto.`, "/financeiro/contas-a-receber")}
    </section>

    <section className="mb-5 grid gap-4 md:grid-cols-3">
      {moneyCard("Carteira de produção", data.productionPortfolioValue, `${data.productionPortfolioCount} OP(s) abertas. Não é receita realizada.`, "/ops")}
      {moneyCard("Concluído a faturar", data.completedToBillValue, `${data.completedToBillCount} OP(s) concluídas sem faturamento.`, "/ops")}
      <article className="panel">
        <p className="text-sm font-medium text-slate-500">Vencidos</p>
        <strong className="mt-2 block text-xl">A pagar: {formatCurrency(data.payableOverdue)}</strong>
        <strong className="mt-1 block text-xl">A receber: {formatCurrency(data.receivableOverdue)}</strong>
        <p className="mt-2 text-xs text-slate-500">Saldos vencidos e ainda abertos.</p>
      </article>
    </section>

    <section className="panel mb-5">
      <h2 className="section-title mb-4">Atenção financeira</h2>
      <div className="grid gap-3 md:grid-cols-3">
        <Alert label="Contas a pagar vencidas" value={data.attention.overduePayableCount} href="/financeiro/contas-a-pagar?status=Vencida" />
        <Alert label="Contas a receber vencidas" value={data.attention.overdueReceivableCount} href="/financeiro/contas-a-receber?status=Vencida" />
        <Alert label="OPs concluídas sem faturamento" value={data.attention.completedToBillCount} href="/ops" />
      </div>
    </section>

    <section className="panel">
      <h2 className="section-title mb-4">OPs concluídas a faturar</h2>
      {data.completedToBillOrders.length ? <div className="table-wrap"><table><thead><tr><th>OP</th><th>Cliente</th><th>Produto</th><th>Conclusão</th><th>Valor previsto</th><th /></tr></thead><tbody>{data.completedToBillOrders.slice(0, 20).map((order) => <tr key={order.id}><td>{order.number}</td><td>{order.customer.name}</td><td>{order.product.reference}</td><td>{order.completedAt ? formatDate(order.completedAt) : "—"}</td><td>{formatCurrency(productionOrderPredictedValue(order.quantity, order.unitPrice))}</td><td><Link className="link-button" href={`/ops/${order.id}`}>Abrir OP</Link></td></tr>)}</tbody></table></div> : <p className="empty-state">Nenhuma OP concluída aguardando faturamento.</p>}
      <p className="mt-4 text-sm text-slate-500">Concluir produção não cria receita nem Conta a Receber. O fato financeiro nasce no faturamento.</p>
    </section>
  </>;
}

function Alert({ label, value, href }: { label: string; value: number; href: string }) {
  return <Link className="rounded-lg border border-amber-200 bg-amber-50 p-4 hover:bg-amber-100" href={href}>
    <strong className="block text-2xl text-amber-900">{value}</strong>
    <span className="text-sm font-medium text-amber-900">{label}</span>
  </Link>;
}
