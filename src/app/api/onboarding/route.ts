import { clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { companyCode, onboardingSchema } from "@/domain/company";
import { getRequestIdentity } from "@/server/auth";
import { connectMongo } from "@/server/db/connection";
import {
  Company,
  CompanyMembership,
  CompanySettings,
  Subscription,
} from "@/server/db/models";
import { seedSaasCatalog } from "@/server/seed";
import { writeAudit } from "@/server/audit";
import { getPlanDefinition } from "@/server/services/planService";
import { apiError } from "@/server/apiError";
import { createStripeCheckout, stripeConfigured } from "@/server/stripe/client";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const identity = await getRequestIdentity();
    if (!identity.userId) {
      return NextResponse.json({ error: "Najpierw zaloguj się przez Clerk." }, { status: 401 });
    }
    if (!(await connectMongo())) {
      return NextResponse.json({ error: "MongoDB nie jest skonfigurowane." }, { status: 503 });
    }
    if (!stripeConfigured()) {
      return NextResponse.json({ error: "Stripe nie jest jeszcze skonfigurowany." }, { status: 503 });
    }

    const input = onboardingSchema.parse(await request.json());
    await seedSaasCatalog();
    const selectedPlan = await getPlanDefinition(input.packageCode);
    const client = await clerkClient();
    const user = await client.users.getUser(identity.userId);
    const email = user?.primaryEmailAddress?.emailAddress;
    if (!email) {
      return NextResponse.json(
        { error: "Konto Clerk nie ma zweryfikowanego adresu e-mail." },
        { status: 400 },
      );
    }

    const slugOwner: any = await Company.findOne({ slug: input.slug }).lean();
    if (slugOwner && slugOwner.ownerClerkUserId !== identity.userId) {
      return NextResponse.json(
        { error: "Ten adres firmy jest już zajęty — wybierz inny." },
        { status: 409 },
      );
    }

    let company: any = await Company.findOne({ ownerClerkUserId: identity.userId });
    let created = false;
    if (company) {
      const existingSubscription: any = await Subscription.findOne({ companyId: company._id }).lean();
      if (existingSubscription && existingSubscription.status !== "ONBOARDING") {
        // Rejestracja jest już zamknięta — to nie jest błąd użytkownika,
        // więc odsyłamy go do panelu zamiast pokazywać ślepy komunikat.
        return NextResponse.json({ slug: company.slug, alreadyRegistered: true });
      }
      // Wznowienie porzuconego onboardingu: dane z formularza muszą nadpisać
      // firmę utworzoną przy poprzedniej próbie. Bez tego zmiana nazwy lub
      // adresu była po cichu ignorowana, a stary slug zostawał na zawsze.
      if (company.slug !== input.slug || company.displayName !== input.companyName) {
        company.slug = input.slug;
        company.displayName = input.companyName;
        company.code = companyCode(input.companyName);
        company.branding.name = input.companyName;
        try {
          await company.save();
        } catch (error: any) {
          if (error?.code === 11000) {
            return NextResponse.json(
              { error: "Ten adres firmy jest już zajęty — wybierz inny." },
              { status: 409 },
            );
          }
          throw error;
        }
      }
    } else {
      try {
        company = await Company.create({
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
        created = true;
      } catch (error: any) {
        if (error?.code === 11000) {
          // Dwa szybkie submity mogą równolegle przejść wcześniejsze findOne().
          // Jeśli pierwsze żądanie utworzyło firmę tego samego użytkownika,
          // drugie powinno wznowić onboarding zamiast zgłaszać konflikt.
          const concurrentCompany: any = await Company.findOne({
            ownerClerkUserId: identity.userId,
          });
          if (concurrentCompany) {
            company = concurrentCompany;
            created = false;
          } else {
            return NextResponse.json(
              { error: "Ten adres firmy jest już zajęty — wybierz inny." },
              { status: 409 },
            );
          }
        } else {
          throw error;
        }
      }
    }

    await Promise.all([
      CompanyMembership.updateOne(
        { companyId: company._id, email: email.toLowerCase() },
        {
          $setOnInsert: {
            companyId: company._id,
            clerkUserId: identity.userId,
            email: email.toLowerCase(),
            firstName: user?.firstName || undefined,
            lastName: user?.lastName || undefined,
            role: "OWNER",
            status: "ACTIVE",
            joinedAt: new Date(),
          },
        },
        { upsert: true },
      ),
      CompanySettings.updateOne(
        { companyId: company._id },
        {
          $setOnInsert: {
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
          },
        },
        { upsert: true },
      ),
    ]);

    const amountGross = input.billingMode === "PREPAID_SIX_MONTHS"
      ? selectedPlan.prepaidSixMonthsGross
      : selectedPlan.monthlyGross;
    let subscription: any = await Subscription.findOne({ companyId: company._id });
    if (!subscription) {
      subscription = await Subscription.create({
        companyId: company._id,
        packageCode: input.packageCode,
        billingMode: input.billingMode,
        status: "ONBOARDING",
        amountGross,
        currency: "PLN",
        provider: "STRIPE",
      });
    } else {
      subscription.packageCode = input.packageCode;
      subscription.billingMode = input.billingMode;
      subscription.amountGross = amountGross;
      subscription.provider = "STRIPE";
      await subscription.save();
    }

    const session = await createStripeCheckout({
      company,
      subscription,
      email,
      packageCode: input.packageCode,
      billingMode: input.billingMode,
    });
    await writeAudit({
      companyId: company._id,
      actorClerkUserId: identity.userId,
      actorType: "USER",
      action: created ? "company.created" : "checkout.restarted",
      entityType: created ? "Company" : "Subscription",
      entityId: String(created ? company._id : subscription._id),
      after: {
        provider: "STRIPE",
        packageCode: input.packageCode,
        billingMode: input.billingMode,
        checkoutSessionId: session.id,
      },
    });
    return NextResponse.json({ slug: company.slug, checkoutUrl: session.url });
  } catch (error) {
    return apiError(error, "Nie udało się utworzyć firmy i płatności Stripe.");
  }
}
