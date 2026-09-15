"use client";

import { useState } from "react";
import type { UserRole } from "@/generated/prisma";

const roles: UserRole[] = ["ADMIN", "FINANCE", "OPERATIONS", "VIEWER", "CONTRACTOR"];

export function UserRoleFields({ initialRole = "VIEWER", initialContractorId = "", contractors }: { initialRole?: UserRole; initialContractorId?: string; contractors: { id: string; name: string }[] }) {
  const [role, setRole] = useState<UserRole>(initialRole);
  return <>
    <label className="field">Perfil<select name="role" onChange={(event) => setRole(event.target.value as UserRole)} value={role}>{roles.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
    <label className="field">Terceirizado<select defaultValue={initialContractorId} disabled={role !== "CONTRACTOR"} name="contractorId" required={role === "CONTRACTOR"}><option value="">Selecione</option>{contractors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><span className="font-normal text-slate-500">Obrigatório e usado somente no perfil CONTRACTOR.</span></label>
  </>;
}
