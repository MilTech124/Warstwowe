import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  DUNNING_GRACE_DAYS,
  DUNNING_RETRY_DELAYS_HOURS,
  MAX_DUNNING_ATTEMPTS,
  applyDunningFailure,
} from "../src/domain/dunning";
import { isSubscriptionAccessActive } from "../src/domain/entitlements";
import { decidePayUStatusTransition, verifyPayUAmount } from "../src/domain/payuStatus";
import { verifyPayUSignature } from "../src/server/payu/client";

const NOW = new Date("2026-08-03T12:00:00.000Z");
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

function withPayUEnv(
  env: { secondKey?: string; posId?: string },
  run: () => void,
) {
  const previousKey = process.env.PAYU_SECOND_KEY;
  const previousPos = process.env.PAYU_POS_ID;
  if (env.secondKey === undefined) delete process.env.PAYU_SECOND_KEY;
  else process.env.PAYU_SECOND_KEY = env.secondKey;
  if (env.posId === undefined) delete process.env.PAYU_POS_ID;
  else process.env.PAYU_POS_ID = env.posId;
  try {
    run();
  } finally {
    if (previousKey === undefined) delete process.env.PAYU_SECOND_KEY;
    else process.env.PAYU_SECOND_KEY = previousKey;
    if (previousPos === undefined) delete process.env.PAYU_POS_ID;
    else process.env.PAYU_POS_ID = previousPos;
  }
}

function sign(body: string, key: string, algorithm: string) {
  return createHash(algorithm).update(body + key).digest("hex");
}

// ---------------------------------------------------------------- signature

test("podpis PayU akceptuje MD5 i SHA-256 zgodnie z nagłówkiem algorithm", () => {
  const body = JSON.stringify({ order: { extOrderId: "SUB-1", status: "COMPLETED" } });
  withPayUEnv({ secondKey: "second-key" }, () => {
    const md5 = sign(body, "second-key", "md5");
    assert.equal(verifyPayUSignature(body, `signature=${md5};algorithm=MD5`), true);
    // Brak parametru algorithm oznacza historyczny domyślny MD5.
    assert.equal(verifyPayUSignature(body, `signature=${md5}`), true);

    const sha = sign(body, "second-key", "sha256");
    assert.equal(verifyPayUSignature(body, `signature=${sha};algorithm=SHA-256`), true);
    assert.equal(verifyPayUSignature(body, `signature=${sha};algorithm=SHA256`), true);

    // Podpis SHA-256 zadeklarowany jako MD5 musi zostać odrzucony.
    assert.equal(verifyPayUSignature(body, `signature=${sha};algorithm=MD5`), false);
  });
});

test("podpis PayU odrzuca brak klucza, zły podpis i nieznany algorytm", () => {
  const body = "{}";
  withPayUEnv({ secondKey: undefined }, () => {
    assert.equal(verifyPayUSignature(body, "signature=abc;algorithm=MD5"), false);
  });
  withPayUEnv({ secondKey: "second-key" }, () => {
    assert.equal(verifyPayUSignature(body, null), false);
    assert.equal(verifyPayUSignature(body, "algorithm=MD5"), false);
    assert.equal(verifyPayUSignature(body, `signature=${"0".repeat(32)};algorithm=MD5`), false);
    const md5 = sign(body, "second-key", "md5");
    assert.equal(verifyPayUSignature(body, `signature=${md5};algorithm=CRC32`), false);
  });
});

test("podpis PayU odrzuca powiadomienie z obcego punktu sprzedaży", () => {
  const body = "{}";
  withPayUEnv({ secondKey: "second-key", posId: "300746" }, () => {
    const md5 = sign(body, "second-key", "md5");
    assert.equal(
      verifyPayUSignature(body, `sender=checkout-300746;signature=${md5};algorithm=MD5`),
      true,
    );
    assert.equal(
      verifyPayUSignature(body, `sender=checkout-999999;signature=${md5};algorithm=MD5`),
      false,
    );
  });
});

// ------------------------------------------------------- status monotonicity

test("status płatności nie może się cofnąć", () => {
  assert.deepEqual(decidePayUStatusTransition("PENDING", "COMPLETED"), { ok: true });
  assert.deepEqual(decidePayUStatusTransition(null, "PENDING"), { ok: true });
  // Powtórzenie tego samego statusu jest dozwolone (idempotentne).
  assert.deepEqual(decidePayUStatusTransition("COMPLETED", "COMPLETED"), { ok: true });

  // Spóźnione powiadomienie po rozliczeniu nie może zdjąć statusu COMPLETED.
  assert.deepEqual(decidePayUStatusTransition("COMPLETED", "PENDING"), {
    ok: false,
    reason: "STALE_STATUS",
  });
  assert.deepEqual(decidePayUStatusTransition("COMPLETED", "CANCELED"), {
    ok: false,
    reason: "STALE_STATUS",
  });
  assert.deepEqual(decidePayUStatusTransition("PENDING", "NIEZNANY"), {
    ok: false,
    reason: "UNKNOWN_STATUS",
  });
});

// --------------------------------------------------------- amount validation

test("rozliczenie wymaga zgodnej kwoty i waluty", () => {
  const base = { expectedAmountGross: 1400, expectedCurrency: "PLN" };
  assert.deepEqual(
    verifyPayUAmount({ ...base, reportedTotalAmount: "140000", reportedCurrency: "PLN" }),
    { ok: true },
  );
  // Brak echa kwoty nie blokuje rozliczenia.
  assert.deepEqual(verifyPayUAmount({ ...base }), { ok: true });

  const mismatch = verifyPayUAmount({ ...base, reportedTotalAmount: "100" });
  assert.equal(mismatch.ok, false);
  assert.equal(mismatch.ok === false && mismatch.reason, "AMOUNT_MISMATCH");

  const currency = verifyPayUAmount({
    ...base,
    reportedTotalAmount: "140000",
    reportedCurrency: "EUR",
  });
  assert.equal(currency.ok, false);
  assert.equal(currency.ok === false && currency.reason, "CURRENCY_MISMATCH");

  // Trial to zamówienie na 0 zł — musi przechodzić.
  assert.deepEqual(
    verifyPayUAmount({
      expectedAmountGross: 0,
      expectedCurrency: "PLN",
      reportedTotalAmount: "0",
    }),
    { ok: true },
  );
});

// ------------------------------------------------------------------ dunning

test("nieudane obciążenie przechodzi w PAST_DUE i planuje ponowienia", () => {
  const first = applyDunningFailure({}, NOW);
  assert.equal(first.status, "PAST_DUE");
  assert.equal(first.dunningAttempt, 1);
  assert.equal(first.exhausted, false);
  assert.equal(
    first.nextRetryAt?.getTime(),
    NOW.getTime() + DUNNING_RETRY_DELAYS_HOURS[0] * HOUR_MS,
  );
  assert.equal(first.graceEndsAt.getTime(), NOW.getTime() + DUNNING_GRACE_DAYS * DAY_MS);

  // Okno karencji jest zakotwiczone w pierwszej porażce i nie przedłuża się.
  const later = new Date(NOW.getTime() + 2 * DAY_MS);
  const second = applyDunningFailure(
    { dunningAttempt: first.dunningAttempt, graceEndsAt: first.graceEndsAt },
    later,
  );
  assert.equal(second.status, "PAST_DUE");
  assert.equal(second.dunningAttempt, 2);
  assert.equal(second.graceEndsAt.getTime(), first.graceEndsAt.getTime());
  assert.equal(
    second.nextRetryAt?.getTime(),
    later.getTime() + DUNNING_RETRY_DELAYS_HOURS[1] * HOUR_MS,
  );
});

test("po wyczerpaniu ponowień subskrypcja trafia w PAYMENT_FAILED", () => {
  const exhausted = applyDunningFailure(
    { dunningAttempt: MAX_DUNNING_ATTEMPTS, graceEndsAt: NOW },
    NOW,
  );
  assert.equal(exhausted.status, "PAYMENT_FAILED");
  assert.equal(exhausted.exhausted, true);
  assert.equal(exhausted.nextRetryAt, null);
});

// ------------------------------------------------------------------- access

test("brak daty końca okresu nie daje dostępu (fail-closed)", () => {
  // Regresja: wcześniej pusty currentPeriodEnd oznaczał dostęp bez końca.
  assert.equal(isSubscriptionAccessActive("ACTIVE", null, NOW), false);
  assert.equal(isSubscriptionAccessActive("ACTIVE", undefined, NOW), false);
  assert.equal(isSubscriptionAccessActive("TRIALING", null, NOW), false);

  assert.equal(
    isSubscriptionAccessActive("ACTIVE", new Date(NOW.getTime() + DAY_MS), NOW),
    true,
  );
  assert.equal(
    isSubscriptionAccessActive("ACTIVE", new Date(NOW.getTime() - DAY_MS), NOW),
    false,
  );
});

test("PAST_DUE zachowuje dostęp tylko do końca karencji", () => {
  const grace = new Date(NOW.getTime() + 3 * DAY_MS);
  assert.equal(isSubscriptionAccessActive("PAST_DUE", null, NOW, grace), true);
  assert.equal(
    isSubscriptionAccessActive("PAST_DUE", null, new Date(grace.getTime() + 1), grace),
    false,
  );
  // Bez okna karencji PAST_DUE nie daje dostępu.
  assert.equal(isSubscriptionAccessActive("PAST_DUE", null, NOW), false);
  // Karencja nie ratuje subskrypcji po wyczerpaniu ponowień.
  assert.equal(isSubscriptionAccessActive("PAYMENT_FAILED", null, NOW, grace), false);
});
