import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCompanyMember, requireCompanyWriteIntent } from "@/server/auth";
import { CompanyMembership } from "@/server/db/models";
import { sendTransactionalEmail } from "@/server/email/smtp";
import { applicationUrl } from "@/server/payu/client";
import { getConfiguratorBootstrap } from "@/server/services/companyService";
import { writeAudit } from "@/server/audit";
import { apiError } from "@/server/apiError";

const inviteSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  role: z.enum(["ADMIN", "SALESPERSON"]),
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
      return NextResponse.json({
        invitation: { id: `demo-invite-${Date.now()}`, email: input.email, role: input.role },
        emailSent: true,
      });
    }
    const company = (access as any).company;
    const membershipCount = await CompanyMembership.countDocuments({
      companyId: company._id,
      status: { $in: ["INVITED", "ACTIVE"] },
    });
    if (membershipCount >= bootstrap.seatLimit) {
      throw new Error(`Pakiet ${bootstrap.packageCode} pozwala na maksymalnie ${bootstrap.seatLimit} kont.`);
    }

    const existing = await CompanyMembership.findOne({ companyId: company._id, email: input.email }).lean();
    if (existing && existing.status !== "DISABLED") {
      throw new Error("Ten adres e-mail jest już przypisany do zespołu firmy.");
    }

    const invitation: any = await CompanyMembership.findOneAndUpdate(
      { companyId: company._id, email: input.email },
      {
        $set: {
          role: input.role,
          status: "INVITED",
          invitedByClerkUserId: access.userId,
          invitedAt: new Date(),
        },
        $unset: { clerkUserId: 1, firstName: 1, lastName: 1, joinedAt: 1 },
      },
      { upsert: true, new: true },
    );

    const dashboardPath = `/${firma}/dashboard`;
    const inviteUrl = `${applicationUrl()}/rejestracja?redirect_url=${encodeURIComponent(dashboardPath)}`;
    const emailResult = await sendTransactionalEmail({
      to: input.email,
      subject: `Zaproszenie do zespołu ${bootstrap.company.branding.name}`,
      text: [
        `Administrator firmy ${bootstrap.company.branding.name} zaprosił Cię do panelu Warstwowe3D.`,
        `Zarejestruj się lub zaloguj tym adresem e-mail: ${inviteUrl}`,
      ].join("\n\n"),
    }).catch(() => ({ sent: false as const, reason: "SMTP_ERROR" as const }));

    await writeAudit({
      companyId: company._id,
      actorClerkUserId: access.userId,
      actorType: "USER",
      action: "team.invitation_created",
      entityType: "CompanyMembership",
      entityId: String(invitation._id),
      after: { email: input.email, role: input.role, emailSent: emailResult.sent },
    });
    return NextResponse.json({
      invitation: { id: String(invitation._id), email: input.email, role: input.role },
      emailSent: emailResult.sent,
    });
  } catch (error) {
    return apiError(error, "Nie udało się wysłać zaproszenia.");
  }
}
