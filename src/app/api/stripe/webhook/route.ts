import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/server/db/connection";
import { WebhookEvent } from "@/server/db/models";
import { constructStripeEvent } from "@/server/stripe/client";
import { processStripeEvent } from "@/server/services/stripePaymentService";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });

  let event;
  try {
    event = constructStripeEvent(rawBody, signature);
  } catch {
    return NextResponse.json({ error: "Invalid Stripe signature" }, { status: 401 });
  }

  try {
    if (!(await connectMongo())) {
      return NextResponse.json({ error: "MongoDB not configured" }, { status: 503 });
    }
    try {
      await WebhookEvent.create({
        provider: "STRIPE",
        eventKey: event.id,
        signature,
        status: event.type,
        payload: event,
      });
    } catch (error: any) {
      if (error?.code !== 11000) throw error;
      const existing: any = await WebhookEvent.findOne({ eventKey: event.id }).lean();
      if (existing?.processedAt) return new NextResponse(null, { status: 200 });
    }

    const leaseLimit = new Date(Date.now() - 5 * 60_000);
    const claimed = await WebhookEvent.findOneAndUpdate(
      {
        eventKey: event.id,
        processedAt: { $exists: false },
        $or: [
          { processingStartedAt: { $exists: false } },
          { processingStartedAt: { $lte: leaseLimit } },
        ],
      },
      { $set: { processingStartedAt: new Date(), processingError: null } },
      { new: true },
    );
    if (!claimed) return new NextResponse(null, { status: 200 });

    try {
      const result = await processStripeEvent(event);
      await WebhookEvent.updateOne(
        { eventKey: event.id },
        {
          $set: {
            processedAt: new Date(),
            processingError: result.applied || result.reason === "IGNORED_EVENT" ? null : result.reason,
          },
        },
      );
      return new NextResponse(null, { status: 200 });
    } catch (error) {
      await WebhookEvent.updateOne(
        { eventKey: event.id },
        {
          $unset: { processingStartedAt: 1 },
          $set: { processingError: error instanceof Error ? error.message : String(error) },
        },
      ).catch(() => {});
      throw error;
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Stripe webhook processing failed" },
      { status: 500 },
    );
  }
}
