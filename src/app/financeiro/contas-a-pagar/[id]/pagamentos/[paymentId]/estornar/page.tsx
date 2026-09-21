import { notFound } from "next/navigation";
import { FinanceNav } from "@/components/finance-nav";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { AlertPanel } from "@/components/ui/alert-panel";
import { formatCurrency, formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { reversePaymentAction } from "@/modules/financial-reversals/actions";

export default async function Page({ params }: { params: Promise<{ id: string; paymentId: string }> }) {
  const { id, paymentId } = await params;
  const payment = await prisma.payment.findUnique({ where: { id: paymentId }, include: { reversal: true, accountPayable: true } });
  if (!payment || payment.accountPayableId !== id) notFound();
  return (
    <>
      <PageHeader title="Estornar pagamento" description="O pagamento original será preservado e um movimento inverso será registrado." action={{ label: "Cancelar", href: `/financeiro/contas-a-pagar/${id}` }}/>
      <FinanceNav active="payables"/>
      <AlertPanel title="Ação sensível" variant="danger">
        <p>Este estorno reabre o saldo da Conta a Pagar e gera movimento inverso no Fluxo de Caixa. A DRE não é alterada pelo pagamento nem pelo estorno.</p>
      </AlertPanel>
      <section className="panel mb-4"><dl className="detail-grid"><div><dt>Pagamento</dt><dd>{formatCurrency(payment.amount)}</dd></div><div><dt>Data</dt><dd>{formatDate(payment.paymentDate)}</dd></div><div><dt>Conta relacionada</dt><dd>{payment.accountPayable.description}</dd></div><div><dt>Favorecido</dt><dd>{payment.accountPayable.payeeName}</dd></div></dl></section>
      <form action={reversePaymentAction} className="panel form-grid">
        <input type="hidden" name="paymentId" value={payment.id}/>
        <input type="hidden" name="accountId" value={id}/>
        <label className="field">Data do estorno<input type="date" name="reversalDate" min={payment.paymentDate.toISOString().slice(0, 10)} required/></label>
        <label className="field sm:col-span-2">Motivo<textarea name="reason" required/></label>
        <SubmitButton disabled={!!payment.reversal}>Estornar pagamento</SubmitButton>
      </form>
    </>
  );
}
