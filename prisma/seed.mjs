import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

process.loadEnvFile();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured");
}

const adapter = new PrismaPg(databaseUrl);
const prisma = new PrismaClient({ adapter });

const SYSTEM_REFERENCE_DATE = new Date("2026-09-02T00:00:00.000Z");

const serviceCatalog = [
  { name: "Preparação Frente", unitPrice: "1.1000" },
  { name: "Pala e Gancho", unitPrice: "0.2700" },
  { name: "Frente Completa", unitPrice: "1.5000" },
  { name: "Final Frente", unitPrice: "0.6000" },
  { name: "Preparação e Bolso Traseiro", unitPrice: "0.7000" },
  { name: "Frente" },
  { name: "Costas" },
];

async function ensureService(tx, name) {
  const existing = await tx.service.findFirst({
    where: { name },
    orderBy: { createdAt: "asc" },
  });

  if (existing) {
    return tx.service.update({
      where: { id: existing.id },
      data: { active: true },
    });
  }

  return tx.service.create({
    data: { name },
  });
}

async function ensureReferencePrice(tx, serviceId, unitPrice) {
  const existing = await tx.servicePrice.findFirst({
    where: {
      serviceId,
      unitPrice,
      validFrom: SYSTEM_REFERENCE_DATE,
      validUntil: null,
    },
  });

  if (existing) {
    return existing;
  }

  return tx.servicePrice.create({
    data: {
      serviceId,
      unitPrice,
      validFrom: SYSTEM_REFERENCE_DATE,
    },
  });
}

async function main() {
  await prisma.$transaction(async (tx) => {
    await tx.financialClassification.upsert({
      where: { code: "OUTSOURCED_PRODUCTION" },
      update: {
        name: "Serviços terceirizados de produção",
        dreGroup: "VARIABLE_COST_EXPENSE",
        active: true,
      },
      create: {
        code: "OUTSOURCED_PRODUCTION",
        name: "Serviços terceirizados de produção",
        dreGroup: "VARIABLE_COST_EXPENSE",
        notes: "Classificação padrão das Contas a Pagar originadas de Fechamentos de Terceirizados.",
      },
    });

    for (const item of serviceCatalog) {
      const service = await ensureService(tx, item.name);

      if (item.unitPrice) {
        await ensureReferencePrice(tx, service.id, item.unitPrice);
      }
    }
  });

  console.log("Seed completed: official financial classification, 7 services and 5 reference prices ensured.");
}

main()
  .catch((error) => {
    console.error("Seed failed.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
