import Link from "next/link";
import { BadgeDollarSign } from "lucide-react";
import { EmptyState, PageHeading } from "@/components/dashboard/DashboardBits";
import { PricingEditor } from "@/components/dashboard/PricingEditor";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { assertCompanyDashboardRole } from "@/server/services/dashboardService";
import { getConfiguratorBootstrap } from "@/server/services/companyService";
import { getPriceListEditorBootstrap } from "@/server/services/priceListService";

export default async function PricingPage({ params }: { params: Promise<{ firma: string }> }) {
  const { firma } = await params;
  const access: any = await assertCompanyDashboardRole(firma, ["OWNER", "ADMIN"]);
  const bootstrap = await getConfiguratorBootstrap(firma);
  if (!bootstrap) return null;

  const heading = (
    <PageHeading
      eyebrow="Sprzedaż"
      title="Cennik firmy"
      description="Stawki, po których konfigurator automatycznie wycenia zamówienia klientów."
    />
  );

  if (!bootstrap.capabilities.pricing) {
    return (
      <>
        {heading}
        <Card className="py-0">
          <CardContent className="p-0">
            <EmptyState
              icon={<BadgeDollarSign size={28} />}
              title="Cennik nie jest dostępny w tym pakiecie"
              description={`Automatyczna wycena jest częścią pakietów Gold i wyższych. Twój bieżący pakiet to ${bootstrap.packageCode}.`}
              action={
                <Button asChild size="sm">
                  <Link href={`/${firma}/dashboard/billing`}>Zmień pakiet</Link>
                </Button>
              }
            />
          </CardContent>
        </Card>
      </>
    );
  }

  const priceList = await getPriceListEditorBootstrap(access?.company?._id);
  if (!priceList) return null;

  return (
    <>
      {heading}
      <PricingEditor
        slug={firma}
        initial={priceList as never}
        defaultPresetId={bootstrap.settings.defaultPresetId}
        wallPanelModels={bootstrap.catalog.wallPanelModels as never}
        roofPanelModels={bootstrap.catalog.roofPanelModels as never}
        gateModels={bootstrap.catalog.gateModels as never}
        doorModels={bootstrap.catalog.doorModels as never}
        windowModels={bootstrap.catalog.windowModels as never}
      />
    </>
  );
}
