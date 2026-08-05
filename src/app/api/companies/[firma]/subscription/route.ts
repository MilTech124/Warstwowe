import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PACKAGE_CODES } from "@/types/saas";
import { requireCompanyMember, requireCompanyWriteIntent } from "@/server/auth";
import { Subscription } from "@/server/db/models";
import { writeAudit } from "@/server/audit";
import { getPlanDefinition } from "@/server/services/planService";
import { applyStripeSubscription } from "@/server/services/stripePaymentService";
import {
  createStripeCheckout,
  ensureStripePrice,
  getStripe,
} from "@/server/stripe/client";
import { apiError } from "@/server/apiError";

const schema = z.object({
  action: z.literal("CHANGE_PACKAGE"),
  packageCode: z.enum(PACKAGE_CODES),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ firma: string }> },
) {
  try {
    const { firma } = await params;
    const access: any = await requireCompanyMember(firma, ["OWNER"]);
    requireCompanyWriteIntent(request, access);
    const input = schema.parse(await request.json());
    if (access.company?.demo) {
      return NextResponse.json({ message: "Zmiana została zasymulowana w trybie demo." });
    }
    const companyId = access.company._id;
    const subscription: any = await Subscription.findOne({ companyId });
    if (!subscription) throw new Error("Firma nie ma subskrypcji.");
    const before = subscription.toObject();

    if (subscription.billingMode !== "RECURRING_MONTHLY" || !subscription.stripeSubscriptionId) {
      const email = access.company.billing?.email || access.company.branding?.supportEmail;
      if (!email) throw new Error("Firma nie ma adresu e-mail do rozliczeń.");
      const checkout = await createStripeCheckout({
        company: access.company,
        subscription,
        email,
        packageCode: input.packageCode,
        billingMode: subscription.billingMode,
      });
      return NextResponse.json({
        checkoutUrl: checkout.url,
        message: "Nowy okres zostanie aktywowany po potwierdzeniu płatności Stripe.",
      });
    }

    const stripe = getStripe();
    const { priceId, plan } = await ensureStripePrice(input.packageCode, "RECURRING_MONTHLY");
    const stripeSubscription: any = await stripe.subscriptions.retrieve(
      subscription.stripeSubscriptionId,
      { expand: ["items.data.price", "default_payment_method"] },
    );
    if (["canceled", "unpaid", "incomplete_expired"].includes(stripeSubscription.status)) {
      const email = access.company.billing?.email || access.company.branding?.supportEmail;
      if (!email) throw new Error("Firma nie ma adresu e-mail do rozliczeń.");
      const checkout = await createStripeCheckout({
        company: access.company,
        subscription,
        email,
        packageCode: input.packageCode,
        billingMode: "RECURRING_MONTHLY",
      });
      return NextResponse.json({
        checkoutUrl: checkout.url,
        message: "Nowa subskrypcja zostanie aktywowana po zakończeniu Checkout.",
      });
    }
    if (subscription.cancelAtPeriodEnd) {
      return NextResponse.json(
        { error: "Najpierw wznów subskrypcję w portalu Stripe." },
        { status: 409 },
      );
    }
    const item = stripeSubscription.items?.data?.[0];
    if (!item) throw new Error("STRIPE_SUBSCRIPTION_ITEM_MISSING");

    if (stripeSubscription.status === "trialing") {
      const updated = await stripe.subscriptions.update(
        stripeSubscription.id,
        {
          items: [{ id: item.id, price: priceId }],
          proration_behavior: "none",
          metadata: { ...stripeSubscription.metadata, packageCode: input.packageCode },
        },
        { idempotencyKey: `trial-plan:${stripeSubscription.id}:${priceId}` },
      );
      subscription.packageCode = input.packageCode;
      subscription.amountGross = Number(plan.monthlyGross);
      subscription.stripePriceId = priceId;
      subscription.scheduledPackageCode = undefined;
      subscription.scheduledPackageStartsAt = undefined;
      await subscription.save();
      await applyStripeSubscription(updated as any);
    } else {
      if (subscription.stripeScheduleId) {
        try {
          await stripe.subscriptionSchedules.release(subscription.stripeScheduleId);
        } catch {
          // A completed/released schedule no longer needs cleanup.
        }
      }
      const schedule: any = await stripe.subscriptionSchedules.create(
        { from_subscription: stripeSubscription.id },
        {
          idempotencyKey: `schedule:${stripeSubscription.id}:${priceId}:${new Date(subscription.updatedAt).getTime()}`,
        },
      );
      const current = schedule.current_phase;
      const periodEnd = item.current_period_end;
      if (!current?.start_date || !periodEnd) throw new Error("STRIPE_SCHEDULE_PERIOD_MISSING");
      await stripe.subscriptionSchedules.update(schedule.id, {
        end_behavior: "release",
        phases: [
          {
            start_date: current.start_date,
            end_date: periodEnd,
            items: [{ price: item.price.id, quantity: item.quantity || 1 }],
            proration_behavior: "none",
          },
          {
            start_date: periodEnd,
            duration: { interval: "month", interval_count: 1 },
            items: [{ price: priceId, quantity: 1 }],
            proration_behavior: "none",
            metadata: { packageCode: input.packageCode },
          },
        ],
        metadata: { companyId: String(companyId), packageCode: input.packageCode },
      });
      subscription.stripeScheduleId = schedule.id;
      subscription.scheduledPackageCode = input.packageCode;
      subscription.scheduledPackageStartsAt = new Date(periodEnd * 1000);
      await subscription.save();
    }

    await writeAudit({
      companyId,
      actorClerkUserId: access.userId,
      actorType: "USER",
      action: subscription.status === "TRIALING"
        ? "subscription.package_changed"
        : "subscription.package_scheduled",
      entityType: "Subscription",
      entityId: String(subscription._id),
      before,
      after: subscription.toObject(),
    });
    return NextResponse.json({
      message: subscription.status === "TRIALING"
        ? `Pakiet ${input.packageCode} obowiązuje od razu w trialu.`
        : `Pakiet ${input.packageCode} zacznie obowiązywać od kolejnego okresu.`,
    });
  } catch (error) {
    return apiError(error, "Nie udało się zmienić pakietu Stripe.");
  }
}
