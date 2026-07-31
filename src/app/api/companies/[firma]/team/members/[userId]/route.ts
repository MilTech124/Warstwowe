import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCompanyMember, requireCompanyWriteIntent } from "@/server/auth";
import { CompanyMembership } from "@/server/db/models";
import { writeAudit } from "@/server/audit";

const roleSchema = z.object({ role: z.enum(["ADMIN", "SALESPERSON"]) });

async function getContext(request: NextRequest, firma: string, membershipId: string) {
  const access = await requireCompanyMember(firma, ["OWNER", "ADMIN"]);
  requireCompanyWriteIntent(request, access);
  const company: any = (access as any).company;
  const membership: any = await CompanyMembership.findOne({ _id: membershipId, companyId: company._id });
  if (!membership) throw new Error("Konto nie istnieje w tej firmie.");
  if (membership.role === "OWNER" || membership.clerkUserId === company.ownerClerkUserId) {
    throw new Error("Nie można usunąć ani zdegradować właściciela firmy.");
  }
  return { access, company, membership };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ firma: string; userId: string }> },
) {
  try {
    const { firma, userId: membershipId } = await params;
    const { role } = roleSchema.parse(await request.json());
    const { access, company, membership } = await getContext(request, firma, membershipId);
    const beforeRole = membership.role;
    membership.role = role;
    await membership.save();
    await writeAudit({
      companyId: company._id,
      actorClerkUserId: access.userId,
      actorType: "USER",
      action: "team.role_changed",
      entityType: "CompanyMembership",
      entityId: String(membership._id),
      before: { role: beforeRole },
      after: { clerkUserId: membership.clerkUserId, role },
    });
    return NextResponse.json({ membership: { id: String(membership._id), role } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Nie udało się zmienić roli." }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ firma: string; userId: string }> },
) {
  try {
    const { firma, userId: membershipId } = await params;
    const { access, company, membership } = await getContext(request, firma, membershipId);
    const before = { clerkUserId: membership.clerkUserId, email: membership.email, role: membership.role };
    await membership.deleteOne();
    await writeAudit({
      companyId: company._id,
      actorClerkUserId: access.userId,
      actorType: "USER",
      action: "team.member_removed",
      entityType: "CompanyMembership",
      entityId: membershipId,
      before,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Nie udało się usunąć konta." }, { status: 400 });
  }
}
