import Link from "next/link";
import { notFound } from "next/navigation";
import { Feedback } from "@/components/feedback";
import { FinanceNav } from "@/components/finance-nav";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { StatusChip } from "@/components/ui/status-chip";
import { formatCurrency, formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { financialStatus, paidAmount, remainingAmount } from "@/modules/accounts-payable/domain";

const groupLabel = { VARIABLE_COST_EXPENSE: "Custos e Despesas Variáveis", FIXED_COST_EXPENSE: "Custos e Despesas Fixas", FINANCIAL_REVENUE: "Receitas Financeiras", FINANCIAL_EXPENSE: "Despesas Financeiras", INCOME_TAX_EXPENSE: "Tributos sobre o Resultado" } as const;

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ success?: string; error?: string }> }) {
  const { id } = await params;
  const [account, messages] = await Promise.all([
    prisma.accountPayable.findUnique({
      where: { id },
      include: {
        company: true,
        classification: true,
        createdBy: { select: { name: true } },
        payments: {
          include: {
            createdBy: { select: { name: true } },
            reversal: { include: { createdBy: { select: { name: true } } } },
          },
          orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
        },
        contractorSettlement: { include: { contractor: true } },
      },
    }),
    searchParams,
  ]);
  if (!account) notFound();
  const paid = paidAmount(account.payments);
  const remaining = remainingAmount(account.originalAmount, account.payments);
  const status = financialStatus(account.originalAmount, account.dueDate, account.payments);
  return <>
    <PageHeader title="Conta a Pagar" description="Obrigação histórica por competência; pagamento permanece um fato separado." action={{ label: "Voltar às contas", href: "/financeiro/contas-a-pagar" }} />
    <FinanceNav active="payables"/>
    <Feedback {...messages} />
    <section className="finance-stat-grid"><StatCard label="Valor original" value={formatCurrency(account.originalAmount)} helper="Obrigação reconhecida"/><StatCard label="Pago efetivo" value={formatCurrency(paid)} helper="Pagamentos não estornados" variant="success"/><StatCard label="Saldo atual" value={formatCurrency(remaining)} helper="Após pagamentos e estornos" variant={remaining.gt(0) ? "warning" : "success"}/><StatCard label="Situação" value={status} helper={`Vence em ${formatDate(account.dueDate)}`}/></section>
    <section className="panel mb-5"><dl className="detail-grid">
      <div><dt>Empresa</dt><dd>{account.company.tradeName || account.company.name}</dd></div>
      <div><dt>Descrição</dt><dd>{account.description}</dd></div>
      <div><dt>Origem</dt><dd>{account.source === "MANUAL" ? "Lançamento manual" : <Link className="link-button" href={`/terceirizacao/fechamentos/${account.contractorSettlementId}`}>Fechamento de Terceirizados</Link>}</dd></div>
      <div><dt>Criado por</dt><dd>{account.createdBy?.name || "Registro histórico sem autoria"}</dd></div>
      <div><dt>Beneficiário</dt><dd>{account.payeeName}</dd></div>
      <div><dt>Classificação aplicada</dt><dd>{account.classificationNameSnapshot}</dd></div>
      <div><dt>Código snapshot</dt><dd>{account.classificationCodeSnapshot}</dd></div>
      <div><dt>Impacta DRE</dt><dd>{account.financialNatureSnapshot === "OPERATING_EXPENSE" ? "Sim" : "Não"}</dd></div>
      <div><dt>Grupo DRE snapshot</dt><dd>{account.dreGroupSnapshot ? groupLabel[account.dreGroupSnapshot] : "Não aplicável"}</dd></div>
      <div><dt>Cadastro atual</dt><dd>{account.classification.name} ({account.classification.active ? "ativo" : "inativo"})</dd></div>
      <div><dt>Competência</dt><dd>{formatDate(account.competenceDate)}</dd></div>
      <div><dt>Vencimento</dt><dd>{formatDate(account.dueDate)}</dd></div>
      <div><dt>Valor original</dt><dd>{formatCurrency(account.originalAmount)}</dd></div>
      <div><dt>Pago</dt><dd>{formatCurrency(paid)}</dd></div>
      <div><dt>Saldo</dt><dd>{formatCurrency(remaining)}</dd></div>
      <div><dt>Situação</dt><dd><StatusChip variant={status === "Pago" ? "success" : status === "Vencida" ? "danger" : status === "Parcial" ? "warning" : "info"}>{status}</StatusChip></dd></div>
    </dl></section>
    <section className="panel"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="section-title">Pagamentos e estornos</h2>{remaining.gt(0) ? <Button href={`/financeiro/contas-a-pagar/${id}/pagamentos/novo`}>Registrar pagamento</Button> : null}</div>{account.payments.length ? <div className="finance-card-list">{account.payments.map((payment) => <article className="finance-list-card" key={payment.id}><div className="finance-card-head"><div><strong>{formatCurrency(payment.amount)}</strong><p>{formatDate(payment.paymentDate)} • {payment.createdBy?.name || "autor histórico não identificado"}</p></div><StatusChip variant={payment.reversal ? "danger" : "success"}>{payment.reversal ? "Estornado" : "Ativo"}</StatusChip></div><p>{payment.notes || "Sem observação"}</p>{payment.reversal ? <p>Estornado em {formatDate(payment.reversal.reversalDate)} — {payment.reversal.reason}</p> : <Button href={`/financeiro/contas-a-pagar/${id}/pagamentos/${payment.id}/estornar`} variant="danger" size="sm">Estornar pagamento</Button>}</article>)}</div> : <p className="empty-state">Nenhum pagamento registrado.</p>}</section>
  </>;
}
