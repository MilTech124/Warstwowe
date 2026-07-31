import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/server/db/connection";
import { WebhookEvent } from "@/server/db/models";
import { verifyPayUSignature } from "@/server/payu/client";
import { applyPayUOrderStatus } from "@/server/services/paymentStatusService";

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

    const result = await applyPayUOrderStatus(payuOrder, payload);
    if (!result.applied) {
      await WebhookEvent.updateOne(
        { eventKey },
        { $set: { processedAt: new Date(), processingError: result.reason } },
      );
      return new NextResponse(null, { status: 200 });
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
