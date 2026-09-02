const navigationItems = [
  "Início",
  "OPs",
  "Terceirização",
  "Romaneios",
  "Terceirizados",
  "Financeiro",
  "DRE",
  "Relatórios",
  "Configurações",
];

const moduleAreas = [
  "OPs",
  "Terceirização",
  "Romaneios",
  "Fechamentos",
  "Financeiro",
  "DRE",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-[var(--border)] bg-[var(--surface)] px-4 py-5 md:block">
          <div className="mb-8">
            <p className="text-sm font-semibold text-[var(--brand)]">Genect</p>
            <h1 className="mt-1 text-xl font-semibold">Gestão</h1>
          </div>

          <nav aria-label="Navegação principal" className="space-y-1">
            {navigationItems.map((item) => (
              <a
                aria-disabled={item !== "Início"}
                className="block rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-[var(--surface-muted)]"
                href={item === "Início" ? "/" : "#"}
                key={item}
              >
                {item}
              </a>
            ))}
          </nav>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-[var(--border)] bg-[var(--surface)] px-5 py-4">
            <div className="mx-auto flex max-w-6xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--brand)]">Genect Confecções</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-normal">Base técnica do sistema</h2>
              </div>
              <div className="rounded-md border border-[var(--border)] px-3 py-2 text-sm text-slate-600">
                Ambiente inicial
              </div>
            </div>
          </header>

          <div className="mx-auto w-full max-w-6xl flex-1 px-5 py-6">
            <section className="mb-6 border-b border-[var(--border)] pb-6">
              <h3 className="text-lg font-semibold">Estrutura preparada</h3>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                Projeto iniciado como monólito modular em Next.js, com documentação de domínio preservada e base visual administrativa para evoluir por fases.
              </p>
            </section>

            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {moduleAreas.map((area) => (
                <article
                  className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4"
                  key={area}
                >
                  <h4 className="text-sm font-semibold">{area}</h4>
                  <p className="mt-2 text-sm leading-5 text-slate-600">
                    Área reservada para implementação futura conforme as fases documentadas.
                  </p>
                </article>
              ))}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
