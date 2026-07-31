import { clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { clerkConfigured, requireCompanyMember, requireCompanyWriteIntent } from "@/server/auth";
import { writeAudit } from "@/server/audit";

const roleSchema = z.object({ role: z.enum(["org:admin", "org:member"]) });

async function getContext(request: NextRequest, firma: string, userId: string) {
  const access = await requireCompanyMember(firma, ["OWNER", "ADMIN"]);
  requireCompanyWriteIntent(request, access);
  const company: any = (access as any).company;
  if (userId === company.ownerClerkUserId) throw new Error("Nie można usunąć ani zdegradować właściciela firmy.");
  if (!clerkConfigured()) throw new Error("Clerk nie jest skonfigurowany.");
  return { access, company, client: await clerkClient() };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ firma: string; userId: string }> },
) {
  try {
    const { firma, userId } = await params;
    const { role } = roleSchema.parse(await request.json());
    const { access, company, client } = await getContext(request, firma, userId);
    const membership = await client.organizations.updateOrganizationMembership({
      organizationId: company.clerkOrgId,
      userId,
      role,
    });
    await writeAudit({
      companyId: company._id,
      actorClerkUserId: access.userId,
      actorType: "USER",
      action: "team.role_changed",
      entityType: "ClerkMembership",
      entityId: membership.id,
      after: { userId, role },
    });
    return NextResponse.json({ membership });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Nie udało się zmienić roli." }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ firma: string; userId: string }> },
) {
  try {
    const { firma, userId } = await params;
    const { access, company, client } = await getContext(request, firma, userId);
    const membership = await client.organizations.deleteOrganizationMembership({
      organizationId: company.clerkOrgId,
      userId,
    });
    await writeAudit({
      companyId: company._id,
      actorClerkUserId: access.userId,
      actorType: "USER",
      action: "team.member_removed",
      entityType: "ClerkMembership",
      entityId: membership.id,
      before: { userId },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Nie udało się usunąć konta." }, { status: 400 });
  }
}
