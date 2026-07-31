"use client";

import { useMemo, useState } from "react";
import { Building2, Check, Eye, Layers3, Loader2, PackageCheck, Palette, Save, Send, SlidersHorizontal } from "lucide-react";
import type { ConfiguratorBootstrap, FeatureKey } from "@/types/saas";

const featureOptions: Array<{ key: FeatureKey; label: string; description: string }> = [
  { key: "frontProjection", label: "Wypust frontowy", description: "Pozwala klientom dobrać głębokość i wykończenie wypustu." },
  { key: "structureView", label: "Widok konstrukcji", description: "Pokazuje szkielet, profile i parametry konstrukcyjne." },
  { key: "gateAnimations", label: "Animacje bram", description: "Interaktywne otwieranie bram w scenie 3D." },
  { key: "lighting", label: "Oświetlenie", description: "Lampy, LED i nocny podgląd obiektu." },
  { key: "orderPdf", label: "PDF zamówienia", description: "Dokument techniczny i wizualizacje zamówienia." },
];

function Toggle({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={label}
      aria-checked={checked}
      disabled={disabled}
      className={`settings-toggle ${checked ? "on" : ""}`}
      onClick={onChange}
    >
      <i />
    </button>
  );
}

export function SettingsEditor({ bootstrap }: { bootstrap: ConfiguratorBootstrap }) {
  const [settings, setSettings] = useState(bootstrap.settings);
  const [branding, setBranding] = useState(bootstrap.company.branding);
  const [busy, setBusy] = useState<"draft" | "publish" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const presets = bootstrap.catalog.presets as Array<{ key: string; name: string }>;
  const panelManufacturers = bootstrap.catalog.panelManufacturers as Array<{ key: string; name: string }>;
  const gateManufacturers = bootstrap.catalog.gateManufacturers as Array<{ key: string; name: string }>;
  const finishes = bootstrap.catalog.materialFinishes as Array<{ key: string; name: string; hex?: string }>;
  const currentEnabledFeatures = useMemo(
    () => Object.fromEntries(featureOptions.map((item) => [
      item.key,
      bootstrap.capabilities[item.key] && !settings.disabledFeatures.includes(item.key),
    ])),
    [bootstrap.capabilities, settings.disabledFeatures],
  );

  function toggleArray(field: keyof typeof settings, value: string) {
    setSettings((current) => {
      const values = current[field] as string[];
      return { ...current, [field]: values.includes(value) ? values.filter((item) => item !== value) : [...values, value] };
    });
  }

  async function uploadLogo(file?: File) {
    if (!file) return;
    setBusy("draft");
    setMessage(null);
    const form = new FormData();
    form.set("file", file);
    const response = await fetch(`/api/companies/${bootstrap.company.slug}/assets`, { method: "POST", body: form });
    const result = await response.json();
    setBusy(null);
    if (!response.ok) {
      setMessage(result.error || "Nie udało się przesłać logo.");
      return;
    }
    setBranding((current) => ({ ...current, logoUrl: result.url }));
    setMessage("Logo przesłano. Opublikuj ustawienia, aby je zastosować.");
  }

  async function save(publish: boolean) {
    setBusy(publish ? "publish" : "draft");
    setMessage(null);
    try {
      const response = await fetch(`/api/companies/${bootstrap.company.slug}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings, branding, publish }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Nie udało się zapisać ustawień.");
      setSettings(result.settings);
      setMessage(publish ? "Ustawienia zostały opublikowane." : "Szkic został zapisany.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nie udało się zapisać ustawień.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="settings-layout">
      <div className="settings-main">
        <section className="dashboard-card settings-section" id="branding">
          <div className="settings-section-title"><span className="settings-section-icon"><Building2 size={19} /></span><div><h2>Branding firmy</h2><p>Nazwa, logo i kolory widoczne w publicznym konfiguratorze.</p></div></div>
          <div className="form-grid">
            <label className="settings-field"><span>Nazwa marki</span><input value={branding.name} onChange={(event) => setBranding({ ...branding, name: event.target.value })} /></label>
            <label className="settings-field"><span>Adres logo</span><input value={branding.logoUrl || ""} onChange={(event) => setBranding({ ...branding, logoUrl: event.target.value })} placeholder="https://…" /></label>
            <label className="settings-field"><span>Prześlij logo do Vercel Blob</span><input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => uploadLogo(event.target.files?.[0])} /></label>
            <label className="settings-field"><span>Kolor główny</span><input type="color" value={branding.primaryColor} onChange={(event) => setBranding({ ...branding, primaryColor: event.target.value })} /></label>
            <label className="settings-field"><span>Kolor akcentu</span><input type="color" value={branding.accentColor} onChange={(event) => setBranding({ ...branding, accentColor: event.target.value })} /></label>
            <label className="settings-field"><span>E-mail kontaktowy</span><input type="email" value={branding.supportEmail || ""} onChange={(event) => setBranding({ ...branding, supportEmail: event.target.value })} /></label>
            <label className="settings-field"><span>Telefon kontaktowy</span><input value={branding.supportPhone || ""} onChange={(event) => setBranding({ ...branding, supportPhone: event.target.value })} /></label>
          </div>
        </section>
        <section className="dashboard-card settings-section" id="dostepnosc">
          <div className="settings-section-title"><span className="settings-section-icon"><SlidersHorizontal size={19} /></span><div><h2>Dostępność</h2><p>Ręczne wyłączenie działa niezależnie od aktywnej subskrypcji.</p></div><Toggle label="Dostępność konfiguratora" checked={settings.manuallyEnabled} onChange={() => setSettings({ ...settings, manuallyEnabled: !settings.manuallyEnabled })} /></div>
        </section>
        <section className="dashboard-card settings-section" id="funkcje">
          <div className="settings-section-title"><span className="settings-section-icon"><PackageCheck size={19} /></span><div><h2>Funkcje konfiguratora</h2><p>Możesz wyłączyć funkcję swojego pakietu, ale nie włączyć funkcji wyższego pakietu.</p></div></div>
          <div className="settings-option-list">
            {featureOptions.map((feature) => {
              const entitled = bootstrap.capabilities[feature.key] || settings.disabledFeatures.includes(feature.key);
              return (
                <div key={feature.key}>
                  <div><strong>{feature.label}</strong><small>{entitled ? feature.description : `Niedostępne w pakiecie ${bootstrap.packageCode}`}</small></div>
                  <Toggle
                    label={`${feature.label}: ${currentEnabledFeatures[feature.key] ? "włączone" : "wyłączone"}`}
                    checked={Boolean(currentEnabledFeatures[feature.key])}
                    disabled={!entitled}
                    onChange={() => toggleArray("disabledFeatures", feature.key)}
                  />
                </div>
              );
            })}
          </div>
        </section>
        <section className="dashboard-card settings-section" id="oferta">
          <div className="settings-section-title"><span className="settings-section-icon"><Layers3 size={19} /></span><div><h2>Presety obiektów</h2><p>Co najmniej jeden preset musi pozostać dostępny.</p></div></div>
          <div className="check-grid">
            {presets.map((preset) => (
              <button key={preset.key} type="button" className={settings.allowedPresetIds.includes(preset.key) ? "checked" : ""} onClick={() => toggleArray("allowedPresetIds", preset.key)}>
                <i>{settings.allowedPresetIds.includes(preset.key) && <Check size={14} />}</i><span>{preset.name}</span>
              </button>
            ))}
          </div>
          <label className="settings-field"><span>Preset domyślny</span><select value={settings.defaultPresetId} onChange={(event) => setSettings({ ...settings, defaultPresetId: event.target.value })}>{presets.filter((preset) => settings.allowedPresetIds.includes(preset.key)).map((preset) => <option key={preset.key} value={preset.key}>{preset.name}</option>)}</select></label>
        </section>
        <section className="dashboard-card settings-section">
          <div className="settings-section-title"><div><h2>Producenci płyt</h2><p>Produkty udostępnione globalnie przez operatora SaaS.</p></div></div>
          <div className="check-grid">{panelManufacturers.map((item) => <button key={item.key} type="button" className={settings.allowedPanelManufacturerIds.includes(item.key) ? "checked" : ""} onClick={() => toggleArray("allowedPanelManufacturerIds", item.key)}><i>{settings.allowedPanelManufacturerIds.includes(item.key) && <Check size={14} />}</i><span>{item.name}</span></button>)}</div>
        </section>
        <section className="dashboard-card settings-section">
          <div className="settings-section-title"><div><h2>Producenci bram</h2><p>Firma wybiera podzbiór opublikowanego katalogu globalnego.</p></div></div>
          <div className="check-grid">{gateManufacturers.map((item) => <button key={item.key} type="button" className={settings.allowedGateManufacturerIds.includes(item.key) ? "checked" : ""} onClick={() => toggleArray("allowedGateManufacturerIds", item.key)}><i>{settings.allowedGateManufacturerIds.includes(item.key) && <Check size={14} />}</i><span>{item.name}</span></button>)}</div>
        </section>
        <section className="dashboard-card settings-section" id="kolory">
          <div className="settings-section-title"><span className="settings-section-icon"><Palette size={19} /></span><div><h2>Kolory ścian</h2><p>Pusta lista oznacza wszystkie opublikowane kolory. Wybierz pozycje, aby utworzyć podzbiór.</p></div></div>
          <div className="finish-choice-grid">{finishes.map((item) => <button key={item.key} type="button" className={settings.allowedWallColorIds.includes(item.key) ? "checked" : ""} onClick={() => toggleArray("allowedWallColorIds", item.key)}><i style={{ background: item.hex || "#ccc" }} /><span>{item.name}</span></button>)}</div>
        </section>
        <section className="dashboard-card settings-section">
          <div className="settings-section-title"><div><h2>Kolory dachu</h2><p>Zakres kolorów dostępny klientowi dla pokrycia dachowego.</p></div></div>
          <div className="finish-choice-grid">{finishes.map((item) => <button key={item.key} type="button" className={settings.allowedRoofColorIds.includes(item.key) ? "checked" : ""} onClick={() => toggleArray("allowedRoofColorIds", item.key)}><i style={{ background: item.hex || "#ccc" }} /><span>{item.name}</span></button>)}</div>
        </section>
      </div>
      <aside className="settings-aside">
        <div className="dashboard-card publish-card">
          <div className="publish-version"><span>Wersja ustawień</span><strong>v{settings.version}</strong></div>
          <p>Zmiany zapisane jako szkic nie wpływają na publiczny konfigurator do czasu publikacji.</p>
          <nav className="settings-anchor-nav" aria-label="Sekcje ustawień">
            <a href="#branding">Branding</a>
            <a href="#dostepnosc">Dostępność</a>
            <a href="#funkcje">Funkcje</a>
            <a href="#oferta">Oferta</a>
            <a href="#kolory">Kolory</a>
          </nav>
          {message && <div className="settings-message" role="status">{message}</div>}
          <button className="secondary-button full" disabled={Boolean(busy)} onClick={() => save(false)}>{busy === "draft" ? <Loader2 size={16} className="spin" /> : <Save size={16} />} Zapisz szkic</button>
          <button className="primary-button full" disabled={Boolean(busy)} onClick={() => save(true)}>{busy === "publish" ? <Loader2 size={16} className="spin" /> : <Send size={16} />} Opublikuj</button>
          <a className="link-button full" href={`/${bootstrap.company.slug}`} target="_blank" rel="noreferrer"><Eye size={16} /> Otwórz podgląd</a>
        </div>
      </aside>
    </div>
  );
}
