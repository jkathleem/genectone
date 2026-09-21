import { notFound, redirect } from "next/navigation";
import { FinanceNav } from "@/components/finance-nav";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency, fortalezaDateInputValue } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { paidAmount, remainingAmount } from "@/modules/accounts-payable/domain";
import { registerPayment } from "@/modules/accounts-payable/payment-actions";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const account = await prisma.accountPayable.findUnique({ where: { id }, include: { company: true, payments: { select: { amount: true, reversal: { select: { id: true } } } } } });
  if (!account) notFound();
  const paid = paidAmount(account.payments), remaining = remainingAmount(account.originalAmount, account.payments);
  if (remaining.lte(0)) redirect(`/financeiro/contas-a-pagar/${id}`);
  return <><PageHeader title="Registrar pagamento" description="Registre a saída efetiva de caixa. A DRE permanece pela competência da obrigação." action={{ label: "Cancelar", href: `/financeiro/contas-a-pagar/${id}` }}/><FinanceNav active="payables"/><section className="finance-stat-grid"><StatCard label="Conta" value={account.payeeName} helper={account.description}/><StatCard label="Valor original" value={formatCurrency(account.originalAmount)}/><StatCard label="Já pago" value={formatCurrency(paid)} variant="success"/><StatCard label="Saldo atual" value={formatCurrency(remaining)} variant="warning"/></section><form action={registerPayment} className="panel form-grid"><input name="accountPayableId" type="hidden" value={id}/><label className="field">Data do pagamento<input defaultValue={fortalezaDateInputValue()} name="paymentDate" required type="date"/></label><label className="field">Valor a pagar<input defaultValue={remaining.toFixed(2).replace(".", ",")} inputMode="decimal" name="amount" required/></label><label className="field sm:col-span-2">Observações<textarea maxLength={2000} name="notes" rows={3}/></label><div><SubmitButton>Registrar pagamento</SubmitButton></div></form></>;
}
