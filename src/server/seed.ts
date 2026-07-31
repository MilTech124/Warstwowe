import { CLADDING_CATALOG, GATE_MANUFACTURERS, PRESETS, PRESET_DEFAULTS, ROOF_CLADDING_CATALOG } from "@/config/catalog";
import { FINISH_PRESETS } from "@/config/materialFinishes";
import { PACKAGE_DEFINITIONS } from "@/domain/plans";
import { connectMongo } from "@/server/db/connection";
import {
  CatalogManufacturer,
  CatalogProduct,
  MaterialFinish,
  Plan,
  Preset,
} from "@/server/db/models";

export async function seedSaasCatalog() {
  const connection = await connectMongo();
  if (!connection) return { skipped: true, reason: "MONGODB_URI is not configured" };

  await Promise.all(
    Object.values(PACKAGE_DEFINITIONS).map((definition) =>
      Plan.updateOne(
        { code: definition.code },
        { $setOnInsert: { ...definition, version: 1, active: true } },
        { upsert: true },
      ),
    ),
  );

  for (const [key, preset] of Object.entries(PRESETS as Record<string, any>)) {
    await Preset.updateOne(
      { key },
      {
        $setOnInsert: {
          key,
          name: preset.label,
          status: "PUBLISHED",
          version: 1,
          dimensions: preset.dimensions,
          dimensionLimits: preset.dimensionLimits,
          defaultConfiguration: (PRESET_DEFAULTS as Record<string, unknown>)[key],
        },
      },
      { upsert: true },
    );
  }

  for (const [key, finish] of Object.entries(FINISH_PRESETS as Record<string, any>)) {
    await MaterialFinish.updateOne(
      { key },
      {
        $setOnInsert: {
          key,
          name: finish.label,
          hex: finish.hex,
          roles: finish.allowedRoles,
          maps: finish.maps,
          status: "PUBLISHED",
          metadata: { kind: finish.kind, group: finish.group },
        },
      },
      { upsert: true },
    );
  }

  for (const [key, manufacturer] of Object.entries(CLADDING_CATALOG as Record<string, any>)) {
    await CatalogManufacturer.updateOne(
      { kind: "PANEL", key },
      { $setOnInsert: { kind: "PANEL", key, name: manufacturer.label, status: "PUBLISHED", version: 1 } },
      { upsert: true },
    );
    for (const [typeKey, type] of Object.entries(manufacturer.types) as Array<[string, any]>) {
      for (const [productKey, product] of Object.entries(type.models) as Array<[string, any]>) {
        await CatalogProduct.updateOne(
          { kind: "WALL_PANEL", manufacturerKey: key, key: productKey },
          {
            $setOnInsert: {
              kind: "WALL_PANEL",
              manufacturerKey: key,
              key: productKey,
              name: product.label,
              status: "PUBLISHED",
              version: 1,
              thicknessMm: product.thicknessMm,
              colorIds: Object.keys(product.colors ?? {}),
              profile: product.profile ?? productKey,
              renderKind: "BUILT_IN_PROFILE",
              metadata: { typeKey },
            },
          },
          { upsert: true },
        );
      }
    }
  }

  for (const [key, manufacturer] of Object.entries(ROOF_CLADDING_CATALOG as Record<string, any>)) {
    for (const [productKey, product] of Object.entries(manufacturer.models) as Array<[string, any]>) {
      await CatalogProduct.updateOne(
        { kind: "ROOF_PANEL", manufacturerKey: key, key: productKey },
        {
          $setOnInsert: {
            kind: "ROOF_PANEL",
            manufacturerKey: key,
            key: productKey,
            name: product.label,
            status: "PUBLISHED",
            version: 1,
            thicknessMm: product.thicknessMm,
            colorIds: Object.keys(product.colors ?? {}),
            renderKind: "BUILT_IN_PROFILE",
          },
        },
        { upsert: true },
      );
    }
  }

  for (const [key, manufacturer] of Object.entries(GATE_MANUFACTURERS as Record<string, any>)) {
    await CatalogManufacturer.updateOne(
      { kind: "GATE", key },
      { $setOnInsert: { kind: "GATE", key, name: manufacturer.label, status: "PUBLISHED", version: 1 } },
      { upsert: true },
    );
    for (const [typeKey, type] of Object.entries(manufacturer.types) as Array<[string, any]>) {
      for (const [productKey, product] of Object.entries(type.models) as Array<[string, any]>) {
        await CatalogProduct.updateOne(
          { kind: "GATE", manufacturerKey: key, key: productKey },
          {
            $setOnInsert: {
              kind: "GATE",
              manufacturerKey: key,
              key: productKey,
              name: product.label,
              status: "PUBLISHED",
              version: 1,
              colorIds: Object.keys(product.colors ?? {}),
              animationProfile:
                typeKey === "sectional" ? "SECTIONAL" : typeKey === "roller" ? "ROLLER" : "TILTING",
              renderKind: "PARAMETRIC",
              metadata: { typeKey },
            },
          },
          { upsert: true },
        );
      }
    }
  }

  return { skipped: false };
}
