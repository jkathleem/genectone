import { notFound, redirect } from "next/navigation";
import { OutsourcingFlowNav } from "@/components/outsourcing-flow-nav";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { generateAccountPayable } from "@/modules/accounts-payable/actions";
import { settlementTotal } from "@/modules/contractor-settlements/domain";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const settlement = await prisma.contractorSettlement.findUnique({ where: { id }, include: { company: true, contractor: true, items: true, accountPayable: true } });
  if (!settlement) notFound();
  if (settlement.status !== "APPROVED") redirect(`/terceirizacao/fechamentos/${id}`);
  if (settlement.accountPayable) redirect(`/financeiro/contas-a-pagar/${settlement.accountPayable.id}`);
  const total = settlementTotal(settlement.items.map((item) => ({ quantity: item.approvedQuantityIncluded, price: item.appliedUnitPriceSnapshot })));
  const pieces = settlement.items.reduce((sum, item) => sum + item.approvedQuantityIncluded, 0);
  return (
    <>
      <PageHeader title="Gerar Conta a Pagar" description="A obrigação será criada a partir do fechamento aprovado." action={{ label: "Voltar ao fechamento", href: `/terceirizacao/fechamentos/${id}` }}/>
      <OutsourcingFlowNav active="settlements"/>
      <section className="outsourcing-stat-grid">
        <StatCard label="Fechamento" value={`${String(settlement.periodMonth).padStart(2, "0")}/${settlement.periodYear}`} helper={settlement.contractor.name}/>
        <StatCard label="Valor" value={formatCurrency(total)} helper={`${pieces.toLocaleString("pt-BR")} peças`} variant="info"/>
        <StatCard label="Origem" value="Fechamento" helper="Terceirização aprovada"/>
      </section>
      <section className="panel mb-5"><dl className="detail-grid"><div><dt>Empresa</dt><dd>{settlement.company.tradeName || settlement.company.name}</dd></div><div><dt>Terceirizado</dt><dd>{settlement.contractor.name}</dd></div><div><dt>Competência</dt><dd>{String(settlement.periodMonth).padStart(2, "0")}/{settlement.periodYear}</dd></div><div><dt>Valor</dt><dd>{formatCurrency(total)}</dd></div></dl></section>
      <form action={generateAccountPayable} className="panel form-grid">
        <input name="settlementId" type="hidden" value={id}/>
        <label className="field">Vencimento<input name="dueDate" required type="date"/></label>
        <div className="flex items-end"><button className="button-primary">Gerar Conta a Pagar</button></div>
      </form>
    </>
  );
}
