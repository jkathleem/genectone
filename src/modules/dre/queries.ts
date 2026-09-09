import { prisma } from "@/lib/prisma";
import { calculateOperationalDre, ClassifiedExpense, groupByClassification } from "./domain";

export function competenceRange(year: number, month: number) {
  if (!Number.isInteger(year) || year < 1900 || !Number.isInteger(month) || month < 1 || month > 12) throw new Error("Competência inválida.");
  return {
    from: new Date(Date.UTC(year, month - 1, 1)),
    to: new Date(Date.UTC(year, month, 1)),
  };
}

export async function operationalDre(companyId: string, year: number, month: number) {
  if (!companyId) throw new Error("Selecione uma empresa.");
  const { from, to } = competenceRange(year, month);
  const [billings, accountsPayable] = await Promise.all([
    prisma.billing.findMany({
      where: { companyId, competenceDate: { gte: from, lt: to } },
      include: { productionOrder: { include: { customer: true } }, accountReceivable: { select: { id: true } } },
      orderBy: [{ issueDate: "asc" }, { invoiceNumber: "asc" }],
    }),
    prisma.accountPayable.findMany({
      where: { companyId, competenceDate: { gte: from, lt: to } },
      orderBy: [{ classificationNameSnapshot: "asc" }, { dueDate: "asc" }, { createdAt: "asc" }],
    }),
  ]);
  const expenses: ClassifiedExpense<(typeof accountsPayable)[number]>[] = accountsPayable.map((account) => ({
    classificationCode: account.classificationCodeSnapshot,
    classificationName: account.classificationNameSnapshot,
    group: account.dreGroupSnapshot,
    amount: account.originalAmount,
    detail: account,
  }));
  const result = calculateOperationalDre(billings.map((billing) => billing.amount), expenses);
  return {
    ...result,
    billings,
    variableGroups: groupByClassification(expenses.filter((item) => item.group === "VARIABLE_COST_EXPENSE")),
    fixedGroups: groupByClassification(expenses.filter((item) => item.group === "FIXED_COST_EXPENSE")),
  };
}
