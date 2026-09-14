import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";

process.loadEnvFile();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured");
}

const adapter = new PrismaPg(databaseUrl);
const prisma = new PrismaClient({ adapter });
const scrypt = promisify(scryptCallback);

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const key = await scrypt(password, salt, 64);
  return `scrypt:${salt}:${key.toString("hex")}`;
}

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

const financialClassifications = [
  { code: "OUTSOURCED_PRODUCTION", name: "Serviços terceirizados de produção", financialNature: "OPERATING_EXPENSE", dreGroup: "VARIABLE_COST_EXPENSE", notes: "Serviços produtivos executados por terceirizados." },
  { code: "PRODUCTION_MATERIALS", name: "Materiais e insumos de produção", financialNature: "OPERATING_EXPENSE", dreGroup: "VARIABLE_COST_EXPENSE", notes: "Materiais diretamente ligados à fabricação sem módulo próprio." },
  { code: "PRODUCTION_SUPPLIES", name: "Suprimentos de produção", financialNature: "OPERATING_EXPENSE", dreGroup: "VARIABLE_COST_EXPENSE", notes: "Pequenos insumos operacionais diretamente associados à produção." },
  { code: "PAYROLL", name: "Salários", financialNature: "OPERATING_EXPENSE", dreGroup: "FIXED_COST_EXPENSE", notes: "Folha registrada manualmente por competência, sem integração automática." },
  { code: "PAYROLL_CHARGES", name: "Encargos sobre folha", financialNature: "OPERATING_EXPENSE", dreGroup: "FIXED_COST_EXPENSE", notes: "Encargos sobre folha registrados separadamente dos salários." },
  { code: "ELECTRICITY", name: "Energia elétrica", financialNature: "OPERATING_EXPENSE", dreGroup: "FIXED_COST_EXPENSE", notes: "Energia classificada como fixa nesta versão gerencial." },
  { code: "RENT", name: "Aluguel", financialNature: "OPERATING_EXPENSE", dreGroup: "FIXED_COST_EXPENSE", notes: "Aluguéis operacionais." },
  { code: "ACCOUNTING", name: "Contabilidade", financialNature: "OPERATING_EXPENSE", dreGroup: "FIXED_COST_EXPENSE", notes: "Serviços contábeis recorrentes." },
  { code: "MAINTENANCE", name: "Manutenção", financialNature: "OPERATING_EXPENSE", dreGroup: "FIXED_COST_EXPENSE", notes: "Manutenção classificada como fixa nesta versão gerencial." },
  { code: "ADMIN_EXPENSES", name: "Despesas administrativas", financialNature: "OPERATING_EXPENSE", dreGroup: "FIXED_COST_EXPENSE", notes: "Despesas administrativas operacionais." },
  { code: "COMMERCIAL_EXPENSES", name: "Despesas comerciais", financialNature: "OPERATING_EXPENSE", dreGroup: "FIXED_COST_EXPENSE", notes: "Despesas comerciais operacionais." },
  { code: "FINANCIAL_EXPENSES", name: "Despesas financeiras", financialNature: "DRE_POST_OPERATING", dreGroup: "FINANCIAL_EXPENSE", notes: "Despesas financeiras gerenciais reconhecidas por competência." },
  { code: "INCOME_TAXES", name: "Tributos sobre o resultado", financialNature: "DRE_POST_OPERATING", dreGroup: "INCOME_TAX_EXPENSE", notes: "Tributos gerenciais incidentes sobre o resultado." },
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
    for (const classification of financialClassifications) {
      await tx.financialClassification.upsert({
        where: { code: classification.code },
        update: { active: true },
        create: classification,
      });
    }

    for (const item of serviceCatalog) {
      const service = await ensureService(tx, item.name);

      if (item.unitPrice) {
        await ensureReferencePrice(tx, service.id, item.unitPrice);
      }
    }
  });

  const adminName = process.env.SEED_ADMIN_NAME?.trim();
  const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (adminName && adminEmail && adminPassword) {
    if (adminPassword.length < 8) throw new Error("SEED_ADMIN_PASSWORD must contain at least 8 characters.");
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: { name: adminName, role: "ADMIN", active: true },
      create: { name: adminName, email: adminEmail, role: "ADMIN", passwordHash: await hashPassword(adminPassword) },
    });
    console.log("Initial ADMIN ensured from environment variables.");
  } else {
    console.log("Initial ADMIN not created: configure SEED_ADMIN_NAME, SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD.");
  }

  console.log("Seed completed: 13 financial classifications, 7 services and 5 reference prices ensured.");
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
