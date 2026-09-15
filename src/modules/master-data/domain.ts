import { Prisma, type DreGroup, type FinancialNature } from "@/generated/prisma";

export type BulkPriceMode = "PERCENT" | "FIXED";

export function adjustedProductPrice(current: Prisma.Decimal | string | null, mode: BulkPriceMode, value: Prisma.Decimal | string) {
  const adjustment = new Prisma.Decimal(value);
  if (mode === "FIXED") {
    if (adjustment.lt(0)) throw new Error("O preço definido não pode ser negativo.");
    return adjustment;
  }
  if (current === null) throw new Error("Todos os produtos selecionados precisam possuir preço atual para ajuste percentual.");
  if (adjustment.lte(-100)) throw new Error("O percentual deve ser maior que -100%.");
  return new Prisma.Decimal(current).mul(new Prisma.Decimal(1).add(adjustment.div(100))).toDecimalPlaces(4);
}

export function financialGroupMapping(value: DreGroup | "NON_DRE"): { financialNature: FinancialNature; dreGroup: DreGroup | null } {
  if (value === "NON_DRE") return { financialNature: "NON_DRE", dreGroup: null };
  if (value === "VARIABLE_COST_EXPENSE" || value === "FIXED_COST_EXPENSE") return { financialNature: "OPERATING_EXPENSE", dreGroup: value };
  return { financialNature: "DRE_POST_OPERATING", dreGroup: value };
}

export function categoryCode(name: string) {
  const code = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  if (!code) throw new Error("Não foi possível gerar o código interno da categoria.");
  return code;
}
