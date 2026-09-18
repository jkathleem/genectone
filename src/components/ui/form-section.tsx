import type { ReactNode } from "react";

export function FormSection({ title, description, children }: { title: ReactNode; description?: ReactNode; children: ReactNode }) {
  return (
    <section className="form-section">
      <div>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      <div>{children}</div>
    </section>
  );
}
