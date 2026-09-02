export function Feedback({ success, error }: { success?: string; error?: string }) {
  const message = error ?? success;
  if (!message) return null;
  return <div role={error ? "alert" : "status"} className={`mb-5 rounded-md border px-4 py-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}>{message}</div>;
}
