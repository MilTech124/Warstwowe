import type { PackageCode } from "@/types/saas";

export type PayUChargePrice = {
  catalogAmountGross: number;
  chargedAmountGross: number;
  testOverride: boolean;
};

export function resolvePayUChargePrice(
  _packageCode: PackageCode,
  catalogAmountGross: number,
): PayUChargePrice {
  return {
    catalogAmountGross,
    chargedAmountGross: catalogAmountGross,
    testOverride: false,
  };
}

export function payUPriceDescription(label: string, _price: PayUChargePrice) {
  return label;
}
