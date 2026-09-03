import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";

const shortcuts = [["Nova OP", "/ops/nova"], ["Consultar OPs", "/ops"], ["Novo Romaneio", "/romaneios/novo"], ["Romaneios", "/romaneios"], ["Terceirização", "/terceirizacao"], ["Empresas", "/cadastros/empresas"], ["Clientes", "/cadastros/clientes"], ["Produtos", "/cadastros/produtos"], ["Terceirizados", "/cadastros/terceirizados"], ["Serviços", "/cadastros/servicos"]];

export default async function Home() {
  const values = await Promise.all([prisma.productionOrder.count(), prisma.company.count(), prisma.customer.count(), prisma.product.count(), prisma.contractor.count(), prisma.outsourcedService.count(), prisma.deliveryNote.count()]);
  const counts = ["OPs", "Empresas", "Clientes", "Produtos", "Terceirizados", "Serviços terceirizados", "Romaneios"].map((label, index) => [label, values[index]]);
  return <><PageHeader title="Início" description="Acesso rápido à operação e aos cadastros básicos." /><section className="mb-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{counts.map(([label, value]) => <article className="panel" key={label}><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p></article>)}</section><section><h2 className="section-title mb-3">Atalhos</h2><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{shortcuts.map(([label, href]) => <Link className="panel font-medium hover:border-[var(--brand)]" href={href} key={href}>{label}<span className="mt-2 block text-sm font-normal text-slate-500">Abrir área →</span></Link>)}</div></section></>;
}
