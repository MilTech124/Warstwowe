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
  allowedWallColorIds: string[];
  allowedRoofColorIds: string[];
  allowedPanelManufacturerIds: string[];
  allowedGateManufacturerIds: string[];
  disabledFeatures: FeatureKey[];
  orderNotificationEmails: string[];
}

export interface PublicCatalog {
  version: number;
  panelManufacturers: Array<Record<string, unknown>>;
  gateManufacturers: Array<Record<string, unknown>>;
  presets: Array<Record<string, unknown>>;
  materialFinishes: Array<Record<string, unknown>>;
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
  seatLimit: number;
  settings: CompanyConfiguratorSettings;
  catalog: PublicCatalog;
  initialConfiguration?: Record<string, unknown>;
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
