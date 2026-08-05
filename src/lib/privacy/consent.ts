import {
  CONSENT_COOKIE_NAME,
  CONSENT_LIFETIME_DAYS,
  PRIVACY_POLICY_VERSION,
} from "@/config/legal";
import type { ConsentPreferences, ConsentRecord } from "@/types/saas";

export const DEFAULT_CONSENT: ConsentPreferences = Object.freeze({
  necessary: true,
  analytics: false,
  marketing: false,
});

export type GoogleConsentState = {
  analytics_storage: "granted" | "denied";
  ad_storage: "granted" | "denied";
  ad_user_data: "granted" | "denied";
  ad_personalization: "granted" | "denied";
  functionality_storage: "granted";
  security_storage: "granted";
};

export function googleConsentFromPreferences(
  preferences: ConsentPreferences,
): GoogleConsentState {
  return {
    analytics_storage: preferences.analytics ? "granted" : "denied",
    ad_storage: preferences.marketing ? "granted" : "denied",
    ad_user_data: preferences.marketing ? "granted" : "denied",
    ad_personalization: preferences.marketing ? "granted" : "denied",
    functionality_storage: "granted",
    security_storage: "granted",
  };
}

export function createConsentRecord(
  consentId: string,
  preferences: ConsentPreferences,
  now = new Date(),
): ConsentRecord {
  const expiresAt = new Date(now.getTime() + CONSENT_LIFETIME_DAYS * 86400000);
  return {
    consentId,
    policyVersion: PRIVACY_POLICY_VERSION,
    preferences: { ...preferences, necessary: true },
    decidedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
}

export function encodeConsentRecord(record: ConsentRecord) {
  return encodeURIComponent(JSON.stringify(record));
}

export function parseConsentRecord(
  encoded: string | null | undefined,
  now = new Date(),
): ConsentRecord | null {
  if (!encoded) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(encoded)) as Partial<ConsentRecord>;
    if (
      !parsed.consentId
      || parsed.policyVersion !== PRIVACY_POLICY_VERSION
      || !parsed.preferences
      || parsed.preferences.necessary !== true
      || typeof parsed.preferences.analytics !== "boolean"
      || typeof parsed.preferences.marketing !== "boolean"
      || !parsed.decidedAt
      || !parsed.expiresAt
      || new Date(parsed.expiresAt).getTime() <= now.getTime()
    ) {
      return null;
    }
    return parsed as ConsentRecord;
  } catch {
    return null;
  }
}

export function readConsentFromCookieHeader(
  cookieHeader: string,
  now = new Date(),
): ConsentRecord | null {
  const prefix = `${CONSENT_COOKIE_NAME}=`;
  const value = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length);
  return parseConsentRecord(value, now);
}

export function consentCookieValue(record: ConsentRecord, secure: boolean) {
  const maxAge = CONSENT_LIFETIME_DAYS * 86400;
  return [
    `${CONSENT_COOKIE_NAME}=${encodeConsentRecord(record)}`,
    "Path=/",
    `Max-Age=${maxAge}`,
    "SameSite=Lax",
    secure ? "Secure" : "",
  ].filter(Boolean).join("; ");
}
