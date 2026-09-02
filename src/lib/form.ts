import { redirect } from "next/navigation";

export function optionalText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text || null;
}
export function redirectWithMessage(path: string, kind: "success" | "error", message: string): never {
  const params = new URLSearchParams({ [kind]: message });
  redirect(`${path}?${params}`);
}
