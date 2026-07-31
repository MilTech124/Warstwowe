import { notFound } from "next/navigation";
import App from "@/App";
import { InactiveConfigurator } from "@/components/saas/InactiveConfigurator";
import { getConfiguratorBootstrap } from "@/server/services/companyService";
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
}: {
  params: Promise<{ firma: string }>;
}) {
  const { firma } = await params;
  if (isReservedApplicationPath(firma)) notFound();
  const bootstrap = await getConfiguratorBootstrap(firma);
  if (!bootstrap) notFound();
  if (!bootstrap.accessActive) return <InactiveConfigurator bootstrap={bootstrap} />;
  return <App bootstrap={bootstrap} />;
}
