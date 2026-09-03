import Link from "next/link";
import type { ReactNode } from "react";

const navigation = [
  { label: "Início", href: "/" },
  { label: "OPs", href: "/ops" },
  { label: "Terceirização", href: "/terceirizacao" },
  { label: "Cobranças", href: "/terceirizacao/cobrancas" },
  { label: "Romaneios", href: "/romaneios" },
  { label: "Empresas", href: "/cadastros/empresas", group: "Cadastros" },
  { label: "Clientes", href: "/cadastros/clientes", group: "Cadastros" },
  { label: "Produtos", href: "/cadastros/produtos", group: "Cadastros" },
  { label: "Terceirizados", href: "/cadastros/terceirizados", group: "Cadastros" },
  { label: "Serviços", href: "/cadastros/servicos", group: "Cadastros" },
];

const future = ["Financeiro", "DRE", "Relatórios", "Configurações"];

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen md:flex">
      <aside className="border-b border-[var(--border)] bg-[var(--surface)] p-4 md:min-h-screen md:w-64 md:border-b-0 md:border-r">
        <Link className="block px-2 py-2" href="/">
          <span className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--brand)]">Genect</span>
          <span className="mt-1 block text-lg font-semibold">Gestão</span>
        </Link>
        <nav aria-label="Navegação principal" className="mt-5 grid grid-cols-2 gap-1 sm:grid-cols-3 md:block md:space-y-1">
          {navigation.map((item, index) => (
            <div key={item.href}>
              {item.group && navigation[index - 1]?.group !== item.group ? (
                <p className="mt-4 hidden px-3 text-xs font-semibold uppercase tracking-wider text-slate-400 md:block">{item.group}</p>
              ) : null}
              <Link className="block rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-[var(--surface-muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]" href={item.href}>{item.label}</Link>
            </div>
          ))}
          {future.map((item) => (
            <span aria-disabled="true" className="hidden cursor-not-allowed rounded-md px-3 py-2 text-sm text-slate-400 md:block" key={item}>{item} <span className="text-xs">(futuro)</span></span>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="border-b border-[var(--border)] bg-[var(--surface)] px-5 py-4">
          <p className="mx-auto max-w-7xl text-sm font-medium text-slate-600">Sistema interno • Operação Genect</p>
        </header>
        <main className="mx-auto max-w-7xl p-5 md:p-8">{children}</main>
      </div>
    </div>
  );
}
