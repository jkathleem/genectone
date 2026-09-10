import { DreGroup, Prisma } from "@/generated/prisma";
import { calculateOperationalDre, ClassifiedExpense } from "@/modules/dre/domain";

export type Evaluation = "Favorável" | "Desfavorável" | "Neutra";
export type ComparisonLine = { budgeted: Prisma.Decimal; actual: Prisma.Decimal; variance: Prisma.Decimal; variancePercentage: Prisma.Decimal | null; evaluation: Evaluation };

export function monthlyCompetence(year: number, month: number) {
  if (!Number.isInteger(year) || year < 1900 || !Number.isInteger(month) || month < 1 || month > 12) throw new Error("Informe uma competência válida.");
  return new Date(Date.UTC(year, month - 1, 1));
}

export function nonNegativeAmount(value: Prisma.Decimal | string) {
  const amount = new Prisma.Decimal(value);
  if (amount.isNegative()) throw new Error("O valor previsto não pode ser negativo.");
  return amount;
}

export function comparison(budgetedValue: Prisma.Decimal | string, actualValue: Prisma.Decimal | string, kind: "REVENUE" | "EXPENSE"): ComparisonLine {
  const budgeted = new Prisma.Decimal(budgetedValue), actual = new Prisma.Decimal(actualValue), variance = actual.minus(budgeted);
  const variancePercentage = budgeted.gt(0) ? variance.div(budgeted).mul(100) : null;
  const favorable = kind === "REVENUE" ? variance.gt(0) : variance.lt(0);
  return { budgeted, actual, variance, variancePercentage, evaluation: variance.isZero() ? "Neutra" : favorable ? "Favorável" : "Desfavorável" };
}

export function plannedDre(grossRevenue: Prisma.Decimal | string, entries: Array<{ group: DreGroup; amount: Prisma.Decimal | string }>) {
  const expenses: ClassifiedExpense[] = entries.map((entry, index) => ({ classificationCode: String(index), classificationName: String(index), group: entry.group, amount: entry.amount }));
  return calculateOperationalDre([grossRevenue], expenses);
}
