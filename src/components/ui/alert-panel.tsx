import type { ReactNode } from "react";

type AlertPanelVariant = "info" | "warning" | "danger" | "success";

export function AlertPanel({ children, title, variant = "info" }: { children: ReactNode; title?: ReactNode; variant?: AlertPanelVariant }) {
  return (
    <div className={`alert-panel alert-panel-${variant}`} role={variant === "danger" ? "alert" : "status"}>
      {title ? <strong>{title}</strong> : null}
      <div>{children}</div>
    </div>
  );
}
