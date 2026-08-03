import { redirect } from "next/navigation";
import { getRequestIdentity } from "@/server/auth";
import { findCompanyForUser } from "@/server/services/companyService";
import { reconcileLatestCompanyPayment } from "@/server/services/paymentStatusService";

export const dynamic = "force-dynamic";

export default async function PanelEntryPage() {
  const localDemoEnabled = process.env.NODE_ENV !== "production" && process.env.DEMO_MODE === "true";
  const identity = await getRequestIdentity();
  if (!identity.userId) {
    if (localDemoEnabled) redirect("/demo/dashboard");
    redirect("/logowanie?redirect_url=/panel");
  }

  const company: any = await findCompanyForUser(identity.userId);
  if (company?.slug) {
    try {
      await reconcileLatestCompanyPayment(company._id);
    } catch {
      // Webhook remains the primary source; a temporary PayU error must not block dashboard access.
    }
    redirect(`/${company.slug}/dashboard`);
  }
  if (localDemoEnabled) redirect("/demo/dashboard");
  if (identity.isSuperadmin) redirect("/superadmin");
  redirect("/onboarding");
}
