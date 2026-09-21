"use client";

import { useMemo, useState } from "react";
import { createDeliveryNote } from "@/modules/delivery-notes/actions";
import { SubmitButton } from "./submit-button";
import { FormSection } from "./ui/form-section";

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
  const selectedCount = selectedItems.length;
  const selectedPieces = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
  const selectedOrders = new Set(selectedItems.map((selected) => availableItems.find((item) => item.id === selected.outsourcedServiceId)?.order).filter(Boolean)).size;
  const selectedContractor = contractors.find((contractor) => contractor.id === contractorId)?.name ?? "Selecione";

  return <form action={createDeliveryNote} className="space-y-5">
    <section className="delivery-note-workflow">
      <FormSection title="1. Terceirizado" description="Um romaneio pertence sempre a um único terceirizado.">
        <div className="form-grid">
          <label className="field">Terceirizado<select name="contractorId" required value={contractorId} onChange={(event) => { setContractorId(event.target.value); setQuantities({}); }}><option value="">Selecione</option>{contractors.map((contractor) => <option key={contractor.id} value={contractor.id}>{contractor.name}</option>)}</select></label>
          <label className="field">Data de saída<input defaultValue={today} name="departureDate" required type="date"/></label>
          <label className="field">Responsável pela saída<input maxLength={200} name="responsibleName" required/></label>
          <label className="field sm:col-span-2 lg:col-span-3">Observações<textarea maxLength={2000} name="notes" rows={3}/></label>
        </div>
      </FormSection>
    </section>
    <section className="panel">
      <div className="mb-4">
        <h2 className="section-title">2. Serviços disponíveis</h2>
        <p className="text-sm text-slate-500">Escolha os serviços que sairão neste romaneio e ajuste a quantidade enviada.</p>
      </div>
      {!contractorId ? <p className="empty-state mt-4">Selecione o Terceirizado para ver os serviços disponíveis.</p> : !availableItems.length ? <p className="empty-state mt-4">Nenhum serviço possui saldo disponível para esse Terceirizado.</p> : <>
        <div className="delivery-select-list">{availableItems.map((item) => {
          const selected = quantities[item.id] !== undefined;
          return <article className={`delivery-select-card ${selected ? "selected" : ""}`} key={item.id}>
            <label><input aria-label={`Selecionar ${item.order} ${item.service}`} checked={selected} type="checkbox" onChange={(event) => setQuantities((current) => { const next = { ...current }; if (event.target.checked) next[item.id] = String(item.available); else delete next[item.id]; return next; })}/><span>OP {item.order}</span></label>
            <strong>{item.service}</strong>
            <p>{item.customer} • {item.product}</p>
            <dl className="outsourcing-facts">
              <div><dt>Prevista</dt><dd>{item.planned.toLocaleString("pt-BR")}</dd></div>
              <div><dt>Já enviada</dt><dd>{item.sent.toLocaleString("pt-BR")}</dd></div>
              <div><dt>Disponível</dt><dd>{item.available.toLocaleString("pt-BR")}</dd></div>
            </dl>
            <label className="field">Enviar agora<input aria-label={`Quantidade para ${item.order} ${item.service}`} disabled={!selected} max={item.available} min={1} step={1} type="number" value={quantities[item.id] ?? ""} onChange={(event) => setQuantities((current) => ({ ...current, [item.id]: event.target.value }))}/></label>
          </article>;
        })}</div>
        <div className="table-wrap mt-4 delivery-table-desktop"><table><thead><tr><th>Selecionar</th><th>OP</th><th>Cliente</th><th>Produto / referência</th><th>Serviço</th><th>Prevista</th><th>Já enviada</th><th>Disponível</th><th>Enviar agora</th></tr></thead><tbody>{availableItems.map((item) => <tr key={item.id}><td><input aria-label={`Selecionar ${item.order} ${item.service}`} checked={quantities[item.id] !== undefined} type="checkbox" onChange={(event) => setQuantities((current) => { const next = { ...current }; if (event.target.checked) next[item.id] = String(item.available); else delete next[item.id]; return next; })}/></td><td>{item.order}</td><td>{item.customer}</td><td>{item.product}</td><td>{item.service}</td><td>{item.planned.toLocaleString("pt-BR")}</td><td>{item.sent.toLocaleString("pt-BR")}</td><td>{item.available.toLocaleString("pt-BR")}</td><td><input aria-label={`Quantidade para ${item.order} ${item.service}`} className="w-28 rounded border border-slate-300 px-2 py-1" disabled={quantities[item.id] === undefined} max={item.available} min={1} step={1} type="number" value={quantities[item.id] ?? ""} onChange={(event) => setQuantities((current) => ({ ...current, [item.id]: event.target.value }))}/></td></tr>)}</tbody></table></div>
      </>}
      <input name="items" type="hidden" value={JSON.stringify(selectedItems)}/>
    </section>
    <section className="panel delivery-summary-panel">
      <div>
        <h2 className="section-title">3. Resumo do romaneio</h2>
        <p>{selectedContractor}</p>
      </div>
      <dl className="outsourcing-facts">
        <div><dt>Itens</dt><dd>{selectedCount}</dd></div>
        <div><dt>Total de peças</dt><dd>{selectedPieces.toLocaleString("pt-BR")}</dd></div>
        <div><dt>OPs envolvidas</dt><dd>{selectedOrders}</dd></div>
      </dl>
      <SubmitButton disabled={!selectedItems.length}>Gerar romaneio</SubmitButton>
    </section>
  </form>;
}
