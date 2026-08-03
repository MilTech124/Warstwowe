import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { companySlugSchema } from "@/domain/company";
import { requireSuperadmin } from "@/server/auth";
import { writeAudit } from "@/server/audit";
import { Company, FeatureOverride, Subscription } from "@/server/db/models";
import { FEATURE_KEYS, PACKAGE_CODES, SUBSCRIPTION_STATUSES } from "@/types/saas";
import { apiError } from "@/server/apiError";

const companyPatchSchema = z.object({
  displayName: z.string().trim().min(2).max(120).optional(),
  slug: companySlugSchema.optional(),
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
  subscription: z.object({
    packageCode: z.enum(PACKAGE_CODES).optional(),
    status: z.enum(SUBSCRIPTION_STATUSES).optional(),
    trialEndsAt: z.string().datetime().nullable().optional(),
    currentPeriodEnd: z.string().datetime().nullable().optional(),
    cancelAtPeriodEnd: z.boolean().optional(),
  })
    // Access is now fail-closed on a missing end date, so an ACTIVE/TRIALING
    // subscription must always carry one — otherwise this endpoint would just
    // turn the company's configurator off.
    .refine(
      (value) => {
        if (value.status === "ACTIVE") return value.currentPeriodEnd !== null;
        if (value.status === "TRIALING") return value.trialEndsAt !== null;
        return true;
      },
      { message: "Aktywna subskrypcja wymaga daty końca okresu." },
    )
    .optional(),
  overrides: z.array(z.object({
    feature: z.enum(FEATURE_KEYS),
    mode: z.enum(["FORCE_ENABLE", "FORCE_DISABLE"]),
    expiresAt: z.string().datetime().nullable().optional(),
    reason: z.string().trim().max(500).optional(),
  })).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> },
) {
  try {
    const identity = await requireSuperadmin();
    const { companyId } = await params;
    const input = companyPatchSchema.parse(await request.json());
    const before = await Company.findById(companyId).lean();
    if (!before) return NextResponse.json({ error: "Firma nie istnieje." }, { status: 404 });

    const companyPatch: Record<string, unknown> = {};
    if (input.displayName) {
      companyPatch.displayName = input.displayName;
      companyPatch["branding.name"] = input.displayName;
    }
    if (input.slug) companyPatch.slug = input.slug;
    if (input.status) companyPatch.status = input.status;
    if (Object.keys(companyPatch).length) {
      await Company.updateOne({ _id: companyId }, { $set: companyPatch });
    }

    if (input.subscription) {
      const subscriptionPatch = Object.fromEntries(
        Object.entries(input.subscription).map(([key, value]) => [
          key,
          (key === "trialEndsAt" || key === "currentPeriodEnd") && value ? new Date(value as string) : value,
        ]),
      );
      await Subscription.updateOne({ companyId }, { $set: subscriptionPatch });
    }

    if (input.overrides) {
      const requested = new Set(input.overrides.map((item) => item.feature));
      await FeatureOverride.deleteMany({ companyId, feature: { $nin: [...requested] } });
      for (const override of input.overrides) {
        await FeatureOverride.updateOne(
          { companyId, feature: override.feature },
          {
            $set: {
              ...override,
              expiresAt: override.expiresAt ? new Date(override.expiresAt) : null,
              createdBy: identity.userId,
            },
          },
          { upsert: true },
        );
      }
    }

    const [company, subscription, overrides] = await Promise.all([
      Company.findById(companyId).lean(),
      Subscription.findOne({ companyId }).lean(),
      FeatureOverride.find({ companyId }).lean(),
    ]);
    await writeAudit({
      companyId,
      actorClerkUserId: identity.userId,
      actorType: "SUPERADMIN",
      action: "company.admin_updated",
      entityType: "Company",
      entityId: companyId,
      before,
      after: { company, subscription, overrides },
    });
    return NextResponse.json({ company, subscription, overrides });
  } catch (error: any) {
    const duplicate = error?.code === 11000;
    if (duplicate) {
      return NextResponse.json({ error: "Ten slug jest już zajęty." }, { status: 409 });
    }
    return apiError(error, "Nie udało się zmienić firmy.");
  }
}
