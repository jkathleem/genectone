"use client";

import { useMemo, useState } from "react";
import { createDeliveryNote } from "@/modules/delivery-notes/actions";
import { SubmitButton } from "./submit-button";

type Contractor = { id: string; name: string };
type Item = { id: string; contractorId: string; order: string; customer: string; product: string; service: string; planned: number; sent: number; available: number };

export function DeliveryNoteForm({ contractors, items, today }: { contractors: Contractor[]; items: Item[]; today: string }) {
  const [contractorId, setContractorId] = useState("");
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const availableItems = useMemo(() => items.filter((item) => item.contractorId === contractorId && item.available > 0), [contractorId, items]);
  const selectedItems = availableItems.flatMap((item) => {
    const quantity = Number(quantities[item.id]);
    return Number.isInteger(quantity) && quantity > 0 ? [{ outsourcedServiceId: item.id, quantity }] : [];
  });

  return <form action={createDeliveryNote} className="space-y-5">
    <section className="panel form-grid">
      <label className="field">Terceirizado<select name="contractorId" required value={contractorId} onChange={(event) => { setContractorId(event.target.value); setQuantities({}); }}><option value="">Selecione</option>{contractors.map((contractor) => <option key={contractor.id} value={contractor.id}>{contractor.name}</option>)}</select></label>
      <label className="field">Data de saída<input defaultValue={today} name="departureDate" required type="date"/></label>
      <label className="field">Responsável pela saída<input maxLength={200} name="responsibleName" required/></label>
      <label className="field sm:col-span-2 lg:col-span-3">Observações<textarea maxLength={2000} name="notes" rows={3}/></label>
    </section>
    <section className="panel">
      <h2 className="section-title">Itens que estão saindo</h2>
      {!contractorId ? <p className="empty-state mt-4">Selecione o Terceirizado para ver os serviços disponíveis.</p> : !availableItems.length ? <p className="empty-state mt-4">Nenhum serviço possui saldo disponível para esse Terceirizado.</p> : <div className="table-wrap mt-4"><table><thead><tr><th>Selecionar</th><th>OP</th><th>Cliente</th><th>Produto / referência</th><th>Serviço</th><th>Prevista</th><th>Já enviada</th><th>Disponível</th><th>Enviar agora</th></tr></thead><tbody>{availableItems.map((item) => <tr key={item.id}><td><input aria-label={`Selecionar ${item.order} ${item.service}`} checked={quantities[item.id] !== undefined} type="checkbox" onChange={(event) => setQuantities((current) => { const next = { ...current }; if (event.target.checked) next[item.id] = String(item.available); else delete next[item.id]; return next; })}/></td><td>{item.order}</td><td>{item.customer}</td><td>{item.product}</td><td>{item.service}</td><td>{item.planned.toLocaleString("pt-BR")}</td><td>{item.sent.toLocaleString("pt-BR")}</td><td>{item.available.toLocaleString("pt-BR")}</td><td><input aria-label={`Quantidade para ${item.order} ${item.service}`} className="w-28 rounded border border-slate-300 px-2 py-1" disabled={quantities[item.id] === undefined} max={item.available} min={1} step={1} type="number" value={quantities[item.id] ?? ""} onChange={(event) => setQuantities((current) => ({ ...current, [item.id]: event.target.value }))}/></td></tr>)}</tbody></table></div>}
      <input name="items" type="hidden" value={JSON.stringify(selectedItems)}/>
      <div className="mt-5"><SubmitButton disabled={!selectedItems.length}>Emitir Romaneio</SubmitButton></div>
    </section>
  </form>;
}
