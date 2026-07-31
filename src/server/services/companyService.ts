import { CLADDING_CATALOG, GATE_MANUFACTURERS, PRESETS } from "@/config/catalog";
import { FINISH_PRESETS } from "@/config/materialFinishes";
import { PACKAGE_DEFINITIONS } from "@/domain/plans";
import { resolveEntitlements } from "@/domain/entitlements";
import { connectMongo } from "@/server/db/connection";
import {
  CatalogManufacturer,
  CatalogProduct,
  Company,
  CompanySettings,
  FeatureOverride,
  MaterialFinish,
  Plan,
  Preset,
  Subscription,
} from "@/server/db/models";
import type {
  CompanyConfiguratorSettings,
  ConfiguratorBootstrap,
  FeatureKey,
  PackageCode,
  PublicCatalog,
  SubscriptionStatus,
} from "@/types/saas";

const DEFAULT_SETTINGS: CompanyConfiguratorSettings = {
  version: 1,
  published: true,
  manuallyEnabled: true,
  defaultPresetId: "single_garage",
  allowedPresetIds: Object.keys(PRESETS),
  allowedWallColorIds: [],
  allowedRoofColorIds: [],
  allowedPanelManufacturerIds: Object.keys(CLADDING_CATALOG),
  allowedGateManufacturerIds: Object.keys(GATE_MANUFACTURERS),
  disabledFeatures: [],
  orderNotificationEmails: [],
};

function staticCatalog(): PublicCatalog {
  return {
    version: 1,
    panelManufacturers: Object.entries(CLADDING_CATALOG as Record<string, any>).map(([key, item]) => ({
      key,
      name: item.label,
      status: "PUBLISHED",
    })),
    gateManufacturers: Object.entries(GATE_MANUFACTURERS as Record<string, any>).map(([key, item]) => ({
      key,
      name: item.label,
      status: "PUBLISHED",
    })),
    presets: Object.entries(PRESETS as Record<string, any>).map(([key, item]) => ({
      key,
      name: item.label,
      dimensions: item.dimensions,
      dimensionLimits: item.dimensionLimits,
      status: "PUBLISHED",
    })),
    materialFinishes: Object.entries(FINISH_PRESETS as Record<string, any>).map(([key, item]) => ({
      key,
      name: item.label,
      hex: item.hex,
      roles: item.allowedRoles,
      status: "PUBLISHED",
    })),
  };
}

export const DEMO_COMPANY_ID = "demo-company";

export function demoBootstrap(): ConfiguratorBootstrap {
  const plan = PACKAGE_DEFINITIONS.DIAMOND;
  return {
    company: {
      id: DEMO_COMPANY_ID,
      slug: "demo",
      branding: {
        name: "SteelCraft Demo",
        primaryColor: "#0f766e",
        accentColor: "#f59e0b",
        supportEmail: "sprzedaz@example.pl",
        supportPhone: "+48 000 000 000",
      },
    },
    packageCode: "DIAMOND",
    accessActive: true,
    capabilities: { ...plan.features },
    seatLimit: plan.seatLimit,
    settings: { ...DEFAULT_SETTINGS },
    catalog: staticCatalog(),
  };
}

function settingsFromDocument(document: Record<string, unknown> | null): CompanyConfiguratorSettings {
  if (!document) return { ...DEFAULT_SETTINGS, published: false };
  return {
    version: Number(document.publishedVersion || document.version || 1),
    published: Boolean(document.published),
    manuallyEnabled: document.manuallyEnabled !== false,
    defaultPresetId: String(document.defaultPresetId || "single_garage"),
    allowedPresetIds: Array.isArray(document.allowedPresetIds) ? document.allowedPresetIds.map(String) : [],
    allowedWallColorIds: Array.isArray(document.allowedWallColorIds) ? document.allowedWallColorIds.map(String) : [],
    allowedRoofColorIds: Array.isArray(document.allowedRoofColorIds) ? document.allowedRoofColorIds.map(String) : [],
    allowedPanelManufacturerIds: Array.isArray(document.allowedPanelManufacturerIds)
      ? document.allowedPanelManufacturerIds.map(String)
      : [],
    allowedGateManufacturerIds: Array.isArray(document.allowedGateManufacturerIds)
      ? document.allowedGateManufacturerIds.map(String)
      : [],
    disabledFeatures: Array.isArray(document.disabledFeatures)
      ? (document.disabledFeatures as FeatureKey[])
      : [],
    orderNotificationEmails: Array.isArray(document.orderNotificationEmails)
      ? document.orderNotificationEmails.map(String)
      : [],
  };
}

async function dynamicCatalog(): Promise<PublicCatalog> {
  const [manufacturers, products, presets, finishes] = await Promise.all([
    CatalogManufacturer.find({ status: "PUBLISHED" }).lean(),
    CatalogProduct.find({ status: "PUBLISHED" }).lean(),
    Preset.find({ status: "PUBLISHED" }).lean(),
    MaterialFinish.find({ status: "PUBLISHED" }).lean(),
  ]);

  if (!manufacturers.length && !presets.length) return staticCatalog();

  const latestVersion = Math.max(
    1,
    ...manufacturers.map((item: any) => Number(item.version || 1)),
    ...products.map((item: any) => Number(item.version || 1)),
    ...presets.map((item: any) => Number(item.version || 1)),
  );

  return {
    version: latestVersion,
    panelManufacturers: manufacturers
      .filter((item: any) => item.kind === "PANEL")
      .map((item: any) => ({
        key: item.key,
        name: item.name,
        logoUrl: item.logoUrl,
        products: products.filter((product: any) => product.manufacturerKey === item.key),
      })),
    gateManufacturers: manufacturers
      .filter((item: any) => item.kind === "GATE")
      .map((item: any) => ({
        key: item.key,
        name: item.name,
        logoUrl: item.logoUrl,
        products: products.filter((product: any) => product.manufacturerKey === item.key),
      })),
    presets: presets.map((item: any) => ({
      key: item.key,
      name: item.name,
      dimensions: item.dimensions,
      dimensionLimits: item.dimensionLimits,
      defaultConfiguration: item.defaultConfiguration,
    })),
    materialFinishes: finishes.map((item: any) => ({
      key: item.key,
      name: item.name,
      hex: item.hex,
      roles: item.roles,
      maps: item.maps,
    })),
  };
}

export async function findCompanyBySlug(slug: string) {
  if (slug === "demo" && (process.env.DEMO_MODE !== "false" || !process.env.MONGODB_URI)) {
    return {
      _id: DEMO_COMPANY_ID,
      slug: "demo",
      displayName: "SteelCraft Demo",
      code: "DEMO",
      status: "ACTIVE",
      ownerClerkUserId: "demo-owner",
      branding: demoBootstrap().company.branding,
      demo: true,
    };
  }
  try {
    if (!(await connectMongo())) return null;
    return Company.findOne({ slug: slug.toLowerCase() }).lean();
  } catch {
    // Public routes should degrade to not-found instead of returning 500
    // during temporary DNS or Atlas availability problems.
    return null;
  }
}

export async function getConfiguratorBootstrap(slug: string): Promise<ConfiguratorBootstrap | null> {
  if (slug === "demo" && (process.env.DEMO_MODE !== "false" || !process.env.MONGODB_URI)) {
    return demoBootstrap();
  }

  const company = await findCompanyBySlug(slug);
  if (!company || (company as any).demo) return company ? demoBootstrap() : null;

  const companyId = (company as any)._id;
  const [settingsDocument, subscription, overrides, planDocument, catalog] = await Promise.all([
    CompanySettings.findOne({ companyId }).lean(),
    Subscription.findOne({ companyId }).lean(),
    FeatureOverride.find({ companyId }).lean(),
    Subscription.findOne({ companyId })
      .lean()
      .then((sub: any) => (sub ? Plan.findOne({ code: sub.packageCode, active: true }).lean() : null)),
    dynamicCatalog(),
  ]);

  const settings = settingsFromDocument(settingsDocument as any);
  const packageCode = ((subscription as any)?.packageCode || "STANDARD") as PackageCode;
  const status = ((subscription as any)?.status || "ONBOARDING") as SubscriptionStatus;
  const periodEnd = (subscription as any)?.trialEndsAt || (subscription as any)?.currentPeriodEnd;
  const entitlements = resolveEntitlements({
    packageCode,
    subscriptionStatus: status,
    periodEnd,
    companySuspended: (company as any).status === "SUSPENDED",
    settings,
    overrides: (overrides as any[]).map((item) => ({
      feature: item.feature,
      mode: item.mode,
      expiresAt: item.expiresAt,
    })),
    planFeatures: (planDocument as any)?.features,
    seatLimit: (planDocument as any)?.seatLimit,
  });

  return {
    company: {
      id: String(companyId),
      slug: String((company as any).slug),
      branding: {
        name: String((company as any).branding?.name || (company as any).displayName),
        logoUrl: (company as any).branding?.logoUrl || null,
        primaryColor: (company as any).branding?.primaryColor || "#0f766e",
        accentColor: (company as any).branding?.accentColor || "#f59e0b",
        supportEmail: (company as any).branding?.supportEmail || null,
        supportPhone: (company as any).branding?.supportPhone || null,
      },
    },
    packageCode,
    accessActive: entitlements.accessActive,
    accessMessage: entitlements.accessActive
      ? undefined
      : status === "PAYMENT_FAILED"
        ? "Płatność za konfigurator nie została potwierdzona."
        : "Konfigurator jest obecnie nieaktywny.",
    capabilities: entitlements.features,
    seatLimit: entitlements.seatLimit,
    settings,
    catalog,
  };
}

export async function getCompanyAdminSummary(slug: string) {
  const company = await findCompanyBySlug(slug);
  if (!company || (company as any).demo) {
    const bootstrap = company ? demoBootstrap() : null;
    return bootstrap
      ? {
          company,
          bootstrap,
          subscription: {
            status: "ACTIVE",
            packageCode: "DIAMOND",
            billingMode: "RECURRING_MONTHLY",
            currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
          },
        }
      : null;
  }

  const bootstrap = await getConfiguratorBootstrap(slug);
  const subscription = await Subscription.findOne({ companyId: (company as any)._id }).lean();
  return { company, bootstrap, subscription };
}
