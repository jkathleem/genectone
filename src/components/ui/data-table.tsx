import type { ReactNode } from "react";

export function DataTable({ children, empty }: { children: ReactNode; empty?: ReactNode }) {
  return (
    <div className="data-table">
      <div className="table-wrap">{children}</div>
      {empty ? <div className="data-table-empty">{empty}</div> : null}
    </div>
  );
}
