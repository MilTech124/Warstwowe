import { writeAudit } from "@/server/audit";
import { Payment, Subscription } from "@/server/db/models";
import { retrievePayUOrder } from "@/server/payu/client";

type PayUOrderStatus = {
  orderId?: string;
  extOrderId?: string;
  status?: string;
};

export async function applyPayUOrderStatus(payuOrder: PayUOrderStatus, payload: unknown) {
  if (!payuOrder.extOrderId || !payuOrder.status) return { applied: false, reason: "INVALID_ORDER" };
  const payment: any = await Payment.findOne({ extOrderId: payuOrder.extOrderId });
  if (!payment) return { applied: false, reason: "PAYMENT_NOT_FOUND" };

  const previousPaymentStatus = payment.status;
  payment.payuOrderId = payuOrder.orderId || payment.payuOrderId;
  payment.status = payuOrder.status;
  payment.rawStatus = payload;
  await payment.save();

  const subscription: any = await Subscription.findById(payment.subscriptionId);
  if (!subscription) return { applied: true, subscriptionUpdated: false };

  if (payuOrder.status === "COMPLETED") {
    const expectedStatus = Number(payment.amountGross) === 0 ? "TRIALING" : "ACTIVE";
    const shouldActivate = previousPaymentStatus !== "COMPLETED" || subscription.status !== expectedStatus;
    if (shouldActivate) {
      if (Number(payment.amountGross) === 0) {
        subscription.status = "TRIALING";
        subscription.trialEndsAt = payment.periodEnd;
      } else {
        subscription.status = "ACTIVE";
        subscription.trialEndsAt = undefined;
        subscription.lastPaymentAt = new Date();
      }
      subscription.currentPeriodStart = payment.periodStart;
      subscription.currentPeriodEnd = payment.periodEnd;
      if (payment.packageCode) {
        subscription.packageCode = payment.packageCode;
        subscription.scheduledPackageCode = undefined;
        subscription.amountGross = payment.catalogAmountGross || payment.amountGross;
      }
      await subscription.save();
      await writeAudit({
        companyId: payment.companyId,
        actorType: "SYSTEM",
        action: Number(payment.amountGross) === 0 ? "subscription.trial_started" : "subscription.renewed",
        entityType: "Subscription",
        entityId: String(subscription._id),
        after: {
          status: subscription.status,
          packageCode: subscription.packageCode,
          currentPeriodEnd: subscription.currentPeriodEnd,
        },
      });
    }
  } else if (payuOrder.status === "CANCELED" && previousPaymentStatus !== "CANCELED") {
    subscription.status = Number(payment.amountGross) === 0 ? "ONBOARDING" : "PAYMENT_FAILED";
    await subscription.save();
    await writeAudit({
      companyId: payment.companyId,
      actorType: "SYSTEM",
      action: "subscription.payment_failed",
      entityType: "Subscription",
      entityId: String(subscription._id),
      after: { status: subscription.status, extOrderId: payment.extOrderId },
    });
  }

  return { applied: true, subscriptionUpdated: true, status: subscription.status };
}

export async function reconcileLatestCompanyPayment(companyId: unknown) {
  const payment: any = await Payment.findOne({ companyId }).sort({ createdAt: -1 });
  if (!payment) return { reconciled: false, reason: "PAYMENT_NOT_FOUND" };
  const subscription: any = await Subscription.findById(payment.subscriptionId).lean();
  const expectedStatus = Number(payment.amountGross) === 0 ? "TRIALING" : "ACTIVE";

  if (payment.status === "COMPLETED" && subscription?.status === expectedStatus) {
    return { reconciled: false, reason: "ALREADY_CURRENT" };
  }
  if (!payment.payuOrderId) return { reconciled: false, reason: "PAYU_ORDER_ID_MISSING" };

  const { order, payload } = await retrievePayUOrder(payment.payuOrderId);
  if (!order || order.extOrderId !== payment.extOrderId) {
    return { reconciled: false, reason: "PAYU_ORDER_MISMATCH" };
  }
  const result = await applyPayUOrderStatus(order, payload);
  return { reconciled: result.applied, status: order.status, result };
}
