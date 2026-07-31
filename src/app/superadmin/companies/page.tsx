import { Building2 } from "lucide-react";
import { CompaniesManager } from "@/components/superadmin/CompaniesManager";
import { SuperadminPageHeader } from "@/components/superadmin/SuperadminBits";
import { getSuperadminDataset } from "@/server/services/dashboardService";

export default async function CompaniesPage() {
  const data = await getSuperadminDataset();
  return (
    <>
      <SuperadminPageHeader
        eyebrow="Tenanci"
        title="Firmy"
        description="Kontroluj dostęp, pakiety, okresy rozliczeniowe oraz wyjątki funkcjonalne dla każdej organizacji."
        actions={<span className="sa-page-count"><Building2 size={16} /> {data.companies.length} firm</span>}
      />
      <CompaniesManager companies={JSON.parse(JSON.stringify(data.companies))} />
    </>
  );
}
