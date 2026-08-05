import assert from "node:assert/strict";
import test from "node:test";
import { CONSENT_COOKIE_NAME, isCompletePrivacyProfile } from "../src/config/legal";
import {
  createConsentRecord,
  encodeConsentRecord,
  googleConsentFromPreferences,
  parseConsentRecord,
  readConsentFromCookieHeader,
} from "../src/lib/privacy/consent";

test("Google Consent Mode v2 pozostawia wszystkie opcjonalne sygnały denied", () => {
  assert.deepEqual(
    googleConsentFromPreferences({ necessary: true, analytics: false, marketing: false }),
    {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      functionality_storage: "granted",
      security_storage: "granted",
    },
  );
});

test("zgoda analityczna nie udziela żadnej zgody reklamowej", () => {
  const state = googleConsentFromPreferences({ necessary: true, analytics: true, marketing: false });
  assert.equal(state.analytics_storage, "granted");
  assert.equal(state.ad_storage, "denied");
  assert.equal(state.ad_user_data, "denied");
  assert.equal(state.ad_personalization, "denied");
});

test("marketing steruje trzema sygnałami reklamowymi", () => {
  const state = googleConsentFromPreferences({ necessary: true, analytics: false, marketing: true });
  assert.equal(state.analytics_storage, "denied");
  assert.equal(state.ad_storage, "granted");
  assert.equal(state.ad_user_data, "granted");
  assert.equal(state.ad_personalization, "granted");
});

test("ważny rekord zgody przechodzi kodowanie i odczyt z cookie", () => {
  const now = new Date("2026-08-04T12:00:00.000Z");
  const record = createConsentRecord(
    "11111111-1111-4111-8111-111111111111",
    { necessary: true, analytics: true, marketing: false },
    now,
  );
  const encoded = encodeConsentRecord(record);
  assert.deepEqual(parseConsentRecord(encoded, now), record);
  assert.deepEqual(
    readConsentFromCookieHeader(`foo=bar; ${CONSENT_COOKIE_NAME}=${encoded}`, now),
    record,
  );
});

test("rekord wygasły albo uszkodzony nie jest uznawany za decyzję", () => {
  const now = new Date("2026-08-04T12:00:00.000Z");
  const record = createConsentRecord(
    "11111111-1111-4111-8111-111111111111",
    { necessary: true, analytics: false, marketing: false },
    now,
  );
  assert.equal(parseConsentRecord(encodeConsentRecord(record), new Date(record.expiresAt)), null);
  assert.equal(parseConsentRecord("not-json", now), null);
});

test("profil prywatności wymaga danych identyfikujących administratora", () => {
  assert.equal(isCompletePrivacyProfile({ controllerName: "Firma", address: "Adres" }), false);
  assert.equal(isCompletePrivacyProfile({
    controllerName: "Firma sp. z o.o.",
    address: "ul. Testowa 1, 00-001 Warszawa",
    taxId: "1234567890",
    privacyEmail: "rodo@example.pl",
    noticeVersion: 1,
  }), true);
});
