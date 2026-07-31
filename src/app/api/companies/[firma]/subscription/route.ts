import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PACKAGE_CODES } from "@/types/saas";
import { requireCompanyMember, requireCompanyWriteIntent } from "@/server/auth";
import { Subscription } from "@/server/db/models";
import { writeAudit } from "@/server/audit";
import { getPlanDefinition } from "@/server/services/planService";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("CHANGE_PACKAGE"), packageCode: z.enum(PACKAGE_CODES) }),
  z.object({ action: z.literal("CANCEL") }),
  z.object({ action: z.literal("RESUME") }),
]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ firma: string }> },
) {
  try {
    const { firma } = await params;
    const access = await requireCompanyMember(firma, ["OWNER"]);
    requireCompanyWriteIntent(request, access);
    const input = schema.parse(await request.json());
    if ((access as any).company?.demo) {
      return NextResponse.json({ message: "Zmiana została zasymulowana w trybie demo." });
    }
    const companyId = (access as any).company._id;
    const subscription: any = await Subscription.findOne({ companyId });
    if (!subscription) throw new Error("Firma nie ma subskrypcji.");
    const before = subscription.toObject();
    if (input.action === "CANCEL") {
      subscription.cancelAtPeriodEnd = true;
      await subscription.save();
      await writeAudit({
        companyId,
        actorClerkUserId: access.userId,
        actorType: "USER",
        action: "subscription.cancellation_scheduled",
        entityType: "Subscription",
        entityId: String(subscription._id),
        before,
        after: subscription.toObject(),
      });
      return NextResponse.json({ message: "Subskrypcja zakończy się z końcem opłaconego okresu." });
    }
    if (input.action === "RESUME") {
      subscription.cancelAtPeriodEnd = false;
      await subscription.save();
      await writeAudit({
        companyId,
        actorClerkUserId: access.userId,
        actorType: "USER",
        action: "subscription.cancellation_revoked",
        entityType: "Subscription",
        entityId: String(subscription._id),
        before,
        after: subscription.toObject(),
      });
      return NextResponse.json({ message: "Automatyczne odnowienie zostało przywrócone." });
    }
    const { packageCode } = input;
    if (subscription.status === "TRIALING") {
      const plan = await getPlanDefinition(packageCode);
      subscription.packageCode = packageCode;
      subscription.amountGross = plan.monthlyGross;
      subscription.scheduledPackageCode = undefined;
    } else {
      subscription.scheduledPackageCode = packageCode;
    }
    await subscription.save();
    await writeAudit({
      companyId,
      actorClerkUserId: access.userId,
      actorType: "USER",
      action: subscription.status === "TRIALING" ? "subscription.package_changed" : "subscription.package_scheduled",
      entityType: "Subscription",
      entityId: String(subscription._id),
      before,
      after: subscription.toObject(),
    });
    return NextResponse.json({
      message:
        subscription.status === "TRIALING"
          ? `Pakiet ${packageCode} obowiązuje od razu w trialu.`
          : `Pakiet ${packageCode} zacznie obowiązywać od kolejnego okresu.`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nie udało się zmienić pakietu." },
      { status: 400 },
    );
  }
}
