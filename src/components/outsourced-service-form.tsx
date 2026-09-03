"use client";
import { useMemo, useState } from "react";
import { SubmitButton } from "./submit-button";
type ServiceOption = { id: string; name: string; price: string | null };
type ContractorOption = { id: string; name: string };
type Values = { id?: string; serviceId?: string; contractorId?: string; plannedQuantity: number; appliedUnitPrice?: string; notes?: string | null; locked?: boolean };
export function OutsourcedServiceForm({ action, orderId, services, contractors, values }: { action: (data: FormData) => Promise<void>; orderId: string; services: ServiceOption[]; contractors: ContractorOption[]; values: Values }) {
  const [serviceId, setServiceId] = useState(values.serviceId ?? ""); const [price, setPrice] = useState(values.appliedUnitPrice ?? ""); const selected = useMemo(() => services.find(s => s.id === serviceId), [services, serviceId]);
  return <form action={action} className="panel form-grid"><input name="orderId" type="hidden" value={orderId}/>{values.id ? <input name="id" type="hidden" value={values.id}/> : null}
    <label className="field">Serviço<select disabled={values.locked} name="serviceId" onChange={event => { const next = event.target.value; setServiceId(next); setPrice(services.find(s => s.id === next)?.price ?? ""); }} required value={serviceId}><option disabled value="">Selecione</option>{services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>{values.locked ? <input name="serviceId" type="hidden" value={serviceId}/> : null}</label>
    <label className="field">Terceirizado<select defaultValue={values.contractorId ?? ""} disabled={values.locked} name="contractorId" required><option disabled value="">Selecione</option>{contractors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>{values.locked ? <input name="contractorId" type="hidden" value={values.contractorId}/> : null}</label>
    <label className="field">Quantidade prevista<input defaultValue={values.plannedQuantity} min="1" name="plannedQuantity" required step="1" type="number"/></label>
    <label className="field">Preço unitário aplicado<input inputMode="decimal" name="appliedUnitPrice" onChange={e => setPrice(e.target.value)} placeholder="Informe o preço" required value={price}/>{selected ? <span className="font-normal text-slate-500">{selected.price ? "Preço padrão sugerido; pode ser alterado." : "Este serviço não possui preço padrão. Informe o preço aplicado."}</span> : null}</label>
    <label className="field sm:col-span-2">Observações<textarea defaultValue={values.notes ?? ""} name="notes" rows={3}/></label><div><SubmitButton>{values.id ? "Salvar alterações" : "Adicionar serviço"}</SubmitButton></div>
  </form>;
}
