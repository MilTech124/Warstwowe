export function companyWriteIntentAllowed(
  superadminAccess: boolean,
  confirmation: string | null,
) {
  return !superadminAccess || confirmation === "confirmed";
}
