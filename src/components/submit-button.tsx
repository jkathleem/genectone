"use client";
import { useFormStatus } from "react-dom";

export function SubmitButton({ children, disabled = false }: { children: React.ReactNode; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return <button className="button-primary disabled:cursor-not-allowed disabled:opacity-60" disabled={pending || disabled} type="submit">{pending ? "Salvando..." : children}</button>;
}
