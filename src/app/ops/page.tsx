import Link from "next/link";
import type { Prisma } from "@/generated/prisma";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/format";
import { currentUser } from "@/modules/auth/session";
import { hasPermission } from "@/modules/auth/permissions";
import { derivedQuantities } from "@/modules/outsourcing/domain";
import { externalServiceProgress, isOutsourcedServiceLate, productionOrderLifecycleStatus, serviceProgressSummary } from "@/modules/production-orders/domain";
import { calculateOrderTotal } from "@/modules/production-orders/validation";
import { receivableRemainingAmount, receivableStatus } from "@/modules/accounts-receivable/domain";

type Params = { q?: string; customerId?: string; productId?: string; color?: string; urgent?: string; from?: string; to?: string; lifecycle?: string; pendingOutsourcing?: string; partialReturn?: string; issue?: string; late?: string; responsible?: string };
const lifecycleLabel = { EM_PRODUCAO: "Em produção", CONCLUIDA: "Concluída", FATURADA: "Faturada", RECEBIDA: "Recebida" };

export default async function Page({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const where: Prisma.ProductionOrderWhereInput = {
    customerId: params.customerId || undefined,
    productId: params.productId || undefined,
    isUrgent: params.urgent === "yes" ? true : params.urgent === "no" ? false : undefined,
    entryDate: params.from || params.to ? { gte: params.from ? new Date(`${params.from}T00:00:00.000Z`) : undefined, lte: params.to ? new Date(`${params.to}T23:59:59.999Z`) : undefined } : undefined,
    product: params.color ? { color: params.color } : undefined,
    OR: params.q ? [
      { number: { contains: params.q, mode: "insensitive" } },
      { product: { reference: { contains: params.q, mode: "insensitive" } } },
      { product: { name: { contains: params.q, mode: "insensitive" } } },
      { customer: { name: { contains: params.q, mode: "insensitive" } } },
    ] : undefined,
  };
  const [rawOrders, customers, products, contractors, sectors, colors, user] = await Promise.all([
    prisma.productionOrder.findMany({ where, include: { customer: true, product: true, internalServices: { include: { internalSector: true } }, operationalIssues: true, outsourcedServices: { include: { contractor: true, deliveryNoteItems: { select: { quantity: true } }, returns: { select: { quantity: true } } } }, billing: { include: { accountReceivable: { include: { allocations: { include: { receipt: { include: { reversal: true } } } } } } } } }, orderBy: [{ isUrgent: "desc" }, { entryDate: "desc" }, { createdAt: "desc" }] }),
    prisma.customer.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.product.findMany({ orderBy: [{ reference: "asc" }, { name: "asc" }], select: { id: true, name: true, reference: true } }),
    prisma.contractor.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.internalSector.findMany({ orderBy: [{ displayOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
    prisma.product.findMany({ where: { color: { not: null } }, distinct: ["color"], orderBy: { color: "asc" }, select: { color: true } }),
    currentUser(),
  ]);
  const today = new Date();
  const orders = rawOrders.filter((order) => {
    const lifecycle = productionOrderLifecycleStatus(order);
    const quantities = order.outsourcedServices.map((item) => ({ item, ...derivedQuantities(item.deliveryNoteItems, item.returns) }));
    if (params.lifecycle && lifecycle !== params.lifecycle) return false;
    if (params.pendingOutsourcing === "yes" && !quantities.some((row) => (row.item.plannedQuantity || 0) > row.sentQuantity || row.sentQuantity > row.returnedQuantity)) return false;
    if (params.partialReturn === "yes" && !quantities.some((item) => item.returnedQuantity > 0 && item.sentQuantity > item.returnedQuantity)) return false;
    if (params.issue === "yes" && !order.operationalIssues.some((item) => item.status !== "RESOLVED")) return false;
    if (params.late === "yes" && !(order.expectedCompletionDate && !order.completedAt && order.expectedCompletionDate < today) && !quantities.some((row) => isOutsourcedServiceLate(row.item.expectedReturnDate, row.sentQuantity, row.returnedQuantity, today))) return false;
    if (params.responsible?.startsWith("contractor:") && !order.outsourcedServices.some((item) => item.contractorId === params.responsible!.slice(11))) return false;
    if (params.responsible?.startsWith("sector:") && !order.internalServices.some((item) => item.internalSectorId === params.responsible!.slice(7))) return false;
    return true;
  });
  const canCreate = Boolean(user && hasPermission(user.role, "OPERATION_MUTATE"));
  return <>
    <PageHeader title="Cadastro de OPs" description="Acompanhamento compacto da entrada ao recebimento." action={canCreate ? { label: "Nova OP", href: "/ops/nova" } : undefined}/>
    <form className="panel mb-5 grid gap-3 md:grid-cols-3 xl:grid-cols-5" method="get">
      <label className="field md:col-span-2">Busca ampla<input defaultValue={params.q} name="q" placeholder="OP, referência, descrição ou Cliente"/></label>
      <label className="field">Cliente<select defaultValue={params.customerId || ""} name="customerId"><option value="">Todos</option>{customers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="field">Produto<select defaultValue={params.productId || ""} name="productId"><option value="">Todos</option>{products.map((item) => <option key={item.id} value={item.id}>{item.reference ? `${item.reference} — ` : ""}{item.name}</option>)}</select></label>
      <label className="field">Cor<select defaultValue={params.color || ""} name="color"><option value="">Todas</option>{colors.flatMap((item) => item.color ? [<option key={item.color} value={item.color}>{item.color}</option>] : [])}</select></label>
      <label className="field">Urgência<select defaultValue={params.urgent || ""} name="urgent"><option value="">Todas</option><option value="yes">Urgentes</option><option value="no">Não urgentes</option></select></label>
      <label className="field">Situação<select defaultValue={params.lifecycle || ""} name="lifecycle"><option value="">Todas</option><option value="EM_PRODUCAO">Em produção</option><option value="CONCLUIDA">Concluída</option><option value="FATURADA">Faturada</option><option value="RECEBIDA">Recebida</option></select></label>
      <label className="field">Responsável<select defaultValue={params.responsible || ""} name="responsible"><option value="">Todos</option><optgroup label="Terceirizados">{contractors.map((item) => <option key={item.id} value={`contractor:${item.id}`}>{item.name}</option>)}</optgroup><optgroup label="Setores internos">{sectors.map((item) => <option key={item.id} value={`sector:${item.id}`}>{item.name}</option>)}</optgroup></select></label>
      <label className="field">Entrada de<input defaultValue={params.from} name="from" type="date"/></label><label className="field">Entrada até<input defaultValue={params.to} name="to" type="date"/></label>
      <div className="flex flex-wrap items-center gap-3 text-xs md:col-span-3 xl:col-span-5"><label><input defaultChecked={params.pendingOutsourcing === "yes"} name="pendingOutsourcing" type="checkbox" value="yes"/> Terceirização pendente</label><label><input defaultChecked={params.partialReturn === "yes"} name="partialReturn" type="checkbox" value="yes"/> Retorno parcial</label><label><input defaultChecked={params.issue === "yes"} name="issue" type="checkbox" value="yes"/> Pendência operacional</label><label><input defaultChecked={params.late === "yes"} name="late" type="checkbox" value="yes"/> Atrasada</label></div>
      <div className="flex gap-2"><button className="button-primary">Filtrar</button><Link className="button-secondary" href="/ops">Limpar</Link></div>
    </form>
    <section className="panel">{orders.length === 0 ? <p className="empty-state">Nenhuma OP encontrada.</p> : <div className="table-wrap"><table className="text-xs"><thead><tr><th>OP / entrada</th><th>Produto</th><th>Cliente</th><th>Qtd.</th><th>Previsão</th><th>Operação</th><th>Serviços</th><th>Financeiro</th></tr></thead><tbody>{orders.map((order) => { const lifecycle = productionOrderLifecycleStatus(order); const statuses = [...order.outsourcedServices.map((item) => { const q = derivedQuantities(item.deliveryNoteItems, item.returns); return externalServiceProgress(q.sentQuantity, q.returnedQuantity); }), ...order.internalServices.map((item) => item.completedAt ? "CONCLUIDO" as const : "PENDENTE" as const)]; const progress = serviceProgressSummary(statuses); const account = order.billing?.accountReceivable; const financial = account ? `${receivableStatus(account.originalAmount, account.dueDate, account.allocations)} · saldo ${formatCurrency(receivableRemainingAmount(account.originalAmount, account.allocations))}` : order.billing ? "Faturada" : "Não faturada"; return <tr key={order.id}><td><Link className="font-semibold text-[var(--brand)] hover:underline" href={`/ops/${order.id}`}>{order.number}</Link><span className="block text-slate-500">{formatDate(order.entryDate)}{order.isUrgent ? " · URGENTE" : ""}</span></td><td><strong>{order.product.reference || "—"}</strong><span className="block text-slate-500">{order.product.name} · {order.product.color || "sem cor"}</span></td><td>{order.customer.name}</td><td>{order.quantity.toLocaleString("pt-BR")}</td><td>{order.expectedCompletionDate ? formatDate(order.expectedCompletionDate) : "—"}</td><td><span className="status-info">{lifecycleLabel[lifecycle]}</span>{order.operationalIssues.some((item) => item.status !== "RESOLVED") ? <span className="mt-1 block text-amber-700">Com pendência</span> : null}</td><td>{progress.completed} de {progress.total}</td><td>{financial}<span className="block text-slate-500">Previsto {formatCurrency(calculateOrderTotal(order.quantity, order.unitPrice))}</span></td></tr>; })}</tbody></table></div>}</section>
  </>;
}
