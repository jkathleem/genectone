"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

export type ShellNavItem = {
  label: string;
  href: string;
  matchPaths?: string[];
};

export type ShellNavGroup = {
  label: string;
  items: ShellNavItem[];
};

function hrefPath(href: string) {
  return href.split("#")[0] || "/";
}

function matchesPath(pathname: string, href: string) {
  const path = hrefPath(href);
  if (path === "/") return pathname === "/";
  return pathname === path || pathname.startsWith(`${path}/`);
}

function matchesItem(pathname: string, item: ShellNavItem) {
  return matchesPath(pathname, item.href) || item.matchPaths?.some((path) => matchesPath(pathname, path)) === true;
}

function findCurrentItem(groups: ShellNavGroup[], pathname: string) {
  return groups
    .flatMap((group) => group.items.map((item) => ({ group: group.label, item })))
    .filter(({ item }) => matchesItem(pathname, item))
    .sort((a, b) => hrefPath(b.item.href).length - hrefPath(a.item.href).length)[0];
}

function NavigationGroups({ groups, onNavigate }: { groups: ShellNavGroup[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = findCurrentItem(groups, pathname);

  return (
    <nav aria-label="Navegação principal" className="shell-nav">
      {groups.map((group) => (
        <div className="shell-nav-group" key={group.label}>
          <p>{group.label}</p>
          <div>
            {group.items.map((item) => {
              const isActive = active?.item.href === item.href;
              return (
                <Link aria-current={isActive ? "page" : undefined} className={isActive ? "active" : undefined} href={item.href} key={item.href} onClick={onNavigate}>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function ShellCurrentLocation({ groups }: { groups: ShellNavGroup[] }) {
  const pathname = usePathname();
  const current = useMemo(() => findCurrentItem(groups, pathname), [groups, pathname]);

  if (!current) return <span>Genect</span>;
  return (
    <span>
      {current.group} <span aria-hidden="true">/</span> {current.item.label}
    </span>
  );
}

export function ShellNavigation({
  groups,
  homeHref,
  subtitle,
  title,
}: {
  groups: ShellNavGroup[];
  homeHref: string;
  subtitle: string;
  title: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="shell-mobile-bar">
        <Link className="shell-brand" href={homeHref}>
          <span>{title}</span>
          <strong>{subtitle}</strong>
        </Link>
        <button aria-controls="mobile-navigation" aria-expanded={isOpen} className="button-secondary button-sm" onClick={() => setIsOpen((value) => !value)} type="button">
          Menu
        </button>
      </div>

      {isOpen ? (
        <div className="shell-mobile-panel" id="mobile-navigation">
          <NavigationGroups groups={groups} onNavigate={() => setIsOpen(false)} />
        </div>
      ) : null}

      <aside className="shell-sidebar">
        <Link className="shell-brand" href={homeHref}>
          <span>{title}</span>
          <strong>{subtitle}</strong>
        </Link>
        <NavigationGroups groups={groups} />
      </aside>
    </>
  );
}
