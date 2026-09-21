"use client";

import { useMemo, useState } from "react";
import { Button } from "./ui/button";
import { FormSection } from "./ui/form-section";
import { StatusChip } from "./ui/status-chip";
import { SubmitButton } from "./submit-button";

type Option = { id: string; label: string };
type ProductOption = Option & {
  reference: string | null;
  description: string;
  customerId: string | null;
  customerName: string | null;
  color: string | null;
  currentUnitPrice: string | null;
  imageUrl: string | null;
  supplies: { name: string; unit: string; quantityPerBase: string | null; baseQuantity: number | null }[];
};

const money = (value: string | null) => value === null ? "Preço não configurado" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));

function plannedSupply(quantity: string, supply: ProductOption["supplies"][number]) {
  const orderQuantity = Number(quantity);
  const perBase = supply.quantityPerBase ? Number(supply.quantityPerBase) : null;
  if (!orderQuantity || !perBase || !supply.baseQuantity) return null;
  return (orderQuantity * perBase) / supply.baseQuantity;
}

export function ProductionOrderForm({ action, companies, customers, products }: { action: (data: FormData) => Promise<void>; companies: Option[]; customers: Option[]; products: ProductOption[] }) {
  const [number, setNumber] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [productId, setProductId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [entryDate, setEntryDate] = useState("");
  const [expectedCompletionDate, setExpectedCompletionDate] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  const product = useMemo(() => products.find((item) => item.id === productId), [productId, products]);
  const selectedCompany = companies.find((item) => item.id === companyId);
  const selectedCustomer = customers.find((item) => item.id === customerId);
  const expectedValue = product?.currentUnitPrice && quantity ? Number(product.currentUnitPrice) * Number(quantity) : null;
  const selectProduct = (selectedId: string) => {
    const selected = products.find((item) => item.id === selectedId);
    setProductId(selectedId);
    setCustomerId(selected?.customerId ?? "");
  };

  return (
    <form action={action} className="po-create-layout">
      <div className="po-create-main">
        <FormSection title="Identificação" description="Dados mínimos para localizar a OP e preservar o vínculo com a empresa.">
          <div className="form-grid">
            <label className="field">Número da OP<input name="number" onChange={(event) => setNumber(event.target.value)} required value={number} /></label>
            <label className="field">Empresa<select name="companyId" onChange={(event) => setCompanyId(event.target.value)} required value={companyId}><option disabled value="">Selecione</option>{companies.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
            <label className="field">Data de entrada<input name="entryDate" onChange={(event) => setEntryDate(event.target.value)} required type="date" value={entryDate} /></label>
          </div>
        </FormSection>

        <FormSection title="Produto e Cliente" description="Ao selecionar o Produto, Cliente padrão, cor, preço atual e insumos são carregados para conferência.">
          <div className="form-grid">
            <label className="field">Código / Produto<select name="productId" onChange={(event) => selectProduct(event.target.value)} required value={productId}><option disabled value="">Selecione</option>{products.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
            <label className="field">Cliente da OP<select name="customerId" onChange={(event) => setCustomerId(event.target.value)} required value={customerId}><option disabled value="">Selecione</option>{customers.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select><span className="font-normal text-slate-500">Preenchido pelo Cliente padrão do Produto; pode ser alterado para esta OP.</span></label>
          </div>
          {product ? (
            <section className="po-product-preview">
              {product.imageUrl ? <div aria-label={`Imagem de ${product.description}`} className="po-product-image" style={{ backgroundImage: `url(${product.imageUrl})` }} /> : null}
              <dl>
                <div><dt>Referência</dt><dd>{product.reference || "—"}</dd></div>
                <div><dt>Descrição</dt><dd>{product.description}</dd></div>
                <div><dt>Cor</dt><dd>{product.color || "—"}</dd></div>
                <div><dt>Cliente sugerido pelo Produto</dt><dd>{product.customerName || "Não definido"}</dd></div>
                <div><dt>Preço aplicado nesta OP</dt><dd>{money(product.currentUnitPrice)}</dd></div>
              </dl>
              <p>O valor fica registrado nesta OP mesmo que o preço do Produto seja alterado depois.</p>
            </section>
          ) : null}
        </FormSection>

        <FormSection title="Produção" description="Informe a quantidade para estimar valor previsto e insumos registrados nesta OP.">
          <div className="form-grid">
            <label className="field">Quantidade<input min="1" name="quantity" onChange={(event) => setQuantity(event.target.value)} required step="1" type="number" value={quantity} /></label>
          </div>
          {product ? (
            <section className="po-supplies-preview">
              <div className="po-section-mini-heading">
                <h3>Insumos registrados nesta OP</h3>
                <span>{product.supplies.length} item(ns)</span>
              </div>
              {product.supplies.length ? (
                <div className="po-supply-list">
                  {product.supplies.map((item) => {
                    const planned = plannedSupply(quantity, item);
                    return <div key={`${item.name}-${item.unit}`}><strong>{item.name}</strong><span>{planned === null ? "Quantidade calculada ao salvar" : `${planned.toLocaleString("pt-BR", { maximumFractionDigits: 4 })} ${item.unit}`}</span></div>;
                  })}
                </div>
              ) : <p className="po-helper">Este Produto não possui insumos padrão cadastrados.</p>}
            </section>
          ) : null}
        </FormSection>

        <FormSection title="Prazo e prioridade" description="Use urgência somente para OPs que exigem destaque operacional.">
          <div className="form-grid">
            <label className="field">Previsão de conclusão<input name="expectedCompletionDate" onChange={(event) => setExpectedCompletionDate(event.target.value)} type="date" value={expectedCompletionDate} /></label>
            <label className={`po-urgent-toggle ${isUrgent ? "active" : ""}`}>
              <input checked={isUrgent} name="isUrgent" onChange={(event) => setIsUrgent(event.target.checked)} type="checkbox" />
              <span><strong>OP urgente</strong><small>Destacar esta OP em listas, Kanban e workspace.</small></span>
            </label>
          </div>
        </FormSection>

        <FormSection title="Observações" description="Use apenas para contexto operacional que ajude a produção.">
          <label className="field">Observações<textarea maxLength={2000} name="notes" rows={3} /></label>
        </FormSection>
      </div>

      <aside className="po-create-summary">
        <div>
          <h2>Resumo da OP</h2>
          <p>Revise antes de criar.</p>
        </div>
        <dl>
          <div><dt>OP</dt><dd>{number || "—"}</dd></div>
          <div><dt>Empresa</dt><dd>{selectedCompany?.label || "—"}</dd></div>
          <div><dt>Cliente</dt><dd>{selectedCustomer?.label || "—"}</dd></div>
          <div><dt>Produto</dt><dd>{product?.description || "—"}</dd></div>
          <div><dt>Referência</dt><dd>{product?.reference || "—"}</dd></div>
          <div><dt>Cor</dt><dd>{product?.color || "—"}</dd></div>
          <div><dt>Quantidade</dt><dd>{quantity ? Number(quantity).toLocaleString("pt-BR") : "—"}</dd></div>
          <div><dt>Preço aplicado</dt><dd>{product ? money(product.currentUnitPrice) : "—"}</dd></div>
          <div><dt>Valor previsto</dt><dd>{expectedValue === null || Number.isNaN(expectedValue) ? "—" : money(String(expectedValue))}</dd></div>
          <div><dt>Entrada</dt><dd>{entryDate || "—"}</dd></div>
          <div><dt>Prazo</dt><dd>{expectedCompletionDate || "Sem previsão"}</dd></div>
          <div><dt>Insumos</dt><dd>{product ? product.supplies.length : "—"}</dd></div>
        </dl>
        <div className="po-summary-chips">{isUrgent ? <StatusChip variant="danger">URGENTE</StatusChip> : <StatusChip variant="neutral">Prioridade normal</StatusChip>}</div>
        <div className="po-final-actions">
          <SubmitButton>Criar OP</SubmitButton>
          <Button href="/ops" variant="secondary">Cancelar</Button>
        </div>
      </aside>
    </form>
  );
}
