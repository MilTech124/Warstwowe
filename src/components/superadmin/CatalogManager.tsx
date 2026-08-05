"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import {
  Archive,
  Boxes,
  Building2,
  ImageUp,
  Layers3,
  LoaderCircle,
  Plus,
  Save,
  Send,
  X,
} from "lucide-react";
import { SuperadminEmpty, SuperadminSectionHeader, SuperadminStatus } from "@/components/superadmin/SuperadminBits";

const PRODUCT_KIND_LABELS: Record<string, string> = {
  WALL_PANEL: "Płyta ścienna",
  ROOF_PANEL: "Płyta dachowa",
  GATE: "Brama",
};

/** „60:0,32, 80:0,26" → tabela U z karty technicznej producenta. */
function parseUValues(raw: string) {
  return String(raw || "")
    .split(",")
    .map((pair) => pair.split(":").map((value) => Number(value.trim().replace(",", "."))))
    .filter(([thicknessMm, uWm2K]) => thicknessMm > 0 && uWm2K > 0)
    .map(([thicknessMm, uWm2K]) => ({ thicknessMm, uWm2K }));
}

/** Tabela U z bazy z powrotem do pola tekstowego formularza. */
function formatUValues(uValues: any[] | undefined) {
  return (uValues ?? [])
    .map((entry) => `${entry.thicknessMm}:${String(entry.uWm2K).replace(".", ",")}`)
    .join(", ");
}

function decimal(raw: unknown) {
  const value = Number(String(raw ?? "").trim().replace(",", "."));
  return value > 0 ? value : undefined;
}

/** Pozycja z katalogu statycznego istnieje dopiero po pierwszym zapisie. */
function isSaved(item: any) {
  return Boolean(item?._id);
}

export function CatalogManager({ manufacturers, products }: { manufacturers: any[]; products: any[] }) {
  const [items, setItems] = useState(manufacturers);
  const [productItems, setProductItems] = useState(products);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  // Panel działa jak lista → szczegóły: najpierw wybierasz producenta, potem
  // edytujesz jego dane i jego produkty. Bez tego produkty wszystkich marek
  // leżały na jednej kupie i nie dało się nad tym zapanować.
  const [selectedKey, setSelectedKey] = useState<string | null>(
    manufacturers.length ? `${manufacturers[0].kind}:${manufacturers[0].key}` : null,
  );
  const [creatingManufacturer, setCreatingManufacturer] = useState(!manufacturers.length);
  const [editedProduct, setEditedProduct] = useState<any>(null);
  const [creatingProduct, setCreatingProduct] = useState(false);

  const selected = useMemo(
    () => items.find((item) => `${item.kind}:${item.key}` === selectedKey) ?? null,
    [items, selectedKey],
  );
  const selectedProducts = useMemo(
    () => (selected ? productItems.filter((item) => item.manufacturerKey === selected.key) : []),
    [productItems, selected],
  );

  function selectManufacturer(item: any) {
    setSelectedKey(`${item.kind}:${item.key}`);
    setCreatingManufacturer(false);
    setEditedProduct(null);
    setCreatingProduct(false);
    setNotice(null);
  }

  function startNewManufacturer() {
    setCreatingManufacturer(true);
    setSelectedKey(null);
    setEditedProduct(null);
    setCreatingProduct(false);
    setNotice(null);
  }

  /** Wstawia zapisany dokument w miejsce pozycji o tym samym kluczu naturalnym. */
  function mergeInto(setter: (updater: (current: any[]) => any[]) => void, document: any, matches: (entry: any) => boolean) {
    setter((current: any[]) =>
      current.some(matches) ? current.map((entry) => (matches(entry) ? { ...document, source: "DB" } : entry)) : [{ ...document, source: "DB" }, ...current],
    );
  }

  async function post(body: Record<string, unknown>, fallback: string) {
    const response = await fetch("/api/superadmin/catalog", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) {
      setNotice({ tone: "error", text: result.error || fallback });
      return null;
    }
    return result.document;
  }

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
    const editing = creatingManufacturer ? null : selected;
    try {
      const values = Object.fromEntries(new FormData(form));
      const document = await post(
        {
          entity: "manufacturer",
          ...values,
          id: editing?._id,
          // Edycja nie cofa publikacji — poprawka danych producenta ma od razu
          // dojechać do konfiguratora, jeśli marka była już opublikowana.
          status: isSaved(editing) ? editing.status : "DRAFT",
        },
        "Nie udało się zapisać producenta.",
      );
      if (!document) return;

      mergeInto(setItems, document, (entry) => entry.kind === document.kind && entry.key === document.key);
      setSelectedKey(`${document.kind}:${document.key}`);
      setCreatingManufacturer(false);
      setNotice({
        tone: "success",
        text: isSaved(editing) ? "Dane producenta zostały zaktualizowane." : "Producent został zapisany jako szkic.",
      });
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
    const editing = creatingProduct ? null : editedProduct;
    try {
      const values = Object.fromEntries(new FormData(form));
      const document = await post(
        {
          entity: "product",
          ...values,
          manufacturerKey: selected?.key,
          id: editing?._id,
          status: isSaved(editing) ? editing.status : "DRAFT",
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
        },
        "Nie udało się zapisać produktu.",
      );
      if (!document) return;

      mergeInto(
        setProductItems,
        document,
        (entry) =>
          entry.kind === document.kind && entry.manufacturerKey === document.manufacturerKey && entry.key === document.key,
      );
      setEditedProduct(null);
      setCreatingProduct(false);
      setNotice({
        tone: "success",
        text: isSaved(editing) ? "Produkt został zaktualizowany." : "Produkt został zapisany jako szkic.",
      });
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
      const base = entity === "manufacturer"
        ? {
            kind: item.kind,
            key: item.key,
            name: item.name,
            tagline: item.tagline || "",
            description: item.description || "",
            logoUrl: item.logoUrl || "",
            websiteUrl: item.websiteUrl || "",
          }
        : {
            kind: item.kind,
            manufacturerKey: item.manufacturerKey,
            key: item.key,
            name: item.name,
            thicknessMm: item.thicknessMm || [],
            colorIds: item.colorIds || [],
            profile: item.profile || "",
            renderKind: item.renderKind || "PARAMETRIC",
            animationProfile: item.animationProfile || "NONE",
            // Cały komplet parametrów, a nie sama zmiana statusu — inaczej
            // publikacja skasowałaby λ i tabelę U.
            ...(item.specs ? { specs: item.specs } : {}),
          };
      const document = await post({ ...base, entity, id: item._id, status }, "Nie udało się zmienić statusu.");
      if (!document) return;

      if (entity === "manufacturer") {
        mergeInto(setItems, document, (entry) => entry.kind === document.kind && entry.key === document.key);
      } else {
        mergeInto(
          setProductItems,
          document,
          (entry) =>
            entry.kind === document.kind && entry.manufacturerKey === document.manufacturerKey && entry.key === document.key,
        );
      }
      setNotice({
        tone: "success",
        text: status === "PUBLISHED" ? "Opublikowano nową wersję katalogu." : "Pozycja została zarchiwizowana.",
      });
    } catch {
      setNotice({ tone: "error", text: "Nie udało się połączyć z serwerem." });
    } finally {
      setBusy(false);
    }
  }

  const manufacturerForm = creatingManufacturer ? null : selected;
  const productForm = creatingProduct ? null : editedProduct;

  return (
    <div className="sa-catalog-layout">
      {notice ? (
        <div
          className={`sa-form-notice is-${notice.tone} sa-span-3`}
          role={notice.tone === "error" ? "alert" : "status"}
          aria-live="polite"
        >
          {notice.text}
        </div>
      ) : null}

      {/* ---------- Lista producentów ---------- */}
      <section className="sa-card">
        <SuperadminSectionHeader eyebrow={`${items.length} producentów`} title="Producenci" icon={Building2} />
        <div className="sa-catalog-list">
          {items.map((item) => {
            const active = `${item.kind}:${item.key}` === selectedKey;
            return (
              <article key={`${item.kind}:${item.key}`} className={active ? "is-active" : undefined}>
                <span className="sa-catalog-entity-icon">
                  {item.logoUrl ? (
                    <img className="sa-catalog-logo" src={item.logoUrl} alt={`Logo ${item.name}`} />
                  ) : (
                    <Building2 size={17} />
                  )}
                </span>
                <button type="button" className="sa-catalog-pick" onClick={() => selectManufacturer(item)}>
                  <strong>{item.name}</strong>
                  <small>
                    {item.kind === "GATE" ? "Bramy" : "Płyty warstwowe"} ·{" "}
                    {productItems.filter((product) => product.manufacturerKey === item.key).length} produktów
                  </small>
                </button>
                <SuperadminStatus status={item.status} />
              </article>
            );
          })}
          {!items.length ? <SuperadminEmpty>Brak producentów w katalogu.</SuperadminEmpty> : null}
        </div>
        <div className="sa-catalog-form-actions sa-catalog-list-footer">
          <button type="button" className="sa-button sa-button-secondary" disabled={busy} onClick={startNewManufacturer}>
            <Plus size={15} /> Nowy producent
          </button>
        </div>
      </section>

      {/* ---------- Dane wybranego producenta ---------- */}
      <section className="sa-card sa-span-2">
        <SuperadminSectionHeader
          eyebrow={creatingManufacturer ? "Nowa pozycja" : manufacturerForm?.source === "STATIC" ? "Katalog bazowy" : "Edycja"}
          title={creatingManufacturer ? "Dodaj producenta" : manufacturerForm ? manufacturerForm.name : "Wybierz producenta"}
          icon={Building2}
          action={
            manufacturerForm && isSaved(manufacturerForm) ? (
              <button
                className="sa-button sa-button-secondary"
                disabled={busy}
                onClick={() =>
                  publish("manufacturer", manufacturerForm, manufacturerForm.status === "PUBLISHED" ? "ARCHIVED" : "PUBLISHED")
                }
              >
                {manufacturerForm.status === "PUBLISHED" ? <Archive size={15} /> : <Send size={15} />}
                {manufacturerForm.status === "PUBLISHED" ? "Archiwizuj" : "Publikuj"}
              </button>
            ) : null
          }
        />

        {manufacturerForm?.source === "STATIC" ? (
          <p className="sa-catalog-hint">
            Ten producent pochodzi z katalogu bazowego aplikacji. Pierwszy zapis utworzy jego wpis w bazie i pozwoli
            publikować zmiany.
          </p>
        ) : null}

        <form
          key={creatingManufacturer ? "new-manufacturer" : selectedKey ?? "empty"}
          className="sa-catalog-form sa-catalog-form-grid"
          onSubmit={submitManufacturer}
        >
          <label>
            <span>Typ producenta</span>
            {/* Typ zapisanej pozycji jest częścią klucza katalogu, więc tylko go
                pokazujemy — wartość i tak leci w ukrytym polu. */}
            <select
              name={manufacturerForm ? undefined : "kind"}
              defaultValue={manufacturerForm?.kind ?? "PANEL"}
              disabled={Boolean(manufacturerForm)}
            >
              <option value="PANEL">Płyty warstwowe</option>
              <option value="GATE">Bramy</option>
            </select>
            {manufacturerForm ? <input type="hidden" name="kind" value={manufacturerForm.kind} /> : null}
          </label>
          <label>
            <span>Klucz systemowy</span>
            <input
              name="key"
              required
              pattern="[a-z0-9_-]+"
              placeholder="np. steelprofil"
              defaultValue={manufacturerForm?.key ?? ""}
              readOnly={Boolean(manufacturerForm)}
            />
            <small>Klucz łączy producenta z konfiguratorem — nie zmieniamy go po utworzeniu.</small>
          </label>
          <label>
            <span>Nazwa wyświetlana</span>
            <input name="name" required placeholder="Nazwa producenta" defaultValue={manufacturerForm?.name ?? ""} />
          </label>
          <label>
            <span>Opis marki</span>
            <input
              name="tagline"
              maxLength={120}
              placeholder="np. Rdzeń PIR, gwarancja 20 lat"
              defaultValue={manufacturerForm?.tagline ?? ""}
            />
            <small>Jedna linijka widoczna przy wyborze produktu.</small>
          </label>
          <label>
            <span>Strona producenta</span>
            <input name="websiteUrl" type="url" placeholder="https://" defaultValue={manufacturerForm?.websiteUrl ?? ""} />
          </label>
          <label>
            <span>Logo</span>
            <input name="logoUrl" type="url" placeholder="https://" defaultValue={manufacturerForm?.logoUrl ?? ""} />
            <small>Wklej adres albo wgraj plik poniżej.</small>
          </label>
          <label className="sa-catalog-upload sa-form-wide">
            <span>
              <ImageUp size={15} /> Wgraj logo
            </span>
            <input type="file" accept="image/*" disabled={busy} onChange={uploadLogo} />
          </label>
          <div className="sa-catalog-form-actions sa-form-wide">
            <button className="sa-button sa-button-primary" disabled={busy || (!creatingManufacturer && !selected)}>
              {busy ? <LoaderCircle className="sa-spin" size={16} /> : <Save size={16} />}
              {creatingManufacturer ? "Zapisz szkic" : "Zapisz zmiany"}
            </button>
            {creatingManufacturer && items.length ? (
              <button
                type="button"
                className="sa-button sa-button-secondary"
                disabled={busy}
                onClick={() => selectManufacturer(items[0])}
              >
                <X size={15} /> Anuluj
              </button>
            ) : null}
          </div>
        </form>
      </section>

      {/* ---------- Produkty wybranego producenta ---------- */}
      <section className="sa-card">
        <SuperadminSectionHeader
          eyebrow={selected ? `${selectedProducts.length} pozycji` : "Brak wyboru"}
          title={selected ? `Produkty: ${selected.name}` : "Produkty"}
          icon={Boxes}
        />
        <div className="sa-catalog-list">
          {selectedProducts.map((item) => (
            <article key={`${item.kind}:${item.key}`} className={item._id && item._id === editedProduct?._id ? "is-active" : undefined}>
              <span className="sa-catalog-entity-icon">
                <Boxes size={17} />
              </span>
              <button
                type="button"
                className="sa-catalog-pick"
                onClick={() => {
                  setEditedProduct(item);
                  setCreatingProduct(false);
                  setNotice(null);
                }}
              >
                <strong>{item.name}</strong>
                <small>
                  {PRODUCT_KIND_LABELS[item.kind] ?? item.kind}
                  {item.specs?.lambdaWmK ? ` · λ ${item.specs.lambdaWmK}` : " · brak λ"}
                  {item.specs?.uValues?.length ? ` · U dla ${item.specs.uValues.length} grubości` : ""}
                </small>
              </button>
              <SuperadminStatus status={item.status} />
              {isSaved(item) ? (
                <button
                  className="sa-button sa-button-secondary"
                  disabled={busy}
                  onClick={() => publish("product", item, item.status === "PUBLISHED" ? "ARCHIVED" : "PUBLISHED")}
                >
                  {item.status === "PUBLISHED" ? <Archive size={15} /> : <Send size={15} />}
                  {item.status === "PUBLISHED" ? "Archiwizuj" : "Publikuj"}
                </button>
              ) : null}
            </article>
          ))}
          {selected && !selectedProducts.length ? (
            <SuperadminEmpty>Ten producent nie ma jeszcze produktów.</SuperadminEmpty>
          ) : null}
          {!selected ? <SuperadminEmpty>Wybierz producenta z listy.</SuperadminEmpty> : null}
        </div>
        {selected ? (
          <div className="sa-catalog-form-actions sa-catalog-list-footer">
            <button
              type="button"
              className="sa-button sa-button-secondary"
              disabled={busy}
              onClick={() => {
                setCreatingProduct(true);
                setEditedProduct(null);
                setNotice(null);
              }}
            >
              <Plus size={15} /> Nowy produkt
            </button>
          </div>
        ) : null}
      </section>

      {/* ---------- Dane produktu ---------- */}
      <section className="sa-card sa-span-2">
        <SuperadminSectionHeader
          eyebrow={creatingProduct ? "Nowa pozycja" : productForm?.source === "STATIC" ? "Katalog bazowy" : "Edycja"}
          title={creatingProduct ? "Dodaj produkt" : productForm ? productForm.name : "Wybierz produkt"}
          icon={Layers3}
        />

        {!selected ? (
          <p className="sa-catalog-hint">Najpierw wybierz producenta — produkt zawsze należy do jednej marki.</p>
        ) : null}

        <form
          key={creatingProduct ? `new-product-${selected?.key}` : productForm ? `${productForm.kind}:${productForm.key}` : "empty-product"}
          className="sa-catalog-form sa-catalog-form-grid"
          onSubmit={submitProduct}
        >
          <label>
            <span>Rodzaj produktu</span>
            <select
              name={productForm ? undefined : "kind"}
              defaultValue={productForm?.kind ?? (selected?.kind === "GATE" ? "GATE" : "WALL_PANEL")}
              disabled={Boolean(productForm)}
            >
              <option value="WALL_PANEL">Płyta ścienna</option>
              <option value="ROOF_PANEL">Płyta dachowa</option>
              <option value="GATE">Brama</option>
            </select>
            {productForm ? <input type="hidden" name="kind" value={productForm.kind} /> : null}
          </label>
          <label>
            <span>Klucz modelu</span>
            <input
              name="key"
              required
              pattern="[a-z0-9_-]+"
              placeholder="np. pir-100"
              defaultValue={productForm?.key ?? ""}
              readOnly={Boolean(productForm)}
            />
          </label>
          <label>
            <span>Nazwa handlowa</span>
            <input name="name" required placeholder="Nazwa produktu" defaultValue={productForm?.name ?? ""} />
          </label>
          <label>
            <span>Grubości w mm</span>
            <input name="thicknessMm" placeholder="60, 80, 100" defaultValue={(productForm?.thicknessMm ?? []).join(", ")} />
            <small>Wartości rozdziel przecinkami.</small>
          </label>
          <label>
            <span>Klucze kolorów</span>
            <input name="colorIds" placeholder="ral7016, ral9005" defaultValue={(productForm?.colorIds ?? []).join(", ")} />
            <small>Klucze rozdziel przecinkami.</small>
          </label>
          <label>
            <span>Rdzeń</span>
            <select name="coreType" defaultValue={productForm?.specs?.coreType ?? ""}>
              <option value="">Nie podano</option>
              <option value="PIR">PIR</option>
              <option value="PUR">PUR</option>
              <option value="MW">Wełna mineralna</option>
            </select>
          </label>
          <label>
            <span>Przewodność λ [W/(m·K)]</span>
            <input name="lambdaWmK" placeholder="0,022" defaultValue={productForm?.specs?.lambdaWmK ?? ""} />
            <small>Wartość z karty technicznej rdzenia.</small>
          </label>
          <label className="sa-form-wide">
            <span>Współczynniki U [grubość:U]</span>
            <input name="uValues" placeholder="60:0,32, 80:0,26, 100:0,21" defaultValue={formatUValues(productForm?.specs?.uValues)} />
            <small>Wartości badane. Brakujące grubości konfigurator wyliczy z λ.</small>
          </label>
          <label>
            <span>Reakcja na ogień</span>
            <input name="fireClass" placeholder="np. B-s1,d0" defaultValue={productForm?.specs?.fireClass ?? ""} />
          </label>
          <label>
            <span>Karta techniczna</span>
            <input name="datasheetUrl" type="url" placeholder="https://" defaultValue={productForm?.specs?.datasheetUrl ?? ""} />
          </label>
          <label className="sa-form-wide">
            <span>Profil animacji bramy</span>
            <select name="animationProfile" defaultValue={productForm?.animationProfile ?? "NONE"}>
              <option value="NONE">Brak animacji</option>
              <option value="SECTIONAL">Segmentowy</option>
              <option value="ROLLER">Roletowy</option>
              <option value="TILTING">Uchylny</option>
            </select>
          </label>
          <div className="sa-catalog-form-actions sa-form-wide">
            <button className="sa-button sa-button-primary" disabled={busy || !selected || (!creatingProduct && !productForm)}>
              {busy ? <LoaderCircle className="sa-spin" size={16} /> : <Save size={16} />}
              {creatingProduct ? "Dodaj produkt" : "Zapisz zmiany"}
            </button>
            {creatingProduct || productForm ? (
              <button
                type="button"
                className="sa-button sa-button-secondary"
                disabled={busy}
                onClick={() => {
                  setCreatingProduct(false);
                  setEditedProduct(null);
                }}
              >
                <X size={15} /> Anuluj
              </button>
            ) : null}
          </div>
        </form>
      </section>
    </div>
  );
}
