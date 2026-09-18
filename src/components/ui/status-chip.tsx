import type { ReactNode } from "react";

type StatusChipVariant = "neutral" | "info" | "success" | "warning" | "danger";

const variantClasses: Record<StatusChipVariant, string> = {
  neutral: "status-neutral",
  info: "status-info",
  success: "status-success",
  warning: "status-warning",
  danger: "status-danger",
};

export function StatusChip({ children, variant = "neutral" }: { children: ReactNode; variant?: StatusChipVariant }) {
  return <span className={variantClasses[variant]}>{children}</span>;
}
