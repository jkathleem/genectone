"use client";

import { useMemo, useState } from "react";
import { SubmitButton } from "./submit-button";

type ServiceOption = { id: string; name: string };
type ContractorOption = { id: string; name: string };
type ContractorServiceOption = { serviceId: string; contractorId: string; price: string };
type Values = { id?: string; serviceId?: string; contractorId?: string; plannedQuantity: number; appliedUnitPrice?: string; expectedReturnDate?: string; notes?: string | null; locked?: boolean };

export function OutsourcedServiceForm({ action, orderId, services, contractors, contractorServices, values }: { action: (data: FormData) => Promise<void>; orderId: string; services: ServiceOption[]; contractors: ContractorOption[]; contractorServices: ContractorServiceOption[]; values: Values }) {
  const [serviceId, setServiceId] = useState(values.serviceId ?? "");
  const [contractorId, setContractorId] = useState(values.contractorId ?? "");
  const enabledContractors = useMemo(() => new Set(contractorServices.filter((item) => item.serviceId === serviceId).map((item) => item.contractorId)), [contractorServices, serviceId]);
  const selectedAssignment = contractorServices.find((item) => item.serviceId === serviceId && item.contractorId === contractorId);
  const unchangedAssignment = Boolean(values.id && serviceId === values.serviceId && contractorId === values.contractorId);
  const price = unchangedAssignment ? values.appliedUnitPrice ?? "" : selectedAssignment?.price ?? "";
  return <form action={action} className="panel form-grid">
    <input name="orderId" type="hidden" value={orderId}/>{values.id ? <input name="id" type="hidden" value={values.id}/> : null}
    <label className="field">Serviço<select disabled={values.locked} name="serviceId" onChange={(event) => { setServiceId(event.target.value); setContractorId(""); }} required value={serviceId}><option disabled value="">Selecione</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select>{values.locked ? <input name="serviceId" type="hidden" value={serviceId}/> : null}</label>
    <label className="field">Terceirizado<select disabled={values.locked || !serviceId} name="contractorId" onChange={(event) => setContractorId(event.target.value)} required value={contractorId}><option disabled value="">Selecione</option>{contractors.filter((item) => enabledContractors.has(item.id) || item.id === values.contractorId).map((contractor) => <option key={contractor.id} value={contractor.id}>{contractor.name}</option>)}</select>{values.locked ? <input name="contractorId" type="hidden" value={contractorId}/> : null}</label>
    <label className="field">Quantidade prevista<input defaultValue={values.plannedQuantity} min="1" name="plannedQuantity" required step="1" type="number"/></label>
    <label className="field">Prazo do serviço<input defaultValue={values.expectedReturnDate} name="expectedReturnDate" type="date"/></label>
    <label className="field">Preço unitário aplicado<input inputMode="decimal" name="appliedUnitPrice" readOnly required value={price}/><span className="font-normal text-slate-500">{price ? unchangedAssignment ? "Snapshot preservado desta atribuição." : "Preço atual desta combinação." : "Selecione uma combinação habilitada e com preço."}</span></label>
    <label className="field sm:col-span-2">Observações<textarea defaultValue={values.notes ?? ""} name="notes" rows={3}/></label>
    <div><SubmitButton>{values.id ? "Salvar alterações" : "Adicionar serviço"}</SubmitButton></div>
  </form>;
}
