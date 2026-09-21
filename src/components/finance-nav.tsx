import Link from "next/link";

const links = [
  { href: "/financeiro", label: "Visão Geral", key: "overview" },
  { href: "/financeiro/contas-a-pagar", label: "A Pagar", key: "payables" },
  { href: "/financeiro/contas-a-receber", label: "A Receber", key: "receivables" },
  { href: "/financeiro/fluxo-de-caixa", label: "Caixa", key: "cash" },
  { href: "/financeiro/dre", label: "DRE", key: "dre" },
  { href: "/financeiro/previsto-realizado", label: "Previsto x Realizado", key: "budget" },
] as const;

type FinanceNavKey = (typeof links)[number]["key"];

export function FinanceNav({ active }: { active: FinanceNavKey }) {
  return (
    <nav className="finance-nav" aria-label="Navegação financeira">
      {links.map((link) => (
        <Link className={link.key === active ? "active" : ""} href={link.href} key={link.href}>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
