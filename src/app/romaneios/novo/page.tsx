import { DeliveryNoteForm } from "@/components/delivery-note-form";
import { Feedback } from "@/components/feedback";
import { OutsourcingFlowNav } from "@/components/outsourcing-flow-nav";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";
import { fortalezaDateInputValue } from "@/lib/format";
import { availableToSend, sentQuantity } from "@/modules/delivery-notes/domain";

export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [contractors, services, messages] = await Promise.all([
    prisma.contractor.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.outsourcedService.findMany({ where: { plannedQuantity: { not: null } }, include: { contractor: true, service: true, productionOrder: { include: { customer: true, product: true } }, deliveryNoteItems: { select: { quantity: true } } }, orderBy: { createdAt: "asc" } }),
    searchParams,
  ]);
  const items = services.flatMap((item) => {
    if (!item.plannedQuantity) return [];
    const sent = sentQuantity(item.deliveryNoteItems); const available = availableToSend(item.plannedQuantity, sent);
    return [{ id: item.id, contractorId: item.contractorId, order: item.productionOrder.number, customer: item.productionOrder.customer.name, product: `${item.productionOrder.product.name}${item.productionOrder.product.reference ? ` — ${item.productionOrder.product.reference}` : ""}`, service: item.service.name, planned: item.plannedQuantity, sent, available }];
  });
  return <><PageHeader title="Novo Romaneio" description="Selecione um terceirizado, escolha os serviços disponíveis e confirme o envio." action={{ label: "Voltar aos Romaneios", href: "/romaneios" }}/><OutsourcingFlowNav active="delivery-notes"/><Feedback {...messages}/><DeliveryNoteForm contractors={contractors} items={items} today={fortalezaDateInputValue()}/></>;
}
