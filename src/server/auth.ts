import { auth, clerkClient } from "@clerk/nextjs/server";
import { companyInvitationClaimFilter, normalizeCompanyEmail } from "@/domain/companyMembership";
import { CompanyMembership } from "@/server/db/models";
import { findCompanyBySlug } from "@/server/services/companyService";
import type { CompanyRole } from "@/types/saas";
import { companyWriteIntentAllowed } from "@/domain/companyWriteIntent";

/**
 * Authorization failures used to surface as HTTP 400 with the raw internal code
 * in the body, so a client could not tell "log in" from "bad input".
 */
export class AuthError extends Error {
  readonly status: number;
  readonly publicMessage: string;

  constructor(code: string, status: number, publicMessage: string) {
    super(code);
    this.name = "AuthError";
    this.status = status;
    this.publicMessage = publicMessage;
  }
}

export function clerkConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY);
}

export function superadminIds() {
  return new Set(
    (process.env.CLERK_SUPERADMIN_USER_IDS || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

export function isSuperadminId(userId: string | null | undefined) {
  return Boolean(userId && superadminIds().has(userId));
}

export async function getRequestIdentity() {
  if (!clerkConfigured()) {
    return { userId: null, isSuperadmin: false };
  }
  const identity = await auth();
  return {
    userId: identity.userId,
    isSuperadmin: isSuperadminId(identity.userId),
  };
}

async function resolveCompanyRole(company: any, userId: string): Promise<CompanyRole | null> {
  if (userId === company.ownerClerkUserId) return "OWNER";

  const activeMembership: any = await CompanyMembership.findOne({
    companyId: company._id,
    clerkUserId: userId,
    status: "ACTIVE",
  }).lean();
  if (activeMembership) return activeMembership.role as CompanyRole;

  const client = await clerkClient();
  const user = await client.users.getUser(userId);
  const primaryEmailAddress = user.primaryEmailAddress?.emailAddress;
  const primaryEmail = primaryEmailAddress ? normalizeCompanyEmail(primaryEmailAddress) : null;
  const emailVerified = user.primaryEmailAddress?.verification?.status === "verified";
  if (!primaryEmail || !emailVerified) return null;

  const claimedMembership: any = await CompanyMembership.findOneAndUpdate(
    companyInvitationClaimFilter(company._id, primaryEmail),
    {
      $set: {
        clerkUserId: userId,
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
        status: "ACTIVE",
        joinedAt: new Date(),
      },
    },
    { new: true },
  );
  return claimedMembership?.role as CompanyRole || null;
}

export async function requireSuperadmin() {
  const identity = await getRequestIdentity();
  if (!identity.userId) {
    throw new AuthError("AUTH_REQUIRED", 401, "Zaloguj się, aby kontynuować.");
  }
  if (!identity.isSuperadmin) {
    throw new AuthError("SUPERADMIN_REQUIRED", 403, "Brak uprawnień superadmina.");
  }
  return identity;
}

export async function requireCompanyMember(
  slug: string,
  allowedRoles: CompanyRole[] = ["OWNER", "ADMIN", "SALESPERSON"],
) {
  const identity = await getRequestIdentity();
  if (!identity.userId) {
    throw new AuthError("AUTH_REQUIRED", 401, "Zaloguj się, aby kontynuować.");
  }
  const company = await findCompanyBySlug(slug);
  if (!company || (company as any).demo) {
    throw new AuthError("COMPANY_NOT_FOUND", 404, "Firma nie istnieje.");
  }
  if (identity.isSuperadmin) {
    return { ...identity, companyRole: "OWNER" as CompanyRole, company, superadminAccess: true };
  }

  const companyRole = await resolveCompanyRole(company, identity.userId);
  if (!companyRole) {
    throw new AuthError("COMPANY_ACCESS_DENIED", 403, "Nie masz dostępu do tej firmy.");
  }
  if (!allowedRoles.includes(companyRole)) {
    throw new AuthError("ROLE_ACCESS_DENIED", 403, "Twoja rola nie pozwala na tę operację.");
  }
  return { ...identity, companyRole, company, superadminAccess: false };
}

export function requireCompanyWriteIntent(
  request: Request,
  access: { superadminAccess?: boolean },
) {
  if (!companyWriteIntentAllowed(
    Boolean(access.superadminAccess),
    request.headers.get("x-superadmin-write-intent"),
  )) {
    throw new AuthError(
      "SUPERADMIN_READ_ONLY_MODE",
      403,
      "Panel firmy jest dla superadmina tylko do odczytu.",
    );
  }
}
