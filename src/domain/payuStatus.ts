/**
 * PayU notification ordering rules.
 *
 * Notifications are not delivered in order, and the webhook idempotency key
 * includes the status — so a late PENDING arriving after COMPLETED looks like a
 * brand new event. Without a rank check it would overwrite the settled status
 * and the subscription would lose its paid state.
 */
export const PAYU_STATUS_RANK: Record<string, number> = {
  NEW: 1,
  PENDING: 2,
  WAITING_FOR_CONFIRMATION: 3,
  CANCELED: 4,
  REJECTED: 4,
  ERROR: 4,
  COMPLETED: 5,
};

export type PayUStatusDecision =
  | { ok: true }
  | { ok: false; reason: "UNKNOWN_STATUS" | "STALE_STATUS" };

export function decidePayUStatusTransition(
  currentStatus: string | null | undefined,
  nextStatus: string,
): PayUStatusDecision {
  const nextRank = PAYU_STATUS_RANK[nextStatus];
  if (!nextRank) return { ok: false, reason: "UNKNOWN_STATUS" };
  const currentRank = PAYU_STATUS_RANK[currentStatus ?? ""] ?? 0;
  if (nextRank < currentRank) return { ok: false, reason: "STALE_STATUS" };
  return { ok: true };
}

export type PayUAmountDecision =
  | { ok: true }
  | { ok: false; reason: "AMOUNT_MISMATCH" | "CURRENCY_MISMATCH"; expectedGrosz: number; reportedGrosz: number };

/**
 * A COMPLETED notification is what unlocks the subscription, so the amount PayU
 * reports must match what we asked it to charge.
 */
export function verifyPayUAmount(input: {
  expectedAmountGross: number;
  expectedCurrency: string;
  reportedTotalAmount?: string | number | null;
  reportedCurrency?: string | null;
}): PayUAmountDecision {
  const expectedGrosz = Math.round(Number(input.expectedAmountGross) * 100);
  // An absent totalAmount means PayU echoed nothing to compare against.
  const reportedGrosz = input.reportedTotalAmount === undefined || input.reportedTotalAmount === null
    ? expectedGrosz
    : Number(input.reportedTotalAmount);

  if (!Number.isFinite(reportedGrosz) || reportedGrosz !== expectedGrosz) {
    return { ok: false, reason: "AMOUNT_MISMATCH", expectedGrosz, reportedGrosz };
  }
  const reportedCurrency = input.reportedCurrency || input.expectedCurrency;
  if (reportedCurrency !== input.expectedCurrency) {
    return { ok: false, reason: "CURRENCY_MISMATCH", expectedGrosz, reportedGrosz };
  }
  return { ok: true };
}
