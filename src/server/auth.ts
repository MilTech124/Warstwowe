import { auth, clerkClient } from "@clerk/nextjs/server";
import { findCompanyBySlug } from "@/server/services/companyService";
import type { CompanyRole } from "@/types/saas";

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
    return { userId: null, orgId: null, orgRole: null, isSuperadmin: false };
  }
  const identity = await auth();
  return {
    userId: identity.userId,
    orgId: identity.orgId,
    orgRole: identity.orgRole,
    isSuperadmin: isSuperadminId(identity.userId),
  };
}

export async function requireSuperadmin() {
  const identity = await getRequestIdentity();
  if (!identity.userId || !identity.isSuperadmin) {
    throw new Error("SUPERADMIN_REQUIRED");
  }
  return identity;
}

export async function requireCompanyMember(
  slug: string,
  allowedRoles: CompanyRole[] = ["OWNER", "ADMIN", "SALESPERSON"],
) {
  const identity = await getRequestIdentity();
  if (!identity.userId) throw new Error("AUTH_REQUIRED");
  const company = await findCompanyBySlug(slug);
  if (!company || (company as any).demo) throw new Error("COMPANY_NOT_FOUND");
  if (identity.isSuperadmin) {
    return { ...identity, companyRole: "OWNER" as CompanyRole, company, superadminAccess: true };
  }

  if (identity.orgId !== (company as any).clerkOrgId) throw new Error("COMPANY_ACCESS_DENIED");

  const companyRole: CompanyRole =
    identity.userId === (company as any).ownerClerkUserId
      ? "OWNER"
      : identity.orgRole === "org:admin"
        ? "ADMIN"
        : "SALESPERSON";

  if (!allowedRoles.includes(companyRole)) throw new Error("ROLE_ACCESS_DENIED");
  return { ...identity, companyRole, company, superadminAccess: false };
}

export function requireCompanyWriteIntent(
  request: Request,
  access: { superadminAccess?: boolean },
) {
  if (access.superadminAccess && request.headers.get("x-superadmin-write-intent") !== "confirmed") {
    throw new Error("SUPERADMIN_READ_ONLY_MODE");
  }
}

export async function createClerkOrganization(name: string, slug: string, userId: string) {
  if (!clerkConfigured()) throw new Error("CLERK_NOT_CONFIGURED");
  const client = await clerkClient();
  try {
    return await client.organizations.createOrganization({
      name,
      slug,
      createdBy: userId,
    });
  } catch (error: any) {
    const clerkDetails = [
      error?.message,
      error?.errors?.[0]?.message,
      error?.errors?.[0]?.longMessage,
      error?.errors?.[0]?.long_message,
    ].filter(Boolean).join(" ").toLowerCase();
    const organizationsDisabled = error?.status === 403
      || error?.statusCode === 403
      || clerkDetails.includes("organizations feature is not enabled")
      || clerkDetails === "forbidden";

    if (organizationsDisabled) {
      throw new Error(
        "Organizacje Clerk nie są włączone. Administrator aplikacji musi aktywować Organizations w panelu Clerk.",
      );
    }
    throw error;
  }
}
