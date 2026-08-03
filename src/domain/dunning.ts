import type { SubscriptionStatus } from "@/types/saas";

/**
 * Dunning window for a declined recurring charge.
 *
 * Previously a single failure flipped the subscription straight to
 * PAYMENT_FAILED and cut the configurator off, and the billing attempt key
 * (`subscriptionId:dueAt`) then blocked the cron from ever retrying — so one
 * transient decline silently ended a paying account.
 *
 * Now a failure moves the subscription to PAST_DUE, keeps access alive until
 * `graceEndsAt`, and schedules the next retry. Access only ends once the
 * retries are exhausted.
 */
export const DUNNING_RETRY_DELAYS_HOURS = [24, 72, 120] as const;
export const MAX_DUNNING_ATTEMPTS = DUNNING_RETRY_DELAYS_HOURS.length;
export const DUNNING_GRACE_DAYS = 7;

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

export interface DunningState {
  dunningAttempt?: number | null;
  graceEndsAt?: Date | string | null;
}

export interface DunningPatch {
  status: SubscriptionStatus;
  dunningAttempt: number;
  graceEndsAt: Date;
  nextRetryAt: Date | null;
  exhausted: boolean;
}

/**
 * Computes the subscription patch for one failed charge. Pure — the caller
 * assigns the result and saves.
 */
export function applyDunningFailure(state: DunningState, now = new Date()): DunningPatch {
  const attempt = Math.max(0, Number(state.dunningAttempt) || 0) + 1;

  // The grace window is anchored to the first failure and never extended, so a
  // company cannot stay live indefinitely by failing repeatedly.
  const graceEndsAt = state.graceEndsAt
    ? new Date(state.graceEndsAt)
    : new Date(now.getTime() + DUNNING_GRACE_DAYS * DAY_MS);

  if (attempt > MAX_DUNNING_ATTEMPTS) {
    return {
      status: "PAYMENT_FAILED",
      dunningAttempt: attempt,
      graceEndsAt,
      nextRetryAt: null,
      exhausted: true,
    };
  }

  return {
    status: "PAST_DUE",
    dunningAttempt: attempt,
    graceEndsAt,
    nextRetryAt: new Date(now.getTime() + DUNNING_RETRY_DELAYS_HOURS[attempt - 1] * HOUR_MS),
    exhausted: false,
  };
}
