import type { BillingMode, FeatureMap, PackageCode } from "@/types/saas";

export interface PackageDefinition {
  code: PackageCode;
  name: string;
  monthlyGross: number;
  prepaidSixMonthsGross: number;
  seatLimit: number;
  features: FeatureMap;
  description: string;
}

const coreFeatures = {
  coreConfigurator: true,
  orders: true,
  flashings: true,
  gutters: true,
  catalogCuration: true,
  frontProjection: false,
  orderAnalytics: false,
  csvExport: false,
  emailNotifications: false,
  structureView: false,
  gateAnimations: false,
  lighting: false,
  orderPdf: false,
  pricing: false,
} satisfies FeatureMap;

export const PACKAGE_DEFINITIONS: Record<PackageCode, PackageDefinition> = {
  STANDARD: {
    code: "STANDARD",
    name: "Standard",
    monthlyGross: 500,
    prepaidSixMonthsGross: 2700,
    seatLimit: 1,
    features: { ...coreFeatures },
    description: "Pełny konfigurator sprzedażowy i obsługa zamówień.",
  },
  GOLD: {
    code: "GOLD",
    name: "Gold",
    monthlyGross: 800,
    prepaidSixMonthsGross: 4320,
    seatLimit: 3,
    features: {
      ...coreFeatures,
      frontProjection: true,
      orderAnalytics: true,
      csvExport: true,
      emailNotifications: true,
      pricing: true,
    },
    description: "Wypusty frontowe, cennik z automatyczną wyceną i narzędzia zespołu sprzedaży.",
  },
  PLATINUM: {
    code: "PLATINUM",
    name: "Platinum",
    monthlyGross: 1000,
    prepaidSixMonthsGross: 5400,
    seatLimit: 5,
    features: {
      ...coreFeatures,
      frontProjection: true,
      orderAnalytics: true,
      csvExport: true,
      emailNotifications: true,
      structureView: true,
      pricing: true,
    },
    description: "Widok konstrukcji i dane techniczne obiektu.",
  },
  DIAMOND: {
    code: "DIAMOND",
    name: "Diamond",
    monthlyGross: 1400,
    prepaidSixMonthsGross: 7560,
    seatLimit: 10,
    features: {
      ...coreFeatures,
      frontProjection: true,
      orderAnalytics: true,
      csvExport: true,
      emailNotifications: true,
      structureView: true,
      gateAnimations: true,
      lighting: true,
      orderPdf: true,
      pricing: true,
    },
    description: "Pełna prezentacja 3D, oświetlenie, animacje i dokumenty PDF.",
  },
};

export function packagePriceGross(packageCode: PackageCode, billingMode: BillingMode) {
  const definition = PACKAGE_DEFINITIONS[packageCode];
  return billingMode === "PREPAID_SIX_MONTHS"
    ? definition.prepaidSixMonthsGross
    : definition.monthlyGross;
}

export function packagePriceGrosz(packageCode: PackageCode, billingMode: BillingMode) {
  return packagePriceGross(packageCode, billingMode) * 100;
}

export function billingPeriodMonths(billingMode: BillingMode) {
  return billingMode === "PREPAID_SIX_MONTHS" ? 6 : 1;
}

export function addBillingPeriod(from: Date, billingMode: BillingMode) {
  const result = new Date(from);
  result.setUTCMonth(result.getUTCMonth() + billingPeriodMonths(billingMode));
  return result;
}
