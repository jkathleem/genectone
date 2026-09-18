import type { ReactNode } from "react";
import type { AuthenticatedUser } from "@/modules/auth/session";
import { logoutAction } from "@/modules/auth/actions";
import { canAccessPath } from "@/modules/auth/permissions";
import { ShellCurrentLocation, ShellNavigation, type ShellNavGroup } from "@/components/shell-navigation";

type NavigationItem = { label: string; href: string };

const navigationGroups: ShellNavGroup[] = [
  {
    label: "Operação",
    items: [
      { label: "Início", href: "/" },
      { label: "OPs", href: "/ops" },
    ],
  },
  {
    label: "Terceirização",
    items: [
      { label: "Serviços", href: "/terceirizacao" },
      { label: "Cobranças", href: "/terceirizacao/cobrancas" },
      { label: "Romaneios", href: "/romaneios" },
      { label: "Fechamentos", href: "/terceirizacao/fechamentos" },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { label: "Visão Geral", href: "/financeiro" },
      { label: "Contas a Pagar", href: "/financeiro/contas-a-pagar" },
      { label: "Contas a Receber", href: "/financeiro/contas-a-receber" },
      { label: "Fluxo de Caixa", href: "/financeiro/fluxo-de-caixa" },
      { label: "DRE", href: "/financeiro/dre" },
      { label: "Previsto x Realizado", href: "/financeiro/previsto-realizado" },
    ],
  },
  {
    label: "Administração",
    items: [{ label: "Cadastros", href: "/cadastros" }],
  },
];

const contractorNavigationGroups: ShellNavGroup[] = [
  {
    label: "Portal",
    items: [
      { label: "Início", href: "/portal" },
      { label: "Minhas OPs", href: "/portal#minhas-ops" },
      { label: "Financeiro", href: "/portal#financeiro" },
    ],
  },
];

function routePath(href: string) {
  return href.split("#")[0] || "/";
}

function filterGroupsByPermission(groups: ShellNavGroup[], role: AuthenticatedUser["role"]) {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item: NavigationItem) => canAccessPath(role, routePath(item.href))),
    }))
    .filter((group) => group.items.length > 0);
}

export function AdminShell({ children, user }: { children: ReactNode; user: AuthenticatedUser }) {
  const visibleGroups = user.role === "CONTRACTOR" ? filterGroupsByPermission(contractorNavigationGroups, user.role) : filterGroupsByPermission(navigationGroups, user.role);
  const isContractor = user.role === "CONTRACTOR";

  return (
    <div className="app-shell">
      <ShellNavigation groups={visibleGroups} homeHref={isContractor ? "/portal" : "/"} subtitle={isContractor ? "Portal" : "Confecções"} title="GENECT" />
      <div className="shell-content">
        <header className="shell-topbar">
          <p className="shell-context">
            <ShellCurrentLocation groups={visibleGroups} />
          </p>
          <form action={logoutAction} className="shell-user">
            <span>{user.name}</span>
            <strong>{user.role}</strong>
            <button className="button-ghost button-sm" type="submit">
              Sair
            </button>
          </form>
        </header>
        <main className="shell-main">{children}</main>
      </div>
    </div>
  );
}
