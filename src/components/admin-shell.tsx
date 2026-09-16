import Link from "next/link";
import type { ReactNode } from "react";
import type { AuthenticatedUser } from "@/modules/auth/session";
import { logoutAction } from "@/modules/auth/actions";
import { canAccessPath } from "@/modules/auth/permissions";

const navigation = [
  { label: "Início", href: "/" },
  { label: "Cadastro de OPs", href: "/ops" },
  { label: "Terceirização", href: "/terceirizacao" },
  { label: "Cobranças", href: "/terceirizacao/cobrancas" },
  { label: "Fechamentos", href: "/terceirizacao/fechamentos" },
  { label: "Romaneios", href: "/romaneios" },
  { label: "Contas a Pagar", href: "/financeiro/contas-a-pagar", group: "Financeiro" },
  { label: "Contas a Receber", href: "/financeiro/contas-a-receber", group: "Financeiro" },
  { label: "Recebimentos", href: "/financeiro/recebimentos", group: "Financeiro" },
  { label: "Fluxo de Caixa", href: "/financeiro/fluxo-de-caixa", group: "Financeiro" },
  { label: "DRE", href: "/financeiro/dre", group: "Financeiro" },
  { label: "Previsto x Realizado", href: "/financeiro/previsto-realizado", group: "Financeiro" },
  { label: "Cadastros", href: "/cadastros", group: "Cadastros" },
];

export function AdminShell({ children, user }: { children: ReactNode; user: AuthenticatedUser }) {
  const visible = navigation.filter((item) => canAccessPath(user.role, item.href));
  return <div className="min-h-screen md:flex"><aside className="border-b border-[var(--border)] bg-[var(--surface)] p-4 md:min-h-screen md:w-64 md:border-b-0 md:border-r"><Link className="block px-2 py-2" href="/"><span className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--brand)]">Genect</span><span className="mt-1 block text-lg font-semibold">Gestão</span></Link><nav aria-label="Navegação principal" className="mt-5 grid grid-cols-2 gap-1 sm:grid-cols-3 md:block md:space-y-1">{visible.map((item, index) => <div key={item.href}>{item.group && visible[index - 1]?.group !== item.group ? <p className="mt-4 hidden px-3 text-xs font-semibold uppercase tracking-wider text-slate-400 md:block">{item.group}</p> : null}<Link className="block rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-[var(--surface-muted)]" href={item.href}>{item.label}</Link></div>)}</nav></aside><div className="min-w-0 flex-1"><header className="border-b border-[var(--border)] bg-[var(--surface)] px-5 py-4"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4 text-sm text-slate-600"><p>Sistema interno • Operação Genect</p><form action={logoutAction}><span className="mr-3">{user.name} ({user.role})</span><button className="font-semibold text-[var(--brand)]">Sair</button></form></div></header><main className="mx-auto max-w-7xl p-5 md:p-8">{children}</main></div></div>;
}
