export function normalizeCompanyEmail(email: string) {
  return email.trim().toLowerCase();
}

export function companyInvitationClaimFilter(companyId: unknown, verifiedEmail: string) {
  return {
    companyId,
    email: normalizeCompanyEmail(verifiedEmail),
    status: "INVITED" as const,
    clerkUserId: { $exists: false as const },
  };
}
