import { PackageOpen } from "lucide-react";
import { PlansManager } from "@/components/superadmin/PlansManager";
import { SuperadminPageHeader } from "@/components/superadmin/SuperadminBits";
import { PACKAGE_DEFINITIONS } from "@/domain/plans";
import { getSuperadminDataset } from "@/server/services/dashboardService";

export default async function PlansPage() {
  const data = await getSuperadminDataset();
  const plans = data.plans.length ? data.plans : Object.values(PACKAGE_DEFINITIONS).map((plan) => ({ ...plan, version: 1, active: true }));
  return (
    <>
      <SuperadminPageHeader
        eyebrow="Monetyzacja"
        title="Pakiety i uprawnienia"
        description="Zarządzaj cenami, limitami kont oraz macierzą funkcji. Publikacja zawsze tworzy nową wersję."
        actions={<span className="sa-page-count"><PackageOpen size={16} /> {plans.length} pakiety</span>}
      />
      <div className="sa-alert sa-alert-info" role="note">
        <span><PackageOpen size={19} /></span>
        <div><strong>Bezpieczne wersjonowanie cen</strong><p>Nowe stawki nie zmieniają automatycznie kwot istniejących subskrypcji.</p></div>
      </div>
      <PlansManager initialPlans={JSON.parse(JSON.stringify(plans))} />
    </>
  );
}
