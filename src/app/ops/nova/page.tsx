import { Feedback } from "@/components/feedback";
import { PageHeader } from "@/components/page-header";
import { ProductionOrderForm } from "@/components/production-order-form";
import { AlertPanel } from "@/components/ui/alert-panel";
import { createProductionOrder } from "@/modules/production-orders/actions";
import { getOrderOptions } from "@/modules/production-orders/queries";

export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [options, params] = await Promise.all([getOrderOptions(), searchParams]);
  const unavailable = !options.companies.length || !options.customers.length || !options.products.length;

  return (
    <>
      <PageHeader title="Nova OP" description="Crie uma ordem de produção com Produto, Cliente, preço aplicado e insumos registrados na OP." secondaryActions={[{ label: "Voltar às OPs", href: "/ops" }]} />
      <Feedback error={params.error} />
      {unavailable ? (
        <AlertPanel title="Cadastros necessários" variant="warning">
          Cadastre ao menos uma Empresa, um Cliente e um Produto ativos antes de criar uma OP.
        </AlertPanel>
      ) : (
        <ProductionOrderForm action={createProductionOrder} {...options} />
      )}
    </>
  );
}
