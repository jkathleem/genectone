import { prisma } from "@/lib/prisma";

export async function getOrderOptions(include?: { companyId: string; customerId: string; productId: string }) {
  const [companies, customers, products] = await Promise.all([
    prisma.company.findMany({ where: { OR: [{ active: true }, ...(include ? [{ id: include.companyId }] : [])] }, orderBy: { name: "asc" } }),
    prisma.customer.findMany({ where: { OR: [{ active: true }, ...(include ? [{ id: include.customerId }] : [])] }, orderBy: { name: "asc" } }),
    prisma.product.findMany({ where: { OR: [{ active: true }, ...(include ? [{ id: include.productId }] : [])] }, include: { customer: true, supplies: { include: { supply: true } } }, orderBy: [{ name: "asc" }, { reference: "asc" }] }),
  ]);
  return {
    companies: companies.map((item) => ({ id: item.id, label: item.tradeName || item.name })),
    customers: customers.map((item) => ({ id: item.id, label: item.name })),
    products: products.map((item) => ({
      id: item.id,
      label: item.reference ? `${item.reference} — ${item.name}` : item.name,
      reference: item.reference,
      description: item.name,
      customerId: item.customerId,
      customerName: item.customer?.name ?? null,
      color: item.color,
      currentUnitPrice: item.currentUnitPrice?.toFixed(4) ?? null,
      imageUrl: item.imageUrl,
      supplies: item.supplies.map((link) => ({ name: link.supply.name, unit: link.supply.unit, quantityPerBase: link.quantityPerBase?.toFixed(4) ?? null, baseQuantity: link.baseQuantity })),
    })),
  };
}
