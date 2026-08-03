import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/server/db/connection";
import { WebhookEvent } from "@/server/db/models";
import { verifyPayUSignature } from "@/server/payu/client";
import { applyPayUOrderStatus } from "@/server/services/paymentStatusService";

export const runtime = "nodejs";

/**
 * Outcomes that are worth another delivery attempt rather than a final 200.
 * A notification can legitimately overtake our own Payment insert.
 */
const RETRYABLE_REASONS = new Set(["PAYMENT_NOT_FOUND"]);

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
      if (error?.code !== 11000) throw error;
      // The event row is written before processing, so a duplicate key alone
      // does not mean the event was handled — an earlier delivery may have
      // crashed mid-flight. Only skip once a run reached a terminal outcome,
      // otherwise the retry would be acknowledged and the payment lost.
      const existing: any = await WebhookEvent.findOne({ eventKey }).lean();
      if (existing?.processedAt) return new NextResponse(null, { status: 200 });
    }

    let result;
    try {
      result = await applyPayUOrderStatus(payuOrder, payload);
    } catch (error) {
      await WebhookEvent.updateOne(
        { eventKey },
        { $set: { processingError: error instanceof Error ? error.message : String(error) } },
      ).catch(() => {});
      throw error;
    }

    if (!result.applied && RETRYABLE_REASONS.has(result.reason as string)) {
      // e.g. the notification beat our own Payment write — ask PayU to retry.
      await WebhookEvent.updateOne({ eventKey }, { $set: { processingError: result.reason } });
      return NextResponse.json({ error: result.reason }, { status: 503 });
    }

    await WebhookEvent.updateOne(
      { eventKey },
      { $set: { processedAt: new Date(), processingError: result.applied ? null : result.reason } },
    );
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook processing failed" },
      { status: 500 },
    );
  }
}
