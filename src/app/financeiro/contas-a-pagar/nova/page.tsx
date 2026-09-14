import { Feedback } from "@/components/feedback";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
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
    <Feedback {...messages} />
    <form action={createManualPayableAction} className="panel form-grid">
      <label className="field">Empresa<select name="companyId" required defaultValue=""><option disabled value="">Selecione</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.tradeName || company.name}</option>)}</select></label>
      <label className="field">Beneficiário<input maxLength={200} name="payeeName" required /></label>
      <label className="field sm:col-span-2">Descrição<input maxLength={300} name="description" required /></label>
      <label className="field sm:col-span-2">Classificação<select name="classificationId" required defaultValue=""><option disabled value="">Selecione</option>{classifications.map((classification) => <option key={classification.id} value={classification.id}>{classification.name} — Impacta DRE: {classification.financialNature === "NON_DRE" ? "Não" : "Sim"}</option>)}</select></label>
      <label className="field">Mês da competência<input defaultValue={month} max={12} min={1} name="competenceMonth" required type="number" /></label>
      <label className="field">Ano da competência<input defaultValue={year} min={1900} name="competenceYear" required type="number" /></label>
      <label className="field">Vencimento<input name="dueDate" required type="date" /></label>
      <label className="field">Valor<input inputMode="decimal" name="originalAmount" placeholder="0,00" required /></label>
      <div><SubmitButton>Registrar Conta a Pagar</SubmitButton></div>
    </form>
  </>;
}
