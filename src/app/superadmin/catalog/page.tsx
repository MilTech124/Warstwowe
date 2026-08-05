import { Boxes } from "lucide-react";
import { CatalogManager } from "@/components/superadmin/CatalogManager";
import { SuperadminPageHeader } from "@/components/superadmin/SuperadminBits";
import { mergeAdminCatalog } from "@/server/services/catalogAdminService";
import { getSuperadminDataset } from "@/server/services/dashboardService";

export default async function CatalogPage() {
  const data = await getSuperadminDataset();
  // Producenci z bazy razem z tymi z konfiguracji statycznej — panel musi
  // pokazywać wszystko, co klient widzi w konfiguratorze.
  const catalog = mergeAdminCatalog(data.manufacturers as any[], data.products as any[]);

  return (
    <>
      <SuperadminPageHeader
        eyebrow="Oferta globalna"
        title="Katalog płyt i bram"
        description="Wybierz producenta, uzupełnij jego dane i parametry produktów, a następnie opublikuj wersję katalogu."
        actions={<span className="sa-page-count"><Boxes size={16} /> {catalog.products.length} produktów</span>}
      />
      <CatalogManager
        manufacturers={JSON.parse(JSON.stringify(catalog.manufacturers))}
        products={JSON.parse(JSON.stringify(catalog.products))}
      />
    </>
  );
}
