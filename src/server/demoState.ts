import type {
  CompanyConfiguratorSettings,
  CompanyPrivacyProfile,
  ConfiguratorBootstrap,
} from "@/types/saas";
import { normalizePriceList } from "@/domain/pricing/priceList";

type DemoBranding = ConfiguratorBootstrap["company"]["branding"];

export type DemoState = {
  branding?: DemoBranding;
  privacyProfile?: CompanyPrivacyProfile;
  settings?: CompanyConfiguratorSettings;
};

type DemoStorage = {
  draft?: DemoState;
  published?: DemoState;
};

const demoGlobal = globalThis as typeof globalThis & {
  __warstwoweDemoState?: DemoStorage | DemoState;
  __warstwoweDemoPriceList?: DemoPriceListStorage;
};

const DEMO_RATES = normalizePriceList({
  vatRatePercent: 23,
  panels: {
    wall: { defaultPerM2: 155, wastePercent: 8 },
    roof: { defaultPerM2: 185, wastePercent: 6 },
  },
  frontProjection: { liningPerM2: 220 },
  steel: { profilePerKg: 12.5, platePerKg: 14, anchorPerUnit: 10, fixingsPerKg: 18 },
  flashings: { defaultPerMeter: 38 },
  gutters: {
    gutterPerMeter: 65,
    downspoutPerMeter: 58,
    bracketPerUnit: 13,
    clampPerUnit: 9,
    leafGuardPerMeter: 22,
  },
  openings: {
    gate: { default: { pricePerUnit: 3200, baseWidthM: 2.5, widthStepPrice: 650 } },
    door: { default: { pricePerUnit: 1350 } },
    window: { default: { pricePerUnit: 850 } },
    roofWindow: { default: { pricePerUnit: 1650 } },
  },
  lighting: {
    interiorLighting: 950,
    roofPerimeterLed: 1450,
    gateLamps: 420,
    exteriorSconces: 620,
    frontProjectionLed: 850,
  },
  labour: { perM2BuildingArea: 125, percentOfMaterials: 0 },
  extras: [],
  marginPercent: 12,
  delivery: { flat: 900, perKm: 0 },
  rounding: "TO_10",
});

type DemoPriceListStorage = {
  version: number;
  publishedVersion: number;
  published: boolean;
  showToCustomer: boolean;
  currency: string;
  draft: Record<string, unknown>;
  publishedRates: Record<string, unknown>;
};

function initialDemoPriceList(): DemoPriceListStorage {
  return {
    version: 1,
    publishedVersion: 1,
    published: true,
    showToCustomer: true,
    currency: "PLN",
    draft: DEMO_RATES,
    publishedRates: DEMO_RATES,
  };
}

export function getDemoPriceListEditorState() {
  const state = demoGlobal.__warstwoweDemoPriceList ?? initialDemoPriceList();
  return {
    version: state.version,
    publishedVersion: state.publishedVersion,
    published: state.published,
    showToCustomer: state.showToCustomer,
    currency: state.currency,
    draft: structuredClone(state.draft),
  };
}

export function getDemoPublishedPriceList() {
  const state = demoGlobal.__warstwoweDemoPriceList ?? initialDemoPriceList();
  return {
    version: state.publishedVersion,
    currency: state.currency,
    showToCustomer: state.showToCustomer,
    rates: structuredClone(state.publishedRates),
  };
}

export function saveDemoPriceList(input: {
  rates: unknown;
  showToCustomer: boolean;
  publish: boolean;
}) {
  const current = demoGlobal.__warstwoweDemoPriceList ?? initialDemoPriceList();
  const version = current.version + 1;
  const draft = normalizePriceList(input.rates) as unknown as Record<string, unknown>;
  const next: DemoPriceListStorage = {
    ...current,
    version,
    draft,
    showToCustomer: input.showToCustomer,
    ...(input.publish ? {
      published: true,
      publishedVersion: version,
      publishedRates: draft,
    } : {}),
  };
  demoGlobal.__warstwoweDemoPriceList = next;
  return getDemoPriceListEditorState();
}

export function getDemoState(): DemoState {
  const state = demoGlobal.__warstwoweDemoState;
  if (!state) return {};
  if ("published" in state || "draft" in state) return (state as DemoStorage).published ?? {};
  return state as DemoState;
}

export function getDemoDraftState(): DemoState {
  const state = demoGlobal.__warstwoweDemoState;
  if (!state) return {};
  if ("published" in state || "draft" in state) {
    const storage = state as DemoStorage;
    return storage.draft ?? storage.published ?? {};
  }
  return state as DemoState;
}

export function saveDemoState(input: {
  branding?: DemoBranding;
  privacyProfile?: CompanyPrivacyProfile;
  settings: Omit<CompanyConfiguratorSettings, "published"> & { published?: boolean };
  publish: boolean;
}): DemoState {
  const current = getDemoDraftState();
  const nextVersion = Math.max(1, Number(current.settings?.version || input.settings.version || 1)) + 1;
  const next: DemoState = {
    branding: input.branding ?? current.branding,
    privacyProfile: input.privacyProfile ?? current.privacyProfile,
    settings: {
      ...input.settings,
      version: nextVersion,
      published: input.publish || Boolean(input.settings.published) || Boolean(current.settings?.published),
    },
  };

  const published = getDemoState();
  demoGlobal.__warstwoweDemoState = {
    draft: next,
    published: input.publish ? next : published,
  };
  return next;
}
