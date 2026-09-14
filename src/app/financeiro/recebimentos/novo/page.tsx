import { Feedback } from "@/components/feedback";
import { PageHeader } from "@/components/page-header";
import { ReceiptForm } from "@/components/receipt-form";
import { formatDate, fortalezaDateInputValue } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { receivedAmount, receivableRemainingAmount } from "@/modules/accounts-receivable/domain";
import { registerReceipt } from "@/modules/receipts/actions";

type Params = { companyId?: string; customerId?: string; error?: string };

export default async function Page({ searchParams }: { searchParams: Promise<Params> }) {
  const p = await searchParams;
  const [companies, customers, rows] = await Promise.all([
    prisma.company.findMany({ orderBy: { name: "asc" } }),
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
    p.companyId && p.customerId ? prisma.accountReceivable.findMany({ where: { companyId: p.companyId, customerId: p.customerId }, include: { allocations: { select: { amount: true } }, billing: { include: { productionOrder: true } } }, orderBy: { dueDate: "asc" } }) : Promise.resolve([]),
  ]);
  const accounts = rows.flatMap(row => {
    const received = receivedAmount(row.allocations), remaining = receivableRemainingAmount(row.originalAmount, row.allocations);
    return remaining.gt(0) ? [{ id: row.id, op: row.billing.productionOrder.number, invoice: row.billing.invoiceNumber, dueDate: formatDate(row.dueDate), original: row.originalAmount.toString(), received: received.toString(), remaining: remaining.toString() }] : [];
  });
  return <><PageHeader title="Novo recebimento" description="Registre uma única entrada real e distribua integralmente entre Contas a Receber." action={{ label: "Voltar", href: "/financeiro/recebimentos" }}/><Feedback error={p.error}/><form className="panel mb-5 form-grid"><label className="field">Empresa<select defaultValue={p.companyId || ""} name="companyId" required><option value="">Selecione</option>{companies.map(x => <option key={x.id} value={x.id}>{x.tradeName || x.name}</option>)}</select></label><label className="field">Cliente<select defaultValue={p.customerId || ""} name="customerId" required><option value="">Selecione</option>{customers.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label><div className="flex items-end"><button className="button-secondary">Carregar contas</button></div></form>{p.companyId && p.customerId ? accounts.length ? <ReceiptForm action={registerReceipt} accounts={accounts} companyId={p.companyId} customerId={p.customerId} today={fortalezaDateInputValue()}/> : <section className="panel"><p className="empty-state">Nenhuma Conta a Receber com saldo para esta empresa e cliente.</p></section> : <section className="panel"><p className="empty-state">Selecione Empresa e Cliente para carregar as contas disponíveis.</p></section>}</>;
}
