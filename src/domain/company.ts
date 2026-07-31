import { z } from "zod";
import { BILLING_MODES, PACKAGE_CODES } from "@/types/saas";

export const RESERVED_COMPANY_SLUGS = new Set([
  "api",
  "superadmin",
  "logowanie",
  "rejestracja",
  "onboarding",
  "cennik",
  "demo",
  "_next",
  "favicon.ico",
]);

export const companySlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Adres musi mieć co najmniej 3 znaki.")
  .max(48, "Adres może mieć maksymalnie 48 znaków.")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Użyj małych liter, cyfr i pojedynczych myślników.")
  .refine((slug) => !RESERVED_COMPANY_SLUGS.has(slug), "Ten adres jest zarezerwowany.");

export const onboardingSchema = z.object({
  companyName: z.string().trim().min(2).max(120),
  slug: companySlugSchema,
  packageCode: z.enum(PACKAGE_CODES),
  billingMode: z.enum(BILLING_MODES),
  cardToken: z.string().startsWith("TOK_").optional(),
  cardMask: z.string().max(32).optional(),
});

export function companyCode(name: string) {
  const parts = name
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .split(/\s+/)
    .filter(Boolean);
  const value = parts.length > 1
    ? parts.slice(0, 4).map((part) => part[0]).join("")
    : (parts[0] || "FIRMA").slice(0, 5);
  return value.toUpperCase();
}
