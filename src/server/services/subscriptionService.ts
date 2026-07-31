import { addBillingPeriod } from "@/domain/plans";
import { writeAudit } from "@/server/audit";
import { connectMongo } from "@/server/db/connection";
import {
  BillingAttempt,
  Company,
  Payment,
  Subscription,
} from "@/server/db/models";
import {
  applicationUrl,
  createPayUOrder,
  retrievePayUTokens,
} from "@/server/payu/client";
import { payUPriceDescription, resolvePayUChargePrice } from "@/server/payu/pricing";
import type { PackageCode } from "@/types/saas";
import { getPlanDefinition } from "@/server/services/planService";

export async function processDueSubscriptions(now = new Date()) {
  if (!(await connectMongo())) return { checked: 0, charged: 0, failed: 0, skipped: 0 };
  const ended = await Subscription.find({
    status: { $in: ["ACTIVE", "TRIALING"] },
    $or: [
      { cancelAtPeriodEnd: true, currentPeriodEnd: { $lte: now } },
      { billingMode: { $in: ["PREPAID_MONTHLY", "PREPAID_SIX_MONTHS"] }, currentPeriodEnd: { $lte: now } },
    ],
  });
  for (const subscription of ended) {
    subscription.status = subscription.cancelAtPeriodEnd ? "CANCELED" : "EXPIRED";
    await subscription.save();
    await writeAudit({
      companyId: subscription.companyId,
      actorType: "SYSTEM",
      action: subscription.cancelAtPeriodEnd ? "subscription.canceled" : "subscription.expired",
      entityType: "Subscription",
      entityId: String(subscription._id),
      after: { status: subscription.status },
    });
  }
  const due: any[] = await Subscription.find({
    billingMode: "RECURRING_MONTHLY",
    cancelAtPeriodEnd: { $ne: true },
    $or: [
      { status: "TRIALING", trialEndsAt: { $lte: now } },
      { status: "ACTIVE", currentPeriodEnd: { $lte: now } },
    ],
  }).limit(200);

  const result = { checked: due.length, charged: 0, failed: 0, skipped: 0, ended: ended.length };
  for (const subscription of due) {
    const dueAt = subscription.status === "TRIALING"
      ? subscription.trialEndsAt
      : subscription.currentPeriodEnd;
    const attemptKey = `${subscription._id}:${new Date(dueAt).toISOString()}`;
    let attempt: any;
    try {
      attempt = await BillingAttempt.create({
        companyId: subscription.companyId,
        subscriptionId: subscription._id,
        attemptKey,
        status: "PROCESSING",
        attemptedAt: now,
      });
    } catch (error: any) {
      if (error?.code === 11000) {
        result.skipped += 1;
        continue;
      }
      throw error;
    }

    try {
      const company: any = await Company.findById(subscription.companyId);
      if (!company) throw new Error("COMPANY_NOT_FOUND");
      const email = company.billing?.email || company.branding?.supportEmail;
      if (!email) throw new Error("BILLING_EMAIL_MISSING");
      const tokens = await retrievePayUTokens(email, subscription.payuExtCustomerId || String(company._id));
      const token = tokens.find((item) => item.status === "ACTIVE") || tokens[0];
      if (!token?.value) throw new Error("ACTIVE_PAYU_TOKEN_MISSING");

      const packageCode = (subscription.scheduledPackageCode || subscription.packageCode) as PackageCode;
      const amountGross = (await getPlanDefinition(packageCode)).monthlyGross;
      const chargePrice = resolvePayUChargePrice(packageCode, amountGross);
      const periodStart = new Date(dueAt);
      const periodEnd = addBillingPeriod(periodStart, "RECURRING_MONTHLY");
      const extOrderId = `REN-${subscription._id}-${periodStart.getTime()}`;
      const payment: any = await Payment.create({
        companyId: company._id,
        subscriptionId: subscription._id,
        extOrderId,
        status: "PENDING",
        amountGross: chargePrice.chargedAmountGross,
        catalogAmountGross: chargePrice.catalogAmountGross,
        testAmountOverride: chargePrice.testOverride,
        packageCode,
        currency: "PLN",
        billingMode: "RECURRING_MONTHLY",
        periodStart,
        periodEnd,
      });
      const payu = await createPayUOrder({
        extOrderId,
        description: payUPriceDescription(`Odnowienie pakietu ${packageCode}`, chargePrice),
        totalAmountGrosz: chargePrice.chargedAmountGross * 100,
        customerIp: "127.0.0.1",
        buyer: {
          email,
          extCustomerId: subscription.payuExtCustomerId || String(company._id),
        },
        token: token.value,
        recurring: "STANDARD",
        continueUrl: `${applicationUrl()}/${company.slug}/dashboard/billing`,
        notifyUrl: `${applicationUrl()}/api/payu/notify`,
      });
      payment.payuOrderId = payu.orderId;
      payment.rawStatus = payu.status;
      await payment.save();
      attempt.status = "ORDER_CREATED";
      await attempt.save();
      result.charged += 1;
    } catch (error) {
      subscription.status = "PAYMENT_FAILED";
      await subscription.save();
      attempt.status = "FAILED";
      attempt.errorMessage = error instanceof Error ? error.message : String(error);
      await attempt.save();
      await writeAudit({
        companyId: subscription.companyId,
        actorType: "SYSTEM",
        action: "subscription.payment_failed",
        entityType: "Subscription",
        entityId: String(subscription._id),
        after: { status: "PAYMENT_FAILED", error: attempt.errorMessage },
      });
      result.failed += 1;
    }
  }
  return result;
}
