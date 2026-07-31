import { PageHeading } from "@/components/dashboard/DashboardBits";
import { SettingsEditor } from "@/components/dashboard/SettingsEditor";
import { assertCompanyDashboardRole } from "@/server/services/dashboardService";
import { getConfiguratorBootstrap } from "@/server/services/companyService";

export default async function SettingsPage({ params }: { params: Promise<{ firma: string }> }) {
  const { firma } = await params;
  await assertCompanyDashboardRole(firma, ["OWNER", "ADMIN"]);
  const bootstrap = await getConfiguratorBootstrap(firma);
  if (!bootstrap) return null;
  return (
    <>
      <PageHeading eyebrow="Konfigurator" title="Ustawienia firmy" description="Zbuduj ofertę widoczną dla klientów, zapisz szkic i opublikuj gotową wersję." />
      <SettingsEditor bootstrap={bootstrap} />
    </>
  );
}
