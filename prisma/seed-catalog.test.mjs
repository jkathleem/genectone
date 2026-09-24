import { describe, expect, it } from "vitest";
import {
  productionSectorCatalog,
  productionSectorCodeForServiceName,
  productionSectorUpsertArgs,
  serviceProductionSectorBackfill,
} from "./seed-catalog.mjs";

describe("catálogo de setores macro de produção", () => {
  it("define os 7 ProductionSector oficiais em ordem", () => {
    expect(productionSectorCatalog.map((sector) => sector.code)).toEqual([
      "STANDBY",
      "PREPARATION",
      "FRONT",
      "BACK",
      "ASSEMBLY",
      "FINAL",
      "REVIEW",
    ]);
    expect(productionSectorCatalog.map((sector) => sector.displayOrder)).toEqual([10, 20, 30, 40, 50, 60, 70]);
  });

  it("usa upsert por code para permitir seed idempotente", () => {
    expect(productionSectorUpsertArgs(productionSectorCatalog[0])).toMatchObject({
      where: { code: "STANDBY" },
      update: { name: "Stand by", displayOrder: 10, active: true },
      create: { code: "STANDBY", name: "Stand by", displayOrder: 10 },
    });
  });

  it("mantém Stand by sem serviço atribuído por backfill", () => {
    expect(serviceProductionSectorBackfill.some((item) => item.productionSectorCode === "STANDBY")).toBe(false);
  });

  it("mapeia somente serviços oficiais conhecidos de alta confiança", () => {
    expect(productionSectorCodeForServiceName("Preparação Frente")).toBe("PREPARATION");
    expect(productionSectorCodeForServiceName("Pala e Gancho")).toBe("FRONT");
    expect(productionSectorCodeForServiceName("Frente Completa")).toBe("FRONT");
    expect(productionSectorCodeForServiceName("Frente")).toBe("FRONT");
    expect(productionSectorCodeForServiceName("Costas")).toBe("BACK");
  });

  it("mantém o backfill restrito a Service e ProductionSector, sem executor interno ou terceirizado", () => {
    expect(serviceProductionSectorBackfill).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ serviceName: "Frente Completa", productionSectorCode: "FRONT" }),
      ]),
    );
    expect(serviceProductionSectorBackfill.every((item) => !("internalSectorName" in item) && !("contractorName" in item))).toBe(true);
  });

  it("deixa serviços ambíguos ou desconhecidos sem setor durante a transição", () => {
    expect(productionSectorCodeForServiceName("Preparação e Bolso Traseiro")).toBeNull();
    expect(productionSectorCodeForServiceName("Final Frente")).toBeNull();
    expect(productionSectorCodeForServiceName("Serviço Customizado")).toBeNull();
  });
});
