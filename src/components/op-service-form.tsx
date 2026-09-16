"use client";

import { useMemo, useState } from "react";
import { SubmitButton } from "./submit-button";

type Service = { id: string; name: string };
type Contractor = { id: string; name: string };
type Sector = { id: string; name: string };
type ExternalCapability = { serviceId: string; contractorId: string; price: string };
type InternalCapability = { serviceId: string; internalSectorId: string };

export function OpServiceForm({ orderId, orderQuantity, services, contractors, sectors, externalCapabilities, internalCapabilities, externalAction, internalAction }: {
  orderId: string;
  orderQuantity: number;
  services: Service[];
  contractors: Contractor[];
  sectors: Sector[];
  externalCapabilities: ExternalCapability[];
  internalCapabilities: InternalCapability[];
  externalAction: (data: FormData) => Promise<void>;
  internalAction: (data: FormData) => Promise<void>;
}) {
  const [kind, setKind] = useState<"external" | "internal">("external");
  const [serviceId, setServiceId] = useState("");
  const [executorId, setExecutorId] = useState("");
  const externalIds = useMemo(() => new Set(externalCapabilities.filter((item) => item.serviceId === serviceId).map((item) => item.contractorId)), [externalCapabilities, serviceId]);
  const internalIds = useMemo(() => new Set(internalCapabilities.filter((item) => item.serviceId === serviceId).map((item) => item.internalSectorId)), [internalCapabilities, serviceId]);
  const price = externalCapabilities.find((item) => item.serviceId === serviceId && item.contractorId === executorId)?.price;
  const changeKind = (next: "external" | "internal") => { setKind(next); setServiceId(""); setExecutorId(""); };
  return <div>
    <div className="mb-4 flex gap-2"><button className={kind === "external" ? "button-primary" : "button-secondary"} onClick={() => changeKind("external")} type="button">Terceirizado</button><button className={kind === "internal" ? "button-primary" : "button-secondary"} onClick={() => changeKind("internal")} type="button">Setor interno</button></div>
    <form action={kind === "external" ? externalAction : internalAction} className="form-grid">
      <input name="orderId" type="hidden" value={orderId}/>
      <label className="field">Serviço<select name="serviceId" onChange={(event) => { setServiceId(event.target.value); setExecutorId(""); }} required value={serviceId}><option disabled value="">Selecione</option>{services.filter((service) => kind === "external" ? externalCapabilities.some((item) => item.serviceId === service.id) : internalCapabilities.some((item) => item.serviceId === service.id)).map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select></label>
      {kind === "external" ? <label className="field">Terceirizado<select name="contractorId" onChange={(event) => setExecutorId(event.target.value)} required value={executorId}><option disabled value="">Selecione</option>{contractors.filter((item) => externalIds.has(item.id)).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label> : <label className="field">Setor interno<select name="internalSectorId" onChange={(event) => setExecutorId(event.target.value)} required value={executorId}><option disabled value="">Selecione</option>{sectors.filter((item) => internalIds.has(item.id)).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}
      <label className="field">Quantidade prevista<input defaultValue={orderQuantity} min="1" name="plannedQuantity" required type="number"/></label>
      {kind === "external" ? <><label className="field">Prazo de retorno<input name="expectedReturnDate" type="date"/></label><div className="rounded-md bg-slate-50 p-3 text-sm"><span className="text-slate-500">Preço unitário</span><strong className="block">{price ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(price)) : "Selecione o executor"}</strong></div></> : <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">Serviço interno não recebe preço ou custo contábil nesta etapa.</div>}
      <label className="field sm:col-span-2">Observações<textarea name="notes" rows={2}/></label>
      <div><SubmitButton>Adicionar serviço</SubmitButton></div>
    </form>
  </div>;
}
