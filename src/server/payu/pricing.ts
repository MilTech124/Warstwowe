import type { PackageCode } from "@/types/saas";

type PricingEnvironment = {
  PAYU_TEST_PRICING?: string;
  PAYU_TEST_DIAMOND_AMOUNT_GROSS?: string;
};

export type PayUChargePrice = {
  catalogAmountGross: number;
  chargedAmountGross: number;
  testOverride: boolean;
};

export function resolvePayUChargePrice(
  packageCode: PackageCode,
  catalogAmountGross: number,
  environment: PricingEnvironment = {
    PAYU_TEST_PRICING: process.env.PAYU_TEST_PRICING,
    PAYU_TEST_DIAMOND_AMOUNT_GROSS: process.env.PAYU_TEST_DIAMOND_AMOUNT_GROSS,
  },
): PayUChargePrice {
  const requestedAmount = Number(environment.PAYU_TEST_DIAMOND_AMOUNT_GROSS);
  const testAmountIsValid = Number.isInteger(requestedAmount)
    && requestedAmount > 0
    && requestedAmount < catalogAmountGross;
  const testOverride = environment.PAYU_TEST_PRICING === "true"
    && packageCode === "DIAMOND"
    && testAmountIsValid;

  return {
    catalogAmountGross,
    chargedAmountGross: testOverride ? requestedAmount : catalogAmountGross,
    testOverride,
  };
}

export function payUPriceDescription(label: string, price: PayUChargePrice) {
  return price.testOverride
    ? `[TEST ${price.chargedAmountGross} PLN] ${label}`
    : label;
}
