import type { UserRole } from "@/generated/prisma";

export type Permission = "ADMIN" | "OPERATION_MUTATE" | "FINANCE_MUTATE" | "REPORT_VIEW";

const grants: Record<Permission, readonly UserRole[]> = {
  ADMIN: ["ADMIN"],
  OPERATION_MUTATE: ["ADMIN", "OPERATIONS"],
  FINANCE_MUTATE: ["ADMIN", "FINANCE"],
  REPORT_VIEW: ["ADMIN", "FINANCE", "VIEWER"],
};

export function hasPermission(role: UserRole, permission: Permission) {
  return grants[permission].includes(role);
}

export function canAccessPath(role: UserRole, pathname: string) {
  if (role === "CONTRACTOR") return pathname === "/" || pathname.startsWith("/portal");
  if (pathname.startsWith("/cadastros/usuarios")) return role === "ADMIN";
  if (pathname.startsWith("/cadastros")) return true;
  if (role === "VIEWER") return pathname === "/" || pathname.startsWith("/estoque") || pathname.startsWith("/ops") || pathname.startsWith("/financeiro/dre") || pathname.startsWith("/financeiro/fluxo-de-caixa") || pathname.startsWith("/financeiro/previsto-realizado");
  if (pathname.startsWith("/financeiro") || pathname.startsWith("/cadastros/classificacoes-financeiras")) return hasPermission(role, "REPORT_VIEW");
  return true;
}
