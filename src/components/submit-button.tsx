"use client";
import { useFormStatus } from "react-dom";

export function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return <button className="button-primary disabled:cursor-wait disabled:opacity-60" disabled={pending} type="submit">{pending ? "Salvando..." : children}</button>;
}
