import { notFound, redirect } from "next/navigation";
import "@/app/dashboard.css";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { panelThemeCss, resolvePanelTheme } from "@/lib/branding";
import { getRequestIdentity, requireCompanyMember } from "@/server/auth";
import { findCompanyBySlug, getConfiguratorBootstrap } from "@/server/services/companyService";

export const dynamic = "force-dynamic";

export default async function CompanyDashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ firma: string }>;
}) {
  const { firma } = await params;
  const [company, bootstrap] = await Promise.all([
    findCompanyBySlug(firma),
    getConfiguratorBootstrap(firma),
  ]);
  if (!company || !bootstrap) notFound();

  let role: "OWNER" | "ADMIN" | "SALESPERSON" = "OWNER";
  let superadminAccess = false;
  if (!(company as any).demo) {
    const identity = await getRequestIdentity();
    if (!identity.userId) redirect(`/logowanie?redirect_url=/${firma}/dashboard`);
    try {
      const access = await requireCompanyMember(firma);
      role = access.companyRole;
      superadminAccess = identity.isSuperadmin;
    } catch {
      notFound();
    }
  }

  // Emitted at document level, not on the shell: Radix and Sonner portal into
  // <body>, so panel-scoped variables would never reach them.
  const theme = resolvePanelTheme(bootstrap.company.branding);

  return (
    <>
      <style>{panelThemeCss(theme)}</style>
      <DashboardShell
      slug={firma}
      companyName={bootstrap.company.branding.name}
      packageCode={bootstrap.packageCode}
      accessActive={bootstrap.accessActive}
      role={role}
      features={bootstrap.capabilities}
      superadminAccess={superadminAccess}
      >
        {children}
      </DashboardShell>
    </>
  );
}
