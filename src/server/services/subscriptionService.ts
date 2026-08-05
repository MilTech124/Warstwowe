import { writeAudit } from "@/server/audit";
import { connectMongo } from "@/server/db/connection";
import { Subscription } from "@/server/db/models";
import { getPlanDefinition } from "@/server/services/planService";
import type { PackageCode } from "@/types/saas";

/** Daily maintenance is deliberately local-only. Stripe owns all recurring
 * charges, retries and cancellation state; this job only advances prepaid
 * entitlements that have no provider-side subscription lifecycle. */
export async function processDueSubscriptions(now = new Date()) {
  if (!(await connectMongo())) return { checked: 0, expired: 0, packagesActivated: 0 };

  const scheduled: any[] = await Subscription.find({
    billingMode: { $in: ["PREPAID_MONTHLY", "PREPAID_SIX_MONTHS"] },
    scheduledPackageCode: { $exists: true },
    scheduledPackageStartsAt: { $lte: now },
  }).limit(200);
  for (const subscription of scheduled) {
    const nextPackage = subscription.scheduledPackageCode as PackageCode;
    const plan = await getPlanDefinition(nextPackage);
    subscription.packageCode = nextPackage;
    subscription.amountGross = subscription.billingMode === "PREPAID_SIX_MONTHS"
      ? plan.prepaidSixMonthsGross
      : plan.monthlyGross;
    subscription.scheduledPackageCode = undefined;
    subscription.scheduledPackageStartsAt = undefined;
    await subscription.save();
    await writeAudit({
      companyId: subscription.companyId,
      actorType: "SYSTEM",
      action: "subscription.package_changed",
      entityType: "Subscription",
      entityId: String(subscription._id),
      after: { packageCode: nextPackage, source: "prepaid_schedule" },
    });
  }

  const expired: any[] = await Subscription.find({
    billingMode: { $in: ["PREPAID_MONTHLY", "PREPAID_SIX_MONTHS"] },
    status: { $in: ["ACTIVE", "TRIALING"] },
    currentPeriodEnd: { $lte: now },
  }).limit(200);
  for (const subscription of expired) {
    subscription.status = "EXPIRED";
    await subscription.save();
    await writeAudit({
      companyId: subscription.companyId,
      actorType: "SYSTEM",
      action: "subscription.expired",
      entityType: "Subscription",
      entityId: String(subscription._id),
      after: { status: "EXPIRED", provider: "STRIPE" },
    });
  }

  return {
    checked: scheduled.length + expired.length,
    expired: expired.length,
    packagesActivated: scheduled.length,
  };
}
