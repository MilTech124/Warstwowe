import { redirect } from "next/navigation";
import { getRequestIdentity } from "@/server/auth";
import { findRegistrationForUser } from "@/server/services/companyService";

export const dynamic = "force-dynamic";

export default async function PanelEntryPage() {
  const localDemoEnabled = process.env.NODE_ENV !== "production" && process.env.DEMO_MODE === "true";
  const identity = await getRequestIdentity();
  if (!identity.userId) {
    if (localDemoEnabled) redirect("/demo/dashboard");
    redirect("/logowanie?redirect_url=/panel");
  }

  // Niedokończona rejestracja wraca na `/onboarding`, a nie do martwego panelu:
  // dopiero tam da się poprawić adres firmy i ponowić płatność.
  const registration = await findRegistrationForUser(identity.userId);
  if (registration?.finished && registration.company?.slug) {
    redirect(`/${registration.company.slug}/dashboard`);
  }
  if (registration?.isOwner) redirect("/onboarding");
  if (localDemoEnabled) redirect("/demo/dashboard");
  if (identity.isSuperadmin) redirect("/superadmin");
  redirect("/onboarding");
}
