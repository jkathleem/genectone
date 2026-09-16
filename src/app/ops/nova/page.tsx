import { Feedback } from "@/components/feedback";
import { PageHeader } from "@/components/page-header";
import { ProductionOrderForm } from "@/components/production-order-form";
import { createProductionOrder } from "@/modules/production-orders/actions";
import { getOrderOptions } from "@/modules/production-orders/queries";

export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [options, params] = await Promise.all([getOrderOptions(), searchParams]);
  const unavailable = !options.companies.length || !options.customers.length || !options.products.length;
  return <><PageHeader title="Nova OP" description="Selecione o Produto para carregar Cliente, descrição, cor, preço e insumos padrão." action={{ label: "Voltar ao Cadastro de OPs", href: "/ops" }}/><Feedback error={params.error}/>{unavailable ? <div className="panel text-sm text-amber-800">Cadastre ao menos uma Empresa, um Cliente e um Produto ativos antes de criar uma OP.</div> : <ProductionOrderForm action={createProductionOrder} {...options}/>}</>;
}
