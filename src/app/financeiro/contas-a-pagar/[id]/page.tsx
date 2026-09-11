import Link from "next/link";
import { notFound } from "next/navigation";
import { Feedback } from "@/components/feedback";
import { PageHeader } from "@/components/page-header";
import { formatCurrency, formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { financialStatus, paidAmount, remainingAmount } from "@/modules/accounts-payable/domain";

const groupLabel = { VARIABLE_COST_EXPENSE: "Custos e Despesas Variáveis", FIXED_COST_EXPENSE: "Custos e Despesas Fixas", FINANCIAL_REVENUE: "Receitas Financeiras", FINANCIAL_EXPENSE: "Despesas Financeiras", INCOME_TAX_EXPENSE: "Tributos sobre o Resultado" } as const;

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ success?: string; error?: string }> }) {
  const { id } = await params;
  const [account, messages] = await Promise.all([
    prisma.accountPayable.findUnique({ where: { id }, include: { company: true, classification: true, payments: { include: { reversal: true }, orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }] }, contractorSettlement: { include: { contractor: true } } } }),
    searchParams,
  ]);
  if (!account) notFound();
  const paid = paidAmount(account.payments);
  const remaining = remainingAmount(account.originalAmount, account.payments);
  const status = financialStatus(account.originalAmount, account.dueDate, account.payments);
  return <>
    <PageHeader title="Conta a Pagar" description="Obrigação histórica por competência; pagamento permanece um fato separado." action={{ label: "Voltar às contas", href: "/financeiro/contas-a-pagar" }} />
    <Feedback {...messages} />
    <section className="panel mb-5"><dl className="detail-grid">
      <div><dt>Empresa</dt><dd>{account.company.tradeName || account.company.name}</dd></div>
      <div><dt>Descrição</dt><dd>{account.description}</dd></div>
      <div><dt>Origem</dt><dd>{account.source === "MANUAL" ? "Lançamento manual" : <Link className="link-button" href={`/terceirizacao/fechamentos/${account.contractorSettlementId}`}>Fechamento de Terceirizados</Link>}</dd></div>
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
      <div><dt>Situação</dt><dd>{status}</dd></div>
    </dl></section>
    <section className="panel mb-5"><h2 className="section-title mb-3">Situação dos pagamentos</h2>{account.payments.map(payment=><div className="mb-2 flex items-center justify-between" key={payment.id}><span>{formatDate(payment.paymentDate)} · {formatCurrency(payment.amount)} · {payment.reversal?`Estornado em ${formatDate(payment.reversal.reversalDate)} — ${payment.reversal.reason}`:"Ativo"}</span>{!payment.reversal?<Link className="link-button" href={`/financeiro/contas-a-pagar/${id}/pagamentos/${payment.id}/estornar`}>Estornar pagamento</Link>:null}</div>)}</section>
    <section className="panel"><div className="mb-4 flex items-center justify-between"><h2 className="section-title">Pagamentos</h2>{remaining.gt(0) ? <Link className="button-primary" href={`/financeiro/contas-a-pagar/${id}/pagamentos/novo`}>Registrar pagamento</Link> : null}</div>{account.payments.length ? <div className="table-wrap"><table><thead><tr><th>Data</th><th>Valor</th><th>Observações</th><th>Criado em</th></tr></thead><tbody>{account.payments.map((payment) => <tr key={payment.id}><td>{formatDate(payment.paymentDate)}</td><td>{formatCurrency(payment.amount)}</td><td>{payment.notes || "—"}</td><td>{payment.createdAt.toLocaleString("pt-BR")}</td></tr>)}</tbody></table></div> : <p className="empty-state">Nenhum pagamento registrado.</p>}</section>
  </>;
}
