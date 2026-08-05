import type { CompanyPrivacyProfile } from "@/types/saas";

export const PRIVACY_POLICY_VERSION = "2026-08-04";
export const PRIVACY_POLICY_EFFECTIVE_DATE = "4 sierpnia 2026 r.";
export const CONSENT_COOKIE_NAME = "w3d_consent_v1";
export const CONSENT_LIFETIME_DAYS = 365;
export const CONSENT_RECEIPT_RETENTION_DAYS = 1826;

export const OPERATOR = {
  brand: "Warstwowe3D",
  legalName: "BruteCode Jarosław Matusiak",
  address: "Słopnice 124, 34-615 Słopnice, Polska",
  taxId: "7372159143",
  email: "biuro@brutecode.pl",
  phone: "+48 505 124 908",
  domain: "https://warstwowe3d.pl",
} as const;

export const DEMO_PRIVACY_PROFILE: CompanyPrivacyProfile = {
  controllerName: OPERATOR.legalName,
  address: OPERATOR.address,
  taxId: OPERATOR.taxId,
  privacyEmail: OPERATOR.email,
  privacyPhone: OPERATOR.phone,
  noticeVersion: 1,
};

export function emptyPrivacyProfile(
  input: Partial<CompanyPrivacyProfile> = {},
): CompanyPrivacyProfile {
  return {
    controllerName: input.controllerName || "",
    address: input.address || "",
    taxId: input.taxId || "",
    privacyEmail: input.privacyEmail || "",
    privacyPhone: input.privacyPhone || null,
    noticeVersion: Number(input.noticeVersion || 1),
  };
}

export function isCompletePrivacyProfile(
  profile: Partial<CompanyPrivacyProfile> | null | undefined,
): profile is CompanyPrivacyProfile {
  return Boolean(
    profile
      && profile.controllerName?.trim()
      && profile.address?.trim()
      && profile.taxId?.trim()
      && profile.privacyEmail?.trim(),
  );
}
