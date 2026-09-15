import type { UserRole } from "@/generated/prisma";

export const registrationTabs = ["companies", "customers", "contractors", "products", "sectors", "categories", "users"] as const;
export type RegistrationTab = (typeof registrationTabs)[number];

const operationalTabs: readonly RegistrationTab[] = ["companies", "customers", "contractors", "products", "sectors"];
const readOnlyMasterTabs: readonly RegistrationTab[] = [...operationalTabs, "categories"];

export function canReadRegistrationTab(role: UserRole, tab: RegistrationTab) {
  if (role === "CONTRACTOR") return false;
  if (role === "ADMIN") return true;
  if (role === "OPERATIONS") return operationalTabs.includes(tab);
  if (role === "FINANCE" || role === "VIEWER") return readOnlyMasterTabs.includes(tab);
  return false;
}

export function canWriteRegistrationTab(role: UserRole, tab: RegistrationTab) {
  if (role === "ADMIN") return true;
  if (role === "OPERATIONS") return operationalTabs.includes(tab);
  return role === "FINANCE" && tab === "categories";
}

export function visibleRegistrationTabs(role: UserRole) {
  return registrationTabs.filter((tab) => canReadRegistrationTab(role, tab));
}
