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
  const [group, setGroup] = useState<DreGroup>(initialGroup ?? "VARIABLE_COST_EXPENSE");
  const groups = nature === "DRE_POST_OPERATING"
    ? [["FINANCIAL_REVENUE", "Receitas Financeiras"], ["FINANCIAL_EXPENSE", "Despesas Financeiras"], ["INCOME_TAX_EXPENSE", "Tributos sobre o Resultado"]] as const
    : [["VARIABLE_COST_EXPENSE", "Custos e Despesas Variáveis"], ["FIXED_COST_EXPENSE", "Custos e Despesas Fixas"]] as const;
  function changeNature(next: FinancialNature) {
    setNature(next);
    if (next === "DRE_POST_OPERATING" && !["FINANCIAL_REVENUE", "FINANCIAL_EXPENSE", "INCOME_TAX_EXPENSE"].includes(group)) setGroup("FINANCIAL_EXPENSE");
    if (next === "OPERATING_EXPENSE" && !["VARIABLE_COST_EXPENSE", "FIXED_COST_EXPENSE"].includes(group)) setGroup("VARIABLE_COST_EXPENSE");
  }
  return <>
    <label className="field">Natureza financeira
      <select name="financialNature" value={nature} disabled={locked} onChange={(event) => changeNature(event.target.value as FinancialNature)}>
        <option value="OPERATING_EXPENSE">Despesa operacional</option>
        <option value="DRE_POST_OPERATING">DRE pós-operacional</option>
        <option value="NON_DRE">Fora da DRE</option>
      </select>
      {locked ? <input name="financialNature" type="hidden" value={nature} /> : null}
    </label>
    <label className="field">Grupo DRE
      <select name="dreGroup" value={group} disabled={locked || nature === "NON_DRE"} onChange={(event) => setGroup(event.target.value as DreGroup)}>
        {groups.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      {locked && initialGroup ? <input name="dreGroup" type="hidden" value={initialGroup} /> : null}
      <small>{nature === "NON_DRE" ? "Não aplicável; esta classificação não afeta a DRE." : locked ? "Natureza e grupo bloqueados porque a classificação já está em uso." : "Obrigatório e coerente com a natureza financeira."}</small>
    </label>
  </>;
}
