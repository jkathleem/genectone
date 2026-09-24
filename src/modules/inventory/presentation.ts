import { Prisma, type StockMovementType, type UserRole } from "@/generated/prisma";

export const supplyUnitOptions = ["UNIDADE", "CONE", "KG", "METRO", "ROLO", "LITRO", "PACOTE"] as const;

export type SupplySituation = "NORMAL" | "BELOW_MINIMUM" | "ZERO" | "NEGATIVE";

export const supplySituationLabels: Record<SupplySituation, string> = {
  NORMAL: "Normal",
  BELOW_MINIMUM: "Abaixo do mínimo",
  ZERO: "Zerado",
  NEGATIVE: "Negativo",
};

export const supplySituationVariants = {
  NORMAL: "success",
  BELOW_MINIMUM: "warning",
  ZERO: "warning",
  NEGATIVE: "danger",
} as const;

export const stockMovementTypeLabels: Record<StockMovementType, string> = {
  PURCHASE: "Compra",
  OP_CONSUMPTION: "Consumo OP",
  POSITIVE_ADJUSTMENT: "Ajuste positivo",
  NEGATIVE_ADJUSTMENT: "Ajuste negativo",
  RETURN: "Retorno",
  REVERSAL: "Reversão",
};

export function supplySituation(balance: Prisma.Decimal | string, minimumStock?: Prisma.Decimal | string | null): SupplySituation {
  const current = new Prisma.Decimal(balance);
  if (current.lt(0)) return "NEGATIVE";
  if (current.eq(0)) return "ZERO";
  if (minimumStock && current.lt(minimumStock)) return "BELOW_MINIMUM";
  return "NORMAL";
}

export function decimalInputValue(value?: Prisma.Decimal | null) {
  return value ? value.toFixed(4).replace(/\.?0+$/, "").replace(".", ",") : "";
}

export function canSeeInventoryFinancialDetails(role: UserRole) {
  return role === "ADMIN" || role === "FINANCE";
}

export function purchaseFinancialVisibility(role: UserRole) {
  const canSeeFinancialDetails = canSeeInventoryFinancialDetails(role);
  return {
    showValues: canSeeFinancialDetails,
    showFinancialStatus: canSeeFinancialDetails,
    showPayableLink: canSeeFinancialDetails,
  };
}
