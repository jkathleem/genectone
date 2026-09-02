import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/format";
import { calculateOrderTotal } from "@/modules/production-orders/validation";

type Params = { q?: string; companyId?: string; customerId?: string; from?: string; to?: string };
export default async function Page({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams; const from = params.from ? new Date(`${params.from}T00:00:00.000Z`) : undefined; const to = params.to ? new Date(`${params.to}T00:00:00.000Z`) : undefined;
  const [orders, companies, customers] = await Promise.all([
    prisma.productionOrder.findMany({ where: { number: params.q ? { contains: params.q, mode: "insensitive" } : undefined, companyId: params.companyId || undefined, customerId: params.customerId || undefined, entryDate: from || to ? { gte: from, lte: to } : undefined }, include: { company: true, customer: true, product: true }, orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }] }),
    prisma.company.findMany({ orderBy: { name: "asc" } }), prisma.customer.findMany({ orderBy: { name: "asc" } }),
  ]);
  return <><PageHeader title="Ordens de produção" description="Consulta das OPs cadastradas e sua visão econômica inicial." action={{ label: "Nova OP", href: "/ops/nova" }} />
    <form className="panel mb-5 form-grid" method="get"><label className="field">Número da OP<input defaultValue={params.q} name="q" /></label><label className="field">Empresa<select defaultValue={params.companyId ?? ""} name="companyId"><option value="">Todas</option>{companies.map((x) => <option key={x.id} value={x.id}>{x.tradeName || x.name}</option>)}</select></label><label className="field">Cliente<select defaultValue={params.customerId ?? ""} name="customerId"><option value="">Todos</option>{customers.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label className="field">Entrada a partir de<input defaultValue={params.from} name="from" type="date" /></label><label className="field">Entrada até<input defaultValue={params.to} name="to" type="date" /></label><div className="flex items-end gap-2"><button className="button-primary" type="submit">Filtrar</button><Link className="button-secondary" href="/ops">Limpar</Link></div></form>
    <section className="panel">{orders.length === 0 ? <p className="empty-state">Nenhuma OP encontrada. Ajuste os filtros ou cadastre a primeira ordem.</p> : <div className="table-wrap"><table><thead><tr><th>OP</th><th>Entrada</th><th>Empresa</th><th>Cliente</th><th>Produto / referência</th><th>Quantidade</th><th>Preço unit.</th><th>Valor total</th></tr></thead><tbody>{orders.map((o) => <tr key={o.id}><td><Link className="font-semibold text-[var(--brand)] hover:underline" href={`/ops/${o.id}`}>{o.number}</Link></td><td>{formatDate(o.entryDate)}</td><td>{o.company.tradeName || o.company.name}</td><td>{o.customer.name}</td><td>{o.product.name}{o.product.reference ? ` — ${o.product.reference}` : ""}</td><td>{o.quantity.toLocaleString("pt-BR")}</td><td>{formatCurrency(o.unitPrice)}</td><td className="font-semibold">{formatCurrency(calculateOrderTotal(o.quantity, o.unitPrice))}</td></tr>)}</tbody></table></div>}</section>
  </>;
}
