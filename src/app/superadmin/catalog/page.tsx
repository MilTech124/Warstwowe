import { Boxes } from "lucide-react";
import { CatalogManager } from "@/components/superadmin/CatalogManager";
import { SuperadminPageHeader } from "@/components/superadmin/SuperadminBits";
import { getSuperadminDataset } from "@/server/services/dashboardService";

export default async function CatalogPage() {
  const data = await getSuperadminDataset();
  return (
    <>
      <SuperadminPageHeader
        eyebrow="Oferta globalna"
        title="Katalog płyt i bram"
        description="Twórz producentów i produkty, kontroluj publikację oraz zachowuj wersje użyte w historycznych zamówieniach."
        actions={<span className="sa-page-count"><Boxes size={16} /> {data.products.length} produktów</span>}
      />
      <CatalogManager manufacturers={JSON.parse(JSON.stringify(data.manufacturers))} products={JSON.parse(JSON.stringify(data.products))} />
    </>
  );
}
