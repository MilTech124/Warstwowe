import Link from "next/link";
import { ArrowLeft, Box, Info } from "lucide-react";
import { notFound } from "next/navigation";
import App from "@/App";
import { Button } from "@/components/ui/button";
import { getCompanyOrder } from "@/server/services/dashboardService";
import { getConfiguratorBootstrap } from "@/server/services/companyService";
import { FEATURE_KEYS } from "@/types/saas";

export const dynamic = "force-dynamic";

export default async function OrderConfigurationPreviewPage({ params }: {
  params: Promise<{ firma: string; orderId: string }>;
}) {
  const { firma, orderId } = await params;
  const [data, companyBootstrap] = await Promise.all([
    getCompanyOrder(firma, orderId),
    getConfiguratorBootstrap(firma),
  ]);
  if (!data || !companyBootstrap) notFound();

  const snapshot = (data.order as any).configurationSnapshot;
  if (!snapshot) notFound();
  const allCapabilities = Object.fromEntries(FEATURE_KEYS.map((key) => [key, true])) as typeof companyBootstrap.capabilities;
  const previewBootstrap = {
    ...companyBootstrap,
    accessActive: true,
    capabilities: allCapabilities,
    availableCapabilities: allCapabilities,
    settings: {
      ...companyBootstrap.settings,
      manuallyEnabled: true,
      disabledFeatures: [],
      allowedPresetIds: [],
      allowedRoofTypeIds: [],
      allowedOpeningKinds: [],
      allowedWallColorIds: [],
      allowedRoofColorIds: [],
      allowedPanelManufacturerIds: [],
      allowedGateManufacturerIds: [],
      allowedWallPanelModelIds: [],
      allowedRoofPanelModelIds: [],
      allowedGateTypeIds: [],
      allowedGateModelIds: [],
      allowedDoorModelIds: [],
      allowedWindowModelIds: [],
    },
    initialConfiguration: snapshot,
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
        <Button asChild variant="link" size="sm" className="px-0">
          <Link href={`/${firma}/dashboard/orders/${orderId}`}>
            <ArrowLeft size={15} /> Wróć do zamówienia
          </Link>
        </Button>
        <div className="grid leading-tight">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.13em] text-muted-foreground uppercase">
            <Box size={14} /> Podgląd konfiguracji 3D
          </span>
          <strong className="text-sm font-semibold">{(data.order as any).number}</strong>
        </div>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Info size={14} /> To zapis obiektu z chwili złożenia zamówienia.
        </p>
      </div>
      <div className="overflow-hidden rounded-xl border border-border">
        <App bootstrap={previewBootstrap} previewOnly />
      </div>
    </div>
  );
}
