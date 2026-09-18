import Link from "next/link";
import type { ReactNode } from "react";

export type TabItem = {
  label: ReactNode;
  href: string;
  active?: boolean;
  badge?: ReactNode;
};

export function Tabs({ items, label = "Seções" }: { items: TabItem[]; label?: string }) {
  return (
    <nav aria-label={label} className="tabs">
      {items.map((item) => (
        <Link aria-current={item.active ? "page" : undefined} className={item.active ? "active" : undefined} href={item.href} key={item.href}>
          <span>{item.label}</span>
          {item.badge ? <span className="tabs-badge">{item.badge}</span> : null}
        </Link>
      ))}
    </nav>
  );
}
