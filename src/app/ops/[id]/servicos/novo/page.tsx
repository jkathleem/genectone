import { notFound } from "next/navigation";
import { Feedback } from "@/components/feedback";
import { OutsourcedServiceForm } from "@/components/outsourced-service-form";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";
import { saveOutsourcedService } from "@/modules/outsourcing/actions";
import { outsourcingOptions } from "@/modules/outsourcing/queries";
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) { const { id } = await params; const [order, options, messages] = await Promise.all([prisma.productionOrder.findUnique({ where: { id } }), outsourcingOptions(), searchParams]); if (!order) notFound(); return <><PageHeader title={`Novo serviço — OP ${order.number}`} description="A OP, empresa, cliente e produto são herdados deste lançamento." action={{ label: "Voltar à OP", href: `/ops/${id}` }}/><Feedback {...messages}/>{!options.services.length || !options.contractors.length ? <p className="panel">Cadastre ao menos um serviço e um terceirizado ativos.</p> : <OutsourcedServiceForm action={saveOutsourcedService} orderId={id} {...options} values={{ plannedQuantity: order.quantity }}/>}</>; }
