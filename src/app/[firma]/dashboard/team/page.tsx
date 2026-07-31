import { PageHeading } from "@/components/dashboard/DashboardBits";
import { TeamManager } from "@/components/dashboard/TeamManager";
import { assertCompanyDashboardRole, getCompanyTeam } from "@/server/services/dashboardService";
import { getConfiguratorBootstrap } from "@/server/services/companyService";

export default async function TeamPage({ params }: { params: Promise<{ firma: string }> }) {
  const { firma } = await params;
  await assertCompanyDashboardRole(firma, ["OWNER", "ADMIN"]);
  const [members, bootstrap] = await Promise.all([getCompanyTeam(firma), getConfiguratorBootstrap(firma)]);
  if (!bootstrap) return null;
  return (
    <>
      <PageHeading eyebrow="Organizacja" title="Zespół" description="Zarządzaj dostępem, rolami i limitem kont przypisanym do pakietu." />
      <TeamManager slug={firma} members={members as any[]} seatLimit={bootstrap.seatLimit} />
    </>
  );
}
