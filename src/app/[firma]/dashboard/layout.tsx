import { notFound, redirect } from "next/navigation";
import "@/app/dashboard-premium.css";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
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
    if (!identity.isSuperadmin && identity.orgId !== (company as any).clerkOrgId) notFound();
    role = (await requireCompanyMember(firma)).companyRole;
    superadminAccess = identity.isSuperadmin;
  }

  return (
    <DashboardShell
      slug={firma}
      companyName={bootstrap.company.branding.name}
      packageCode={bootstrap.packageCode}
      accessActive={bootstrap.accessActive}
      role={role}
      superadminAccess={superadminAccess}
    >
      {children}
    </DashboardShell>
  );
}
