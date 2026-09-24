export const productionSectorCatalog = [
  { code: "STANDBY", name: "Stand by", displayOrder: 10 },
  { code: "PREPARATION", name: "Preparação", displayOrder: 20 },
  { code: "FRONT", name: "Frente", displayOrder: 30 },
  { code: "BACK", name: "Costa", displayOrder: 40 },
  { code: "ASSEMBLY", name: "Montagem", displayOrder: 50 },
  { code: "FINAL", name: "Final", displayOrder: 60 },
  { code: "REVIEW", name: "Revisão", displayOrder: 70 },
];

export const serviceProductionSectorBackfill = [
  { serviceName: "Preparação Frente", productionSectorCode: "PREPARATION" },
  { serviceName: "Pala e Gancho", productionSectorCode: "FRONT" },
  { serviceName: "Frente Completa", productionSectorCode: "FRONT" },
  { serviceName: "Frente", productionSectorCode: "FRONT" },
  { serviceName: "Costas", productionSectorCode: "BACK" },
];

export function productionSectorUpsertArgs(sector) {
  return {
    where: { code: sector.code },
    update: {
      name: sector.name,
      displayOrder: sector.displayOrder,
      active: true,
    },
    create: {
      code: sector.code,
      name: sector.name,
      displayOrder: sector.displayOrder,
    },
  };
}

export function productionSectorCodeForServiceName(serviceName) {
  return serviceProductionSectorBackfill.find((item) => item.serviceName === serviceName)?.productionSectorCode ?? null;
}
