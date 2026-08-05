// Katalog dla superadmina: producenci z bazy razem z tymi, którzy istnieją
// tylko w konfiguracji statycznej.
//
// Konfigurator renderuje z `catalog.js`, więc bez tego scalenia panel pokazywał
// pustą listę i nie dało się edytować producentów, których klient widzi na
// ekranie (WIŚNIOWSKI, SteelProfil). Pozycja bazowa trafia do bazy dopiero przy
// pierwszym zapisie — do tego czasu jest tylko podglądem.

import { CLADDING_CATALOG, GATE_MANUFACTURERS, ROOF_CLADDING_CATALOG } from "@/config/catalog";

export type AdminCatalogSource = "DB" | "STATIC";

export type AdminManufacturer = {
  _id?: string;
  kind: string;
  key: string;
  name: string;
  tagline: string;
  description: string;
  logoUrl: string;
  websiteUrl: string;
  status: string;
  version: number;
  source: AdminCatalogSource;
};

export type AdminProduct = {
  _id?: string;
  kind: string;
  manufacturerKey: string;
  key: string;
  name: string;
  thicknessMm: number[];
  colorIds: string[];
  profile: string;
  animationProfile: string;
  specs: Record<string, unknown> | null;
  status: string;
  version: number;
  source: AdminCatalogSource;
};

const ANIMATION_BY_GATE_TYPE: Record<string, string> = {
  sectional: "SECTIONAL",
  roller: "ROLLER",
  tilting: "TILTING",
};

function staticProduct(kind: string, manufacturerKey: string, key: string, model: any, animationProfile: string): AdminProduct {
  return {
    kind,
    manufacturerKey,
    key,
    name: model.label,
    thicknessMm: model.thicknessMm ?? [],
    colorIds: Object.keys(model.colors ?? {}),
    profile: model.defaultProfile ?? "",
    animationProfile,
    specs: model.specs ?? null,
    status: "BAZOWY",
    version: 0,
    source: "STATIC",
  };
}

/** Producenci i modele zapisane w `catalog.js`. */
function staticCatalogEntries() {
  const manufacturers = new Map<string, AdminManufacturer>();
  const products: AdminProduct[] = [];

  const addManufacturer = (kind: string, key: string, item: any) => {
    if (manufacturers.has(`${kind}:${key}`)) return;
    manufacturers.set(`${kind}:${key}`, {
      kind,
      key,
      name: item.label,
      tagline: item.tagline ?? "",
      description: item.description ?? "",
      logoUrl: item.logoUrl ?? "",
      websiteUrl: item.websiteUrl ?? "",
      status: "BAZOWY",
      version: 0,
      source: "STATIC",
    });
  };

  for (const [key, item] of Object.entries(CLADDING_CATALOG as Record<string, any>)) {
    addManufacturer("PANEL", key, item);
    for (const type of Object.values(item.types ?? {}) as any[]) {
      for (const [modelKey, model] of Object.entries(type.models ?? {})) {
        products.push(staticProduct("WALL_PANEL", key, modelKey, model, "NONE"));
      }
    }
  }

  for (const [key, item] of Object.entries(ROOF_CLADDING_CATALOG as Record<string, any>)) {
    addManufacturer("PANEL", key, item);
    for (const [modelKey, model] of Object.entries(item.models ?? {})) {
      products.push(staticProduct("ROOF_PANEL", key, modelKey, model, "NONE"));
    }
  }

  for (const [key, item] of Object.entries(GATE_MANUFACTURERS as Record<string, any>)) {
    addManufacturer("GATE", key, item);
    for (const [typeKey, type] of Object.entries(item.types ?? {}) as [string, any][]) {
      for (const [modelKey, model] of Object.entries(type.models ?? {})) {
        products.push(staticProduct("GATE", key, modelKey, model, ANIMATION_BY_GATE_TYPE[typeKey] ?? "NONE"));
      }
    }
  }

  return { manufacturers: [...manufacturers.values()], products };
}

function fromDatabaseManufacturer(item: any): AdminManufacturer {
  return {
    _id: String(item._id),
    kind: item.kind,
    key: item.key,
    name: item.name,
    tagline: item.tagline ?? "",
    description: item.description ?? "",
    logoUrl: item.logoUrl ?? "",
    websiteUrl: item.websiteUrl ?? "",
    status: item.status,
    version: Number(item.version || 1),
    source: "DB",
  };
}

function fromDatabaseProduct(item: any): AdminProduct {
  return {
    _id: String(item._id),
    kind: item.kind,
    manufacturerKey: item.manufacturerKey,
    key: item.key,
    name: item.name,
    thicknessMm: item.thicknessMm ?? [],
    colorIds: item.colorIds ?? [],
    profile: item.profile ?? "",
    animationProfile: item.animationProfile ?? "NONE",
    specs: item.specs ?? null,
    status: item.status,
    version: Number(item.version || 1),
    source: "DB",
  };
}

/**
 * Lista dla panelu: dokument z bazy zawsze wygrywa z pozycją bazową o tym samym
 * kluczu — inaczej edycja wyglądałaby na cofniętą.
 */
export function mergeAdminCatalog(dbManufacturers: any[], dbProducts: any[]) {
  const base = staticCatalogEntries();

  const manufacturers = new Map<string, AdminManufacturer>();
  for (const item of base.manufacturers) manufacturers.set(`${item.kind}:${item.key}`, item);
  for (const item of dbManufacturers) {
    const mapped = fromDatabaseManufacturer(item);
    manufacturers.set(`${mapped.kind}:${mapped.key}`, mapped);
  }

  const products = new Map<string, AdminProduct>();
  for (const item of base.products) products.set(`${item.kind}:${item.manufacturerKey}:${item.key}`, item);
  for (const item of dbProducts) {
    const mapped = fromDatabaseProduct(item);
    products.set(`${mapped.kind}:${mapped.manufacturerKey}:${mapped.key}`, mapped);
  }

  return {
    manufacturers: [...manufacturers.values()].sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name)),
    products: [...products.values()].sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name)),
  };
}
