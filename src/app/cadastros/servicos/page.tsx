import { Feedback } from "@/components/feedback";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { formatCurrency } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { createService, toggleService, updateService } from "@/modules/service-catalog/actions";

export default async function Page({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const [services, messages] = await Promise.all([
    prisma.service.findMany({
      include: { contractorCapabilities: { include: { contractor: true }, orderBy: { contractor: { name: "asc" } } } },
      orderBy: { name: "asc" },
    }),
    searchParams,
  ]);
  return <>
    <PageHeader title="Serviços" description="Catálogo reutilizável; preços atuais pertencem à combinação Terceirizado + Serviço." />
    <Feedback {...messages} />
    <section className="panel mb-6"><h2 className="section-title mb-4">Cadastrar serviço</h2><form action={createService} className="form-grid"><label className="field">Nome<input name="name" required /></label><label className="field">Descrição<input name="description" /></label><div className="flex items-end"><SubmitButton>Cadastrar</SubmitButton></div></form></section>
    <div className="grid gap-4">{services.map((service) => <article className="panel" key={service.id}>
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">{service.name}</h2><p className="text-sm text-slate-500">{service.description || "Sem descrição"}</p></div><span className={service.active ? "status-active" : "status-inactive"}>{service.active ? "Ativo" : "Inativo"}</span></div>
      <div className="mt-3 text-sm"><p className="font-medium">Terceirizados habilitados</p>{service.contractorCapabilities.length ? <ul className="mt-1 space-y-1">{service.contractorCapabilities.map((item) => <li key={item.contractorId}>{item.contractor.name}: {item.unitPrice ? formatCurrency(item.unitPrice) : "sem preço configurado"}{item.active ? "" : " — vínculo inativo"}</li>)}</ul> : <p className="text-slate-500">Nenhum vínculo externo configurado.</p>}</div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2"><details><summary className="link-button">Editar serviço</summary><form action={updateService} className="mt-3 grid gap-2"><input name="id" type="hidden" value={service.id}/><label className="field">Nome<input defaultValue={service.name} name="name" required/></label><label className="field">Descrição<input defaultValue={service.description ?? ""} name="description"/></label><SubmitButton>Salvar</SubmitButton></form></details>
      <form action={toggleService}><input name="id" type="hidden" value={service.id}/><input name="active" type="hidden" value={String(!service.active)}/><button className="link-button" type="submit">{service.active ? "Desativar" : "Ativar"}</button></form></div>
    </article>)}</div>
  </>;
}
