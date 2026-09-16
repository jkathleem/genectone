"use client";

import { useMemo, useState } from "react";
import { SubmitButton } from "./submit-button";

type Option = { id: string; label: string };
type ProductOption = Option & { reference: string | null; description: string; customerId: string | null; customerName: string | null; color: string | null; currentUnitPrice: string | null; imageUrl: string | null; supplies: { name: string; unit: string; quantityPerBase: string | null; baseQuantity: number | null }[] };
const money = (value: string | null) => value === null ? "Preço não configurado" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));

export function ProductionOrderForm({ action, companies, customers, products }: { action: (data: FormData) => Promise<void>; companies: Option[]; customers: Option[]; products: ProductOption[] }) {
  const [productId, setProductId] = useState("");
  const product = useMemo(() => products.find((item) => item.id === productId), [productId, products]);
  const [customerId, setCustomerId] = useState("");
  const selectProduct = (selectedId: string) => { setProductId(selectedId); setCustomerId(products.find((item) => item.id === selectedId)?.customerId ?? ""); };
  return <form action={action} className="panel form-grid">
    <label className="field">Número da OP<input name="number" required/></label>
    <label className="field">Código / Produto<select name="productId" onChange={(event) => selectProduct(event.target.value)} required value={productId}><option disabled value="">Selecione</option>{products.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
    <label className="field">Quantidade<input min="1" name="quantity" required step="1" type="number"/></label>
    <label className="field">Data de entrada<input name="entryDate" required type="date"/></label>
    <label className="field">Empresa<select name="companyId" required defaultValue=""><option disabled value="">Selecione</option>{companies.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
    <label className="field">Cliente efetivo<select name="customerId" onChange={(event) => setCustomerId(event.target.value)} required value={customerId}><option disabled value="">Selecione</option>{customers.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><span className="font-normal text-slate-500">Preenchido pelo Cliente padrão; pode ser alterado para esta OP.</span></label>
    <label className="field">Previsão de conclusão<input name="expectedCompletionDate" type="date"/></label>
    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700"><input name="isUrgent" type="checkbox"/> OP urgente</label>
    {product ? <section className="rounded-lg border border-slate-200 bg-slate-50 p-4 sm:col-span-2 lg:col-span-3"><div className="flex flex-wrap gap-6">{product.imageUrl ? <div aria-label={`Imagem de ${product.description}`} className="h-20 w-20 rounded border border-slate-200 bg-cover bg-center" style={{ backgroundImage: `url(${product.imageUrl})` }}/> : null}<div><span className="text-xs uppercase text-slate-500">Descrição</span><strong className="block">{product.description}</strong></div><div><span className="text-xs uppercase text-slate-500">Cor</span><strong className="block">{product.color || "—"}</strong></div><div><span className="text-xs uppercase text-slate-500">Preço snapshot</span><strong className="block">{money(product.currentUnitPrice)}</strong></div><div><span className="text-xs uppercase text-slate-500">Cliente padrão</span><strong className="block">{product.customerName || "Não definido"}</strong></div></div><p className="mt-3 text-xs text-slate-500">Insumos padrão: {product.supplies.length ? product.supplies.map((item) => item.name).join(", ") : "nenhum"}. O preço e os insumos serão preservados na OP.</p></section> : null}
    <label className="field sm:col-span-2 lg:col-span-3">Observações<textarea maxLength={2000} name="notes" rows={3}/></label>
    <div><SubmitButton>Cadastrar OP</SubmitButton></div>
  </form>;
}
