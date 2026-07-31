import { PACKAGE_DEFINITIONS } from "@/domain/plans";
import {
  FEATURE_KEYS,
  type CompanyConfiguratorSettings,
  type FeatureKey,
  type FeatureMap,
  type PackageCode,
  type SubscriptionStatus,
} from "@/types/saas";

export interface FeatureOverride {
  feature: FeatureKey;
  mode: "FORCE_ENABLE" | "FORCE_DISABLE";
  expiresAt?: Date | string | null;
}

export interface ResolveEntitlementsInput {
  packageCode: PackageCode;
  subscriptionStatus: SubscriptionStatus;
  periodEnd?: Date | string | null;
  companySuspended?: boolean;
  settings?: Pick<CompanyConfiguratorSettings, "disabledFeatures" | "manuallyEnabled">;
  overrides?: FeatureOverride[];
  planFeatures?: Partial<FeatureMap>;
  seatLimit?: number;
  now?: Date;
}

export function isSubscriptionAccessActive(
  status: SubscriptionStatus,
  periodEnd: Date | string | null | undefined,
  now = new Date(),
) {
  if (status === "TRIALING") return !periodEnd || new Date(periodEnd) > now;
  if (status !== "ACTIVE") return false;
  return !periodEnd || new Date(periodEnd) > now;
}

export function resolveEntitlements(input: ResolveEntitlementsInput) {
  const now = input.now ?? new Date();
  const accessActive =
    !input.companySuspended
    && input.settings?.manuallyEnabled !== false
    && isSubscriptionAccessActive(input.subscriptionStatus, input.periodEnd, now);
  const definition = PACKAGE_DEFINITIONS[input.packageCode];
  const features = { ...definition.features, ...(input.planFeatures ?? {}) };

  for (const override of input.overrides ?? []) {
    if (override.expiresAt && new Date(override.expiresAt) <= now) continue;
    features[override.feature] = override.mode === "FORCE_ENABLE";
  }

  for (const feature of input.settings?.disabledFeatures ?? []) {
    features[feature] = false;
  }

  if (!accessActive) {
    for (const key of FEATURE_KEYS) features[key] = false;
  }

  return {
    accessActive,
    features: features as FeatureMap,
    seatLimit: input.seatLimit ?? definition.seatLimit,
  };
}

export function featureEnabled(features: FeatureMap, key: FeatureKey) {
  return Boolean(features[key]);
}
