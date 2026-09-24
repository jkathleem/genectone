import Link from "next/link";
import { notFound } from "next/navigation";
import { Prisma, type StockMovementType, type UserRole } from "@/generated/prisma";
import { Feedback } from "@/components/feedback";
import { InventoryPurchaseForm } from "@/components/inventory-purchase-form";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { StatusChip } from "@/components/ui/status-chip";
import { Tabs } from "@/components/ui/tabs";
import { formatCurrency, formatDate, fortalezaDateInputValue } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/modules/auth/session";
import { registerInventoryAdjustment, registerInventoryPurchase, saveInventorySupply } from "@/modules/inventory/actions";
import { getSupplyBalances, listStockMovements, listSupplyPurchases } from "@/modules/inventory/queries";
import {
  decimalInputValue,
  purchaseFinancialVisibility,
  stockMovementTypeLabels,
  supplySituation,
  supplySituationLabels,
  supplySituationVariants,
  supplyUnitOptions,
  type SupplySituation,
} from "@/modules/inventory/presentation";

type Tab = "supplies" | "purchases" | "movements";
type Params = {
  tab?: string;
  q?: string;
  situation?: string;
  active?: string;
  form?: string;
  supplyId?: string;
  from?: string;
  to?: string;
  supplier?: string;
  status?: string;
  type?: string;
  productionOrderId?: string;
  purchaseId?: string;
  success?: string;
  error?: string;
  payableId?: string;
};

const tabLabels: Record<Tab, string> = { supplies: "Insumos", purchases: "Compras", movements: "Movimentações" };
const movementTypes = Object.keys(stockMovementTypeLabels) as StockMovementType[];

function activeFilter(active?: string) {
  if (active === "inactive") return false;
  if (active === "all") return undefined;
  return true;
}

function safeDate(value?: string) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00.000Z`) : undefined;
}

function balanceText(value: Prisma.Decimal | string) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 4 }).format(Number(value));
}

function SupplyStatus({ situation }: { situation: SupplySituation }) {
  return <StatusChip variant={supplySituationVariants[situation]}>{supplySituationLabels[situation]}</StatusChip>;
}

function PurchaseItemsSummary({ items }: { items: { id: string; supplyNameSnapshot: string; unitSnapshot: string; quantity: Prisma.Decimal }[] }) {
  return (
    <ul className="space-y-1 text-sm">
      {items.map((item) => <li key={item.id}>{item.supplyNameSnapshot}: {balanceText(item.quantity)} {item.unitSnapshot}</li>)}
    </ul>
  );
}

function SupplyForm({ supply }: { supply?: { id: string; code: string | null; name: string; unit: string; minimumStock: Prisma.Decimal | null; notes: string | null; active: boolean } }) {
  return (
    <form action={saveInventorySupply} className="panel form-grid">
      {supply ? <input name="id" type="hidden" value={supply.id} /> : null}
      <label className="field">Código<input defaultValue={supply?.code ?? ""} maxLength={100} name="code" /></label>
      <label className="field">Descrição / nome<input defaultValue={supply?.name ?? ""} maxLength={200} name="name" required /></label>
      <label className="field">Unidade<select defaultValue={supply?.unit ?? "UNIDADE"} name="unit" required>{supplyUnitOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="field">Estoque mínimo<input defaultValue={decimalInputValue(supply?.minimumStock)} inputMode="decimal" name="minimumStock" /></label>
      <label className="field sm:col-span-2">Observação<textarea defaultValue={supply?.notes ?? ""} maxLength={2000} name="notes" rows={2} /></label>
      {supply ? <label className="flex items-center gap-2 text-sm text-slate-700"><input defaultChecked={supply.active} name="active" type="checkbox" /> Ativo</label> : null}
      <div className="sm:col-span-2"><SubmitButton>{supply ? "Salvar insumo" : "Cadastrar insumo"}</SubmitButton></div>
    </form>
  );
}

function AdjustmentForm({ supplies }: { supplies: { id: string; name: string; unit: string }[] }) {
  return (
    <form action={registerInventoryAdjustment} className="panel form-grid">
      <label className="field">Insumo<select name="supplyId" required><option value="">Selecione</option>{supplies.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>)}</select></label>
      <label className="field">Tipo<select name="direction" required><option value="IN">Entrada</option><option value="OUT">Saída</option></select></label>
      <label className="field">Quantidade<input inputMode="decimal" name="quantity" required /></label>
      <label className="field">Data<input defaultValue={fortalezaDateInputValue()} name="movementDate" required type="date" /></label>
      <label className="field sm:col-span-2">Motivo<input maxLength={500} name="reason" required /></label>
      <label className="field sm:col-span-2">Observação<textarea maxLength={2000} name="notes" rows={2} /></label>
      <div className="sm:col-span-2"><SubmitButton>Registrar ajuste</SubmitButton></div>
    </form>
  );
}

async function SuppliesTab({ params, canManage }: { params: Params; canManage: boolean }) {
  const active = activeFilter(params.active);
  const supplies = await prisma.supply.findMany({
    where: {
      ...(active === undefined ? {} : { active }),
      ...(params.q ? { OR: [{ code: { contains: params.q, mode: "insensitive" as const } }, { name: { contains: params.q, mode: "insensitive" as const } }] } : {}),
    },
    orderBy: { name: "asc" },
  });
  const balances = await getSupplyBalances(prisma, supplies.map((item) => item.id));
  const rows = supplies.map((item) => {
    const balance = balances.get(item.id) ?? new Prisma.Decimal(0);
    const situation = supplySituation(balance, item.minimumStock);
    return { ...item, balance, situation };
  }).filter((item) => !params.situation || params.situation === item.situation);
  const activeCount = supplies.filter((item) => item.active).length;
  const belowMinimum = rows.filter((item) => item.situation === "BELOW_MINIMUM").length;
  const zeroOrNegative = rows.filter((item) => item.situation === "ZERO" || item.situation === "NEGATIVE").length;
  const selected = params.supplyId ? rows.find((item) => item.id === params.supplyId) ?? await prisma.supply.findUnique({ where: { id: params.supplyId } }) : null;
  const selectedBalance = selected ? await getSupplyBalances(prisma, [selected.id]) : new Map<string, Prisma.Decimal>();
  const latestMovements = selected ? await listStockMovements(prisma, { supplyId: selected.id, take: 6 }) : [];

  return (
    <>
      {params.form === "supply" && canManage ? <section className="mb-5"><SupplyForm /></section> : null}
      <section className="finance-stat-grid">
        <StatCard label="Insumos ativos" value={activeCount} helper="Cadastros disponíveis" />
        <StatCard label="Abaixo do mínimo" value={belowMinimum} helper="Saldo menor que o mínimo" variant={belowMinimum ? "warning" : "neutral"} />
        <StatCard label="Zerado/negativo" value={zeroOrNegative} helper="Requer atenção" variant={zeroOrNegative ? "danger" : "neutral"} />
      </section>
      <form className="panel mb-5 form-grid">
        <input name="tab" type="hidden" value="supplies" />
        <label className="field">Buscar<input defaultValue={params.q ?? ""} name="q" placeholder="Código ou nome" /></label>
        <label className="field">Situação<select defaultValue={params.situation ?? ""} name="situation"><option value="">Todas</option>{Object.entries(supplySituationLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="field">Ativo<select defaultValue={params.active ?? "active"} name="active"><option value="active">Ativos</option><option value="inactive">Inativos</option><option value="all">Todos</option></select></label>
        <div className="flex items-end gap-2"><button className="button-primary">Filtrar</button><Link className="button-secondary" href="/estoque?tab=supplies">Limpar</Link></div>
      </form>
      <section className="panel">
        {!rows.length ? <EmptyState title="Nenhum insumo encontrado." description="Ajuste os filtros ou cadastre um novo insumo." /> : <div className="table-wrap"><table><thead><tr><th>Código</th><th>Insumo</th><th>Unidade</th><th>Saldo</th><th>Estoque mínimo</th><th>Situação</th><th>Ação</th></tr></thead><tbody>{rows.map((item) => <tr key={item.id}><td>{item.code || "—"}</td><td><strong>{item.name}</strong><span className="block text-slate-500">{item.active ? "Ativo" : "Inativo"}</span></td><td>{item.unit}</td><td>{balanceText(item.balance)}</td><td>{item.minimumStock ? balanceText(item.minimumStock) : "—"}</td><td><SupplyStatus situation={item.situation} /></td><td><Link className="link-button" href={`/estoque?tab=supplies&supplyId=${item.id}`}>Abrir</Link></td></tr>)}</tbody></table></div>}
      </section>
      {selected ? <section className="panel mt-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div><h2 className="section-title">{selected.name}</h2><p className="text-sm text-slate-500">{selected.code || "Sem código"} • {selected.unit}</p></div>
          <SupplyStatus situation={supplySituation(selectedBalance.get(selected.id) ?? "0", selected.minimumStock)} />
        </div>
        <dl className="detail-grid">
          <div><dt>Saldo atual</dt><dd>{balanceText(selectedBalance.get(selected.id) ?? "0")}</dd></div>
          <div><dt>Estoque mínimo</dt><dd>{selected.minimumStock ? balanceText(selected.minimumStock) : "—"}</dd></div>
          <div><dt>Situação cadastral</dt><dd>{selected.active ? "Ativo" : "Inativo"}</dd></div>
          <div><dt>Observação</dt><dd>{selected.notes || "—"}</dd></div>
        </dl>
        {canManage ? <div className="mt-5"><details><summary className="link-button">Editar cadastro</summary><div className="mt-3"><SupplyForm supply={selected} /></div></details></div> : null}
        <h3 className="mt-6 text-sm font-semibold">Últimas movimentações</h3>
        {latestMovements.length ? <ul className="mt-2 space-y-2 text-sm">{latestMovements.map((movement) => <li key={movement.id}>{formatDate(movement.movementDate)} — {stockMovementTypeLabels[movement.type]} — {movement.direction === "IN" ? "+" : "-"}{balanceText(movement.quantity)}</li>)}</ul> : <p className="mt-2 text-sm text-slate-500">Sem movimentações.</p>}
      </section> : null}
    </>
  );
}

async function PurchasesTab({ params, role, canBuy, canSeeValues }: { params: Params; role: UserRole; canBuy: boolean; canSeeValues: boolean }) {
  const [companies, supplies, classifications, purchases] = await Promise.all([
    prisma.company.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.supply.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.financialClassification.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    listSupplyPurchases(prisma),
  ]);
  const from = safeDate(params.from);
  const to = safeDate(params.to);
  const financialVisibility = purchaseFinancialVisibility(role);
  const filtered = purchases.filter((purchase) => {
    if (params.supplier && !purchase.supplierNameSnapshot.toLowerCase().includes(params.supplier.toLowerCase())) return false;
    if (from && purchase.purchaseDate < from) return false;
    if (to && purchase.purchaseDate > to) return false;
    if (canSeeValues && params.status && purchase.accountPayableStatus?.status !== params.status) return false;
    return true;
  });
  const categories = classifications.filter((item) => item.active && item.financialNature !== "NON_DRE" && item.dreGroup !== "FINANCIAL_REVENUE");
  return (
    <>
      {params.form === "purchase" && canBuy ? <section className="mb-5"><InventoryPurchaseForm action={registerInventoryPurchase} today={fortalezaDateInputValue()} companies={companies.map((item) => ({ id: item.id, label: item.tradeName || item.name }))} supplies={supplies.map((item) => ({ id: item.id, label: item.name, unit: item.unit }))} classifications={categories.map((item) => ({ id: item.id, label: item.name }))} /></section> : null}
      {params.payableId && financialVisibility.showPayableLink ? <div className="mb-5 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">Conta a pagar criada. <Link className="link-button" href={`/financeiro/contas-a-pagar/${params.payableId}`}>Ver conta a pagar</Link></div> : null}
      <form className="panel mb-5 form-grid">
        <input name="tab" type="hidden" value="purchases" />
        <label className="field">Período de<input defaultValue={params.from ?? ""} name="from" type="date" /></label>
        <label className="field">Até<input defaultValue={params.to ?? ""} name="to" type="date" /></label>
        <label className="field">Fornecedor<input defaultValue={params.supplier ?? ""} name="supplier" /></label>
        {financialVisibility.showFinancialStatus ? <label className="field">Status financeiro<select defaultValue={params.status ?? ""} name="status"><option value="">Todos</option>{["Em aberto", "Vencida", "Parcial", "Pago"].map((item) => <option key={item}>{item}</option>)}</select></label> : null}
        <div className="flex items-end gap-2"><button className="button-primary">Filtrar</button><Link className="button-secondary" href="/estoque?tab=purchases">Limpar</Link></div>
      </form>
      <section className="panel">
        {!filtered.length ? <EmptyState title="Nenhuma compra encontrada." description="Registre uma compra ou ajuste os filtros." /> : <div className="table-wrap"><table><thead><tr><th>Data</th><th>Fornecedor</th><th>Documento</th><th>Itens</th>{financialVisibility.showValues ? <th>Total</th> : null}{financialVisibility.showFinancialStatus ? <th>Vencimento</th> : null}{financialVisibility.showFinancialStatus ? <th>Status financeiro</th> : null}{financialVisibility.showPayableLink ? <th>Ação</th> : null}</tr></thead><tbody>{filtered.map((item) => <tr key={item.id}><td>{formatDate(item.purchaseDate)}</td><td>{item.supplierNameSnapshot}</td><td>{item.documentNumber || "—"}</td><td><PurchaseItemsSummary items={item.items} /></td>{financialVisibility.showValues ? <td>{formatCurrency(item.total)}</td> : null}{financialVisibility.showFinancialStatus ? <td>{item.accountPayableStatus ? formatDate(item.accountPayableStatus.dueDate) : "—"}</td> : null}{financialVisibility.showFinancialStatus ? <td>{item.accountPayableStatus ? <StatusChip variant={item.accountPayableStatus.status === "Pago" ? "success" : item.accountPayableStatus.status === "Vencida" ? "danger" : item.accountPayableStatus.status === "Parcial" ? "warning" : "info"}>{item.accountPayableStatus.status}</StatusChip> : "—"}</td> : null}{financialVisibility.showPayableLink ? <td>{item.accountPayableStatus ? <Link className="link-button" href={`/financeiro/contas-a-pagar/${item.accountPayableStatus.id}`}>Ver A/P</Link> : "—"}</td> : null}</tr>)}</tbody></table></div>}
      </section>
    </>
  );
}

async function MovementsTab({ params, canAdjust }: { params: Params; canAdjust: boolean }) {
  const [supplies, purchases] = await Promise.all([
    prisma.supply.findMany({ orderBy: { name: "asc" } }),
    prisma.supplyPurchase.findMany({ orderBy: { purchaseDate: "desc" }, take: 100 }),
  ]);
  const movements = await listStockMovements(prisma, {
    supplyId: params.supplyId || undefined,
    type: movementTypes.includes(params.type as StockMovementType) ? params.type as StockMovementType : undefined,
    productionOrderId: params.productionOrderId || undefined,
    purchaseId: params.purchaseId || undefined,
    startDate: safeDate(params.from),
    endDate: safeDate(params.to),
    take: 100,
  });
  return (
    <>
      {params.form === "adjustment" && canAdjust ? <section className="mb-5"><AdjustmentForm supplies={supplies} /></section> : null}
      <form className="panel mb-5 form-grid">
        <input name="tab" type="hidden" value="movements" />
        <label className="field">Período de<input defaultValue={params.from ?? ""} name="from" type="date" /></label>
        <label className="field">Até<input defaultValue={params.to ?? ""} name="to" type="date" /></label>
        <label className="field">Insumo<select defaultValue={params.supplyId ?? ""} name="supplyId"><option value="">Todos</option>{supplies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="field">Tipo<select defaultValue={params.type ?? ""} name="type"><option value="">Todos</option>{movementTypes.map((item) => <option key={item} value={item}>{stockMovementTypeLabels[item]}</option>)}</select></label>
        <label className="field">Compra<select defaultValue={params.purchaseId ?? ""} name="purchaseId"><option value="">Todas</option>{purchases.map((item) => <option key={item.id} value={item.id}>{item.supplierNameSnapshot} — {formatDate(item.purchaseDate)}</option>)}</select></label>
        <label className="field">ID da OP<input defaultValue={params.productionOrderId ?? ""} name="productionOrderId" /></label>
        <div className="flex items-end gap-2"><button className="button-primary">Filtrar</button><Link className="button-secondary" href="/estoque?tab=movements">Limpar</Link></div>
      </form>
      <section className="panel">
        {!movements.length ? <EmptyState title="Nenhuma movimentação encontrada." description="Movimentos de compras, consumos, ajustes, retornos e reversões aparecerão aqui." /> : <div className="table-wrap"><table><thead><tr><th>Data</th><th>Insumo</th><th>Tipo</th><th>Origem</th><th>Entrada</th><th>Saída</th><th>Responsável</th></tr></thead><tbody>{movements.map((item) => <tr key={item.id}><td>{formatDate(item.movementDate)}</td><td>{item.supply.name}</td><td>{stockMovementTypeLabels[item.type]}</td><td>{item.productionOrder ? `OP ${item.productionOrder.number}` : item.supplyPurchaseItem?.supplyPurchase ? `Compra ${item.supplyPurchaseItem.supplyPurchase.documentNumber || item.supplyPurchaseItem.supplyPurchase.supplierNameSnapshot}` : item.reason || "—"}</td><td>{item.direction === "IN" ? balanceText(item.quantity) : "—"}</td><td>{item.direction === "OUT" ? balanceText(item.quantity) : "—"}</td><td>{item.createdBy?.name || "—"}</td></tr>)}</tbody></table></div>}
      </section>
    </>
  );
}

export default async function InventoryPage({ searchParams }: { searchParams: Promise<Params> }) {
  const [params, user] = await Promise.all([searchParams, currentUser()]);
  if (!user || user.role === "CONTRACTOR") notFound();
  const activeTab: Tab = params.tab === "purchases" || params.tab === "movements" ? params.tab : "supplies";
  const canManage = user.role === "ADMIN";
  const canBuy = user.role === "ADMIN" || user.role === "FINANCE";
  const canSeeValues = user.role === "ADMIN" || user.role === "FINANCE";
  const primaryAction = activeTab === "supplies" && canManage
    ? { label: "+ Cadastrar insumo", href: "/estoque?tab=supplies&form=supply" }
    : activeTab === "purchases" && canBuy
      ? { label: "+ Registrar compra", href: "/estoque?tab=purchases&form=purchase" }
      : undefined;
  const secondaryActions = activeTab === "movements" && canManage ? [{ label: "Registrar ajuste", href: "/estoque?tab=movements&form=adjustment" }] : [];
  const content = activeTab === "supplies"
    ? <SuppliesTab params={params} canManage={canManage} />
    : activeTab === "purchases"
      ? <PurchasesTab params={params} role={user.role} canBuy={canBuy} canSeeValues={canSeeValues} />
      : <MovementsTab params={params} canAdjust={canManage} />;

  return (
    <>
      <PageHeader title="Estoque" description="Controle de insumos, compras e movimentações." primaryAction={primaryAction} secondaryActions={secondaryActions} />
      <Tabs label="Áreas do estoque" items={(Object.keys(tabLabels) as Tab[]).map((tab) => ({ label: tabLabels[tab], href: `/estoque?tab=${tab}`, active: tab === activeTab }))} />
      <Feedback success={params.success} error={params.error} />
      {content}
    </>
  );
}
