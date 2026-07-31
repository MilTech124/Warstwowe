import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/server/db/connection";
import { Payment, Subscription, WebhookEvent } from "@/server/db/models";
import { verifyPayUSignature } from "@/server/payu/client";
import { writeAudit } from "@/server/audit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature =
    request.headers.get("openpayu-signature")
    || request.headers.get("x-openpayu-signature");
  if (!verifyPayUSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid PayU signature" }, { status: 401 });
  }

  try {
    if (!(await connectMongo())) return NextResponse.json({ error: "MongoDB not configured" }, { status: 503 });
    const payload = JSON.parse(rawBody);
    const payuOrder = payload.order;
    if (!payuOrder?.extOrderId || !payuOrder?.status) {
      return NextResponse.json({ error: "Invalid PayU payload" }, { status: 400 });
    }
    const eventKey = createHash("sha256")
      .update(`${payuOrder.orderId}:${payuOrder.extOrderId}:${payuOrder.status}`)
      .digest("hex");
    try {
      await WebhookEvent.create({
        provider: "PAYU",
        eventKey,
        signature,
        status: payuOrder.status,
        payload,
      });
    } catch (error: any) {
      if (error?.code === 11000) return new NextResponse(null, { status: 200 });
      throw error;
    }

    const payment: any = await Payment.findOne({ extOrderId: payuOrder.extOrderId });
    if (!payment) {
      await WebhookEvent.updateOne(
        { eventKey },
        { $set: { processedAt: new Date(), processingError: "PAYMENT_NOT_FOUND" } },
      );
      return new NextResponse(null, { status: 200 });
    }

    payment.payuOrderId = payuOrder.orderId;
    payment.status = payuOrder.status;
    payment.rawStatus = payload;
    await payment.save();
    const subscription: any = await Subscription.findById(payment.subscriptionId);
    if (subscription) {
      if (payuOrder.status === "COMPLETED") {
        if (Number(payment.amountGross) === 0) {
          subscription.status = "TRIALING";
          subscription.trialEndsAt = payment.periodEnd;
          subscription.currentPeriodStart = payment.periodStart;
          subscription.currentPeriodEnd = payment.periodEnd;
        } else {
          subscription.status = "ACTIVE";
          subscription.trialEndsAt = undefined;
          subscription.currentPeriodStart = payment.periodStart;
          subscription.currentPeriodEnd = payment.periodEnd;
          subscription.lastPaymentAt = new Date();
          if (payment.packageCode) {
            subscription.packageCode = payment.packageCode;
            subscription.scheduledPackageCode = undefined;
            subscription.amountGross = payment.catalogAmountGross || payment.amountGross;
          }
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
      } else if (payuOrder.status === "CANCELED") {
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
    }
    await WebhookEvent.updateOne({ eventKey }, { $set: { processedAt: new Date() } });
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook processing failed" },
      { status: 500 },
    );
  }
}
