import { notFound } from "next/navigation";
import App from "@/App";
import { InactiveConfigurator } from "@/components/saas/InactiveConfigurator";
import { getCompanySettingsEditorBootstrap, getConfiguratorBootstrap } from "@/server/services/companyService";
import { assertCompanyDashboardRole } from "@/server/services/dashboardService";
import { RESERVED_COMPANY_SLUGS } from "@/domain/company";

export const dynamic = "force-dynamic";

function isReservedApplicationPath(slug: string) {
  return slug !== "demo" && RESERVED_COMPANY_SLUGS.has(slug.toLowerCase());
}

export async function generateMetadata({ params }: { params: Promise<{ firma: string }> }) {
  const { firma } = await params;
  if (isReservedApplicationPath(firma)) return { title: "Warstwowe SaaS" };
  const bootstrap = await getConfiguratorBootstrap(firma);
  return {
    title: bootstrap?.company.branding.name || "Konfigurator",
    description: `Konfigurator 3D firmy ${bootstrap?.company.branding.name || firma}`,
  };
}

export default async function CompanyConfiguratorPage({
  params,
  searchParams,
}: {
  params: Promise<{ firma: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { firma } = await params;
  const { preview } = await searchParams;
  if (isReservedApplicationPath(firma)) notFound();
  if (preview === "settings") await assertCompanyDashboardRole(firma, ["OWNER", "ADMIN"]);
  const bootstrap = preview === "settings"
    ? await getCompanySettingsEditorBootstrap(firma)
    : await getConfiguratorBootstrap(firma);
  if (!bootstrap) notFound();
  if (!bootstrap.accessActive) return <InactiveConfigurator bootstrap={bootstrap} />;
  return (
    <>
      {preview === "settings" && <div className="settings-preview-banner">Podgląd prywatnego szkicu — klienci nadal widzą ostatnią opublikowaną wersję.</div>}
      <App bootstrap={bootstrap} accessControlDisabled={preview === "settings"} />
    </>
  );
}
