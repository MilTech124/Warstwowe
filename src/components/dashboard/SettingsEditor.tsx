"use client";

import { useMemo, useState } from "react";
import {
  BellRing,
  Building2,
  Check,
  Eye,
  Layers3,
  Loader2,
  PackageCheck,
  Palette,
  Save,
  Send,
  SlidersHorizontal,
  Warehouse,
} from "lucide-react";
import { toast } from "sonner";
import type { CompanyConfiguratorSettings, ConfiguratorBootstrap, FeatureKey } from "@/types/saas";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type CatalogOption = {
  key: string;
  name: string;
  hex?: string;
  placement?: string;
  typeKey?: string;
  manufacturerKey?: string;
};

const featureOptions: Array<{ key: FeatureKey; label: string; description: string }> = [
  { key: "flashings", label: "Obróbki blacharskie", description: "Obróbki narożników, okapów i kalenicy." },
  { key: "gutters", label: "Orynnowanie", description: "Rynny, rury spustowe i akcesoria." },
  { key: "frontProjection", label: "Wypust frontowy", description: "Głębokość i wykończenie wypustu." },
  { key: "structureView", label: "Widok konstrukcji", description: "Szkielet, profile i parametry konstrukcyjne." },
  { key: "gateAnimations", label: "Animacje bram", description: "Interaktywne otwieranie bram w scenie 3D." },
  { key: "lighting", label: "Oświetlenie", description: "Lampy, LED i nocny podgląd obiektu." },
  { key: "orderPdf", label: "PDF zamówienia", description: "Dokument techniczny i wizualizacje zamówienia." },
];

const requiredLists: Array<{ field: keyof CompanyConfiguratorSettings; label: string }> = [
  { field: "allowedPresetIds", label: "preset" },
  { field: "allowedRoofTypeIds", label: "typ dachu" },
  { field: "allowedOpeningKinds", label: "rodzaj otworu" },
  { field: "allowedPanelManufacturerIds", label: "producent płyt" },
  { field: "allowedGateManufacturerIds", label: "producent bram" },
  { field: "allowedWallPanelModelIds", label: "model płyty ściennej" },
  { field: "allowedRoofPanelModelIds", label: "model płyty dachowej" },
  { field: "allowedGateTypeIds", label: "typ bramy" },
  { field: "allowedGateModelIds", label: "model bramy" },
  { field: "allowedDoorModelIds", label: "model drzwi" },
  { field: "allowedWindowModelIds", label: "model okna" },
];

const sectionLinks = [
  { id: "branding", label: "Branding" },
  { id: "dostepnosc", label: "Funkcje" },
  { id: "oferta", label: "Oferta" },
  { id: "otwory", label: "Otwory" },
  { id: "katalog", label: "Katalog" },
  { id: "kolory", label: "Kolory" },
  { id: "powiadomienia", label: "Powiadomienia" },
];

function ChoiceGrid({
  options,
  selected,
  onToggle,
  colors = false,
}: {
  options: CatalogOption[];
  selected: string[];
  onToggle: (key: string) => void;
  colors?: boolean;
}) {
  if (colors) {
    return (
      <div className="flex flex-wrap gap-2">
        {options.map((item) => {
          const active = selected.includes(item.key);
          return (
            <Tooltip key={item.key}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-pressed={active}
                  aria-label={item.name}
                  onClick={() => onToggle(item.key)}
                  className={cn(
                    "grid size-9 place-items-center rounded-lg border-2 transition-all",
                    active ? "border-primary ring-2 ring-primary/25" : "border-border",
                  )}
                  style={{ background: item.hex || "#d6d9d8" }}
                >
                  {active && <Check size={14} className="text-white drop-shadow" />}
                </button>
              </TooltipTrigger>
              <TooltipContent>{item.name}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {options.map((item) => {
        const active = selected.includes(item.key);
        return (
          <button
            key={item.key}
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(item.key)}
            className={cn(
              "flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
              active
                ? "border-primary bg-primary/5 font-medium"
                : "border-border hover:bg-muted/60",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "grid size-4 shrink-0 place-items-center rounded border",
                active ? "border-primary bg-primary text-primary-foreground" : "border-border",
              )}
            >
              {active && <Check size={11} strokeWidth={3} />}
            </span>
            <span className="truncate">{item.name}</span>
          </button>
        );
      })}
    </div>
  );
}

function Section({
  id,
  title,
  description,
  icon: Icon = Layers3,
  children,
}: {
  id?: string;
  title: string;
  description: string;
  icon?: typeof Layers3;
  children: React.ReactNode;
}) {
  return (
    <Card id={id} className="scroll-mt-20">
      <CardHeader>
        <span
          aria-hidden="true"
          className="mb-1 grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"
        >
          <Icon size={19} />
        </span>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">{children}</CardContent>
    </Card>
  );
}

function SubGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2.5">
      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </h3>
      {children}
    </div>
  );
}

export function SettingsEditor({ bootstrap }: { bootstrap: ConfiguratorBootstrap }) {
  const [settings, setSettings] = useState(bootstrap.settings);
  const [branding, setBranding] = useState(bootstrap.company.branding);
  const [busy, setBusy] = useState<"draft" | "publish" | "upload" | null>(null);
  // Validation errors stay inline: they point at a specific field group and
  // must not disappear on a toast timeout.
  const [validationError, setValidationError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const catalog = bootstrap.catalog;
  const options = (key: keyof typeof catalog) => (catalog[key] || []) as CatalogOption[];
  const wallWindows = options("windowModels").filter((item) => item.placement !== "roof");
  const roofWindows = options("windowModels").filter((item) => item.placement === "roof");

  // Wysyłka wymaga funkcji z pakietu ORAZ tego, żeby firma jej nie wyłączyła.
  // Bierzemy availableCapabilities (uprawnienie pakietu, bez zawężeń firmy),
  // bo capabilities niesie już stan OPUBLIKOWANY i nie odzwierciedla
  // niezapisanych jeszcze przełączeń w tym formularzu.
  const emailNotificationsEnabled =
    Boolean(
      bootstrap.availableCapabilities?.emailNotifications
        ?? bootstrap.capabilities.emailNotifications,
    ) && !settings.disabledFeatures.includes("emailNotifications");

  const currentEnabledFeatures = useMemo(
    () =>
      Object.fromEntries(
        featureOptions.map((item) => [
          item.key,
          Boolean(bootstrap.availableCapabilities?.[item.key] ?? bootstrap.capabilities[item.key])
            && !settings.disabledFeatures.includes(item.key),
        ]),
      ),
    [bootstrap.availableCapabilities, bootstrap.capabilities, settings.disabledFeatures],
  );

  function changeSettings(next: CompanyConfiguratorSettings) {
    setSettings(next);
    setDirty(true);
    setValidationError(null);
  }

  function toggleArray(field: keyof CompanyConfiguratorSettings, value: string, required = false) {
    const values = settings[field] as string[];
    if (required && values.includes(value) && values.length === 1) {
      setValidationError("Co najmniej jedna opcja w tej grupie musi pozostać dostępna.");
      return;
    }
    changeSettings({
      ...settings,
      [field]: values.includes(value)
        ? values.filter((item) => item !== value)
        : [...values, value],
    });
  }

  function changeBranding(patch: Partial<typeof branding>) {
    setBranding({ ...branding, ...patch });
    setDirty(true);
    setValidationError(null);
  }

  function validate() {
    if (branding.name.trim().length < 2) return "Nazwa marki musi mieć co najmniej 2 znaki.";
    for (const item of requiredLists) {
      if (!Array.isArray(settings[item.field]) || (settings[item.field] as string[]).length === 0) {
        return `Wybierz co najmniej jeden: ${item.label}.`;
      }
    }
    if (!settings.allowedPresetIds.includes(settings.defaultPresetId)) {
      return "Preset domyślny musi być włączony.";
    }
    if (
      settings.allowedOpeningKinds.includes("window")
      && !settings.allowedWindowModelIds.some((id) => wallWindows.some((item) => item.key === id))
    ) {
      return "Wybierz co najmniej jeden model okna ściennego.";
    }
    if (
      settings.allowedOpeningKinds.includes("roofWindow")
      && !settings.allowedWindowModelIds.some((id) => roofWindows.some((item) => item.key === id))
    ) {
      return "Wybierz co najmniej jeden model okna dachowego.";
    }
    if (settings.allowedOpeningKinds.includes("gate")) {
      const gateModels = options("gateModels");
      const missingType = settings.allowedGateTypeIds.find(
        (typeKey) =>
          !gateModels.some(
            (model) =>
              model.typeKey === typeKey && settings.allowedGateModelIds.includes(model.key),
          ),
      );
      if (missingType) return "Każdy włączony typ bramy musi mieć co najmniej jeden dostępny model.";
    }
    return null;
  }

  async function uploadLogo(file?: File) {
    if (!file) return;
    setBusy("upload");
    try {
      const form = new FormData();
      form.set("file", file);
      const response = await fetch(`/api/companies/${bootstrap.company.slug}/assets`, {
        method: "POST",
        body: form,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(result.error || "Nie udało się przesłać logo.");
        return;
      }
      changeBranding({ logoUrl: result.url });
      toast.success("Logo przesłano. Opublikuj ustawienia, aby je zastosować.");
    } catch {
      toast.error("Nie udało się połączyć z serwerem.");
    } finally {
      setBusy(null);
    }
  }

  async function save(publish: boolean) {
    const error = validate();
    if (error) {
      setValidationError(error);
      return;
    }
    setBusy(publish ? "publish" : "draft");
    setValidationError(null);
    try {
      const response = await fetch(`/api/companies/${bootstrap.company.slug}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings, branding, publish }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Nie udało się zapisać ustawień.");
      setSettings(result.settings);
      setDirty(false);
      toast.success(
        publish
          ? "Ustawienia zostały opublikowane i są widoczne w konfiguratorze."
          : "Szkic został zapisany. Publiczny konfigurator nie został zmieniony.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nie udało się zapisać ustawień.");
    } finally {
      setBusy(null);
    }
  }

  const choice = (field: keyof CompanyConfiguratorSettings, list: CatalogOption[], colors = false) => (
    <ChoiceGrid
      options={list}
      selected={settings[field] as string[]}
      onToggle={(key) => toggleArray(field, key, !colors)}
      colors={colors}
    />
  );

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="grid gap-4">
        <Section
          id="branding"
          title="Branding firmy"
          description="Nazwa, logo i kolory publicznego konfiguratora."
          icon={Building2}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="brand-name">Nazwa marki</Label>
              <Input
                id="brand-name"
                value={branding.name}
                onChange={(event) => changeBranding({ name: event.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="brand-logo">Adres logo</Label>
              <Input
                id="brand-logo"
                value={branding.logoUrl || ""}
                onChange={(event) => changeBranding({ logoUrl: event.target.value })}
                placeholder="https://…"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="brand-upload">Prześlij logo</Label>
              <Input
                id="brand-upload"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                disabled={Boolean(busy)}
                onChange={(event) => uploadLogo(event.target.files?.[0])}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="brand-email">E-mail kontaktowy</Label>
              <Input
                id="brand-email"
                type="email"
                value={branding.supportEmail || ""}
                onChange={(event) => changeBranding({ supportEmail: event.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="brand-phone">Telefon kontaktowy</Label>
              <Input
                id="brand-phone"
                value={branding.supportPhone || ""}
                onChange={(event) => changeBranding({ supportPhone: event.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="brand-primary">Kolor główny</Label>
                <Input
                  id="brand-primary"
                  type="color"
                  className="h-9 p-1"
                  value={branding.primaryColor}
                  onChange={(event) => changeBranding({ primaryColor: event.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="brand-accent">Kolor akcentu</Label>
                <Input
                  id="brand-accent"
                  type="color"
                  className="h-9 p-1"
                  value={branding.accentColor}
                  onChange={(event) => changeBranding({ accentColor: event.target.value })}
                />
              </div>
            </div>
          </div>
        </Section>

        <Section
          id="dostepnosc"
          title="Dostępność i funkcje"
          description="Firma może zawęzić funkcje swojego pakietu, ale nie rozszerzyć go."
          icon={SlidersHorizontal}
        >
          <div className="flex items-center justify-between gap-4 rounded-xl border border-primary/25 bg-primary/5 p-4">
            <span className="grid gap-0.5">
              <strong className="text-sm font-semibold">Publiczny konfigurator</strong>
              <span className="text-xs text-muted-foreground">
                Ręczne wyłączenie nie usuwa zamówień ani ustawień.
              </span>
            </span>
            <Switch
              aria-label="Dostępność konfiguratora"
              checked={settings.manuallyEnabled}
              onCheckedChange={() =>
                changeSettings({ ...settings, manuallyEnabled: !settings.manuallyEnabled })
              }
            />
          </div>

          <div className="divide-y divide-border rounded-xl border border-border">
            {featureOptions.map((feature) => {
              const entitled = Boolean(
                bootstrap.availableCapabilities?.[feature.key] ?? bootstrap.capabilities[feature.key],
              );
              return (
                <div key={feature.key} className="flex items-center justify-between gap-4 p-4">
                  <span className="grid gap-0.5">
                    <strong className="text-sm font-medium">{feature.label}</strong>
                    <span className="text-xs text-muted-foreground">
                      {entitled
                        ? feature.description
                        : `Niedostępne w pakiecie ${bootstrap.packageCode}`}
                    </span>
                  </span>
                  <Switch
                    aria-label={feature.label}
                    checked={Boolean(currentEnabledFeatures[feature.key])}
                    disabled={!entitled}
                    onCheckedChange={() => toggleArray("disabledFeatures", feature.key)}
                  />
                </div>
              );
            })}
          </div>
        </Section>

        <Section
          id="oferta"
          title="Typy obiektów i dachy"
          description="Presety startowe oraz geometrie dachów dostępne klientowi."
          icon={Warehouse}
        >
          <SubGroup title="Presety obiektów">{choice("allowedPresetIds", options("presets"))}</SubGroup>
          <div className="grid max-w-sm gap-2">
            <Label htmlFor="default-preset">Preset domyślny</Label>
            <Select
              value={settings.defaultPresetId}
              onValueChange={(value) => changeSettings({ ...settings, defaultPresetId: value })}
            >
              <SelectTrigger id="default-preset" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options("presets")
                  .filter((item) => settings.allowedPresetIds.includes(item.key))
                  .map((item) => (
                    <SelectItem key={item.key} value={item.key}>
                      {item.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <SubGroup title="Typy dachów">{choice("allowedRoofTypeIds", options("roofTypes"))}</SubGroup>
        </Section>

        <Section
          id="otwory"
          title="Bramy, drzwi i okna"
          description="Rodzaje otworów i konkretne modele oferowane klientom."
          icon={PackageCheck}
        >
          <SubGroup title="Dostępne rodzaje otworów">
            {choice("allowedOpeningKinds", options("openingKinds"))}
          </SubGroup>
          <SubGroup title="Typy bram">{choice("allowedGateTypeIds", options("gateTypes"))}</SubGroup>
          <SubGroup title="Modele bram">{choice("allowedGateModelIds", options("gateModels"))}</SubGroup>
          <SubGroup title="Modele drzwi">{choice("allowedDoorModelIds", options("doorModels"))}</SubGroup>
          <SubGroup title="Okna ścienne">{choice("allowedWindowModelIds", wallWindows)}</SubGroup>
          <SubGroup title="Okna dachowe">{choice("allowedWindowModelIds", roofWindows)}</SubGroup>
        </Section>

        <Section
          id="katalog"
          title="Producenci i produkty"
          description="Podzbiór globalnego katalogu przygotowanego przez administratora SaaS."
          icon={Layers3}
        >
          <SubGroup title="Producenci płyt">
            {choice("allowedPanelManufacturerIds", options("panelManufacturers"))}
          </SubGroup>
          <SubGroup title="Modele płyt ściennych">
            {choice("allowedWallPanelModelIds", options("wallPanelModels"))}
          </SubGroup>
          <SubGroup title="Modele płyt dachowych">
            {choice("allowedRoofPanelModelIds", options("roofPanelModels"))}
          </SubGroup>
          <SubGroup title="Producenci bram">
            {choice("allowedGateManufacturerIds", options("gateManufacturers"))}
          </SubGroup>
        </Section>

        <Section
          id="kolory"
          title="Kolorystyka"
          description="Pusta lista kolorów oznacza wszystkie opublikowane wykończenia."
          icon={Palette}
        >
          <SubGroup title="Kolory ścian">
            {choice("allowedWallColorIds", options("materialFinishes"), true)}
          </SubGroup>
          <SubGroup title="Kolory dachu">
            {choice("allowedRoofColorIds", options("materialFinishes"), true)}
          </SubGroup>
        </Section>

        <Section
          id="powiadomienia"
          title="Powiadomienia o zamówieniach"
          description="Każdy adres podaj w osobnym wierszu."
          icon={BellRing}
        >
          {/* Bez tej funkcji adresy zapiszą się, ale żaden e-mail nie wyjdzie. */}
          {!emailNotificationsEnabled && (
            <Alert className="border-warning/35 bg-warning/10">
              <AlertTitle className="text-warning">Powiadomienia są nieaktywne</AlertTitle>
              <AlertDescription>
                {bootstrap.availableCapabilities?.emailNotifications
                  ? "Wysyłka e-maili została wyłączona w sekcji „Dostępność i funkcje”. Adresy zapiszą się, ale powiadomienia nie będą wysyłane."
                  : `Wysyłka e-maili nie jest dostępna w pakiecie ${bootstrap.packageCode}. Adresy możesz uzupełnić już teraz — zaczną działać po zmianie pakietu.`}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-2">
            <Label htmlFor="notification-emails">Odbiorcy wiadomości e-mail</Label>
            <Textarea
              id="notification-emails"
              rows={5}
              value={settings.orderNotificationEmails.join("\n")}
              // Wyraźne „np.”, bo dwa wiarygodne adresy w polu wielolinijkowym
              // czytają się jak zapisana konfiguracja, a nie jak podpowiedź.
              placeholder={"np. sprzedaz@firma.pl\nnp. biuro@firma.pl"}
              onChange={(event) =>
                changeSettings({
                  ...settings,
                  orderNotificationEmails: event.target.value
                    .split(/[,;\n]/)
                    .map((email) => email.trim())
                    .filter(Boolean),
                })
              }
            />
          </div>
        </Section>
      </div>

      <aside className="xl:sticky xl:top-20 xl:self-start">
        <Card>
          <CardContent className="grid gap-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">Wersja ustawień</span>
              <Badge variant="secondary">v{settings.version}</Badge>
            </div>

            <div
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium",
                dirty
                  ? "border-warning/35 bg-warning/10 text-warning"
                  : "border-success/30 bg-success/10 text-success",
              )}
              role="status"
            >
              <span
                aria-hidden="true"
                className={cn("size-2 rounded-full", dirty ? "bg-warning" : "bg-success")}
              />
              {dirty ? "Masz niezapisane zmiany" : "Wszystkie zmiany zapisane"}
            </div>

            <p className="text-xs leading-relaxed text-muted-foreground">
              Szkic jest prywatny. Dopiero publikacja aktualizuje konfigurator klientów.
            </p>

            <nav className="flex flex-wrap gap-1.5" aria-label="Sekcje ustawień">
              {sectionLinks.map((link) => (
                <a
                  key={link.id}
                  href={`#${link.id}`}
                  className="rounded-md border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {link.label}
                </a>
              ))}
            </nav>

            {validationError && (
              <Alert variant="destructive">
                <AlertDescription>{validationError}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-2">
              <Button
                variant="outline"
                disabled={Boolean(busy) || !dirty}
                onClick={() => save(false)}
              >
                {busy === "draft" ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Zapisz szkic
              </Button>
              <Button disabled={Boolean(busy)} onClick={() => save(true)}>
                {busy === "publish" ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                Opublikuj
              </Button>
              <Button asChild variant="link" size="sm">
                <a
                  href={`/${bootstrap.company.slug}?preview=settings`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Eye size={15} /> Podgląd szkicu
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
