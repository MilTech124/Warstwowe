import assert from "node:assert/strict";
import test from "node:test";
import { resolveEntitlements } from "../src/domain/entitlements";
import { PACKAGE_DEFINITIONS, packagePriceGross } from "../src/domain/plans";

const activeInput = {
  subscriptionStatus: "ACTIVE" as const,
  periodEnd: "2030-01-01T00:00:00.000Z",
  now: new Date("2026-07-28T00:00:00.000Z"),
};

test("pakiety mają uzgodnione ceny brutto i rabat 10% za sześć miesięcy", () => {
  assert.deepEqual(
    Object.fromEntries(Object.entries(PACKAGE_DEFINITIONS).map(([code, plan]) => [
      code,
      [plan.monthlyGross, plan.prepaidSixMonthsGross],
    ])),
    {
      STANDARD: [500, 2700],
      GOLD: [800, 4320],
      PLATINUM: [1000, 5400],
      DIAMOND: [1400, 7560],
    },
  );
  assert.equal(packagePriceGross("DIAMOND", "PREPAID_SIX_MONTHS"), 7560);
});

test("Standard nie dostaje funkcji Gold, Platinum ani Diamond", () => {
  const result = resolveEntitlements({ packageCode: "STANDARD", ...activeInput });
  assert.equal(result.features.coreConfigurator, true);
  assert.equal(result.features.frontProjection, false);
  assert.equal(result.features.structureView, false);
  assert.equal(result.features.gateAnimations, false);
  assert.equal(result.features.lighting, false);
  assert.equal(result.features.orderPdf, false);
  assert.equal(result.seatLimit, 1);
});

test("Gold, Platinum i Diamond rozszerzają funkcje zgodnie z macierzą", () => {
  const gold = resolveEntitlements({ packageCode: "GOLD", ...activeInput });
  const platinum = resolveEntitlements({ packageCode: "PLATINUM", ...activeInput });
  const diamond = resolveEntitlements({ packageCode: "DIAMOND", ...activeInput });

  assert.equal(gold.features.frontProjection, true);
  assert.equal(gold.features.structureView, false);
  assert.equal(platinum.features.structureView, true);
  assert.equal(platinum.features.gateAnimations, false);
  assert.equal(diamond.features.gateAnimations, true);
  assert.equal(diamond.features.lighting, true);
  assert.equal(diamond.features.orderPdf, true);
  assert.deepEqual([gold.seatLimit, platinum.seatLimit, diamond.seatLimit], [3, 5, 10]);
});

test("nadpisanie superadmina działa do daty, a firma może tylko zawęzić dostęp", () => {
  const activeOverride = resolveEntitlements({
    packageCode: "STANDARD",
    ...activeInput,
    overrides: [{
      feature: "structureView",
      mode: "FORCE_ENABLE",
      expiresAt: "2027-01-01T00:00:00.000Z",
    }],
    settings: { manuallyEnabled: true, disabledFeatures: ["orders"] },
  });
  assert.equal(activeOverride.features.structureView, true);
  assert.equal(activeOverride.features.orders, false);

  const expiredOverride = resolveEntitlements({
    packageCode: "STANDARD",
    ...activeInput,
    overrides: [{
      feature: "structureView",
      mode: "FORCE_ENABLE",
      expiresAt: "2026-01-01T00:00:00.000Z",
    }],
  });
  assert.equal(expiredOverride.features.structureView, false);
});

test("nieudana płatność, koniec okresu lub zawieszenie zerują wszystkie funkcje", () => {
  for (const input of [
    { packageCode: "DIAMOND" as const, subscriptionStatus: "PAYMENT_FAILED" as const },
    { packageCode: "DIAMOND" as const, ...activeInput, periodEnd: "2026-07-27T00:00:00.000Z" },
    { packageCode: "DIAMOND" as const, ...activeInput, companySuspended: true },
  ]) {
    const result = resolveEntitlements(input);
    assert.equal(result.accessActive, false);
    assert.equal(Object.values(result.features).some(Boolean), false);
  }
});
