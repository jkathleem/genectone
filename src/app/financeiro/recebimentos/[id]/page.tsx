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
import { allocationTotal } from "@/modules/receipts/creation";

export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ success?: string; error?: string }> }) {
  const { id } = await params;
  const [receipt, messages] = await Promise.all([
    prisma.receipt.findUnique({ where: { id }, include: { company: true, customer: true, createdBy: { select: { name: true } }, reversal: { include: { createdBy: { select: { name: true } } } }, allocations: { include: { accountReceivable: { include: { billing: { include: { productionOrder: true } } } } } } } }),
    searchParams,
  ]);
  if (!receipt) notFound();
  return (
    <>
      <PageHeader title="Recebimento" description="Entrada financeira preservada mesmo quando estornada." action={{ label: "Voltar", href: "/financeiro/recebimentos" }}/>
      <FinanceNav active="receivables"/>
      <Feedback {...messages}/>
      <section className="finance-stat-grid"><StatCard label="Valor" value={formatCurrency(receipt.amount)} helper={formatDate(receipt.receiptDate)} variant={receipt.reversal ? "danger" : "success"}/><StatCard label="Status" value={receipt.reversal ? "Estornado" : "Ativo"} helper={receipt.customer.name}/><StatCard label="Total alocado histórico" value={formatCurrency(allocationTotal(receipt.allocations))} helper={`${receipt.allocations.length} conta(s)`}/></section>
      <section className="panel mb-5"><dl className="detail-grid"><div><dt>Empresa</dt><dd>{receipt.company.tradeName || receipt.company.name}</dd></div><div><dt>Cliente</dt><dd>{receipt.customer.name}</dd></div><div><dt>Data</dt><dd>{formatDate(receipt.receiptDate)}</dd></div><div><dt>Status</dt><dd><StatusChip variant={receipt.reversal ? "danger" : "success"}>{receipt.reversal ? "Estornado" : "Ativo"}</StatusChip></dd></div><div><dt>Registrado por</dt><dd>{receipt.createdBy?.name || "Autor histórico não identificado"}</dd></div>{receipt.reversal ? <><div><dt>Data do estorno</dt><dd>{formatDate(receipt.reversal.reversalDate)}</dd></div><div><dt>Estornado por</dt><dd>{receipt.reversal.createdBy?.name || "Autor histórico não identificado"}</dd></div><div className="sm:col-span-2"><dt>Motivo</dt><dd>{receipt.reversal.reason}</dd></div></> : null}</dl>{!receipt.reversal ? <Button className="mt-4" href={`/financeiro/recebimentos/${id}/estornar`} variant="danger">Estornar recebimento</Button> : null}</section>
      <section className="panel"><h2 className="section-title mb-4">Alocações {receipt.reversal ? "(históricas, sem efeito no saldo)" : ""}</h2>{receipt.allocations.length ? <div className="finance-card-list">{receipt.allocations.map((allocation) => <article className="finance-list-card" key={allocation.id}><div className="finance-card-head"><div><strong>OP {allocation.accountReceivable.billing.productionOrder.number}</strong><p>NFe {allocation.accountReceivable.billing.invoiceNumber}</p></div><strong>{formatCurrency(allocation.amount)}</strong></div><Link className="link-button" href={`/financeiro/contas-a-receber/${allocation.accountReceivableId}`}>Abrir Conta a Receber</Link></article>)}</div> : <p className="empty-state">Nenhuma alocação registrada.</p>}</section>
    </>
  );
}
