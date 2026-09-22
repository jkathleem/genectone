import type { ReactNode } from "react";
import type { AuthenticatedUser } from "@/modules/auth/session";
import { logoutAction } from "@/modules/auth/actions";
import { canAccessPath } from "@/modules/auth/permissions";
import { ShellCurrentLocation, ShellNavigation, type ShellNavGroup } from "@/components/shell-navigation";

type NavigationItem = { label: string; href: string };

const roleLabels: Record<AuthenticatedUser["role"], string> = {
  ADMIN: "Administrador",
  FINANCE: "Financeiro",
  OPERATIONS: "Operação",
  VIEWER: "Visualização",
  CONTRACTOR: "Terceirizado",
};

const navigationGroups: ShellNavGroup[] = [
  {
    label: "Menu",
    items: [
      { label: "Início", href: "/" },
      { label: "Cadastros", href: "/cadastros" },
      { label: "OPs", href: "/ops" },
      { label: "Estoque", href: "/estoque" },
      { label: "Terceirização", href: "/terceirizacao", matchPaths: ["/romaneios"] },
      { label: "Financeiro", href: "/financeiro" },
    ],
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
            <strong>{roleLabels[user.role]}</strong>
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
