import Link from "next/link";

const links = [
  { href: "/terceirizacao", label: "Serviços" },
  { href: "/terceirizacao/cobrancas", label: "Cobranças" },
  { href: "/romaneios", label: "Romaneios" },
  { href: "/terceirizacao/fechamentos", label: "Fechamentos" },
];

export function OutsourcingFlowNav({ active }: { active: "services" | "collections" | "delivery-notes" | "settlements" }) {
  return (
    <nav className="outsourcing-flow-nav" aria-label="Fluxo de terceirização">
      {links.map((link) => {
        const isActive =
          (active === "services" && link.href === "/terceirizacao") ||
          (active === "collections" && link.href === "/terceirizacao/cobrancas") ||
          (active === "delivery-notes" && link.href === "/romaneios") ||
          (active === "settlements" && link.href === "/terceirizacao/fechamentos");
        return (
          <Link className={isActive ? "active" : ""} href={link.href} key={link.href}>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
