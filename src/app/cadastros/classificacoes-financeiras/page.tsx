import { Feedback } from "@/components/feedback";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { prisma } from "@/lib/prisma";
import { createClassificationAction, toggleClassificationAction, updateClassificationAction } from "@/modules/financial-classifications/actions";
import { ClassificationNatureFields } from "@/modules/financial-classifications/classification-fields";

const groupLabel = {
  VARIABLE_COST_EXPENSE: "Custos e Despesas Variáveis",
  FIXED_COST_EXPENSE: "Custos e Despesas Fixas",
  FINANCIAL_REVENUE: "Receitas Financeiras",
  FINANCIAL_EXPENSE: "Despesas Financeiras",
  INCOME_TAX_EXPENSE: "Tributos sobre o Resultado",
} as const;
const natureLabel = { OPERATING_EXPENSE: "Despesa operacional", DRE_POST_OPERATING: "DRE pós-operacional", NON_DRE: "Fora da DRE" } as const;

export default async function Page({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const [messages, classifications] = await Promise.all([
    searchParams,
    prisma.financialClassification.findMany({ include: { _count: { select: { accountsPayable: true } } }, orderBy: [{ dreGroup: "asc" }, { name: "asc" }] }),
  ]);
  return <>
    <PageHeader title="Classificações Financeiras" description="Catálogo financeiro gerencial amplo; nem toda classificação afeta a DRE." />
    <Feedback {...messages} />
    <section className="panel mb-6">
      <h2 className="section-title mb-4">Cadastrar classificação</h2>
      <form action={createClassificationAction} className="form-grid">
        <label className="field">Código técnico<input name="code" pattern="[A-Z0-9_]+" placeholder="EXEMPLO_CODIGO" required /></label>
        <label className="field">Nome<input maxLength={200} name="name" required /></label>
        <ClassificationNatureFields />
        <label className="field">Observações<input maxLength={2000} name="notes" /></label>
        <div><SubmitButton>Cadastrar</SubmitButton></div>
      </form>
    </section>
    <section className="grid gap-4">
      {classifications.map((item) => <article className="panel" key={item.id}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="section-title">{item.name}</h2><p className="mt-1 text-sm text-slate-500">{item.code} · {natureLabel[item.financialNature]} · {item.dreGroup ? groupLabel[item.dreGroup] : "Grupo DRE não aplicável"} · {item._count.accountsPayable} conta(s)</p></div>
          <span className={item.active ? "status-active" : "status-inactive"}>{item.active ? "Ativa" : "Inativa"}</span>
        </div>
        <p className="mt-3 text-sm text-slate-600">{item.notes || "Sem observações."}</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <details><summary className="link-button">Editar</summary><form action={updateClassificationAction} className="mt-3 grid gap-2"><input name="id" type="hidden" value={item.id} /><label className="field">Código técnico<input disabled value={item.code} /></label><label className="field">Nome<input defaultValue={item.name} maxLength={200} name="name" required /></label><ClassificationNatureFields initialNature={item.financialNature} initialGroup={item.dreGroup} locked={item._count.accountsPayable > 0} /><label className="field">Observações<input defaultValue={item.notes ?? ""} maxLength={2000} name="notes" /></label><SubmitButton>Salvar</SubmitButton></form></details>
          <form action={toggleClassificationAction}><input name="id" type="hidden" value={item.id} /><input name="active" type="hidden" value={String(!item.active)} /><SubmitButton>{item.active ? "Desativar" : "Ativar"}</SubmitButton></form>
        </div>
      </article>)}
    </section>
  </>;
}
