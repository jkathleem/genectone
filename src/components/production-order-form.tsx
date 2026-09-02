"use client";
import { useMemo, useState } from "react";
import { SubmitButton } from "./submit-button";

type Option = { id: string; label: string };
type Values = { id?: string; number?: string; entryDate?: string; companyId?: string; customerId?: string; productId?: string; quantity?: number; unitPrice?: string; notes?: string | null };

function previewTotal(quantity: string, price: string) { const q = Number(quantity); const p = Number(price.replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".")); if (!Number.isFinite(q) || !Number.isFinite(p)) return "R$ 0,00"; return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(q * p); }

export function ProductionOrderForm({ action, companies, customers, products, values = {} }: { action: (data: FormData) => Promise<void>; companies: Option[]; customers: Option[]; products: Option[]; values?: Values }) {
  const [quantity, setQuantity] = useState(String(values.quantity ?? "")); const [unitPrice, setUnitPrice] = useState(values.unitPrice ?? ""); const total = useMemo(() => previewTotal(quantity, unitPrice), [quantity, unitPrice]);
  return <form action={action} className="panel form-grid">{values.id ? <input name="id" type="hidden" value={values.id} /> : null}
    <label className="field">Número da OP<input defaultValue={values.number} name="number" required /></label><label className="field">Data de entrada<input defaultValue={values.entryDate} name="entryDate" required type="date" /></label>
    <label className="field">Empresa<select defaultValue={values.companyId ?? ""} name="companyId" required><option disabled value="">Selecione</option>{companies.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select></label>
    <label className="field">Cliente<select defaultValue={values.customerId ?? ""} name="customerId" required><option disabled value="">Selecione</option>{customers.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select></label>
    <label className="field">Produto / referência<select defaultValue={values.productId ?? ""} name="productId" required><option disabled value="">Selecione</option>{products.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}</select></label>
    <label className="field">Quantidade<input inputMode="numeric" min="1" name="quantity" onChange={(e) => setQuantity(e.target.value)} required step="1" type="number" value={quantity} /></label>
    <label className="field">Preço unitário<input inputMode="decimal" name="unitPrice" onChange={(e) => setUnitPrice(e.target.value)} placeholder="0,00" required value={unitPrice} /></label>
    <div className="rounded-md bg-[var(--surface-muted)] px-4 py-3"><span className="text-xs uppercase tracking-wide text-slate-500">Valor total estimado</span><strong className="mt-1 block text-xl">{total}</strong></div>
    <label className="field sm:col-span-2 lg:col-span-3">Observações<textarea defaultValue={values.notes ?? ""} name="notes" rows={4} /></label><div><SubmitButton>{values.id ? "Salvar alterações" : "Cadastrar OP"}</SubmitButton></div>
  </form>;
}
