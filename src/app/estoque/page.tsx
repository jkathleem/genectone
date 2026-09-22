import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";

export default function InventoryPage() {
  return (
    <>
      <PageHeader title="Estoque" description="Módulo planejado para uma etapa futura do sistema." />
      <section className="panel">
        <EmptyState title="Módulo em desenvolvimento" description="Ainda não há controles de estoque, saldos ou movimentações implementados. Esta tela existe apenas para organizar a navegação principal." />
      </section>
    </>
  );
}
