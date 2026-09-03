import { Feedback } from "@/components/feedback";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { formatCurrency, formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { addServicePrice, createService, toggleService, updateService } from "@/modules/service-catalog/actions";
import { currentPrice } from "@/modules/service-catalog/pricing";

export default async function Page({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const [services, messages] = await Promise.all([prisma.service.findMany({ include: { prices: { orderBy: { validFrom: "desc" } } }, orderBy: { name: "asc" } }), searchParams]); const today = new Date();
  return <><PageHeader title="Serviços" description="Catálogo reutilizável e histórico de preços padrão." /><Feedback {...messages} />
    <section className="panel mb-6"><h2 className="section-title mb-4">Cadastrar serviço</h2><form action={createService} className="form-grid"><label className="field">Nome<input name="name" required /></label><label className="field">Descrição<input name="description" /></label><div className="flex items-end"><SubmitButton>Cadastrar</SubmitButton></div></form></section>
    <div className="grid gap-4">{services.map(service => { const vigente = currentPrice(service.prices, today); return <article className="panel" key={service.id}><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">{service.name}</h2><p className="text-sm text-slate-500">{service.description || "Sem descrição"}</p><p className="mt-2 font-semibold text-[var(--brand)]">{vigente ? `${formatCurrency(vigente.unitPrice)} — desde ${formatDate(vigente.validFrom)}` : "Sem preço padrão"}</p></div><span className={service.active ? "status-active" : "status-inactive"}>{service.active ? "Ativo" : "Inativo"}</span></div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3"><details><summary className="link-button">Editar serviço</summary><form action={updateService} className="mt-3 grid gap-2"><input name="id" type="hidden" value={service.id}/><label className="field">Nome<input defaultValue={service.name} name="name" required/></label><label className="field">Descrição<input defaultValue={service.description ?? ""} name="description"/></label><SubmitButton>Salvar</SubmitButton></form></details>
      <form action={toggleService}><input name="id" type="hidden" value={service.id}/><input name="active" type="hidden" value={String(!service.active)}/><button className="link-button" type="submit">{service.active ? "Desativar" : "Ativar"}</button></form>
      <details><summary className="link-button">Novo preço e histórico</summary><form action={addServicePrice} className="mt-3 grid gap-2"><input name="id" type="hidden" value={service.id}/><label className="field">Novo preço<input inputMode="decimal" name="unitPrice" placeholder="0,00" required/></label><label className="field">Início da vigência<input name="validFrom" required type="date"/></label><SubmitButton>Registrar preço</SubmitButton></form><ul className="mt-4 space-y-1 text-sm">{service.prices.length ? service.prices.map(price => <li key={price.id}>{formatCurrency(price.unitPrice)} — desde {formatDate(price.validFrom)}{price.validUntil ? ` até ${formatDate(price.validUntil)}` : ""}</li>) : <li className="text-slate-500">Nenhum preço registrado.</li>}</ul></details></div></article>; })}</div>
  </>;
}
