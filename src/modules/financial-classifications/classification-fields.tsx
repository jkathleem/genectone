"use client";

import { useState } from "react";
import type { DreGroup, FinancialNature } from "@/generated/prisma";

export function ClassificationNatureFields({
  initialNature = "OPERATING_EXPENSE",
  initialGroup = "VARIABLE_COST_EXPENSE",
  locked = false,
}: {
  initialNature?: FinancialNature;
  initialGroup?: DreGroup | null;
  locked?: boolean;
}) {
  const [nature, setNature] = useState<FinancialNature>(initialNature);
  const group = initialGroup ?? "VARIABLE_COST_EXPENSE";
  return <>
    <label className="field">Natureza financeira
      <select name="financialNature" value={nature} disabled={locked} onChange={(event) => setNature(event.target.value as FinancialNature)}>
        <option value="OPERATING_EXPENSE">Despesa operacional</option>
        <option value="NON_DRE">Fora da DRE</option>
      </select>
      {locked ? <input name="financialNature" type="hidden" value={nature} /> : null}
    </label>
    <label className="field">Grupo DRE
      <select name="dreGroup" defaultValue={group} disabled={locked || nature === "NON_DRE"}>
        <option value="VARIABLE_COST_EXPENSE">Custos e Despesas Variáveis</option>
        <option value="FIXED_COST_EXPENSE">Custos e Despesas Fixas</option>
      </select>
      {locked && initialGroup ? <input name="dreGroup" type="hidden" value={initialGroup} /> : null}
      <small>{nature === "NON_DRE" ? "Não aplicável; esta classificação não afeta a DRE." : locked ? "Natureza e grupo bloqueados porque a classificação já está em uso." : "Obrigatório para despesas operacionais."}</small>
    </label>
  </>;
}
