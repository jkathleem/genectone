"use client";

import { useMemo, useState } from "react";
import { bulkUpdateProductPrices } from "@/modules/master-data/actions";
import { SubmitButton } from "./submit-button";

type Product = { id: string; name: string; reference: string | null; price: string | null };
const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function ProductBulkPriceForm({ products }: { products: Product[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [mode, setMode] = useState<"PERCENT" | "FIXED">("PERCENT");
  const [value, setValue] = useState("");
  const numericValue = Number(value.replace(",", "."));
  const preview = useMemo(() => products.filter((product) => selected.includes(product.id)).map((product) => {
    const current = product.price === null ? null : Number(product.price);
    const next = Number.isFinite(numericValue) ? mode === "FIXED" ? numericValue : current === null ? null : current * (1 + numericValue / 100) : null;
    return { ...product, current, next };
  }), [mode, numericValue, products, selected]);

  return <details className="registration-editor mb-5">
    <summary>Atualização em massa de preços</summary>
    <form action={bulkUpdateProductPrices} className="mt-4 grid gap-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="field">Tipo de ajuste<select name="mode" onChange={(event) => setMode(event.target.value as "PERCENT" | "FIXED")} value={mode}><option value="PERCENT">Percentual</option><option value="FIXED">Definir valor</option></select></label>
        <label className="field">{mode === "PERCENT" ? "Percentual (%)" : "Novo preço"}<input inputMode="decimal" name="value" onChange={(event) => setValue(event.target.value)} required value={value}/></label>
      </div>
      <div className="table-wrap"><table><thead><tr><th>Selecionar</th><th>Produto</th><th>Atual</th><th>Prévia</th></tr></thead><tbody>{products.map((product) => {
        const item = preview.find((candidate) => candidate.id === product.id);
        return <tr key={product.id}><td><input aria-label={`Selecionar ${product.name}`} checked={selected.includes(product.id)} name="productIds" onChange={(event) => setSelected((current) => event.target.checked ? [...current, product.id] : current.filter((id) => id !== product.id))} type="checkbox" value={product.id}/></td><td>{product.reference || "—"} · {product.name}</td><td>{product.price === null ? "Sem preço" : currency.format(Number(product.price))}</td><td>{item?.next === null || item?.next === undefined || !Number.isFinite(item.next) || item.next < 0 ? "—" : currency.format(item.next)}</td></tr>;
      })}</tbody></table></div>
      <p className="text-sm text-slate-500">A prévia é visual. O servidor recalcula todos os valores com Decimal antes de atualizar somente o preço atual do Produto. OPs já criadas preservam o preço histórico aplicado.</p>
      <div><SubmitButton disabled={!selected.length}>Confirmar atualização de {selected.length} produto(s)</SubmitButton></div>
    </form>
  </details>;
}
