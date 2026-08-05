import assert from "node:assert/strict";
import test from "node:test";
import Stripe from "stripe";
import {
  DUNNING_GRACE_DAYS,
  DUNNING_RETRY_DELAYS_HOURS,
  MAX_DUNNING_ATTEMPTS,
  applyDunningFailure,
} from "../src/domain/dunning";
import { isSubscriptionAccessActive } from "../src/domain/entitlements";
import { mapStripeSubscriptionStatus, verifyStripeAmount } from "../src/domain/stripeStatus";
import { constructStripeEvent } from "../src/server/stripe/client";
import { companySlugSchema, onboardingSchema } from "../src/domain/company";
import { apiError } from "../src/server/apiError";

const NOW = new Date("2026-08-03T12:00:00.000Z");
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

test("webhook Stripe akceptuje poprawny podpis i odrzuca zmienione body", () => {
  const previousKey = process.env.STRIPE_SECRET_KEY;
  const previousSecret = process.env.STRIPE_WEBHOOK_SECRET;
  process.env.STRIPE_SECRET_KEY = "sk_test_123456789";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";
  try {
    const body = JSON.stringify({
      id: "evt_test",
      object: "event",
      type: "checkout.session.completed",
      data: { object: { id: "cs_test", object: "checkout.session" } },
    });
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const header = stripe.webhooks.generateTestHeaderString({
      payload: body,
      secret: process.env.STRIPE_WEBHOOK_SECRET,
    });
    assert.equal(constructStripeEvent(body, header).id, "evt_test");
    assert.throws(() => constructStripeEvent(`${body} `, header));
  } finally {
    if (previousKey === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = previousKey;
    if (previousSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = previousSecret;
  }
});

test("statusy Stripe mapują się na statusy dostępu aplikacji", () => {
  assert.equal(mapStripeSubscriptionStatus("trialing"), "TRIALING");
  assert.equal(mapStripeSubscriptionStatus("active"), "ACTIVE");
  assert.equal(mapStripeSubscriptionStatus("past_due"), "PAST_DUE");
  assert.equal(mapStripeSubscriptionStatus("unpaid"), "PAYMENT_FAILED");
  assert.equal(mapStripeSubscriptionStatus("incomplete_expired"), "PAYMENT_FAILED");
  assert.equal(mapStripeSubscriptionStatus("canceled"), "CANCELED");
  assert.equal(mapStripeSubscriptionStatus("paused"), "SUSPENDED");
  assert.equal(mapStripeSubscriptionStatus("incomplete"), "ONBOARDING");
});

test("rozliczenie Stripe wymaga zgodnej kwoty brutto i waluty PLN", () => {
  assert.deepEqual(
    verifyStripeAmount({ expectedGross: 1400, receivedMinor: 140000, currency: "pln" }),
    { ok: true },
  );
  const mismatch = verifyStripeAmount({ expectedGross: 1400, receivedMinor: 100, currency: "pln" });
  assert.equal(mismatch.ok, false);
  assert.equal(mismatch.ok === false && mismatch.reason, "AMOUNT_MISMATCH");
  const currency = verifyStripeAmount({ expectedGross: 1400, receivedMinor: 140000, currency: "eur" });
  assert.equal(currency.ok, false);
  assert.equal(currency.ok === false && currency.reason, "CURRENCY_MISMATCH");
  assert.deepEqual(verifyStripeAmount({ expectedGross: 0, receivedMinor: 0, currency: "pln" }), { ok: true });
});

test("lokalne okno karencji pozostaje ograniczone, gdy Stripe zgłosi błąd płatności", () => {
  const first = applyDunningFailure({}, NOW);
  assert.equal(first.status, "PAST_DUE");
  assert.equal(first.dunningAttempt, 1);
  assert.equal(first.exhausted, false);
  assert.equal(first.nextRetryAt?.getTime(), NOW.getTime() + DUNNING_RETRY_DELAYS_HOURS[0] * HOUR_MS);
  assert.equal(first.graceEndsAt.getTime(), NOW.getTime() + DUNNING_GRACE_DAYS * DAY_MS);
  const later = new Date(NOW.getTime() + 2 * DAY_MS);
  const second = applyDunningFailure(
    { dunningAttempt: first.dunningAttempt, graceEndsAt: first.graceEndsAt },
    later,
  );
  assert.equal(second.dunningAttempt, 2);
  assert.equal(second.graceEndsAt.getTime(), first.graceEndsAt.getTime());
});

test("po wyczerpaniu lokalnej karencji dostęp przechodzi w PAYMENT_FAILED", () => {
  const exhausted = applyDunningFailure(
    { dunningAttempt: MAX_DUNNING_ATTEMPTS, graceEndsAt: NOW },
    NOW,
  );
  assert.equal(exhausted.status, "PAYMENT_FAILED");
  assert.equal(exhausted.exhausted, true);
  assert.equal(exhausted.nextRetryAt, null);
});

test("brak daty końca okresu nie daje dostępu", () => {
  assert.equal(isSubscriptionAccessActive("ACTIVE", null, NOW), false);
  assert.equal(isSubscriptionAccessActive("ACTIVE", undefined, NOW), false);
  assert.equal(isSubscriptionAccessActive("TRIALING", null, NOW), false);
  assert.equal(isSubscriptionAccessActive("ACTIVE", new Date(NOW.getTime() + DAY_MS), NOW), true);
  assert.equal(isSubscriptionAccessActive("ACTIVE", new Date(NOW.getTime() - DAY_MS), NOW), false);
});

test("PAST_DUE zachowuje dostęp wyłącznie do końca karencji", () => {
  const grace = new Date(NOW.getTime() + 3 * DAY_MS);
  assert.equal(isSubscriptionAccessActive("PAST_DUE", null, NOW, grace), true);
  assert.equal(isSubscriptionAccessActive("PAST_DUE", null, new Date(grace.getTime() + 1), grace), false);
  assert.equal(isSubscriptionAccessActive("PAST_DUE", null, NOW), false);
  assert.equal(isSubscriptionAccessActive("PAYMENT_FAILED", null, NOW, grace), false);
});

test("błąd walidacji rejestracji wraca jako czytelny komunikat, nie surowy JSON", async () => {
  const parsed = onboardingSchema.safeParse({
    companyName: "Ab",
    slug: "a",
    packageCode: "GOLD",
    billingMode: "RECURRING_MONTHLY",
  });
  assert.equal(parsed.success, false);
  const response = apiError(parsed.success ? null : parsed.error, "Nie udało się utworzyć firmy.");
  assert.equal(response.status, 400);
  const body: any = await response.json();
  assert.match(body.error, /^slug: /);
  assert.doesNotMatch(body.error, /[[{]/, "komunikat nie może być zrzutem JSON-a z listą problemów");
});

test("adres konfiguratora odrzuca wartości zarezerwowane i za krótkie", () => {
  assert.equal(companySlugSchema.safeParse("ab").success, false);
  assert.equal(companySlugSchema.safeParse("moja firma").success, false);
  assert.equal(companySlugSchema.safeParse("-moja-firma").success, false);
  assert.equal(companySlugSchema.safeParse("moja--firma").success, false);
  assert.equal(companySlugSchema.safeParse("superadmin").success, false);
  assert.equal(companySlugSchema.safeParse("onboarding").success, false);
  assert.equal(companySlugSchema.safeParse("moja-firma-3").success, true);
  assert.equal(companySlugSchema.parse("  Moja-Firma  "), "moja-firma");
});
