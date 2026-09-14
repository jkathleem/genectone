import { DreGroup, Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { operationalDre } from "@/modules/dre/queries";
import { comparison, monthlyCompetence, plannedDre } from "./domain";

const groups: DreGroup[] = ["VARIABLE_COST_EXPENSE", "FIXED_COST_EXPENSE", "FINANCIAL_REVENUE", "FINANCIAL_EXPENSE", "INCOME_TAX_EXPENSE"];
export async function budgetComparison(companyId: string, year: number, month: number) {
  const competenceDate = monthlyCompetence(year, month);
  const [budget, actual] = await Promise.all([
    prisma.budget.findUnique({ where: { companyId_competenceDate: { companyId, competenceDate } }, include: { approvedBy: { select: { name: true } }, closedBy: { select: { name: true } }, entries: { orderBy: [{ entryType: "asc" }, { classificationNameSnapshot: "asc" }] } } }),
    operationalDre(companyId, year, month),
  ]);
  const gross = budget?.entries.find(x => x.entryType === "GROSS_REVENUE")?.amount ?? new Prisma.Decimal(0);
  const classified = budget?.entries.filter(x => x.entryType === "FINANCIAL_CLASSIFICATION" && x.dreGroupSnapshot).map(x => ({ group: x.dreGroupSnapshot!, amount: x.amount })) ?? [];
  const planned = plannedDre(gross, classified);
  const actualByCode = new Map<string, { name: string; group: DreGroup; total: Prisma.Decimal }>();
  for (const collection of [actual.variableGroups, actual.fixedGroups, actual.financialRevenueGroups, actual.financialExpenseGroups, actual.incomeTaxGroups]) for (const row of collection) actualByCode.set(row.classificationCode, { name: row.classificationName, group: row.items[0]?.group ?? "FIXED_COST_EXPENSE", total: row.total });
  const budgetByCode = new Map((budget?.entries.filter(x => x.entryType === "FINANCIAL_CLASSIFICATION").map(x => [x.classificationCodeSnapshot!, x]) ?? []));
  const detailCodes = new Set([...actualByCode.keys(), ...budgetByCode.keys()]);
  const details = [...detailCodes].map(code => { const b = budgetByCode.get(code), a = actualByCode.get(code); const group = b?.dreGroupSnapshot ?? a!.group; return { code, name: b?.classificationNameSnapshot ?? a!.name, group, ...comparison(b?.amount ?? "0", a?.total ?? "0", group === "FINANCIAL_REVENUE" ? "REVENUE" : "EXPENSE") }; }).sort((a,b) => a.name.localeCompare(b.name, "pt-BR"));
  const headline = (budgeted: Prisma.Decimal, realized: Prisma.Decimal, kind: "REVENUE" | "EXPENSE") => comparison(budgeted, realized, kind);
  return { budget, actual, planned, details, availableGroups: groups, headlines: {
    grossRevenue: headline(planned.grossRevenue, actual.grossRevenue, "REVENUE"), variableExpenses: headline(planned.variableExpenses, actual.variableExpenses, "EXPENSE"), contributionMargin: headline(planned.contributionMargin, actual.contributionMargin, "REVENUE"), fixedExpenses: headline(planned.fixedExpenses, actual.fixedExpenses, "EXPENSE"), operatingProfit: headline(planned.operatingProfit, actual.operatingProfit, "REVENUE"), financialRevenue: headline(planned.financialRevenue, actual.financialRevenue, "REVENUE"), financialExpenses: headline(planned.financialExpenses, actual.financialExpenses, "EXPENSE"), resultBeforeTaxes: headline(planned.resultBeforeTaxes, actual.resultBeforeTaxes, "REVENUE"), incomeTaxExpenses: headline(planned.incomeTaxExpenses, actual.incomeTaxExpenses, "EXPENSE"), managerialNetIncome: headline(planned.managerialNetIncome, actual.managerialNetIncome, "REVENUE"),
  } };
}
