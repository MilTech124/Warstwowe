"use client";

import { useMemo, useState } from "react";
import {
  BadgeDollarSign,
  Boxes,
  DoorOpen,
  Droplets,
  Eye,
  EyeOff,
  Frame,
  Hammer,
  Layers3,
  Lightbulb,
  Loader2,
  Percent,
  Plus,
  Save,
  Send,
  Trash2,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { normalizePriceList } from "@/domain/pricing/priceList";
import type { PriceListExtra, PriceListRates, SizedOpening } from "@/types/pricing";
import { quoteFromConfiguration } from "@/domain/pricing/quote";
import { createInitialConfiguratorConfig } from "@/store/configuratorStore";
import { QuoteTable, formatPln } from "@/components/dashboard/QuoteTable";
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
import { cn } from "@/lib/utils";

// normalizePriceList mieszka w JS, więc typ bierzemy z jawnej deklaracji.
type Rates = PriceListRates;
type CatalogModel = { key: string; name: string };

const EXTRA_KIND_LABELS: Record<string, string> = {
  FIXED: "Kwota stała",
  PER_M2_BUILDING: "Za m² zabudowy",
  PERCENT_OF_MATERIALS: "% wartości materiałów",
};

/** Ustawia zagnieżdżoną wartość bez mutacji oryginału. */
function setPath(source: any, path: string, value: unknown) {
  const keys = path.split(".");
  const next = structuredClone(source);
  let cursor = next;
  for (const key of keys.slice(0, -1)) {
    cursor[key] = cursor[key] ?? {};
    cursor = cursor[key];
  }
  cursor[keys[keys.length - 1]] = value;
  return next;
}

function getPath(source: any, path: string) {
  return path.split(".").reduce((acc, key) => acc?.[key], source);
}

/**
 * Pole nadpisania stawki. Pusta wartość ORAZ 0 znaczą „użyj stawki domyślnej" —
 * silnik wyceny i tak ignoruje zera (warunek `> 0`), więc zostawienie w polu
 * widocznego 0 sugerowałoby cenę zerową, której nikt by nie naliczył.
 */
function UnitPriceInput({
  name,
  value,
  onChange,
  placeholder = "domyślna",
  className = "w-28",
  step = "0.01",
}: {
  name: string;
  value: number | undefined;
  onChange: (value: number | null) => void;
  placeholder?: string;
  className?: string;
  step?: string;
}) {
  return (
    <Input
      type="number"
      min={0}
      step={step}
      aria-label={`Stawka: ${name}`}
      placeholder={placeholder}
      value={value == null ? "" : String(value)}
      onChange={(event) => {
        const raw = event.target.value;
        const parsed = Number(raw);
        onChange(raw === "" || !Number.isFinite(parsed) || parsed <= 0 ? null : parsed);
      }}
      className={className}
    />
  );
}

/** Wiersz cennika bramy: cena za sztukę, szerokość bazowa i dopłata za krok. */
function SizedModelRow({
  name,
  value,
  fallback,
  onChange,
}: {
  name: string;
  value: SizedOpening | undefined;
  fallback: SizedOpening;
  onChange: (value: SizedOpening | null) => void;
}) {
  const patch = (field: keyof SizedOpening, next: number | null) => {
    const base = value ?? { ...fallback, pricePerUnit: 0, widthStepPrice: 0 };
    const merged = { ...base, [field]: next ?? (field === "baseWidthM" ? fallback.baseWidthM : 0) };
    // Wiersz bez własnej ceny i bez dopłaty nie jest nadpisaniem.
    if (!merged.pricePerUnit && !merged.widthStepPrice) return onChange(null);
    onChange(merged);
  };

  return (
    <div className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-center">
      <span className="min-w-0 truncate text-sm font-medium">{name}</span>
      <UnitPriceInput
        name={`${name} — cena za sztukę`}
        value={value?.pricePerUnit}
        onChange={(next) => patch("pricePerUnit", next)}
        placeholder="cena"
        className="w-24"
      />
      <UnitPriceInput
        name={`${name} — szerokość bazowa`}
        value={value?.baseWidthM}
        onChange={(next) => patch("baseWidthM", next)}
        placeholder={`${fallback.baseWidthM} m`}
        className="w-20"
        step="0.1"
      />
      <UnitPriceInput
        name={`${name} — dopłata za 50 cm`}
        value={value?.widthStepPrice}
        onChange={(next) => patch("widthStepPrice", next)}
        placeholder="+50 cm"
        className="w-24"
      />
    </div>
  );
}

function Section({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: typeof Layers3;
  children: React.ReactNode;
}) {
  return (
    <Card>
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
      <CardContent className="grid gap-4 sm:grid-cols-2">{children}</CardContent>
    </Card>
  );
}

export function PricingEditor({
  slug,
  initial,
  defaultPresetId,
  wallPanelModels,
  roofPanelModels,
  gateModels,
  doorModels,
  windowModels,
}: {
  slug: string;
  initial: {
    version: number;
    publishedVersion: number;
    published: boolean;
    showToCustomer: boolean;
    draft: Rates;
  };
  defaultPresetId: string;
  wallPanelModels: CatalogModel[];
  roofPanelModels: CatalogModel[];
  gateModels: CatalogModel[];
  doorModels: CatalogModel[];
  windowModels: CatalogModel[];
}) {
  const [rates, setRates] = useState<Rates>(normalizePriceList(initial.draft) as Rates);
  const [showToCustomer, setShowToCustomer] = useState(initial.showToCustomer);
  const [version, setVersion] = useState(initial.version);
  const [published, setPublished] = useState(initial.published);
  const [busy, setBusy] = useState<"draft" | "publish" | null>(null);
  const [dirty, setDirty] = useState(false);

  // Podgląd na żywo na referencyjnej konfiguracji — bez niego nikt nie oceni,
  // czy 145 zł/m² to sensowna stawka.
  const preview = useMemo(() => {
    try {
      const config = createInitialConfiguratorConfig(defaultPresetId);
      return quoteFromConfiguration(config, rates);
    } catch {
      return null;
    }
  }, [rates, defaultPresetId]);

  function change(path: string, value: unknown) {
    setRates((current) => setPath(current, path, value) as Rates);
    setDirty(true);
  }

  const money = (path: string, label: string, suffix = "zł") => (
    <div className="grid gap-2">
      <Label htmlFor={path}>{label}</Label>
      <div className="relative">
        <Input
          id={path}
          type="number"
          min={0}
          step="0.01"
          inputMode="decimal"
          value={String(getPath(rates, path) ?? 0)}
          onChange={(event) => change(path, Number(event.target.value))}
          className="pr-12"
        />
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">
          {suffix}
        </span>
      </div>
    </div>
  );

  async function save(publish: boolean) {
    setBusy(publish ? "publish" : "draft");
    try {
      const response = await fetch(`/api/companies/${slug}/pricing`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rates, showToCustomer, publish }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Nie udało się zapisać cennika.");
      setVersion(result.priceList.version);
      setPublished(result.priceList.published);
      setDirty(false);
      toast.success(
        publish
          ? "Cennik został opublikowany. Nowe zamówienia będą wyceniane tymi stawkami."
          : "Szkic cennika zapisany. Zamówienia nadal wyceniane są poprzednią wersją.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nie udało się zapisać cennika.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="grid gap-4">
        <Section
          title="Płyty warstwowe"
          description="Stawka bazowa za m². Nadpisania per model mają pierwszeństwo przed grubością, a grubość przed stawką bazową."
          icon={Layers3}
        >
          {money("panels.wall.defaultPerM2", "Płyta ścienna", "zł/m²")}
          {money("panels.roof.defaultPerM2", "Płyta dachowa", "zł/m²")}
          {money("panels.wall.wastePercent", "Zapas na docinanie (ściany)", "%")}
          {money("panels.roof.wastePercent", "Zapas na docinanie (dach)", "%")}
          {money("frontProjection.liningPerM2", "Obudowa wypustu frontowego", "zł/m²")}

          <div className="grid gap-2 sm:col-span-2">
            <Label>Nadpisania per model płyty ściennej</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {wallPanelModels.map((model) => (
                <div key={model.key} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                    {model.name}
                  </span>
                  <UnitPriceInput
                    name={model.name}
                    placeholder="bazowa"
                    value={rates.panels.wall.byModelId[model.key]}
                    onChange={(next) => {
                      const map = { ...rates.panels.wall.byModelId };
                      if (next === null) delete map[model.key];
                      else map[model.key] = next;
                      change("panels.wall.byModelId", map);
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-2 sm:col-span-2">
            <Label>Nadpisania per model płyty dachowej</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {roofPanelModels.map((model) => (
                <div key={model.key} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                    {model.name}
                  </span>
                  <UnitPriceInput
                    name={model.name}
                    placeholder="bazowa"
                    value={rates.panels.roof.byModelId[model.key]}
                    onChange={(next) => {
                      const map = { ...rates.panels.roof.byModelId };
                      if (next === null) delete map[model.key];
                      else map[model.key] = next;
                      change("panels.roof.byModelId", map);
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Section
          title="Konstrukcja stalowa"
          description="Stawki liczone od masy z zestawienia materiałowego."
          icon={Boxes}
        >
          {money("steel.profilePerKg", "Profile", "zł/kg")}
          {money("steel.platePerKg", "Blachy podstaw", "zł/kg")}
          {money("steel.fixingsPerKg", "Łączniki", "zł/kg")}
          {money("steel.anchorPerUnit", "Kotwa", "zł/szt.")}
        </Section>

        <Section
          title="Obróbki i orynnowanie"
          description="Metry bieżące i sztuki pochodzą z zestawienia akcesoriów."
          icon={Frame}
        >
          {money("flashings.defaultPerMeter", "Obróbki blacharskie", "zł/mb")}
          {money("gutters.gutterPerMeter", "Rynny", "zł/mb")}
          {money("gutters.downspoutPerMeter", "Rury spustowe", "zł/mb")}
          {money("gutters.leafGuardPerMeter", "Siatki na liście", "zł/mb")}
          {money("gutters.bracketPerUnit", "Haki rynnowe", "zł/szt.")}
          {money("gutters.clampPerUnit", "Obejmy", "zł/szt.")}
        </Section>

        <Section
          title="Bramy"
          description="Cena za sztukę obejmuje szerokość do rozmiaru bazowego. Każde rozpoczęte 50 cm powyżej to dopłata."
          icon={DoorOpen}
        >
          <div className="grid gap-3 sm:col-span-2">
            <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Stawka domyślna
            </span>
            <div className="grid gap-3 sm:grid-cols-3">
              {money("openings.gate.default.pricePerUnit", "Cena za sztukę", "zł")}
              {money("openings.gate.default.baseWidthM", "Szerokość bazowa", "m")}
              {money("openings.gate.default.widthStepPrice", "Dopłata / 50 cm", "zł")}
            </div>
          </div>

          <div className="grid gap-3 sm:col-span-2">
            <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Ceny per model bramy
            </span>
            {gateModels.map((model) => (
              <SizedModelRow
                key={model.key}
                name={model.name}
                value={rates.openings.gate.byModelId[model.key]}
                fallback={rates.openings.gate.default}
                onChange={(next) => {
                  const map = { ...rates.openings.gate.byModelId };
                  if (next === null) delete map[model.key];
                  else map[model.key] = next;
                  change("openings.gate.byModelId", map);
                }}
              />
            ))}
          </div>
        </Section>

        <Section
          title="Drzwi i okna"
          description="Sztywna cena za sztukę, niezależna od wymiaru otworu."
          icon={Droplets}
        >
          {money("openings.door.default.pricePerUnit", "Drzwi — domyślnie", "zł/szt.")}
          {money("openings.window.default.pricePerUnit", "Okno ścienne — domyślnie", "zł/szt.")}
          {money("openings.roofWindow.default.pricePerUnit", "Okno dachowe — domyślnie", "zł/szt.")}

          {(
            [
              ["door", "Modele drzwi", doorModels],
              ["window", "Modele okien", windowModels],
            ] as const
          ).map(([kind, label, models]) =>
            models.length ? (
              <div key={kind} className="grid gap-2 sm:col-span-2">
                <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {label}
                </span>
                <div className="grid gap-2 sm:grid-cols-2">
                  {models.map((model) => (
                    <div key={model.key} className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                        {model.name}
                      </span>
                      <UnitPriceInput
                        name={model.name}
                        value={rates.openings[kind].byModelId[model.key]?.pricePerUnit}
                        onChange={(next) => {
                          const map = { ...rates.openings[kind].byModelId };
                          if (next === null) delete map[model.key];
                          else map[model.key] = { pricePerUnit: next };
                          change(`openings.${kind}.byModelId`, map);
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : null,
          )}
        </Section>

        <Section
          title="Oświetlenie"
          description="Ceny kompletów instalacji wybieranych w konfiguratorze."
          icon={Lightbulb}
        >
          {money("lighting.interiorLighting", "Oświetlenie wewnętrzne")}
          {money("lighting.roofPerimeterLed", "LED po obwodzie dachu")}
          {money("lighting.gateLamps", "Lampy nad bramą")}
          {money("lighting.exteriorSconces", "Kinkiety zewnętrzne")}
          {money("lighting.frontProjectionLed", "LED w wypuście")}
        </Section>

        <Section
          title="Robocizna, marża i dostawa"
          description="Marża obejmuje materiały, robociznę i pozycje dodatkowe — nie dotyczy dostawy."
          icon={Hammer}
        >
          {money("labour.perM2BuildingArea", "Montaż za m² zabudowy", "zł/m²")}
          {money("labour.percentOfMaterials", "Robocizna jako % materiałów", "%")}
          {money("marginPercent", "Marża", "%")}
          {money("delivery.flat", "Transport (ryczałt)", "zł")}
          {money("vatRatePercent", "Stawka VAT", "%")}
          <div className="grid gap-2">
            <Label htmlFor="rounding">Zaokrąglanie sumy netto</Label>
            <Select value={rates.rounding} onValueChange={(value) => change("rounding", value)}>
              <SelectTrigger id="rounding" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">Bez zaokrąglania</SelectItem>
                <SelectItem value="TO_1">Do pełnych złotych</SelectItem>
                <SelectItem value="TO_10">Do pełnych dziesiątek</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Section>

        <Card>
          <CardHeader>
            <span
              aria-hidden="true"
              className="mb-1 grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"
            >
              <Plus size={19} />
            </span>
            <CardTitle>Pozycje dodatkowe</CardTitle>
            <CardDescription>
              Stałe kwoty, stawki za m² zabudowy lub narzut procentowy od materiałów.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {rates.extras.map((extra: PriceListExtra, index: number) => (
              <div key={extra.id} className="flex flex-wrap items-end gap-2">
                <div className="grid min-w-40 flex-1 gap-1.5">
                  <Label htmlFor={`extra-label-${extra.id}`} className="text-xs">
                    Nazwa
                  </Label>
                  <Input
                    id={`extra-label-${extra.id}`}
                    value={extra.label}
                    onChange={(event) => {
                      const next = [...rates.extras];
                      next[index] = { ...extra, label: event.target.value };
                      change("extras", next);
                    }}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Rodzaj</Label>
                  <Select
                    value={extra.kind}
                    onValueChange={(value) => {
                      const next = [...rates.extras];
                      next[index] = { ...extra, kind: value as typeof extra.kind };
                      change("extras", next);
                    }}
                  >
                    <SelectTrigger className="w-48" aria-label={`Rodzaj: ${extra.label}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(EXTRA_KIND_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Wartość</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    aria-label={`Wartość: ${extra.label}`}
                    value={String(extra.value)}
                    onChange={(event) => {
                      const next = [...rates.extras];
                      next[index] = { ...extra, value: Number(event.target.value) };
                      change("extras", next);
                    }}
                    className="w-28"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Usuń pozycję ${extra.label}`}
                  onClick={() =>
                    change(
                      "extras",
                      rates.extras.filter((item: PriceListExtra) => item.id !== extra.id),
                    )
                  }
                  className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 size={15} />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              className="w-fit"
              onClick={() =>
                change("extras", [
                  ...rates.extras,
                  {
                    id: `extra-${Date.now()}`,
                    label: "Nowa pozycja",
                    kind: "FIXED",
                    value: 0,
                  },
                ])
              }
            >
              <Plus size={15} /> Dodaj pozycję
            </Button>
          </CardContent>
        </Card>
      </div>

      <aside className="grid gap-4 xl:sticky xl:top-20 xl:self-start">
        <Card>
          <CardContent className="grid gap-4">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">Wersja cennika</span>
              <Badge variant="secondary">v{version}</Badge>
            </div>

            <div
              role="status"
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium",
                dirty
                  ? "border-warning/35 bg-warning/10 text-warning"
                  : published
                    ? "border-success/30 bg-success/10 text-success"
                    : "border-border bg-muted text-muted-foreground",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "size-2 rounded-full",
                  dirty ? "bg-warning" : published ? "bg-success" : "bg-muted-foreground",
                )}
              />
              {dirty
                ? "Masz niezapisane zmiany"
                : published
                  ? "Cennik opublikowany"
                  : "Cennik nieopublikowany"}
            </div>

            <div className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
              <span className="grid gap-0.5">
                <span className="flex items-center gap-1.5 text-sm font-medium">
                  {showToCustomer ? <Eye size={14} /> : <EyeOff size={14} />}
                  Ceny widoczne dla klienta
                </span>
                <span className="text-xs text-muted-foreground">
                  Gdy wyłączone, stawki nie opuszczają serwera — wycena trafia tylko do panelu
                  i na PDF.
                </span>
              </span>
              <Switch
                aria-label="Pokazuj ceny klientom w konfiguratorze"
                checked={showToCustomer}
                onCheckedChange={(value) => {
                  setShowToCustomer(value);
                  setDirty(true);
                }}
              />
            </div>

            <div className="grid gap-2">
              <Button variant="outline" disabled={Boolean(busy) || !dirty} onClick={() => save(false)}>
                {busy === "draft" ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Zapisz szkic
              </Button>
              <Button disabled={Boolean(busy)} onClick={() => save(true)}>
                {busy === "publish" ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                Opublikuj cennik
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <span className="text-[11px] font-semibold tracking-[0.13em] text-primary uppercase">
              Podgląd
            </span>
            <CardTitle className="flex items-center gap-2">
              <BadgeDollarSign size={17} /> Wycena referencyjna
            </CardTitle>
            <CardDescription>
              Domyślna konfiguracja przeliczana na bieżąco wprowadzanymi stawkami.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {preview ? (
              <>
                <div className="rounded-xl border border-border bg-muted/40 p-4 text-center">
                  <span className="block text-xs text-muted-foreground">Brutto</span>
                  <strong className="text-2xl font-bold tabular-nums">
                    {formatPln(preview.totalGross)}
                  </strong>
                </div>
                {preview.incomplete && (
                  <Alert className="border-warning/35 bg-warning/10">
                    <AlertTitle className="text-warning">Wycena niepełna</AlertTitle>
                    <AlertDescription className="text-xs">
                      Brakuje stawek: {preview.missingRates.slice(0, 6).join(", ")}
                      {preview.missingRates.length > 6
                        ? ` i ${preview.missingRates.length - 6} więcej`
                        : ""}
                      .
                    </AlertDescription>
                  </Alert>
                )}
                <QuoteTable quote={preview as never} compact />
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nie udało się policzyć podglądu dla domyślnego presetu.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-start gap-2.5">
            <Percent size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Zamówienie zapamiętuje wersję cennika, po której zostało wycenione. Późniejsze
              zmiany stawek nie zmieniają cen już złożonych zamówień.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-start gap-2.5">
            <Truck size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Ilości pochodzą z zestawienia materiałowego konfiguratora — powierzchni płyt, masy
              stali i metrów obróbek nie trzeba wpisywać ręcznie.
            </p>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
