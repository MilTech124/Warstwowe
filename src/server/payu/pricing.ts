import type { PackageCode } from "@/types/saas";

type PricingEnvironment = Pick<NodeJS.ProcessEnv, "PAYU_TEST_PRICING" | "PAYU_TEST_DIAMOND_AMOUNT_GROSS">;

export type PayUChargePrice = {
  catalogAmountGross: number;
  chargedAmountGross: number;
  testOverride: boolean;
};

export function resolvePayUChargePrice(
  packageCode: PackageCode,
  catalogAmountGross: number,
  environment: PricingEnvironment = process.env,
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
