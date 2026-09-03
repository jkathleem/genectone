import { notFound } from "next/navigation";
import { Feedback } from "@/components/feedback";
import { OutsourcedServiceForm } from "@/components/outsourced-service-form";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";
import { saveOutsourcedService } from "@/modules/outsourcing/actions";
import { outsourcingOptions } from "@/modules/outsourcing/queries";
export default async function Page({ params, searchParams }: { params: Promise<{ id: string; serviceId: string }>; searchParams: Promise<{ error?: string }> }) { const { id, serviceId } = await params; const [item, messages] = await Promise.all([prisma.outsourcedService.findFirst({ where: { id: serviceId, productionOrderId: id }, include: { productionOrder: true, deliveryNoteItems: { take: 1 } } }), searchParams]); if (!item) notFound(); const options = await outsourcingOptions(item); return <><PageHeader title={`Editar serviço — OP ${item.productionOrder.number}`} description={item.deliveryNoteItems.length ? "Serviço e terceirizado bloqueados porque já existe saída." : "Dados estruturais podem ser alterados enquanto não houver saída."} action={{ label: "Voltar à OP", href: `/ops/${id}` }}/><Feedback {...messages}/><OutsourcedServiceForm action={saveOutsourcedService} orderId={id} {...options} values={{ id: item.id, serviceId: item.serviceId, contractorId: item.contractorId, plannedQuantity: item.plannedQuantity ?? item.productionOrder.quantity, appliedUnitPrice: item.appliedUnitPrice.toFixed(4), notes: item.notes, locked: item.deliveryNoteItems.length > 0 }}/></>; }
