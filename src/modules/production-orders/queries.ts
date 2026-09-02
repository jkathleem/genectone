import { prisma } from "@/lib/prisma";

export async function getOrderOptions(include?: { companyId: string; customerId: string; productId: string }) {
  const [companies, customers, products] = await Promise.all([
    prisma.company.findMany({ where: { OR: [{ active: true }, ...(include ? [{ id: include.companyId }] : [])] }, orderBy: { name: "asc" } }),
    prisma.customer.findMany({ where: { OR: [{ active: true }, ...(include ? [{ id: include.customerId }] : [])] }, orderBy: { name: "asc" } }),
    prisma.product.findMany({ where: { OR: [{ active: true }, ...(include ? [{ id: include.productId }] : [])] }, orderBy: [{ name: "asc" }, { reference: "asc" }] }),
  ]);
  return { companies: companies.map((x) => ({ id: x.id, label: x.tradeName || x.name })), customers: customers.map((x) => ({ id: x.id, label: x.name })), products: products.map((x) => ({ id: x.id, label: x.reference ? `${x.name} — ${x.reference}` : x.name })) };
}
