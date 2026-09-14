import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { formatCurrency, formatDate, fortalezaDateInputValue } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { paidAmount, remainingAmount } from "@/modules/accounts-payable/domain";
import { registerPayment } from "@/modules/accounts-payable/payment-actions";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const account = await prisma.accountPayable.findUnique({ where: { id }, include: { company: true, payments: { select: { amount: true, reversal: { select: { id: true } } } } } });
  if (!account) notFound();
  const paid = paidAmount(account.payments), remaining = remainingAmount(account.originalAmount, account.payments);
  if (remaining.lte(0)) redirect(`/financeiro/contas-a-pagar/${id}`);
  return <><PageHeader title="Registrar pagamento" description="Registre a data da saída efetiva e o valor pago." action={{ label: "Cancelar", href: `/financeiro/contas-a-pagar/${id}` }}/><section className="panel mb-5"><dl className="detail-grid"><div><dt>Empresa</dt><dd>{account.company.tradeName || account.company.name}</dd></div><div><dt>Descrição</dt><dd>{account.description}</dd></div><div><dt>Beneficiário</dt><dd>{account.payeeName}</dd></div><div><dt>Vencimento</dt><dd>{formatDate(account.dueDate)}</dd></div><div><dt>Valor original</dt><dd>{formatCurrency(account.originalAmount)}</dd></div><div><dt>Já pago</dt><dd>{formatCurrency(paid)}</dd></div><div><dt>Saldo atual</dt><dd>{formatCurrency(remaining)}</dd></div></dl></section><form action={registerPayment} className="panel form-grid"><input name="accountPayableId" type="hidden" value={id}/><label className="field">Data do pagamento<input defaultValue={fortalezaDateInputValue()} name="paymentDate" required type="date"/></label><label className="field">Valor<input defaultValue={remaining.toFixed(2).replace(".", ",")} inputMode="decimal" name="amount" required/></label><label className="field sm:col-span-2">Observações<textarea maxLength={2000} name="notes" rows={3}/></label><div><SubmitButton>Registrar pagamento</SubmitButton></div></form></>;
}
