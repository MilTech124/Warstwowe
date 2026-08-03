import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperadmin } from "@/server/auth";
import { writeAudit } from "@/server/audit";
import { Plan, PlanVersion } from "@/server/db/models";
import { FEATURE_KEYS, PACKAGE_CODES } from "@/types/saas";
import { apiError } from "@/server/apiError";

const planPatchSchema = z.object({
  monthlyGross: z.number().int().positive(),
  prepaidSixMonthsGross: z.number().int().positive(),
  seatLimit: z.number().int().min(1).max(1000),
  features: z.record(z.enum(FEATURE_KEYS), z.boolean()),
  active: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const identity = await requireSuperadmin();
    const { code } = await params;
    const packageCode = z.enum(PACKAGE_CODES).parse(code);
    const input = planPatchSchema.parse(await request.json());
    const before: any = await Plan.findOne({ code: packageCode }).lean();
    if (!before) return NextResponse.json({ error: "Pakiet nie istnieje." }, { status: 404 });

    const nextVersion = Number(before.version || 1) + 1;
    await PlanVersion.create({
      planCode: before.code,
      version: before.version || 1,
      monthlyGross: before.monthlyGross,
      prepaidSixMonthsGross: before.prepaidSixMonthsGross,
      seatLimit: before.seatLimit,
      features: before.features,
      effectiveFrom: before.updatedAt || before.createdAt,
      createdBy: identity.userId,
    }).catch((error: any) => {
      if (error?.code !== 11000) throw error;
    });
    const plan = await Plan.findOneAndUpdate(
      { code: packageCode },
      { $set: { ...input, version: nextVersion } },
      { new: true },
    ).lean();
    await writeAudit({
      actorClerkUserId: identity.userId,
      actorType: "SUPERADMIN",
      action: "plan.version_published",
      entityType: "Plan",
      entityId: String(before._id),
      before,
      after: plan,
    });
    return NextResponse.json({ plan });
  } catch (error) {
    return apiError(error, "Nie udało się zapisać pakietu.");
  }
}
