"use client";

import { FormEvent, useState } from "react";
import { Archive, Boxes, Building2, Layers3, LoaderCircle, Plus, Save, Send } from "lucide-react";
import { SuperadminEmpty, SuperadminSectionHeader, SuperadminStatus } from "@/components/superadmin/SuperadminBits";

export function CatalogManager({ manufacturers, products }: { manufacturers: any[]; products: any[] }) {
  const [items, setItems] = useState(manufacturers);
  const [productItems, setProductItems] = useState(products);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function submitManufacturer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    const form = event.currentTarget;
    try {
      const values = Object.fromEntries(new FormData(form));
      const response = await fetch("/api/superadmin/catalog", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entity: "manufacturer", ...values }),
      });
      const result = await response.json();
      if (!response.ok) return setNotice({ tone: "error", text: result.error || "Nie udało się dodać producenta." });
      setItems((current) => [result.document, ...current]);
      form.reset();
      setNotice({ tone: "success", text: "Producent został zapisany jako szkic." });
    } catch {
      setNotice({ tone: "error", text: "Nie udało się połączyć z serwerem." });
    } finally {
      setBusy(false);
    }
  }

  async function submitProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    const form = event.currentTarget;
    try {
      const values = Object.fromEntries(new FormData(form));
      const response = await fetch("/api/superadmin/catalog", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          entity: "product",
          ...values,
          status: "DRAFT",
          thicknessMm: String(values.thicknessMm || "").split(",").map(Number).filter((value) => value > 0),
          colorIds: String(values.colorIds || "").split(",").map((value) => value.trim()).filter(Boolean),
          renderKind: "PARAMETRIC",
        }),
      });
      const result = await response.json();
      if (!response.ok) return setNotice({ tone: "error", text: result.error || "Nie udało się dodać produktu." });
      setProductItems((current) => [result.document, ...current]);
      form.reset();
      setNotice({ tone: "success", text: "Produkt został zapisany jako szkic." });
    } catch {
      setNotice({ tone: "error", text: "Nie udało się połączyć z serwerem." });
    } finally {
      setBusy(false);
    }
  }

  async function publish(entity: "manufacturer" | "product", item: any, status: string) {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/superadmin/catalog", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          entity,
          id: item._id,
          kind: item.kind,
          key: item.key,
          name: item.name,
          status,
          ...(entity === "product" ? {
            manufacturerKey: item.manufacturerKey,
            thicknessMm: item.thicknessMm || [],
            colorIds: item.colorIds || [],
            profile: item.profile || "",
            renderKind: item.renderKind || "PARAMETRIC",
            modelUrl: item.modelUrl || "",
            animationProfile: item.animationProfile || "NONE",
          } : { logoUrl: item.logoUrl || "", websiteUrl: item.websiteUrl || "" }),
        }),
      });
      const result = await response.json();
      if (!response.ok) return setNotice({ tone: "error", text: result.error || "Nie udało się zmienić statusu." });
      const setter = entity === "product" ? setProductItems : setItems;
      setter((current: any[]) => current.map((entry) => entry._id === item._id ? result.document : entry));
      setNotice({ tone: "success", text: status === "PUBLISHED" ? "Opublikowano nową wersję katalogu." : "Pozycja została zarchiwizowana." });
    } catch {
      setNotice({ tone: "error", text: "Nie udało się połączyć z serwerem." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sa-catalog-layout">
      {notice ? <div className={`sa-form-notice is-${notice.tone} sa-span-3`} role={notice.tone === "error" ? "alert" : "status"} aria-live="polite">{notice.text}</div> : null}

      <section className="sa-card">
        <SuperadminSectionHeader eyebrow="Nowa pozycja" title="Dodaj producenta" icon={Building2} />
        <form className="sa-catalog-form" onSubmit={submitManufacturer}>
          <label><span>Typ producenta</span><select name="kind"><option value="PANEL">Płyty warstwowe</option><option value="GATE">Bramy</option></select></label>
          <label><span>Klucz systemowy</span><input name="key" required pattern="[a-z0-9_-]+" placeholder="np. steelprofil" /><small>Małe litery, cyfry, „-” i „_”.</small></label>
          <label><span>Nazwa wyświetlana</span><input name="name" required placeholder="Nazwa producenta" /></label>
          <input type="hidden" name="status" value="DRAFT" />
          <button className="sa-button sa-button-primary" disabled={busy}>{busy ? <LoaderCircle className="sa-spin" size={16} /> : <Save size={16} />} Zapisz szkic</button>
        </form>
      </section>

      <section className="sa-card sa-span-2">
        <SuperadminSectionHeader eyebrow="Nowa pozycja" title="Dodaj produkt" icon={Layers3} />
        <form className="sa-catalog-form sa-catalog-form-grid" onSubmit={submitProduct}>
          <label><span>Rodzaj produktu</span><select name="kind"><option value="WALL_PANEL">Płyta ścienna</option><option value="ROOF_PANEL">Płyta dachowa</option><option value="GATE">Brama</option></select></label>
          <label><span>Producent</span><select name="manufacturerKey" required><option value="">Wybierz producenta</option>{items.map((item) => <option key={item._id} value={item.key}>{item.name}</option>)}</select></label>
          <label><span>Klucz modelu</span><input name="key" required pattern="[a-z0-9_-]+" placeholder="np. pir-100" /></label>
          <label><span>Nazwa handlowa</span><input name="name" required placeholder="Nazwa produktu" /></label>
          <label><span>Grubości w mm</span><input name="thicknessMm" placeholder="60, 80, 100" /><small>Wartości rozdziel przecinkami.</small></label>
          <label><span>Klucze kolorów</span><input name="colorIds" placeholder="ral7016, ral9005" /><small>Klucze rozdziel przecinkami.</small></label>
          <label className="sa-form-wide"><span>Profil animacji bramy</span><select name="animationProfile"><option value="NONE">Brak animacji</option><option value="SECTIONAL">Segmentowy</option><option value="ROLLER">Roletowy</option><option value="TILTING">Uchylny</option></select></label>
          <button className="sa-button sa-button-primary sa-form-submit" disabled={busy}>{busy ? <LoaderCircle className="sa-spin" size={16} /> : <Plus size={16} />} Dodaj produkt</button>
        </form>
      </section>

      <section className="sa-card">
        <SuperadminSectionHeader eyebrow={`${items.length} pozycji`} title="Producenci" icon={Building2} />
        <div className="sa-catalog-list">
          {items.map((item) => (
            <article key={item._id}>
              <span className="sa-catalog-entity-icon"><Building2 size={17} /></span>
              <div><strong>{item.name}</strong><small>{item.kind} · v{item.version}</small></div>
              <SuperadminStatus status={item.status} />
              <button className="sa-button sa-button-secondary" disabled={busy} onClick={() => publish("manufacturer", item, item.status === "PUBLISHED" ? "ARCHIVED" : "PUBLISHED")}>
                {item.status === "PUBLISHED" ? <Archive size={15} /> : <Send size={15} />}{item.status === "PUBLISHED" ? "Archiwizuj" : "Publikuj"}
              </button>
            </article>
          ))}
          {!items.length ? <SuperadminEmpty>Brak producentów w katalogu.</SuperadminEmpty> : null}
        </div>
      </section>

      <section className="sa-card sa-span-2">
        <SuperadminSectionHeader eyebrow={`${productItems.length} pozycji`} title="Produkty płyt i bram" icon={Boxes} />
        <div className="sa-catalog-list">
          {productItems.map((item) => (
            <article key={item._id}>
              <span className="sa-catalog-entity-icon"><Boxes size={17} /></span>
              <div><strong>{item.name}</strong><small>{item.manufacturerKey} · {item.kind} · v{item.version}</small></div>
              <SuperadminStatus status={item.status} />
              <button className="sa-button sa-button-secondary" disabled={busy} onClick={() => publish("product", item, item.status === "PUBLISHED" ? "ARCHIVED" : "PUBLISHED")}>
                {item.status === "PUBLISHED" ? <Archive size={15} /> : <Send size={15} />}{item.status === "PUBLISHED" ? "Archiwizuj" : "Publikuj"}
              </button>
            </article>
          ))}
          {!productItems.length ? <SuperadminEmpty>Brak produktów w katalogu.</SuperadminEmpty> : null}
        </div>
      </section>
    </div>
  );
}
