import type { ReactNode } from "react";

type StatCardVariant = "neutral" | "info" | "success" | "warning" | "danger";

export function StatCard({
  label,
  value,
  helper,
  variant = "neutral",
}: {
  label: ReactNode;
  value: ReactNode;
  helper?: ReactNode;
  variant?: StatCardVariant;
}) {
  return (
    <div className={`stat-card stat-card-${variant}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {helper ? <small>{helper}</small> : null}
    </div>
  );
}
