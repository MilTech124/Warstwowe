export const PACKAGE_CODES = ["STANDARD", "GOLD", "PLATINUM", "DIAMOND"] as const;
export type PackageCode = (typeof PACKAGE_CODES)[number];

export const BILLING_MODES = [
  "RECURRING_MONTHLY",
  "PREPAID_MONTHLY",
  "PREPAID_SIX_MONTHS",
] as const;
export type BillingMode = (typeof BILLING_MODES)[number];

export const SUBSCRIPTION_STATUSES = [
  "ONBOARDING",
  "TRIALING",
  "ACTIVE",
  "PAST_DUE",
  "PAYMENT_FAILED",
  "EXPIRED",
  "CANCELED",
  "SUSPENDED",
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const COMPANY_ROLES = ["OWNER", "ADMIN", "SALESPERSON"] as const;
export type CompanyRole = (typeof COMPANY_ROLES)[number];

export const ORDER_STATUSES = [
  "NEW",
  "CONTACTED",
  "QUOTED",
  "ACCEPTED",
  "REJECTED",
  "ARCHIVED",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const FEATURE_KEYS = [
  "coreConfigurator",
  "orders",
  "flashings",
  "gutters",
  "catalogCuration",
  "frontProjection",
  "orderAnalytics",
  "csvExport",
  "emailNotifications",
  "structureView",
  "gateAnimations",
  "lighting",
  "orderPdf",
  "pricing",
] as const;
export type FeatureKey = (typeof FEATURE_KEYS)[number];

export type FeatureMap = Record<FeatureKey, boolean>;

export interface CompanyBranding {
  name: string;
  logoUrl?: string | null;
  primaryColor: string;
  accentColor: string;
  supportEmail?: string | null;
  supportPhone?: string | null;
}

export interface CompanyConfiguratorSettings {
  version: number;
  published: boolean;
  manuallyEnabled: boolean;
  defaultPresetId: string;
  allowedPresetIds: string[];
  allowedRoofTypeIds: string[];
  allowedOpeningKinds: string[];
  allowedWallColorIds: string[];
  allowedRoofColorIds: string[];
  allowedPanelManufacturerIds: string[];
  allowedGateManufacturerIds: string[];
  allowedWallPanelModelIds: string[];
  allowedRoofPanelModelIds: string[];
  allowedGateTypeIds: string[];
  allowedGateModelIds: string[];
  allowedDoorModelIds: string[];
  allowedWindowModelIds: string[];
  disabledFeatures: FeatureKey[];
  orderNotificationEmails: string[];
}

export interface PublicCatalog {
  version: number;
  panelManufacturers: Array<Record<string, unknown>>;
  gateManufacturers: Array<Record<string, unknown>>;
  presets: Array<Record<string, unknown>>;
  materialFinishes: Array<Record<string, unknown>>;
  roofTypes: Array<Record<string, unknown>>;
  openingKinds: Array<Record<string, unknown>>;
  wallPanelModels: Array<Record<string, unknown>>;
  roofPanelModels: Array<Record<string, unknown>>;
  gateTypes: Array<Record<string, unknown>>;
  gateModels: Array<Record<string, unknown>>;
  doorModels: Array<Record<string, unknown>>;
  windowModels: Array<Record<string, unknown>>;
}

export interface ConfiguratorBootstrap {
  company: {
    id: string;
    slug: string;
    branding: CompanyBranding;
  };
  packageCode: PackageCode;
  accessActive: boolean;
  accessMessage?: string;
  capabilities: FeatureMap;
  availableCapabilities?: FeatureMap;
  seatLimit: number;
  settings: CompanyConfiguratorSettings;
  catalog: PublicCatalog;
  initialConfiguration?: Record<string, unknown>;
  /**
   * Stawki trafiają tutaj TYLKO gdy firma ma funkcję `pricing` i włączyła
   * pokazywanie cen klientom. Publiczny bootstrap jest nieuwierzytelniony —
   * wysłanie stawek przy ukrytych cenach oddałoby konkurencji strukturę marż.
   */
  priceList?: { version: number; currency: string; rates: Record<string, unknown> } | null;
}

export interface OrderCreateInput {
  customer: {
    name: string;
    address?: string;
    phone: string;
    email: string;
  };
  notes?: string;
  consent: boolean;
  settingsVersion: number;
  configuration: Record<string, unknown> & { schemaVersion: number };
}
