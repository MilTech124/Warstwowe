import assert from "node:assert/strict";
import test from "node:test";
import { companyInvitationClaimFilter, normalizeCompanyEmail } from "../src/domain/companyMembership";
import { resolveEntitlements } from "../src/domain/entitlements";
import { PACKAGE_DEFINITIONS, packagePriceGross } from "../src/domain/plans";
import { orderPdfGenerationAvailable, orderPdfUploadError } from "../src/domain/orderPdf";
import { quoteWithManualPrice } from "../src/domain/pricing/manualPrice";
import { companyWriteIntentAllowed } from "../src/domain/companyWriteIntent";
import { orderCreateSchema } from "../src/server/services/orderService";
import {
  configuratorIpHash,
  hashConfiguratorAccessCode,
  requestPublicIp,
  verifyConfiguratorAccessCode,
} from "../src/server/services/configuratorAccessService";
import { getDemoOrder, updateDemoOrder } from "../src/server/demoOrders";

const activeInput = {
  subscriptionStatus: "ACTIVE" as const,
  periodEnd: "2030-01-01T00:00:00.000Z",
  now: new Date("2026-07-28T00:00:00.000Z"),
};

test("kod publicznego konfiguratora jest haszowany i weryfikowany bez zapisu jawnej wartości", () => {
  const encoded = hashConfiguratorAccessCode("FIRMA-2026");
  assert.equal(encoded.includes("FIRMA-2026"), false);
  assert.equal(verifyConfiguratorAccessCode("FIRMA-2026", encoded), true);
  assert.equal(verifyConfiguratorAccessCode("inny-kod", encoded), false);
});

test("licznik rozdziela firmy, ale łączy zwykłe i incognito po tym samym IP", () => {
  const normal = configuratorIpHash("company-a", "203.0.113.10");
  const incognito = configuratorIpHash("company-a", "203.0.113.10");
  const otherTenant = configuratorIpHash("company-b", "203.0.113.10");
  assert.equal(normal, incognito);
  assert.notEqual(normal, otherTenant);
  assert.equal(normal.includes("203.0.113.10"), false);
});

test("na Vercelu licznik preferuje platformowy nagłówek IP", () => {
  const headers = new Headers({
    "x-vercel-forwarded-for": "203.0.113.10",
    "x-forwarded-for": "198.51.100.22",
  });
  assert.equal(requestPublicIp(headers), "203.0.113.10");
});

test("zaproszenie pracownika jest wiązane z konkretną firmą i zweryfikowanym adresem", () => {
  assert.equal(normalizeCompanyEmail("  Pracownik@Firma.PL "), "pracownik@firma.pl");
  assert.deepEqual(companyInvitationClaimFilter("company-a", " Pracownik@Firma.PL "), {
    companyId: "company-a",
    email: "pracownik@firma.pl",
    status: "INVITED",
    clerkUserId: { $exists: false },
  });
  assert.notDeepEqual(
    companyInvitationClaimFilter("company-a", "pracownik@firma.pl"),
    companyInvitationClaimFilter("company-b", "pracownik@firma.pl"),
  );
});

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

test("cennik jest funkcją pakietu Gold i wyższych", () => {
  assert.equal(resolveEntitlements({ packageCode: "STANDARD", ...activeInput }).features.pricing, false);
  for (const packageCode of ["GOLD", "PLATINUM", "DIAMOND"] as const) {
    assert.equal(
      resolveEntitlements({ packageCode, ...activeInput }).features.pricing,
      true,
      packageCode,
    );
  }
});

test("firma może wyłączyć cennik, a superadmin włączyć go poza pakietem", () => {
  const disabled = resolveEntitlements({
    packageCode: "GOLD",
    ...activeInput,
    settings: { manuallyEnabled: true, disabledFeatures: ["pricing"] },
  });
  assert.equal(disabled.features.pricing, false);

  const forced = resolveEntitlements({
    packageCode: "STANDARD",
    ...activeInput,
    overrides: [{ feature: "pricing", mode: "FORCE_ENABLE" }],
  });
  assert.equal(forced.features.pricing, true);
});

test("generator PDF jest dostępny tylko dla aktywnej firmy z odpowiednią funkcją", () => {
  assert.equal(orderPdfGenerationAvailable({ accessActive: true, capability: true }), true);
  assert.equal(orderPdfGenerationAvailable({ accessActive: false, capability: true }), false);
  assert.equal(orderPdfGenerationAvailable({ accessActive: true, capability: false }), false);
  assert.equal(orderPdfGenerationAvailable({ accessActive: true, capability: true, readOnly: true }), false);
  assert.equal(orderPdfGenerationAvailable({ accessActive: true, capability: true, demo: true }), true);
});

test("ręczna cena zachowuje automatyczną wycenę i dodaje audytowalną korektę", () => {
  const automatic = {
    groups: [],
    totalNet: 10_000,
    vatRatePercent: 23,
    vatAmount: 2_300,
    totalGross: 12_300,
  };
  const adjusted = quoteWithManualPrice(automatic, {
    totalGross: 11_070,
    reason: "Rabat 10%",
  });

  assert.equal(automatic.totalGross, 12_300, "snapshot z cennika nie jest nadpisywany");
  assert.equal(adjusted?.totalGross, 11_070);
  assert.equal(adjusted?.totalNet, 9_000);
  assert.equal(adjusted?.vatAmount, 2_070);
  assert.equal(adjusted?.groups.at(-1)?.id, "manual_price_adjustment");
  assert.equal(adjusted?.groups.at(-1)?.lines[0].label, "Rabat 10%");
});

test("zamówienie demo ma wycenę i zachowuje ręczną korektę w pamięci sesji", () => {
  const before = getDemoOrder("demo-order-1");
  assert.ok(before?.order.quote?.totalGross > 0);

  updateDemoOrder("demo-order-1", {
    manualPrice: { totalGross: 42_000, reason: "Cena demonstracyjna" },
  });
  const after = getDemoOrder("demo-order-1");
  assert.equal(after?.order.manualPrice?.totalGross, 42_000);
  assert.equal(after?.events[0]?.type, "PRICE_ADJUSTED");
});

test("upload PDF odrzuca zły format i plik większy niż 20 MB", () => {
  assert.equal(orderPdfUploadError(null), "Oczekiwano pliku PDF.");
  assert.equal(orderPdfUploadError({ type: "text/plain", size: 100 }), "Oczekiwano pliku PDF.");
  assert.equal(
    orderPdfUploadError({ type: "application/pdf", size: 20 * 1024 * 1024 + 1 }),
    "PDF przekracza limit 20 MB.",
  );
  assert.equal(orderPdfUploadError({ type: "application/pdf", size: 1024 }), null);
});

test("superadmin nie może zapisać PDF bez jawnego trybu zapisu", () => {
  assert.equal(companyWriteIntentAllowed(true, null), false);
  assert.equal(companyWriteIntentAllowed(true, "confirmed"), true);
  assert.equal(companyWriteIntentAllowed(false, null), true);
});

test("wysłanie zamówienia wymaga aktualnego potwierdzenia informacji o danych", () => {
  const input = {
    customer: {
      name: "Jan Kowalski",
      phone: "+48 500 600 700",
      email: "jan@example.com",
    },
    settingsVersion: 1,
    configuration: { schemaVersion: 12 },
  };

  assert.equal(orderCreateSchema.safeParse(input).success, false);
  assert.equal(orderCreateSchema.safeParse({
    ...input,
    privacyNoticeAccepted: true,
    privacyNoticeVersion: 1,
  }).success, true);
});
