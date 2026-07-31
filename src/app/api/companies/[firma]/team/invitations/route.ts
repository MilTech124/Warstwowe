import { clerkClient } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { clerkConfigured, requireCompanyMember, requireCompanyWriteIntent } from "@/server/auth";
import { getConfiguratorBootstrap } from "@/server/services/companyService";
import { writeAudit } from "@/server/audit";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["org:admin", "org:member"]),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ firma: string }> },
) {
  try {
    const { firma } = await params;
    const access = await requireCompanyMember(firma, ["OWNER", "ADMIN"]);
    requireCompanyWriteIntent(request, access);
    const input = inviteSchema.parse(await request.json());
    const bootstrap = await getConfiguratorBootstrap(firma);
    if (!bootstrap) throw new Error("Firma nie istnieje.");
    if ((access as any).company?.demo || bootstrap.company.id === "demo-company") {
      return NextResponse.json({ invitation: { id: `demo-invite-${Date.now()}` } });
    }
    if (!clerkConfigured()) throw new Error("Clerk nie jest skonfigurowany.");
    const client = await clerkClient();
    const company = (access as any).company;
    const memberships = await client.organizations.getOrganizationMembershipList({
      organizationId: company.clerkOrgId,
      limit: 100,
    });
    if (memberships.totalCount >= bootstrap.seatLimit) {
      throw new Error(`Pakiet ${bootstrap.packageCode} pozwala na maksymalnie ${bootstrap.seatLimit} kont.`);
    }
    const invitation = await client.organizations.createOrganizationInvitation({
      organizationId: company.clerkOrgId,
      inviterUserId: access.userId!,
      emailAddress: input.email,
      role: input.role,
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/${firma}/dashboard`,
    });
    await writeAudit({
      companyId: company._id,
      actorClerkUserId: access.userId,
      actorType: "USER",
      action: "team.invitation_created",
      entityType: "ClerkInvitation",
      entityId: invitation.id,
      after: { email: input.email, role: input.role },
    });
    return NextResponse.json({ invitation: { id: invitation.id } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nie udało się wysłać zaproszenia." },
      { status: 400 },
    );
  }
}
