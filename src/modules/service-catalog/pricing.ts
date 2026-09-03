type Price = { unitPrice: { toFixed(decimals: number): string }; validFrom: Date; validUntil: Date | null };
export function currentPrice<T extends Price>(prices: T[], referenceDate: Date) {
  return prices.filter(price => price.validFrom <= referenceDate && (!price.validUntil || price.validUntil >= referenceDate)).sort((a, b) => b.validFrom.getTime() - a.validFrom.getTime())[0] ?? null;
}
