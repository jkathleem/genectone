import Link from "next/link";

export function PageHeader({ title, description, action }: { title: string; description: string; action?: { label: string; href: string } }) {
  return (
    <div className="mb-6 flex flex-col gap-4 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div><h1 className="text-2xl font-semibold">{title}</h1><p className="mt-1 text-sm text-slate-600">{description}</p></div>
      {action ? <Link className="button-primary" href={action.href}>{action.label}</Link> : null}
    </div>
  );
}
