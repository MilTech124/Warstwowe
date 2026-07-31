import { clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { companyCode, onboardingSchema } from "@/domain/company";
import { addBillingPeriod } from "@/domain/plans";
import { getRequestIdentity } from "@/server/auth";
import { connectMongo } from "@/server/db/connection";
import {
  Company,
  CompanyMembership,
  CompanySettings,
  Payment,
  Subscription,
} from "@/server/db/models";
import { createPayUOrder, payuConfigured } from "@/server/payu/client";
import { payUPriceDescription, resolvePayUChargePrice } from "@/server/payu/pricing";
import { seedSaasCatalog } from "@/server/seed";
import { writeAudit } from "@/server/audit";
import { getPlanDefinition } from "@/server/services/planService";

export const runtime = "nodejs";

function clientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "127.0.0.1";
}

export async function POST(request: NextRequest) {
  try {
    const identity = await getRequestIdentity();
    if (!identity.userId) return NextResponse.json({ error: "Najpierw zaloguj się przez Clerk." }, { status: 401 });
    if (!(await connectMongo())) {
      return NextResponse.json({ error: "MongoDB nie jest skonfigurowane." }, { status: 503 });
    }

    const input = onboardingSchema.parse(await request.json());
    const requestOrigin = new URL(request.url).origin;
    if (input.billingMode === "RECURRING_MONTHLY" && !input.cardToken) {
      return NextResponse.json({ error: "Brakuje tokena bezpiecznego formularza PayU." }, { status: 400 });
    }
    if (!payuConfigured()) {
      return NextResponse.json({ error: "PayU nie jest jeszcze skonfigurowane." }, { status: 503 });
    }

    await seedSaasCatalog();
    const selectedPlan = await getPlanDefinition(input.packageCode);
    const existing = await Company.findOne({
      $or: [{ slug: input.slug }, { ownerClerkUserId: identity.userId }],
    }).lean();
    if (existing) {
      return NextResponse.json(
        { error: existing.slug === input.slug ? "Ten adres firmy jest już zajęty." : "To konto ma już utworzoną firmę." },
        { status: 409 },
      );
    }

    const client = await clerkClient();
    const user = await client.users.getUser(identity.userId);
    const email = user?.primaryEmailAddress?.emailAddress;
    if (!email) return NextResponse.json({ error: "Konto Clerk nie ma zweryfikowanego adresu e-mail." }, { status: 400 });

    const company = await Company.create({
      ownerClerkUserId: identity.userId,
      slug: input.slug,
      displayName: input.companyName,
      code: companyCode(input.companyName),
      status: "ACTIVE",
      branding: {
        name: input.companyName,
        primaryColor: "#0f766e",
        accentColor: "#f59e0b",
        supportEmail: email,
      },
      billing: { legalName: input.companyName, email },
    });

    await CompanyMembership.create({
      companyId: company._id,
      clerkUserId: identity.userId,
      email: email.toLowerCase(),
      firstName: user?.firstName || undefined,
      lastName: user?.lastName || undefined,
      role: "OWNER",
      status: "ACTIVE",
      joinedAt: new Date(),
    });

    await CompanySettings.create({
      companyId: company._id,
      version: 1,
      publishedVersion: 1,
      published: true,
      manuallyEnabled: true,
      defaultPresetId: "single_garage",
      allowedPresetIds: ["single_garage", "double_garage", "hall", "large_hall"],
      allowedPanelManufacturerIds: ["default_panels", "steelprofil"],
      allowedGateManufacturerIds: ["wisniowski"],
      orderNotificationEmails: [email],
    });

    const now = new Date();
    const amountGross = input.billingMode === "PREPAID_SIX_MONTHS"
      ? selectedPlan.prepaidSixMonthsGross
      : selectedPlan.monthlyGross;
    const chargePrice = resolvePayUChargePrice(input.packageCode, amountGross);
    const subscription = await Subscription.create({
      companyId: company._id,
      packageCode: input.packageCode,
      billingMode: input.billingMode,
      status: "ONBOARDING",
      amountGross,
      currency: "PLN",
      currentPeriodStart: now,
      currentPeriodEnd:
        input.billingMode === "RECURRING_MONTHLY"
          ? undefined
          : addBillingPeriod(now, input.billingMode),
      payuExtCustomerId: String(company._id),
      cardMask: input.cardMask,
    });

    const extOrderId = `SUB-${company._id}-${Date.now()}`;
    const periodStart = now;
    const periodEnd =
      input.billingMode === "RECURRING_MONTHLY"
        ? new Date(now.getTime() + 7 * 86400000)
        : addBillingPeriod(now, input.billingMode);
    const amountGrosz =
      input.billingMode === "RECURRING_MONTHLY"
        ? 0
        : chargePrice.chargedAmountGross * 100;

    const payment = await Payment.create({
      companyId: company._id,
      subscriptionId: subscription._id,
      extOrderId,
      status: "PENDING",
      amountGross: amountGrosz / 100,
      catalogAmountGross: chargePrice.catalogAmountGross,
      testAmountOverride: chargePrice.testOverride,
      packageCode: input.packageCode,
      currency: "PLN",
      billingMode: input.billingMode,
      periodStart,
      periodEnd,
    });

    try {
      const result = await createPayUOrder({
        extOrderId,
        description: payUPriceDescription(
          input.billingMode === "RECURRING_MONTHLY"
            ? `Weryfikacja karty — trial ${input.packageCode}`
            : `Pakiet ${input.packageCode}`,
          chargePrice,
        ),
        totalAmountGrosz: amountGrosz,
        customerIp: clientIp(request),
        buyer: {
          email,
          firstName: user?.firstName || undefined,
          lastName: user?.lastName || undefined,
          extCustomerId: String(company._id),
        },
        token: input.billingMode === "RECURRING_MONTHLY" ? input.cardToken : undefined,
        recurring: input.billingMode === "RECURRING_MONTHLY" ? "FIRST" : undefined,
        continueUrl: `${requestOrigin}/${input.slug}/dashboard/billing?payu=return`,
        notifyUrl: `${requestOrigin}/api/payu/notify`,
      });
      await Payment.updateOne(
        { _id: payment._id },
        { $set: { payuOrderId: result.orderId, rawStatus: result.status } },
      );
      await writeAudit({
        companyId: company._id,
        actorClerkUserId: identity.userId,
        actorType: "USER",
        action: "company.created",
        entityType: "Company",
        entityId: String(company._id),
        after: { packageCode: input.packageCode, billingMode: input.billingMode },
      });
      return NextResponse.json({
        slug: input.slug,
        redirectUri: result.redirectUri,
        orderId: result.orderId,
      });
    } catch (error) {
      await Payment.updateOne(
        { _id: payment._id },
        { $set: { status: "ERROR", rawStatus: { message: error instanceof Error ? error.message : String(error) } } },
      );
      throw error;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nie udało się utworzyć firmy.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
