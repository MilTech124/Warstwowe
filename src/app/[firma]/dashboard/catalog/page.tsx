import { Boxes, DoorOpen, Layers3, PackageOpen, Palette } from "lucide-react";
import { PageHeading, MetricCard } from "@/components/dashboard/DashboardBits";
import { assertCompanyDashboardRole } from "@/server/services/dashboardService";
import { getConfiguratorBootstrap } from "@/server/services/companyService";

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
      <PageHeading eyebrow="Oferta produktowa" title="Katalog firmy" description="Przegląd elementów opublikowanych globalnie i dostępnych w ustawieniach konfiguratora." />
      <div className="metric-grid">
        <MetricCard label="Producenci płyt" value={panels.length} icon={<Layers3 size={19} />} />
        <MetricCard label="Producenci bram" value={gates.length} icon={<DoorOpen size={19} />} />
        <MetricCard label="Presety" value={presets.length} icon={<Boxes size={19} />} />
        <MetricCard label="Kolory i wykończenia" value={finishes.length} icon={<Palette size={19} />} />
      </div>
      <div className="catalog-grid">
        <section className="dashboard-card catalog-card">
          <div className="catalog-card-heading"><div className="catalog-icon"><Layers3 /></div><div><span>Materiały</span><h2>Płyty warstwowe</h2></div></div>
          <div className="catalog-card-list">{panels.map((item) => <div key={item.key}><span>{item.name}</span><small>{item.products?.length || "Katalog bazowy"} produktów</small></div>)}</div>
          {!panels.length && <div className="empty-state compact"><PackageOpen size={22} /><span>Brak producentów płyt.</span></div>}
        </section>
        <section className="dashboard-card catalog-card">
          <div className="catalog-card-heading"><div className="catalog-icon"><DoorOpen /></div><div><span>Otwory</span><h2>Bramy</h2></div></div>
          <div className="catalog-card-list">{gates.map((item) => <div key={item.key}><span>{item.name}</span><small>{item.products?.length || "Katalog bazowy"} modeli</small></div>)}</div>
          {!gates.length && <div className="empty-state compact"><PackageOpen size={22} /><span>Brak producentów bram.</span></div>}
        </section>
        <section className="dashboard-card catalog-card">
          <div className="catalog-card-heading"><div className="catalog-icon"><Boxes /></div><div><span>Konfiguracje</span><h2>Presety obiektów</h2></div></div>
          <div className="catalog-card-list">{presets.map((item) => <div key={item.key}><span>{item.name}</span><small>{item.key}</small></div>)}</div>
          {!presets.length && <div className="empty-state compact"><PackageOpen size={22} /><span>Brak dostępnych presetów.</span></div>}
        </section>
        <section className="dashboard-card catalog-card">
          <div className="catalog-card-heading"><div className="catalog-icon"><Palette /></div><div><span>Paleta</span><h2>Wykończenia</h2></div></div>
          <div className="finish-swatches">{finishes.slice(0, 20).map((item) => <i key={item.key} aria-label={item.name} title={item.name} style={{ background: item.hex || "#ccc" }} />)}</div>
          {!finishes.length && <div className="empty-state compact"><PackageOpen size={22} /><span>Brak dostępnych wykończeń.</span></div>}
        </section>
      </div>
    </>
  );
}
