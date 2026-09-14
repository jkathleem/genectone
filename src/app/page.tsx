import Link from "next/link";
import { Feedback } from "@/components/feedback";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";
import { currentUser } from "@/modules/auth/session";

const shortcuts = [
  { label: "Nova OP", href: "/ops/nova", roles: ["ADMIN", "OPERATIONS"] },
  { label: "Consultar OPs", href: "/ops", roles: ["ADMIN", "OPERATIONS", "FINANCE"] },
  { label: "Novo Romaneio", href: "/romaneios/novo", roles: ["ADMIN", "OPERATIONS"] },
  { label: "Terceirização", href: "/terceirizacao", roles: ["ADMIN", "OPERATIONS", "FINANCE"] },
  { label: "Contas a Pagar", href: "/financeiro/contas-a-pagar", roles: ["ADMIN", "FINANCE"] },
  { label: "Fluxo de Caixa", href: "/financeiro/fluxo-de-caixa", roles: ["ADMIN", "FINANCE", "VIEWER"] },
  { label: "DRE", href: "/financeiro/dre", roles: ["ADMIN", "FINANCE", "VIEWER"] },
  { label: "Previsto x Realizado", href: "/financeiro/previsto-realizado", roles: ["ADMIN", "FINANCE", "VIEWER"] },
] as const;

export default async function Home({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [user, params] = await Promise.all([currentUser(), searchParams]);
  if (!user) return null;
  const mayViewOperation = user.role === "ADMIN" || user.role === "OPERATIONS" || user.role === "FINANCE";
  const values = mayViewOperation ? await Promise.all([prisma.productionOrder.count(), prisma.company.count(), prisma.customer.count(), prisma.product.count(), prisma.contractor.count(), prisma.outsourcedService.count(), prisma.deliveryNote.count()]) : [];
  const counts = ["OPs", "Empresas", "Clientes", "Produtos", "Terceirizados", "Serviços terceirizados", "Romaneios"].map((label, index) => [label, values[index]] as const);
  const visibleShortcuts = shortcuts.filter(item => (item.roles as readonly string[]).includes(user.role));
  const accessError = params.error === "acesso-negado" ? "Você não possui permissão para acessar essa área." : undefined;
  return <><PageHeader title="Início" description={`Acesso rápido para o perfil ${user.role}.`} /><Feedback error={accessError}/>{mayViewOperation ? <section className="mb-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{counts.map(([label, value]) => <article className="panel" key={label}><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p></article>)}</section> : null}<section><h2 className="section-title mb-3">Atalhos permitidos</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{visibleShortcuts.map(item => <Link className="panel font-medium hover:border-[var(--brand)]" href={item.href} key={item.href}>{item.label}<span className="mt-2 block text-sm font-normal text-slate-500">Abrir área →</span></Link>)}</div></section></>;
}
