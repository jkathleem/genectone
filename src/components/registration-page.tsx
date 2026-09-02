import { Feedback } from "@/components/feedback";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";

type Field = { name: string; label: string; type?: string; required?: boolean };
type RecordRow = { id: string; active: boolean; values: Record<string, string | null> };

export function RegistrationPage({ title, singular, description, fields, records, createAction, updateAction, toggleAction, success, error }: {
  title: string; singular: string; description: string; fields: Field[]; records: RecordRow[];
  createAction: (data: FormData) => Promise<void>; updateAction: (data: FormData) => Promise<void>; toggleAction: (data: FormData) => Promise<void>;
  success?: string; error?: string;
}) {
  return <>
    <PageHeader title={title} description={description} />
    <Feedback success={success} error={error} />
    <section className="panel mb-6"><h2 className="section-title">Cadastrar {singular}</h2>
      <form action={createAction} className="form-grid">
        {fields.map((field) => <label className="field" key={field.name}>{field.label}<input name={field.name} required={field.required} type={field.type ?? "text"} /></label>)}
        <div className="flex items-end"><SubmitButton>Cadastrar</SubmitButton></div>
      </form>
    </section>
    <section className="panel"><div className="mb-4 flex items-center justify-between"><h2 className="section-title">Registros</h2><span className="text-sm text-slate-500">{records.length} encontrado(s)</span></div>
      {records.length === 0 ? <p className="empty-state">Nenhum registro cadastrado.</p> : <div className="table-wrap"><table><thead><tr>{fields.map((field) => <th key={field.name}>{field.label}</th>)}<th>Situação</th><th>Ações</th></tr></thead><tbody>
        {records.map((record) => <tr key={record.id}>{fields.map((field) => <td key={field.name}>{record.values[field.name] || "—"}</td>)}<td><span className={record.active ? "status-active" : "status-inactive"}>{record.active ? "Ativo" : "Inativo"}</span></td><td className="min-w-52">
          <details><summary className="link-button">Editar</summary><form action={updateAction} className="mt-3 grid gap-2"><input name="id" type="hidden" value={record.id} />{fields.map((field) => <label className="field text-xs" key={field.name}>{field.label}<input defaultValue={record.values[field.name] ?? ""} name={field.name} required={field.required} type={field.type ?? "text"} /></label>)}<SubmitButton>Salvar</SubmitButton></form></details>
          <form action={toggleAction} className="mt-2"><input name="id" type="hidden" value={record.id} /><input name="active" type="hidden" value={String(!record.active)} /><button className="link-button" type="submit">{record.active ? "Desativar" : "Ativar"}</button></form>
        </td></tr>)}
      </tbody></table></div>}
    </section>
  </>;
}
