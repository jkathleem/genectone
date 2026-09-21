import Link from "next/link";
import { FinanceNav } from "@/components/finance-nav";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { StatusChip } from "@/components/ui/status-chip";
import { formatCurrency, formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { flowTotals, groupByDay } from "@/modules/cash-flow/domain";
import { cashFlowData } from "@/modules/cash-flow/queries";

type Params = { companyId?: string; from?: string; to?: string; view?: string };

function validDate(value?: string) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

export default async function Page({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const current = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Fortaleza",
  }).format(new Date());
  const yearMonth = current.slice(0, 7);
  const fromValue = validDate(params.from) ?? `${yearMonth}-01`;
  const toValue = validDate(params.to) ?? current;
  const view = params.view === "actual" ? "actual" : "predicted";
  const from = new Date(`${fromValue}T00:00:00.000Z`);
  const to = new Date(`${toValue}T00:00:00.000Z`);
  const [data, companies] = await Promise.all([
    cashFlowData({ companyId: params.companyId, from, to, view }),
    prisma.company.findMany({ orderBy: { name: "asc" } }),
  ]);
  const totals = flowTotals(data.movements);
  const days = groupByDay(data.movements);

  return (
    <>
      <PageHeader
        title="Fluxo de Caixa"
        description="Visão derivada dos fatos financeiros registrados; não representa saldo bancário."
      />
      <FinanceNav active="cash"/>
      <form className="panel mb-5 form-grid">
        <label className="field">
          Empresa
          <select defaultValue={params.companyId || ""} name="companyId">
            <option value="">Todas</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.tradeName || company.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Período inicial
          <input defaultValue={fromValue} name="from" required type="date" />
        </label>
        <label className="field">
          Período final
          <input defaultValue={toValue} name="to" required type="date" />
        </label>
        <label className="field">
          Visão
          <select defaultValue={view} name="view">
            <option value="predicted">Previsto</option>
            <option value="actual">Realizado</option>
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button className="button-primary">Aplicar</button>
          <Link className="button-secondary" href="/financeiro/fluxo-de-caixa">
            Limpar filtros
          </Link>
        </div>
      </form>

      <section className="finance-stat-grid">
        <StatCard label={`Entradas ${view === "actual" ? "realizadas" : "previstas"}`} value={formatCurrency(totals.entries)} helper={view === "actual" ? "Receipts e estornos inversos" : "A/R em aberto"} variant="success"/>
        <StatCard label={`Saídas ${view === "actual" ? "realizadas" : "previstas"}`} value={formatCurrency(totals.exits)} helper={view === "actual" ? "Payments e estornos inversos" : "A/P em aberto"} variant="warning"/>
        <StatCard label="Movimentação líquida" value={formatCurrency(totals.net)} helper="Entradas − saídas"/>
      </section>

      {view === "predicted" ? (
        <section className="mb-5 grid gap-4 sm:grid-cols-2">
          <StatCard label="A receber vencido antes do período" value={formatCurrency(data.overdueReceivable)} helper="Previsto em aberto" variant="danger"/>
          <StatCard label="A pagar vencido antes do período" value={formatCurrency(data.overduePayable)} helper="Previsto em aberto" variant="danger"/>
        </section>
      ) : null}

      <section className="panel mb-5">
        <h2 className="section-title mb-4">Agrupamento diário</h2>
        {days.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Entradas</th>
                  <th>Saídas</th>
                  <th>Líquido do dia</th>
                </tr>
              </thead>
              <tbody>
                {days.map((day) => (
                  <tr key={day.date}>
                    <td>{formatDate(new Date(`${day.date}T00:00:00Z`))}</td>
                    <td>{formatCurrency(day.entries)}</td>
                    <td>{formatCurrency(day.exits)}</td>
                    <td>{formatCurrency(day.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty-state">Nenhum movimento encontrado no período.</p>
        )}
      </section>

      <section className="panel">
        <h2 className="section-title mb-4">
          Movimentos {view === "actual" ? "realizados" : "previstos"}
        </h2>
        {data.movements.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Tipo</th>
                  <th>Empresa</th>
                  <th>Contraparte</th>
                  <th>Descrição</th>
                  {view === "predicted" ? (
                    <>
                      <th>Original</th>
                      <th>Pago/recebido</th>
                    </>
                  ) : null}
                  <th>Valor no fluxo</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.movements
                  .sort((a, b) => a.date.getTime() - b.date.getTime())
                  .map((item) => (
                    <tr key={`${item.direction}-${item.id}`}>
                      <td>{formatDate(item.date)}</td>
                      <td><StatusChip variant={item.direction === "OUT" ? "warning" : "success"}>{item.type}</StatusChip></td>
                      <td>{item.company}</td>
                      <td>{item.counterparty}</td>
                      <td>{item.description}</td>
                      {view === "predicted" ? (
                        <>
                          <td>{formatCurrency(item.originalAmount!)}</td>
                          <td>{formatCurrency(item.settledAmount!)}</td>
                        </>
                      ) : null}
                      <td className={item.direction === "OUT" ? "finance-negative" : "finance-positive"}>
                        {item.direction === "OUT" ? "− " : "+ "}
                        {formatCurrency(item.amount)}
                      </td>
                      <td>
                        <Link className="link-button" href={item.href}>
                          Abrir
                        </Link>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty-state">Nenhum movimento encontrado.</p>
        )}
      </section>
    </>
  );
}
