"use client";

import { useMemo, useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import type { registerInventoryPurchase } from "@/modules/inventory/actions";

type Option = { id: string; label: string; unit?: string };

export function InventoryPurchaseForm({
  action,
  classifications,
  companies,
  supplies,
  today,
}: {
  action: typeof registerInventoryPurchase;
  classifications: Option[];
  companies: Option[];
  supplies: Option[];
  today: string;
}) {
  const [rows, setRows] = useState([{ key: crypto.randomUUID() }]);
  const [values, setValues] = useState<Record<string, { quantity: string; unitPrice: string }>>({});
  const total = useMemo(() => rows.reduce((sum, row) => {
    const value = values[row.key];
    const quantity = Number((value?.quantity || "0").replace(",", "."));
    const price = Number((value?.unitPrice || "0").replace(",", "."));
    return sum + (Number.isFinite(quantity) && Number.isFinite(price) ? quantity * price : 0);
  }, 0), [rows, values]);

  function updateValue(key: string, field: "quantity" | "unitPrice", value: string) {
    setValues((current) => ({ ...current, [key]: { ...{ quantity: "", unitPrice: "" }, ...current[key], [field]: value } }));
  }

  return (
    <form action={action} className="panel form-grid">
      <label className="field">Empresa interna<select name="companyId" required><option value="">Selecione</option>{companies.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <label className="field">Fornecedor<input maxLength={200} name="supplierNameSnapshot" required /></label>
      <label className="field">Data da compra<input defaultValue={today} name="purchaseDate" required type="date" /></label>
      <label className="field">Vencimento<input name="dueDate" type="date" /></label>
      <label className="field">Documento / nota<input maxLength={100} name="documentNumber" /></label>
      <label className="field">Classificação financeira<select name="financialClassificationId" required><option value="">Selecione</option>{classifications.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <label className="field sm:col-span-2">Observação<textarea maxLength={2000} name="notes" rows={2} /></label>

      <div className="sm:col-span-2">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="section-title">Itens</h2>
          <button className="button-secondary button-sm" onClick={() => setRows((current) => [...current, { key: crypto.randomUUID() }])} type="button">Adicionar item</button>
        </div>
        <div className="grid gap-3">
          {rows.map((row, index) => (
            <div className="rounded-lg border border-slate-200 p-3" key={row.key}>
              <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_1fr_1fr_minmax(0,1.2fr)_auto]">
                <label className="field">Insumo<select name="itemSupplyId" required><option value="">Selecione</option>{supplies.map((item) => <option key={item.id} value={item.id}>{item.label}{item.unit ? ` (${item.unit})` : ""}</option>)}</select></label>
                <label className="field">Quantidade<input inputMode="decimal" name="itemQuantity" onChange={(event) => updateValue(row.key, "quantity", event.target.value)} required /></label>
                <label className="field">Valor unitário<input inputMode="decimal" name="itemUnitPrice" onChange={(event) => updateValue(row.key, "unitPrice", event.target.value)} required /></label>
                <label className="field">Observação<input maxLength={500} name="itemNotes" /></label>
                <div className="flex items-end">
                  <button aria-label={`Remover item ${index + 1}`} className="button-secondary button-sm" disabled={rows.length === 1} onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))} type="button">Remover</button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-right text-sm font-semibold text-slate-700">Total estimado: {total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
      </div>

      <div className="sm:col-span-2"><SubmitButton>Registrar compra</SubmitButton></div>
    </form>
  );
}
