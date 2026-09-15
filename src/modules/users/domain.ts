import type { UserRole } from "@/generated/prisma";

export function userContractorId(role: UserRole, contractorId: string | null, contractorIsActive: boolean) {
  if (role !== "CONTRACTOR") return null;
  if (!contractorId || !contractorIsActive) throw new Error("Selecione um terceirizado ativo para o usuário CONTRACTOR.");
  return contractorId;
}
