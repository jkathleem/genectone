import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { existsSync } from "node:fs";
import { promisify } from "node:util";
import {
  productionSectorCatalog,
  productionSectorUpsertArgs,
  serviceProductionSectorBackfill,
} from "./seed-catalog.mjs";

if (existsSync(".env")) {
  process.loadEnvFile(".env");
}

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

const serviceCatalog = [
  { name: "Preparação Frente" },
  { name: "Pala e Gancho" },
  { name: "Frente Completa" },
  { name: "Final Frente" },
  { name: "Preparação e Bolso Traseiro" },
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

const initialInternalSectors = [
  { name: "Frente Interna", displayOrder: 10 },
  { name: "Carleano", displayOrder: 20 },
  { name: "Montagem", displayOrder: 30 },
];

const knownContractorCapabilities = [
  { contractorNames: ["Priscila", "Pricila"], serviceName: "Frente Completa", unitPrice: "1.5000" },
  { contractorNames: ["Rafael"], serviceName: "Pala e Gancho", unitPrice: "0.2700" },
  { contractorNames: ["Paulo"], serviceName: "Final Frente", unitPrice: "0.6000" },
  { contractorNames: ["Neudênio", "Neudenio"], serviceName: "Preparação Frente", unitPrice: "1.1000" },
  { contractorNames: ["Paulo Romes"], serviceName: "Preparação e Bolso Traseiro", unitPrice: "0.7000" },
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

async function ensureInitialOperationalStructure(tx) {
  if (await tx.internalSector.count() === 0) {
    await tx.internalSector.createMany({ data: initialInternalSectors });
  }

  const [sectors, services, contractors] = await Promise.all([
    tx.internalSector.findMany(),
    tx.service.findMany(),
    tx.contractor.findMany({ orderBy: { createdAt: "asc" } }),
  ]);
  const serviceByName = new Map(services.map((service) => [service.name, service]));
  const sectorByName = new Map(sectors.map((sector) => [sector.name, sector]));
  const frontService = serviceByName.get("Frente Completa");

  if (frontService) {
    for (const sectorName of ["Frente Interna", "Carleano"]) {
      const sector = sectorByName.get(sectorName);
      if (sector) {
        await tx.serviceInternalSector.upsert({
          where: { serviceId_internalSectorId: { serviceId: frontService.id, internalSectorId: sector.id } },
          update: {},
          create: { serviceId: frontService.id, internalSectorId: sector.id },
        });
      }
    }
  }

  for (const capability of knownContractorCapabilities) {
    const service = serviceByName.get(capability.serviceName);
    const candidates = contractors.filter((contractor) => capability.contractorNames.includes(contractor.name));
    if (!service || candidates.length !== 1) continue;
    await tx.serviceContractor.upsert({
      where: { serviceId_contractorId: { serviceId: service.id, contractorId: candidates[0].id } },
      update: {},
      create: { serviceId: service.id, contractorId: candidates[0].id, unitPrice: capability.unitPrice },
    });
  }
}

async function ensureProductionSectors(tx) {
  for (const sector of productionSectorCatalog) {
    await tx.productionSector.upsert(productionSectorUpsertArgs(sector));
  }
}

async function ensureServiceProductionSectors(tx) {
  const sectors = await tx.productionSector.findMany();
  const sectorByCode = new Map(sectors.map((sector) => [sector.code, sector]));

  for (const item of serviceProductionSectorBackfill) {
    const sector = sectorByCode.get(item.productionSectorCode);
    if (!sector) continue;
    await tx.service.updateMany({
      where: { name: item.serviceName },
      data: { productionSectorId: sector.id },
    });
  }
}

async function main() {
  await prisma.$transaction(async (tx) => {
    await ensureProductionSectors(tx);

    for (const classification of financialClassifications) {
      await tx.financialClassification.upsert({
        where: { code: classification.code },
        update: { active: true },
        create: classification,
      });
    }

    for (const item of serviceCatalog) {
      await ensureService(tx, item.name);
    }

    await ensureServiceProductionSectors(tx);
    await ensureInitialOperationalStructure(tx);
  });

  const adminName = process.env.SEED_ADMIN_NAME?.trim();
  const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (adminName && adminEmail && adminPassword) {
    if (adminPassword.length < 8) throw new Error("SEED_ADMIN_PASSWORD must contain at least 8 characters.");
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: { name: adminName, role: "ADMIN", contractorId: null, active: true },
      create: { name: adminName, email: adminEmail, role: "ADMIN", passwordHash: await hashPassword(adminPassword) },
    });
    console.log("Initial ADMIN ensured from environment variables.");
  } else {
    console.log("Initial ADMIN not created: configure SEED_ADMIN_NAME, SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD.");
  }

  console.log("Seed completed: official financial, service and post-MVP operational references ensured.");
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
