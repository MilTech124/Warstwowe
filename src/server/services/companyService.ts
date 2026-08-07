import {
  CLADDING_CATALOG,
  DOOR_MODELS,
  GATE_MANUFACTURERS,
  GATE_TYPES,
  PRESETS,
  ROOF_CLADDING_CATALOG,
  ROOF_TYPES,
  WINDOW_MODELS,
} from "@/config/catalog";
import { FINISH_PRESETS } from "@/config/materialFinishes";
import {
  DEMO_PRIVACY_PROFILE,
  emptyPrivacyProfile,
  isCompletePrivacyProfile,
} from "@/config/legal";
import { PACKAGE_DEFINITIONS } from "@/domain/plans";
import { resolveEntitlements } from "@/domain/entitlements";
import { getPublishedPriceList } from "@/server/services/priceListService";
import { connectMongo } from "@/server/db/connection";
import { getDemoDraftState, getDemoPublishedPriceList, getDemoState } from "@/server/demoState";
import {
  CatalogManufacturer,
  CatalogProduct,
  Company,
  CompanyMembership,
  CompanySettings,
  FeatureOverride,
  MaterialFinish,
  Plan,
  Preset,
  Subscription,
} from "@/server/db/models";
import type {
  CompanyPrivacyProfile,
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
  publicAccessLimitEnabled: false,
  publicAccessLimitMinutes: 60,
  publicAccessCodeConfigured: false,
  orderActionLabel: "inquiry",
  defaultPresetId: "single_garage",
  allowedPresetIds: Object.keys(PRESETS),
  allowedRoofTypeIds: Object.keys(ROOF_TYPES),
  allowedOpeningKinds: ["gate", "door", "window", "roofWindow"],
  allowedWallColorIds: [],
  allowedRoofColorIds: [],
  allowedPanelManufacturerIds: [...new Set([
    ...Object.keys(CLADDING_CATALOG),
    ...Object.keys(ROOF_CLADDING_CATALOG),
  ])],
  allowedGateManufacturerIds: Object.keys(GATE_MANUFACTURERS),
  allowedWallPanelModelIds: [...new Set(Object.values(CLADDING_CATALOG as Record<string, any>).flatMap((manufacturer: any) =>
    Object.values(manufacturer.types || {}).flatMap((type: any) => Object.keys(type.models || {})),
  ))],
  allowedRoofPanelModelIds: [...new Set(Object.values(ROOF_CLADDING_CATALOG as Record<string, any>).flatMap((manufacturer: any) =>
    Object.keys(manufacturer.models || {}),
  ))],
  allowedGateTypeIds: Object.keys(GATE_TYPES),
  allowedGateModelIds: [...new Set(Object.values(GATE_MANUFACTURERS as Record<string, any>).flatMap((manufacturer: any) =>
    Object.values(manufacturer.types || {}).flatMap((type: any) => Object.keys(type.models || {})),
  ))],
  allowedDoorModelIds: Object.keys(DOOR_MODELS),
  allowedWindowModelIds: Object.keys(WINDOW_MODELS),
  disabledFeatures: [],
  orderNotificationEmails: [],
};

/**
 * Produkty producenta w kształcie, jakiego oczekuje `catalogPresentation`:
 * ten sam zestaw pól niezależnie od tego, czy dane pochodzą z konfiguracji
 * statycznej, czy z kolekcji `CatalogProduct`.
 */
function staticProducts(manufacturer: any, kind: string) {
  const models: Record<string, any> = manufacturer?.models
    ? manufacturer.models
    : Object.values(manufacturer?.types ?? {}).reduce(
        (all: Record<string, any>, type: any) => ({ ...all, ...(type.models ?? {}) }),
        {},
      );

  return Object.entries(models).map(([key, model]: [string, any]) => ({
    kind,
    key,
    name: model.label,
    thicknessMm: model.thicknessMm ?? [],
    specs: model.specs ?? null,
  }));
}

function staticManufacturerEntry(key: string, item: any, kind: string, products: any[]) {
  return {
    key,
    name: item.label,
    logoUrl: item.logoUrl ?? "",
    websiteUrl: item.websiteUrl ?? "",
    tagline: item.tagline ?? "",
    description: item.description ?? "",
    kind,
    products,
    status: "PUBLISHED",
  };
}

function staticPanelManufacturers() {
  const merged = new Map<string, any>();

  for (const [key, item] of Object.entries(CLADDING_CATALOG as Record<string, any>)) {
    merged.set(key, staticManufacturerEntry(key, item, "PANEL", staticProducts(item, "WALL_PANEL")));
  }
  // „steelprofil" dostarcza i płyty ścienne, i dachowe — jeden producent,
  // dwie listy produktów, więc scalamy zamiast nadpisywać.
  for (const [key, item] of Object.entries(ROOF_CLADDING_CATALOG as Record<string, any>)) {
    const roofProducts = staticProducts(item, "ROOF_PANEL");
    const existing = merged.get(key);
    if (existing) existing.products = [...existing.products, ...roofProducts];
    else merged.set(key, staticManufacturerEntry(key, item, "PANEL", roofProducts));
  }

  return [...merged.values()];
}

function staticCatalog(): PublicCatalog {
  return {
    version: 1,
    panelManufacturers: staticPanelManufacturers(),
    gateManufacturers: Object.entries(GATE_MANUFACTURERS as Record<string, any>).map(([key, item]) =>
      staticManufacturerEntry(key, item, "GATE", staticProducts(item, "GATE")),
    ),
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
    roofTypes: Object.entries(ROOF_TYPES as Record<string, string>).map(([key, name]) => ({ key, name })),
    openingKinds: [
      { key: "gate", name: "Bramy" },
      { key: "door", name: "Drzwi" },
      { key: "window", name: "Okna ścienne" },
      { key: "roofWindow", name: "Okna dachowe" },
    ],
    wallPanelModels: [...new Map(Object.values(CLADDING_CATALOG as Record<string, any>).flatMap((manufacturer: any) =>
      Object.values(manufacturer.types || {}).flatMap((type: any) =>
        Object.entries(type.models || {}).map(([key, model]: [string, any]) => [key, { key, name: model.label }]),
      ),
    )).values()],
    roofPanelModels: [...new Map(Object.values(ROOF_CLADDING_CATALOG as Record<string, any>).flatMap((manufacturer: any) =>
      Object.entries(manufacturer.models || {}).map(([key, model]: [string, any]) => [key, { key, name: model.label }]),
    )).values()],
    gateTypes: Object.entries(GATE_TYPES as Record<string, string>).map(([key, name]) => ({ key, name })),
    gateModels: Object.entries(GATE_MANUFACTURERS as Record<string, any>).flatMap(([manufacturerKey, manufacturer]: [string, any]) =>
      Object.entries(manufacturer.types || {}).flatMap(([typeKey, type]: [string, any]) =>
        Object.entries(type.models || {}).map(([key, model]: [string, any]) => ({
          key,
          name: model.label,
          manufacturerKey,
          typeKey,
        })),
      ),
    ),
    doorModels: Object.entries(DOOR_MODELS as Record<string, any>).map(([key, model]) => ({ key, name: model.label })),
    windowModels: Object.entries(WINDOW_MODELS as Record<string, any>).map(([key, model]) => ({
      key,
      name: model.label,
      placement: model.placement,
    })),
  };
}

export const DEMO_COMPANY_ID = "demo-company";

export function demoBootstrap(): ConfiguratorBootstrap {
  const plan = PACKAGE_DEFINITIONS.DIAMOND;
  const demoState = getDemoState();
  const priceList = getDemoPublishedPriceList();
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
        ...demoState.branding,
      },
      privacyProfile: demoState.privacyProfile || DEMO_PRIVACY_PROFILE,
    },
    packageCode: "DIAMOND",
    accessActive: true,
    capabilities: { ...plan.features },
    availableCapabilities: { ...plan.features },
    seatLimit: plan.seatLimit,
    settings: { ...DEFAULT_SETTINGS, ...demoState.settings },
    catalog: staticCatalog(),
    priceList: priceList.showToCustomer
      ? { version: priceList.version, currency: priceList.currency, rates: priceList.rates }
      : null,
  };
}

function publicPrivacyProfile(
  value: unknown,
  fallbackVersion = 1,
): CompanyPrivacyProfile | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const profile = emptyPrivacyProfile({
    controllerName: String(source.controllerName || ""),
    address: String(source.address || ""),
    taxId: String(source.taxId || ""),
    privacyEmail: String(source.privacyEmail || ""),
    privacyPhone: source.privacyPhone ? String(source.privacyPhone) : null,
    noticeVersion: Number(source.noticeVersion || fallbackVersion || 1),
  });
  return isCompletePrivacyProfile(profile) ? profile : null;
}

function settingsFromDocument(document: Record<string, unknown> | null): CompanyConfiguratorSettings {
  if (!document) return { ...DEFAULT_SETTINGS, published: false };
  return {
    version: Number(document.publishedVersion || document.version || 1),
    published: Boolean(document.published),
    manuallyEnabled: document.manuallyEnabled !== false,
    publicAccessLimitEnabled: document.publicAccessLimitEnabled === true,
    publicAccessLimitMinutes: Math.min(240, Math.max(15, Number(document.publicAccessLimitMinutes || 60))),
    publicAccessCodeConfigured: Boolean(document.publicAccessCodeHash),
    orderActionLabel: document.orderActionLabel === "order" ? "order" : "inquiry",
    defaultPresetId: String(document.defaultPresetId || "single_garage"),
    allowedPresetIds: Array.isArray(document.allowedPresetIds) ? document.allowedPresetIds.map(String) : [],
    allowedRoofTypeIds: Array.isArray(document.allowedRoofTypeIds) && document.allowedRoofTypeIds.length
      ? document.allowedRoofTypeIds.map(String)
      : [...DEFAULT_SETTINGS.allowedRoofTypeIds],
    allowedOpeningKinds: Array.isArray(document.allowedOpeningKinds) && document.allowedOpeningKinds.length
      ? document.allowedOpeningKinds.map(String)
      : [...DEFAULT_SETTINGS.allowedOpeningKinds],
    allowedWallColorIds: Array.isArray(document.allowedWallColorIds) ? document.allowedWallColorIds.map(String) : [],
    allowedRoofColorIds: Array.isArray(document.allowedRoofColorIds) ? document.allowedRoofColorIds.map(String) : [],
    allowedPanelManufacturerIds: Array.isArray(document.allowedPanelManufacturerIds)
      ? document.allowedPanelManufacturerIds.map(String)
      : [],
    allowedGateManufacturerIds: Array.isArray(document.allowedGateManufacturerIds)
      ? document.allowedGateManufacturerIds.map(String)
      : [],
    allowedWallPanelModelIds: Array.isArray(document.allowedWallPanelModelIds) && document.allowedWallPanelModelIds.length
      ? document.allowedWallPanelModelIds.map(String)
      : [...DEFAULT_SETTINGS.allowedWallPanelModelIds],
    allowedRoofPanelModelIds: Array.isArray(document.allowedRoofPanelModelIds) && document.allowedRoofPanelModelIds.length
      ? document.allowedRoofPanelModelIds.map(String)
      : [...DEFAULT_SETTINGS.allowedRoofPanelModelIds],
    allowedGateTypeIds: Array.isArray(document.allowedGateTypeIds) && document.allowedGateTypeIds.length
      ? document.allowedGateTypeIds.map(String)
      : [...DEFAULT_SETTINGS.allowedGateTypeIds],
    allowedGateModelIds: Array.isArray(document.allowedGateModelIds) && document.allowedGateModelIds.length
      ? document.allowedGateModelIds.map(String)
      : [...DEFAULT_SETTINGS.allowedGateModelIds],
    allowedDoorModelIds: Array.isArray(document.allowedDoorModelIds) && document.allowedDoorModelIds.length
      ? document.allowedDoorModelIds.map(String)
      : [...DEFAULT_SETTINGS.allowedDoorModelIds],
    allowedWindowModelIds: Array.isArray(document.allowedWindowModelIds) && document.allowedWindowModelIds.length
      ? document.allowedWindowModelIds.map(String)
      : [...DEFAULT_SETTINGS.allowedWindowModelIds],
    disabledFeatures: Array.isArray(document.disabledFeatures)
      ? (document.disabledFeatures as FeatureKey[])
      : [],
    orderNotificationEmails: Array.isArray(document.orderNotificationEmails)
      ? document.orderNotificationEmails.map(String)
      : [],
  };
}

/**
 * Producent z bazy razem z jego produktami. Logo, opis marki i parametry
 * techniczne muszą dojechać do klienta — to za ich ekspozycję płaci producent.
 */
function publicManufacturer(item: any, products: any[]) {
  return {
    key: item.key,
    name: item.name,
    logoUrl: item.logoUrl ?? "",
    websiteUrl: item.websiteUrl ?? "",
    tagline: item.tagline ?? "",
    description: item.description ?? "",
    kind: item.kind,
    products: products
      .filter((product: any) => product.manufacturerKey === item.key)
      .map((product: any) => ({
        kind: product.kind,
        key: product.key,
        name: product.name,
        thicknessMm: product.thicknessMm ?? [],
        lengthOptionsM: product.lengthOptionsM ?? [],
        colorIds: product.colorIds ?? [],
        profile: product.profile ?? "",
        specs: product.specs ?? null,
      })),
  };
}

async function dynamicCatalog(): Promise<PublicCatalog> {
  const configuratorOptions = staticCatalog();
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
      .map((item: any) => publicManufacturer(item, products)),
    gateManufacturers: manufacturers
      .filter((item: any) => item.kind === "GATE")
      .map((item: any) => publicManufacturer(item, products)),
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
    roofTypes: configuratorOptions.roofTypes,
    openingKinds: configuratorOptions.openingKinds,
    wallPanelModels: configuratorOptions.wallPanelModels,
    roofPanelModels: configuratorOptions.roofPanelModels,
    gateTypes: configuratorOptions.gateTypes,
    gateModels: configuratorOptions.gateModels,
    doorModels: configuratorOptions.doorModels,
    windowModels: configuratorOptions.windowModels,
  };
}

/**
 * The synthetic `/demo` tenant is available in production only after an
 * explicit opt-in. Development without MongoDB keeps the convenient fallback,
 * but a production deployment never enables demo implicitly.
 */
export function demoModeEnabled() {
  return process.env.DEMO_MODE === "true"
    || (process.env.NODE_ENV !== "production" && !process.env.MONGODB_URI);
}

export async function findCompanyBySlug(slug: string) {
  if (slug === "demo" && demoModeEnabled()) {
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

export async function findCompanyForUser(clerkUserId: string) {
  try {
    if (!(await connectMongo())) return null;
    const ownedCompany = await Company.findOne({ ownerClerkUserId: clerkUserId }).lean();
    if (ownedCompany) return ownedCompany;

    const membership: any = await CompanyMembership.findOne({
      clerkUserId,
      status: "ACTIVE",
    }).lean();
    if (!membership) return null;
    return Company.findById(membership.companyId).lean();
  } catch {
    return null;
  }
}

/**
 * Rejestracja jest ukończona dopiero wtedy, gdy subskrypcja opuściła status
 * ONBOARDING. Do tego momentu właściciel musi móc wrócić na `/onboarding`,
 * żeby poprawić nazwę, adres lub pakiet — inaczej porzucony Checkout Stripe
 * blokuje slug na zawsze, bez drogi powrotnej. Osoba zaproszona do cudzej
 * firmy nie przechodzi rejestracji, więc zawsze jest „ukończona".
 */
export async function findRegistrationForUser(clerkUserId: string) {
  try {
    if (!(await connectMongo())) return null;
    const ownedCompany: any = await Company.findOne({ ownerClerkUserId: clerkUserId }).lean();
    if (ownedCompany) {
      const subscription: any = await Subscription.findOne({ companyId: ownedCompany._id }).lean();
      return {
        company: ownedCompany,
        subscription,
        isOwner: true,
        finished: Boolean(subscription) && subscription.status !== "ONBOARDING",
      };
    }

    const membership: any = await CompanyMembership.findOne({
      clerkUserId,
      status: "ACTIVE",
    }).lean();
    if (!membership) return null;
    const company: any = await Company.findById(membership.companyId).lean();
    if (!company) return null;
    return { company, subscription: null, isOwner: false, finished: true };
  } catch {
    return null;
  }
}

export async function getConfiguratorBootstrap(slug: string): Promise<ConfiguratorBootstrap | null> {
  if (slug === "demo" && demoModeEnabled()) {
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
  const graceEndsAt = (subscription as any)?.graceEndsAt;
  const entitlements = resolveEntitlements({
    packageCode,
    subscriptionStatus: status,
    periodEnd,
    graceEndsAt,
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
  const availableEntitlements = resolveEntitlements({
    packageCode,
    subscriptionStatus: status,
    periodEnd,
    graceEndsAt,
    companySuspended: (company as any).status === "SUSPENDED",
    settings: { manuallyEnabled: true, disabledFeatures: [] },
    overrides: (overrides as any[]).map((item) => ({
      feature: item.feature,
      mode: item.mode,
      expiresAt: item.expiresAt,
    })),
    planFeatures: (planDocument as any)?.features,
    seatLimit: (planDocument as any)?.seatLimit,
  });
  const privacyProfile = publicPrivacyProfile(
    (settingsDocument as any)?.privacyProfile,
    Number((settingsDocument as any)?.publishedVersion || 1),
  );

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
      privacyProfile,
    },
    packageCode,
    accessActive: entitlements.accessActive,
    accessMessage: entitlements.accessActive
      ? undefined
      : status === "PAYMENT_FAILED" || status === "PAST_DUE"
        ? "Płatność za konfigurator nie została potwierdzona."
        : "Konfigurator jest obecnie nieaktywny.",
    capabilities: entitlements.features,
    availableCapabilities: availableEntitlements.features,
    seatLimit: entitlements.seatLimit,
    settings,
    catalog,
    priceList: await customerVisiblePriceList(companyId, entitlements.features.pricing),
  };
}

/**
 * Bramkowanie jest tutaj, a nie w UI: `/api/public/.../bootstrap` jest
 * nieuwierzytelniony, więc stawki nie mogą opuścić serwera, kiedy firma nie
 * zdecydowała się pokazywać cen klientom. Zwracamy null, nie pusty obiekt —
 * sam numer wersji też jest informacją.
 */
async function customerVisiblePriceList(companyId: unknown, pricingEnabled: boolean) {
  if (!pricingEnabled) return null;
  try {
    const priceList = await getPublishedPriceList(companyId);
    if (!priceList || !priceList.showToCustomer) return null;
    return { version: priceList.version, currency: priceList.currency, rates: priceList.rates };
  } catch {
    return null;
  }
}

export async function getCompanySettingsEditorBootstrap(
  slug: string,
): Promise<ConfiguratorBootstrap | null> {
  const publishedBootstrap = await getConfiguratorBootstrap(slug);
  if (!publishedBootstrap) return null;

  if (publishedBootstrap.company.id === DEMO_COMPANY_ID) {
    const draft = getDemoDraftState();
    const draftSettings = { ...publishedBootstrap.settings, ...draft.settings };
    const available = publishedBootstrap.availableCapabilities || publishedBootstrap.capabilities;
    return {
      ...publishedBootstrap,
      company: {
        ...publishedBootstrap.company,
        branding: { ...publishedBootstrap.company.branding, ...draft.branding },
        privacyProfile: draft.privacyProfile
          || publishedBootstrap.company.privacyProfile
          || DEMO_PRIVACY_PROFILE,
      },
      settings: draftSettings,
      accessActive: draftSettings.manuallyEnabled && publishedBootstrap.accessActive,
      capabilities: Object.fromEntries(Object.entries(available).map(([key, enabled]) => [
        key,
        draftSettings.manuallyEnabled && enabled && !draftSettings.disabledFeatures.includes(key as FeatureKey),
      ])) as ConfiguratorBootstrap["capabilities"],
    };
  }

  const document: any = await CompanySettings.findOne({
    companyId: publishedBootstrap.company.id,
  }).select("+publicAccessCodeHash").lean();
  const company: any = await Company.findById(publishedBootstrap.company.id).lean();
  const draft = document?.draft || {};
  const draftSettings = {
    ...publishedBootstrap.settings,
    ...(draft.settings || {}),
    version: Number(document?.version || publishedBootstrap.settings.version),
    published: publishedBootstrap.settings.published,
    publicAccessCodeConfigured: Boolean(document?.publicAccessCodeHash),
  };
  const available = publishedBootstrap.availableCapabilities || publishedBootstrap.capabilities;
  const prefilledPrivacy = emptyPrivacyProfile({
    controllerName: company?.billing?.legalName || company?.displayName || "",
    address: company?.billing?.address || "",
    taxId: company?.billing?.taxId || "",
    privacyEmail: company?.billing?.email || company?.branding?.supportEmail || "",
    privacyPhone: company?.branding?.supportPhone || null,
    noticeVersion: Number(document?.version || 1),
  });
  const draftPrivacy = draft.privacyProfile
    ? emptyPrivacyProfile(draft.privacyProfile)
    : publishedBootstrap.company.privacyProfile || prefilledPrivacy;
  return {
    ...publishedBootstrap,
    company: {
      ...publishedBootstrap.company,
      branding: { ...publishedBootstrap.company.branding, ...(draft.branding || {}) },
      privacyProfile: draftPrivacy,
    },
    settings: draftSettings,
    accessActive: draftSettings.manuallyEnabled && publishedBootstrap.accessActive,
    capabilities: Object.fromEntries(Object.entries(available).map(([key, enabled]) => [
      key,
      draftSettings.manuallyEnabled && enabled && !draftSettings.disabledFeatures.includes(key as FeatureKey),
    ])) as ConfiguratorBootstrap["capabilities"],
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
