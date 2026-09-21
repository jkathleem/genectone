import { OutsourcingFlowNav } from "@/components/outsourcing-flow-nav";
import { PageHeader } from "@/components/page-header";
import { FormSection } from "@/components/ui/form-section";
import { fortalezaMonthYear } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { createSettlement } from "@/modules/contractor-settlements/actions";

export default async function Page() {
  const [contractors, companies] = await Promise.all([prisma.contractor.findMany({ where: { active: true }, orderBy: { name: "asc" } }), prisma.company.findMany({ where: { active: true }, orderBy: { name: "asc" } })]);
  const { month, year } = fortalezaMonthYear();
  return <><PageHeader title="Novo fechamento" description="Crie o rascunho e adicione os serviços elegíveis na tela seguinte." action={{ label: "Voltar", href: "/terceirizacao/fechamentos" }}/>
    <OutsourcingFlowNav active="settlements"/>
    <form action={createSettlement} className="space-y-5">
      <FormSection title="1. Terceirizado" description="Escolha a empresa e o terceirizado do fechamento.">
        <div className="form-grid"><label className="field">Empresa<select name="companyId" required><option value="">Selecione</option>{companies.map((item) => <option key={item.id} value={item.id}>{item.tradeName || item.name}</option>)}</select></label><label className="field">Terceirizado<select name="contractorId" required><option value="">Selecione</option>{contractors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>
      </FormSection>
      <FormSection title="2. Competência" description="Informe o mês/ano que será usado na apuração.">
        <div className="form-grid"><label className="field">Mês<input defaultValue={month} max={12} min={1} name="periodMonth" required type="number"/></label><label className="field">Ano<input defaultValue={year} name="periodYear" required type="number"/></label></div>
      </FormSection>
      <FormSection title="3. Resumo e criação" description="Os serviços disponíveis para fechamento serão escolhidos no rascunho.">
        <div className="form-grid"><label className="field sm:col-span-2">Observações<textarea name="notes" rows={3}/></label><div className="flex items-end"><button className="button-primary">Criar fechamento</button></div></div>
      </FormSection>
    </form></>;
}
