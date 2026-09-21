import { Feedback } from "@/components/feedback";
import { FinanceNav } from "@/components/finance-nav";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { FormSection } from "@/components/ui/form-section";
import { fortalezaMonthYear } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { createManualPayableAction } from "@/modules/accounts-payable/manual-actions";

export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [messages, companies, classifications] = await Promise.all([
    searchParams,
    prisma.company.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.financialClassification.findMany({ where: { active: true, NOT: { dreGroup: "FINANCIAL_REVENUE" } }, orderBy: { name: "asc" } }),
  ]);
  const { month, year } = fortalezaMonthYear();
  return <>
    <PageHeader title="Nova Conta a Pagar" description="Lançamento manual por competência, sem criar pagamento." action={{ label: "Cancelar", href: "/financeiro/contas-a-pagar" }} />
    <FinanceNav active="payables"/>
    <Feedback {...messages} />
    <form action={createManualPayableAction} className="space-y-5">
      <FormSection title="1. Identificação" description="Descreva a obrigação sem registrar pagamento.">
        <div className="form-grid"><label className="field">Empresa<select name="companyId" required defaultValue=""><option disabled value="">Selecione</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.tradeName || company.name}</option>)}</select></label><label className="field">Favorecido<input maxLength={200} name="payeeName" required /></label><label className="field sm:col-span-2">Descrição<input maxLength={300} name="description" required /></label></div>
      </FormSection>
      <FormSection title="2. Classificação" description="Define se a obrigação entra ou não na DRE por competência.">
        <label className="field">Classificação<select name="classificationId" required defaultValue=""><option disabled value="">Selecione</option>{classifications.map((classification) => <option key={classification.id} value={classification.id}>{classification.name} — Impacta DRE: {classification.financialNature === "NON_DRE" ? "Não" : "Sim"}</option>)}</select></label>
      </FormSection>
      <FormSection title="3. Competência, vencimento e valor">
        <div className="form-grid"><label className="field">Mês da competência<input defaultValue={month} max={12} min={1} name="competenceMonth" required type="number" /></label><label className="field">Ano da competência<input defaultValue={year} min={1900} name="competenceYear" required type="number" /></label><label className="field">Vencimento<input name="dueDate" required type="date" /></label><label className="field">Valor<input inputMode="decimal" name="originalAmount" placeholder="0,00" required /></label><div><SubmitButton>Registrar Conta a Pagar</SubmitButton></div></div>
      </FormSection>
    </form>
  </>;
}
