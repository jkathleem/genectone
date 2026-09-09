import { DreGroup, Prisma } from "@/generated/prisma";

export type ClassifiedExpense<T = unknown> = {
  classificationCode: string;
  classificationName: string;
  group: DreGroup;
  amount: Prisma.Decimal | string;
  detail?: T;
};

export type ExpenseGroup<T = unknown> = {
  classificationCode: string;
  classificationName: string;
  total: Prisma.Decimal;
  items: ClassifiedExpense<T>[];
};

export function sumDecimal(values: Array<Prisma.Decimal | string>): Prisma.Decimal {
  return values.reduce<Prisma.Decimal>((total, value) => total.plus(value), new Prisma.Decimal(0));
}

export function groupByClassification<T>(expenses: ClassifiedExpense<T>[]) {
  const groups = new Map<string, ExpenseGroup<T>>();
  for (const expense of expenses) {
    const key = `${expense.classificationCode}\u0000${expense.classificationName}`;
    const current = groups.get(key) ?? {
      classificationCode: expense.classificationCode,
      classificationName: expense.classificationName,
      total: new Prisma.Decimal(0),
      items: [],
    };
    current.total = current.total.plus(expense.amount);
    current.items.push(expense);
    groups.set(key, current);
  }
  return [...groups.values()].sort((a, b) => a.classificationName.localeCompare(b.classificationName, "pt-BR"));
}

export function percentage(value: Prisma.Decimal, grossRevenue: Prisma.Decimal) {
  return grossRevenue.gt(0) ? value.div(grossRevenue).mul(100) : null;
}

export function calculateOperationalDre(revenues: Array<Prisma.Decimal | string>, expenses: ClassifiedExpense[]) {
  const grossRevenue = sumDecimal(revenues);
  const variableExpenses = sumDecimal(expenses.filter((item) => item.group === "VARIABLE_COST_EXPENSE").map((item) => item.amount));
  const fixedExpenses = sumDecimal(expenses.filter((item) => item.group === "FIXED_COST_EXPENSE").map((item) => item.amount));
  const contributionMargin = grossRevenue.minus(variableExpenses);
  const operatingProfit = contributionMargin.minus(fixedExpenses);
  const financialRevenue = sumDecimal(expenses.filter((item) => item.group === "FINANCIAL_REVENUE").map((item) => item.amount));
  const financialExpenses = sumDecimal(expenses.filter((item) => item.group === "FINANCIAL_EXPENSE").map((item) => item.amount));
  const incomeTaxExpenses = sumDecimal(expenses.filter((item) => item.group === "INCOME_TAX_EXPENSE").map((item) => item.amount));
  const resultBeforeTaxes = operatingProfit.plus(financialRevenue).minus(financialExpenses);
  const managerialNetIncome = resultBeforeTaxes.minus(incomeTaxExpenses);
  return {
    grossRevenue,
    variableExpenses,
    contributionMargin,
    contributionMarginPercentage: percentage(contributionMargin, grossRevenue),
    fixedExpenses,
    operatingProfit,
    operatingMarginPercentage: percentage(operatingProfit, grossRevenue),
    financialRevenue,
    financialExpenses,
    resultBeforeTaxes,
    incomeTaxExpenses,
    managerialNetIncome,
    managerialNetMarginPercentage: percentage(managerialNetIncome, grossRevenue),
  };
}
