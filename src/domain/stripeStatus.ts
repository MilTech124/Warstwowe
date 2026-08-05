import type { SubscriptionStatus } from "@/types/saas";

export const PAYMENT_STATUSES = [
  "PENDING",
  "PAID",
  "FAILED",
  "CANCELED",
  "REFUNDED",
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export function mapStripeSubscriptionStatus(status: string): SubscriptionStatus {
  switch (status) {
    case "trialing": return "TRIALING";
    case "active": return "ACTIVE";
    case "past_due": return "PAST_DUE";
    case "unpaid":
    case "incomplete_expired": return "PAYMENT_FAILED";
    case "canceled": return "CANCELED";
    case "paused": return "SUSPENDED";
    case "incomplete":
    default: return "ONBOARDING";
  }
}

export function verifyStripeAmount(input: {
  expectedGross: number;
  receivedMinor: number | null | undefined;
  currency: string | null | undefined;
}) {
  if ((input.currency || "").toUpperCase() !== "PLN") {
    return { ok: false as const, reason: "CURRENCY_MISMATCH" };
  }
  const expectedMinor = Math.round(Number(input.expectedGross) * 100);
  if (!Number.isInteger(input.receivedMinor) || input.receivedMinor !== expectedMinor) {
    return {
      ok: false as const,
      reason: "AMOUNT_MISMATCH",
      expectedMinor,
      receivedMinor: input.receivedMinor,
    };
  }
  return { ok: true as const };
}
