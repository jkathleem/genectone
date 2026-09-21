import { notFound } from "next/navigation";
import { FinanceNav } from "@/components/finance-nav";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { AlertPanel } from "@/components/ui/alert-panel";
import { formatCurrency, formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { reverseReceiptAction } from "@/modules/financial-reversals/actions";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const receipt = await prisma.receipt.findUnique({ where: { id }, include: { reversal: true, company: true, customer: true } });
  if (!receipt) notFound();
  return (
    <>
      <PageHeader title="Estornar recebimento" description="Todas as alocações serão desfeitas economicamente, sem exclusão." action={{ label: "Cancelar", href: `/financeiro/recebimentos/${id}` }}/>
      <FinanceNav active="receivables"/>
      <AlertPanel title="Ação sensível" variant="danger">
        <p>Este estorno reabre os saldos das contas relacionadas e gera movimento inverso no caixa. A DRE não é alterada por recebimento nem por estorno.</p>
      </AlertPanel>
      <section className="panel mb-4"><dl className="detail-grid"><div><dt>Recebimento</dt><dd>{formatCurrency(receipt.amount)}</dd></div><div><dt>Data</dt><dd>{formatDate(receipt.receiptDate)}</dd></div><div><dt>Cliente</dt><dd>{receipt.customer.name}</dd></div><div><dt>Empresa</dt><dd>{receipt.company.tradeName || receipt.company.name}</dd></div></dl></section>
      <form action={reverseReceiptAction} className="panel form-grid">
        <input type="hidden" name="receiptId" value={id}/>
        <label className="field">Data do estorno<input type="date" name="reversalDate" min={receipt.receiptDate.toISOString().slice(0, 10)} required/></label>
        <label className="field sm:col-span-2">Motivo<textarea name="reason" required/></label>
        <SubmitButton disabled={!!receipt.reversal}>Estornar recebimento</SubmitButton>
      </form>
    </>
  );
}
