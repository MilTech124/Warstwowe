"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { Archive, Boxes, Building2, ImageUp, Layers3, LoaderCircle, Plus, Save, Send } from "lucide-react";
import { SuperadminEmpty, SuperadminSectionHeader, SuperadminStatus } from "@/components/superadmin/SuperadminBits";

/** „60:0,32, 80:0,26" → tabela U z karty technicznej producenta. */
function parseUValues(raw: string) {
  return String(raw || "")
    .split(",")
    .map((pair) => pair.split(":").map((value) => Number(value.trim().replace(",", "."))))
    .filter(([thicknessMm, uWm2K]) => thicknessMm > 0 && uWm2K > 0)
    .map(([thicknessMm, uWm2K]) => ({ thicknessMm, uWm2K }));
}

const SYSTEM_FIELDS = new Set(["_id", "__v", "createdAt", "updatedAt", "version", "entity", "id", "status"]);

/** Dokument z bazy w kształcie akceptowanym przez zod (bez pól technicznych i pustych wartości). */
function catalogPayload(item: Record<string, any>) {
  return Object.fromEntries(
    Object.entries(item).filter(([key, value]) => !SYSTEM_FIELDS.has(key) && value !== null && value !== undefined),
  );
}

function decimal(raw: unknown) {
  const value = Number(String(raw ?? "").trim().replace(",", "."));
  return value > 0 ? value : undefined;
}

export function CatalogManager({ manufacturers, products }: { manufacturers: any[]; products: any[] }) {
  const [items, setItems] = useState(manufacturers);
  const [productItems, setProductItems] = useState(products);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  async function uploadLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    const form = event.target.form;
    const manufacturerKey = String((form?.elements.namedItem("key") as HTMLInputElement)?.value || "").trim();
    if (!file || !form) return;
    if (!manufacturerKey) {
      setNotice({ tone: "error", text: "Najpierw podaj klucz systemowy producenta." });
      event.target.value = "";
      return;
    }

    setBusy(true);
    setNotice(null);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("manufacturerKey", manufacturerKey);
      const response = await fetch("/api/superadmin/assets", { method: "POST", body });
      const result = await response.json();
      if (!response.ok) return setNotice({ tone: "error", text: result.error || "Nie udało się przesłać logo." });
      (form.elements.namedItem("logoUrl") as HTMLInputElement).value = result.url;
      setNotice({ tone: "success", text: "Logo zostało wgrane — zapisz producenta." });
    } catch {
      setNotice({ tone: "error", text: "Nie udało się połączyć z serwerem." });
    } finally {
      event.target.value = "";
      setBusy(false);
    }
  }

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
          specs: {
            coreType: String(values.coreType || ""),
            lambdaWmK: decimal(values.lambdaWmK),
            uValues: parseUValues(String(values.uValues || "")),
            fireClass: String(values.fireClass || ""),
            datasheetUrl: String(values.datasheetUrl || ""),
          },
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
        // Cały dokument, a nie ręczna lista pól — inaczej publikacja kasuje
        // dane, których ta lista nie zna (logo, opis marki, parametry λ i U).
        body: JSON.stringify({ ...catalogPayload(item), entity, id: item._id, status }),
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
          <label><span>Opis marki</span><input name="tagline" maxLength={120} placeholder="np. Rdzeń PIR, gwarancja 20 lat" /><small>Jedna linijka widoczna przy wyborze produktu.</small></label>
          <label><span>Strona producenta</span><input name="websiteUrl" type="url" placeholder="https://" /></label>
          <label><span>Logo</span><input name="logoUrl" type="url" placeholder="https://" /><small>Wklej adres albo wgraj plik poniżej.</small></label>
          <label className="sa-catalog-upload">
            <span><ImageUp size={15} /> Wgraj logo</span>
            <input type="file" accept="image/*" disabled={busy} onChange={uploadLogo} />
          </label>
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
          <label><span>Rdzeń</span><select name="coreType"><option value="">Nie podano</option><option value="PIR">PIR</option><option value="PUR">PUR</option><option value="MW">Wełna mineralna</option></select></label>
          <label><span>Przewodność λ [W/(m·K)]</span><input name="lambdaWmK" placeholder="0,022" /><small>Wartość z karty technicznej rdzenia.</small></label>
          <label className="sa-form-wide"><span>Współczynniki U [grubość:U]</span><input name="uValues" placeholder="60:0,32, 80:0,26, 100:0,21" /><small>Wartości badane. Puste pola konfigurator wyliczy z λ.</small></label>
          <label><span>Reakcja na ogień</span><input name="fireClass" placeholder="np. B-s1,d0" /></label>
          <label><span>Karta techniczna</span><input name="datasheetUrl" type="url" placeholder="https://" /></label>
          <label className="sa-form-wide"><span>Profil animacji bramy</span><select name="animationProfile"><option value="NONE">Brak animacji</option><option value="SECTIONAL">Segmentowy</option><option value="ROLLER">Roletowy</option><option value="TILTING">Uchylny</option></select></label>
          <button className="sa-button sa-button-primary sa-form-submit" disabled={busy}>{busy ? <LoaderCircle className="sa-spin" size={16} /> : <Plus size={16} />} Dodaj produkt</button>
        </form>
      </section>

      <section className="sa-card">
        <SuperadminSectionHeader eyebrow={`${items.length} pozycji`} title="Producenci" icon={Building2} />
        <div className="sa-catalog-list">
          {items.map((item) => (
            <article key={item._id}>
              <span className="sa-catalog-entity-icon">
                {item.logoUrl
                  ? <img className="sa-catalog-logo" src={item.logoUrl} alt={`Logo ${item.name}`} />
                  : <Building2 size={17} />}
              </span>
              <div><strong>{item.name}</strong><small>{item.tagline || `${item.kind} · v${item.version}`}</small></div>
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
              <div>
                <strong>{item.name}</strong>
                <small>
                  {item.manufacturerKey} · {item.kind} · v{item.version}
                  {item.specs?.lambdaWmK ? ` · λ ${item.specs.lambdaWmK}` : ""}
                  {item.specs?.uValues?.length ? ` · U dla ${item.specs.uValues.length} grubości` : ""}
                </small>
              </div>
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
