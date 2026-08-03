import { Boxes, DoorOpen, Layers3, PackageOpen, Palette } from "lucide-react";
import { EmptyState, MetricCard, PageHeading } from "@/components/dashboard/DashboardBits";
import { assertCompanyDashboardRole } from "@/server/services/dashboardService";
import { getConfiguratorBootstrap } from "@/server/services/companyService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

function CatalogCard({
  eyebrow,
  title,
  icon,
  items,
  emptyLabel,
  describe,
}: {
  eyebrow: string;
  title: string;
  icon: React.ReactNode;
  items: any[];
  emptyLabel: string;
  describe: (item: any) => string;
}) {
  return (
    <Card className="gap-0">
      <CardHeader className="border-b [.border-b]:pb-5">
        <span className="text-[11px] font-semibold tracking-[0.13em] text-primary uppercase">
          {eyebrow}
        </span>
        <CardTitle>{title}</CardTitle>
        <div className="col-start-2 row-span-2 row-start-1 self-start justify-self-end">
          <span
            aria-hidden="true"
            className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"
          >
            {icon}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {items.length ? (
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li key={item.key} className="flex items-center justify-between gap-3 px-5 py-3">
                <span className="truncate text-sm font-medium">{item.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{describe(item)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={<PackageOpen size={22} />} title={emptyLabel} />
        )}
      </CardContent>
    </Card>
  );
}

export default async function CatalogPage({ params }: { params: Promise<{ firma: string }> }) {
  const { firma } = await params;
  await assertCompanyDashboardRole(firma, ["OWNER", "ADMIN"]);
  const bootstrap = await getConfiguratorBootstrap(firma);
  if (!bootstrap) return null;

  const panels = bootstrap.catalog.panelManufacturers as any[];
  const gates = bootstrap.catalog.gateManufacturers as any[];
  const presets = bootstrap.catalog.presets as any[];
  const finishes = bootstrap.catalog.materialFinishes as any[];

  return (
    <>
      <PageHeading
        eyebrow="Oferta produktowa"
        title="Katalog firmy"
        description="Przegląd elementów opublikowanych globalnie i dostępnych w ustawieniach konfiguratora."
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Producenci płyt" value={panels.length} icon={<Layers3 size={18} />} />
        <MetricCard label="Producenci bram" value={gates.length} icon={<DoorOpen size={18} />} />
        <MetricCard label="Presety" value={presets.length} icon={<Boxes size={18} />} />
        <MetricCard
          label="Kolory i wykończenia"
          value={finishes.length}
          icon={<Palette size={18} />}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <CatalogCard
          eyebrow="Materiały"
          title="Płyty warstwowe"
          icon={<Layers3 size={20} />}
          items={panels}
          emptyLabel="Brak producentów płyt"
          describe={(item) =>
            item.products?.length ? `${item.products.length} produktów` : "Katalog bazowy"
          }
        />
        <CatalogCard
          eyebrow="Otwory"
          title="Bramy"
          icon={<DoorOpen size={20} />}
          items={gates}
          emptyLabel="Brak producentów bram"
          describe={(item) =>
            item.products?.length ? `${item.products.length} modeli` : "Katalog bazowy"
          }
        />
        <CatalogCard
          eyebrow="Konfiguracje"
          title="Presety obiektów"
          icon={<Boxes size={20} />}
          items={presets}
          emptyLabel="Brak dostępnych presetów"
          describe={(item) => item.key}
        />

        <Card className="gap-0">
          <CardHeader className="border-b [.border-b]:pb-5">
            <span className="text-[11px] font-semibold tracking-[0.13em] text-primary uppercase">
              Paleta
            </span>
            <CardTitle>Wykończenia</CardTitle>
            <div className="col-start-2 row-span-2 row-start-1 self-start justify-self-end">
              <span
                aria-hidden="true"
                className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"
              >
                <Palette size={20} />
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            {finishes.length ? (
              <div className="flex flex-wrap gap-2">
                {finishes.slice(0, 24).map((item) => (
                  <Tooltip key={item.key}>
                    <TooltipTrigger asChild>
                      <span
                        aria-label={item.name}
                        className="size-8 rounded-lg border border-border shadow-sm"
                        style={{ background: item.hex || "#ccc" }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>{item.name}</TooltipContent>
                  </Tooltip>
                ))}
              </div>
            ) : (
              <EmptyState icon={<PackageOpen size={22} />} title="Brak dostępnych wykończeń" />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
