import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";
import { createSettlement } from "@/modules/contractor-settlements/actions";

export default async function Page() {
  const contractors = await prisma.contractor.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  const now = new Date();
  return <><PageHeader title="Novo fechamento" description="Crie o rascunho; os itens serão adicionados na tela seguinte." action={{ label: "Voltar", href: "/terceirizacao/fechamentos" }}/><form action={createSettlement} className="panel form-grid"><label className="field">Mês<input defaultValue={now.getMonth() + 1} max={12} min={1} name="periodMonth" required type="number"/></label><label className="field">Ano<input defaultValue={now.getFullYear()} name="periodYear" required type="number"/></label><label className="field">Terceirizado<select name="contractorId" required><option value="">Selecione</option>{contractors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="field sm:col-span-2">Observações<textarea name="notes" rows={3}/></label><div className="flex items-end"><button className="button-primary">Criar rascunho</button></div></form></>;
}
