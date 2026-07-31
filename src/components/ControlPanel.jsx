import { useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronRight,
  Copy,
  DoorOpen,
  Droplets,
  Frame,
  Grid2X2Plus,
  Layers3,
  Lightbulb,
  Moon,
  PanelTop,
  Plus,
  Ruler,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import {
  CLADDING_CATALOG,
  DOOR_MODELS,
  FLASHING_COLORS,
  FLASHING_PACKAGES,
  GATE_MANUFACTURERS,
  GATE_PATTERNS,
  GATE_STRUCTURES,
  GUTTER_COLORS,
  OPENING_FRAME_COLORS,
  OPENING_WALLS,
  PRESETS,
  ROOF_CLADDING_CATALOG,
  ROOF_TYPES,
  WINDOW_GLASS_TYPES,
  WINDOW_MODELS,
  WALL_PANEL_LENGTH_STANDARDS,
  getCladdingColor,
  getCladdingManufacturer,
  getCladdingModel,
  getCladdingType,
  getDoorColor,
  getDoorModel,
  getGateColor,
  getGateAvailableColors,
  getGateManufacturer,
  getGateModel,
  getGateType,
  getRoofCladdingColor,
  getRoofCladdingManufacturer,
  getRoofCladdingModel,
  getWindowFrameColor,
  getWindowGlass,
  getWindowDefaultSize,
  getWindowModel,
  getWindowOrientation,
  getWindowSizeRanges,
  getWallPanelLengthM,
} from "@/config/catalog";
import { useConfiguratorStore, useConfiguratorStoreApi } from "@/store/configuratorStore";
import { cn, formatMeters } from "@/lib/utils";
import { Field, Select, Slider } from "@/components/ui/Field";
import { StructurePanel } from "@/components/StructurePanel";
import { OrderPdfFooter } from "@/components/OrderPdfFooter";
import {
  filterAllowedColors,
  filterAllowedRecord,
  useConfiguratorAccess,
} from "@/configurator/ConfiguratorContext";
import { openingTitle } from "@/lib/openingLabels";
import { roofPitchBounds } from "@/scene/geometry";
import {
  DEFAULT_FRONT_PROJECTION,
  FRONT_PROJECTION_FINISHES,
  FRONT_PROJECTION_LIMITS,
  getFrontProjectionFinish,
  isFrontProjectionAvailable,
} from "@/config/frontProjection";

const dimensionLabels = {
  widthM: "Szerokość",
  lengthM: "Długość",
  wallHeightM: "Wysokość",
};

const tabs = [
  { id: "body", label: "Bryła", icon: Ruler },
  { id: "roof", label: "Dach", icon: ArrowUpRight },
  { id: "cladding", label: "Płyty", icon: Layers3 },
  { id: "flashings", label: "Obróbki", icon: SlidersHorizontal },
  { id: "openings", label: "Otwory", icon: DoorOpen },
  { id: "lighting", label: "Oświetlenie", icon: Lightbulb },
  { id: "structure", label: "Konstrukcja", icon: Frame },
];

export function ControlPanel() {
  const [claddingDraft, setCladdingDraft] = useState(null);
  const access = useConfiguratorAccess();
  const config = useConfiguratorStore((state) => state.config);
  const activeTab = useConfiguratorStore((state) => state.ui.activeTab);
  const setActiveTab = useConfiguratorStore((state) => state.setActiveTab);
  const updateDimension = useConfiguratorStore((state) => state.updateDimension);
  const updateRoof = useConfiguratorStore((state) => state.updateRoof);
  const updateOverhang = useConfiguratorStore((state) => state.updateOverhang);
  const updateFrontProjection = useConfiguratorStore((state) => state.updateFrontProjection);
  const updateCladding = useConfiguratorStore((state) => state.updateCladding);
  const updateFlashings = useConfiguratorStore((state) => state.updateFlashings);
  const updateGutters = useConfiguratorStore((state) => state.updateGutters);
  const updateLighting = useConfiguratorStore((state) => state.updateLighting);
  const updateStructure = useConfiguratorStore((state) => state.updateStructure);
  const updateOpening = useConfiguratorStore((state) => state.updateOpening);
  const addOpening = useConfiguratorStore((state) => state.addOpening);
  const duplicateOpening = useConfiguratorStore((state) => state.duplicateOpening);
  const removeOpening = useConfiguratorStore((state) => state.removeOpening);
  const limits = PRESETS[config.preset].dimensionLimits;
  const roofPitch = roofPitchBounds(config.roof.type);
  const visibleTabs = tabs.filter((tab) => {
    if (tab.id === "lighting") return access.capabilities.lighting;
    if (tab.id === "structure") return access.capabilities.structureView;
    return true;
  });

  return (
    <aside className="control-panel">
      <div className="panel-top">
        <div className="panel-title-row">
          <div className="configurator-brand">
            <span className="configurator-brand-mark">
              {access.company.branding.logoUrl ? (
                <img src={access.company.branding.logoUrl} alt="" />
              ) : (
                access.company.branding.name.slice(0, 1).toUpperCase()
              )}
            </span>
            <div>
              <p className="eyebrow">{access.company.branding.name}</p>
              <h1>Konfigurator garażu</h1>
            </div>
          </div>
          <div className="panel-online-state">
            <span className="panel-status-dot" aria-hidden="true" />
            <span>Online</span>
          </div>
        </div>
        <p className="panel-intro">Dopasuj obiekt krok po kroku. Podgląd 3D aktualizuje się automatycznie.</p>
      </div>

      <nav className="config-tabs" aria-label="Kategorie konfiguracji">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} className={cn("config-tab", activeTab === tab.id && "active")} onClick={() => setActiveTab(tab.id)} type="button">
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="panel-content">
        {activeTab === "body" && (
          <>
            <PanelSection title="Wymiary obiektu" icon={SlidersHorizontal}>
              <div className="control-stack">
                {Object.entries(config.dimensions).map(([key, value]) => (
                  <RangeControl
                    key={key}
                    label={dimensionLabels[key]}
                    value={value}
                    display={formatMeters(value)}
                    min={limits[key][0]}
                    max={limits[key][1]}
                    step={0.1}
                    onChange={(next) => updateDimension(key, next)}
                  />
                ))}
              </div>
            </PanelSection>
            {access.capabilities.frontProjection && (
              <PanelSection title="Wypust frontowy" icon={PanelTop}>
                <FrontProjectionPanel config={config} updateFrontProjection={updateFrontProjection} />
              </PanelSection>
            )}
          </>
        )}

        {activeTab === "roof" && (
          <PanelSection title="Geometria dachu" icon={ArrowUpRight}>
            <Field label="Typ dachu">
              <Select value={config.roof.type} onChange={(event) => updateRoof({ type: event.target.value })}>
                {Object.entries(ROOF_TYPES).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </Select>
            </Field>
            <RangeControl
              label="Nachylenie"
              value={config.roof.pitchPercent}
              display={`${config.roof.pitchPercent}%`}
              min={roofPitch.min}
              max={roofPitch.max}
              step={1}
              onChange={(value) => updateRoof({ pitchPercent: value })}
            />
            <div className="side-control-grid">
              {Object.entries(config.roof.overhangM).map(([side, value]) => (
                <RangeControl
                  key={side}
                  label={`Okap ${OPENING_WALLS[side] || side}`}
                  value={value}
                  display={formatMeters(value)}
                  min={0}
                  max={0.8}
                  step={0.05}
                  compact
                  onChange={(next) => updateOverhang(side, next)}
                />
              ))}
            </div>
            <GuttersPanel config={config} updateGutters={updateGutters} />
          </PanelSection>
        )}

        {activeTab === "cladding" && (
          <PanelSection title="Poszycie i izolacja" icon={Layers3}>
            <CladdingFlow
              selection={claddingDraft || config.cladding}
              appliedSelection={config.cladding}
              onChange={setCladdingDraft}
              onColorChange={(color) => updateCladding({ color })}
              onApply={(selection) => {
                updateCladding(selection);
                setCladdingDraft(null);
              }}
            />
            <RoofCladdingFlow cladding={config.cladding} updateCladding={updateCladding} />
          </PanelSection>
        )}

        {activeTab === "openings" && (
          <PanelSection title="Bramy, drzwi i okna" icon={DoorOpen}>
            <OpeningsPanel
              config={config}
              updateOpening={updateOpening}
              addOpening={addOpening}
              duplicateOpening={duplicateOpening}
              removeOpening={removeOpening}
            />
          </PanelSection>
        )}

        {activeTab === "flashings" && (
          <PanelSection title="Obrobki blacharskie" icon={SlidersHorizontal}>
            <FlashingsPanel config={config} updateFlashings={updateFlashings} />
          </PanelSection>
        )}

        {activeTab === "structure" && (
          <PanelSection title="Konstrukcja stalowa" icon={Frame}>
            <StructurePanel config={config} updateStructure={updateStructure} />
          </PanelSection>
        )}

        {activeTab === "lighting" && (
          <PanelSection title="Oświetlenie obiektu" icon={Lightbulb}>
            <LightingPanel config={config} updateLighting={updateLighting} />
          </PanelSection>
        )}
      </div>

      <OrderPdfFooter />
    </aside>
  );
}

function FrontProjectionPanel({ config, updateFrontProjection }) {
  const [colorModalOpen, setColorModalOpen] = useState(false);
  const available = isFrontProjectionAvailable(config.preset);
  const selection = { ...DEFAULT_FRONT_PROJECTION, ...(config.frontProjection ?? {}) };
  const finish = getFrontProjectionFinish(selection.liningFinish);
  const totalFrontReachM = (Number(config.roof?.overhangM?.front) || 0) + selection.depthM;

  return (
    <div className={cn("front-projection-panel", !available && "is-disabled")}>
      {!available && (
        <div className="front-projection-unavailable" role="status">
          Dostępne dla garażu pojedynczego i podwójnego.
        </div>
      )}
      <RangeControl
        label="Głębokość wypustu"
        value={available ? selection.depthM : 0}
        display={formatMeters(available ? selection.depthM : 0)}
        min={FRONT_PROJECTION_LIMITS.minM}
        max={FRONT_PROJECTION_LIMITS.maxM}
        step={FRONT_PROJECTION_LIMITS.stepM}
        disabled={!available}
        onChange={(depthM) => updateFrontProjection({ depthM })}
      />
      <div className="front-projection-total">
        <span>Łączne wysunięcie dachu</span>
        <strong>{formatMeters(available ? totalFrontReachM : config.roof.overhangM.front)}</strong>
        <small>Okap przód + wypust</small>
      </div>
      <button
        className="title-color-button front-projection-finish"
        type="button"
        disabled={!available}
        onClick={() => setColorModalOpen(true)}
        aria-label={`Wykończenie wnętrza wypustu: ${finish.label}`}
      >
        <span className="color-chip" style={{ backgroundColor: finish.hex }} />
        <span>
          <small>Wykończenie od środka</small>
          <strong>{finish.label}</strong>
        </span>
      </button>
      <ColorModal
        title="Wykończenie wnętrza wypustu"
        colors={FRONT_PROJECTION_FINISHES}
        selected={selection.liningFinish}
        open={available && colorModalOpen}
        onClose={() => setColorModalOpen(false)}
        onSelect={(liningFinish) => {
          updateFrontProjection({ liningFinish });
          setColorModalOpen(false);
        }}
      />
    </div>
  );
}

function FlashingsPanel({ config, updateFlashings }) {
  const [colorModalOpen, setColorModalOpen] = useState(false);
  const roofColor = getRoofCladdingColor(config.cladding);
  const color = config.flashings.color === "roof_match"
    ? { ...FLASHING_COLORS.roof_match, hex: roofColor.hex, label: `Jak dach (${roofColor.label})` }
    : FLASHING_COLORS[config.flashings.color] || FLASHING_COLORS.roof_match;

  return (
    <div className="flashings-panel">
      <div className="flashings-hero">
        <div>
          <span>Pakiet obrobek</span>
          <strong>{FLASHING_PACKAGES[config.flashings.package]?.label}</strong>
          <small>{FLASHING_PACKAGES[config.flashings.package]?.description}</small>
        </div>
        <button className={cn("flashings-power", config.flashings.enabled && "active")} type="button" onClick={() => updateFlashings({ enabled: !config.flashings.enabled })}>
          {config.flashings.enabled ? "Wlaczone" : "Wylaczone"}
        </button>
      </div>

      <div className="package-grid">
        {Object.entries(FLASHING_PACKAGES).map(([key, item]) => (
          <button key={key} className={cn("package-option", config.flashings.package === key && "active")} type="button" onClick={() => updateFlashings({ package: key })}>
            <strong>{item.label}</strong>
            <small>{item.description}</small>
          </button>
        ))}
      </div>

      <div className="flashing-color-row">
        <div>
          <span>Kolor obrobek</span>
          <strong>{color.label}</strong>
        </div>
        <button className="title-color-button" type="button" onClick={() => setColorModalOpen(true)} aria-label={`Kolor obrobek: ${color.label}`}>
          <span className="color-chip" style={{ backgroundColor: color.hex }} />
          <strong>{color.label}</strong>
        </button>
      </div>

      <ColorModal
        title="Kolor obrobek"
        colors={resolveFlashingColors(roofColor)}
        selected={config.flashings.color}
        open={colorModalOpen}
        onClose={() => setColorModalOpen(false)}
        onSelect={(nextColor) => {
          updateFlashings({ color: nextColor });
          setColorModalOpen(false);
        }}
      />

      <div className="flashing-toggle-list">
        <ToggleRow label="Naroznik zewnetrzny" description="Gieta obrobka maskujaca styk dwoch plyt sciennych" checked={config.flashings.corners} onChange={(corners) => updateFlashings({ corners })} />
        <ToggleRow label="Wiatrownice i pasy okapowe" description="Cienkie obrobki na bocznych i okapowych krawedziach dachu" checked={config.flashings.roofEdges} onChange={(roofEdges) => updateFlashings({ roofEdges })} />
        <ToggleRow label="Kalenica zewnetrzna" description="Gieta nakladka na styku polaci dachu dwuspadowego" checked={config.flashings.ridge} onChange={(ridge) => updateFlashings({ ridge })} />
      </div>
    </div>
  );
}

function resolveFlashingColors(roofColor) {
  const { roof_match: _match, ...finishes } = FLASHING_COLORS;
  return {
    roof_match: { label: `Jak dach (${roofColor.label})`, hex: roofColor.hex },
    ...finishes,
  };
}

function GuttersPanel({ config, updateGutters }) {
  const [colorModalOpen, setColorModalOpen] = useState(false);
  const roofColor = getRoofCladdingColor(config.cladding);
  const color = config.gutters.color === "roof_match"
    ? { ...GUTTER_COLORS.roof_match, hex: roofColor.hex, label: `Jak dach (${roofColor.label})` }
    : GUTTER_COLORS[config.gutters.color] || GUTTER_COLORS.roof_match;

  return (
    <div className="flashings-panel gutters-panel-compact">
      <div className="flashings-hero">
        <div>
          <span className="gutters-hero-label"><Droplets className="h-4 w-4" /> Orynnowanie</span>
          <strong>Rynny i rury spustowe</strong>
        </div>
        <button className={cn("flashings-power", config.gutters.enabled && "active")} type="button" onClick={() => updateGutters({ enabled: !config.gutters.enabled })}>
          {config.gutters.enabled ? "Wlaczone" : "Wylaczone"}
        </button>
      </div>

      <div className="flashing-color-row">
        <div>
          <span>Kolor rynien</span>
          <strong>{color.label}</strong>
        </div>
        <button className="title-color-button" type="button" onClick={() => setColorModalOpen(true)} aria-label={`Kolor rynien: ${color.label}`}>
          <span className="color-chip" style={{ backgroundColor: color.hex }} />
          <strong>{color.label}</strong>
        </button>
      </div>

      <ColorModal
        title="Kolor rynien"
        colors={resolveGutterColors(roofColor)}
        selected={config.gutters.color}
        open={colorModalOpen}
        onClose={() => setColorModalOpen(false)}
        onSelect={(nextColor) => {
          updateGutters({ color: nextColor });
          setColorModalOpen(false);
        }}
      />
    </div>
  );
}

function resolveGutterColors(roofColor) {
  const { roof_match: _match, ...finishes } = GUTTER_COLORS;
  return {
    roof_match: { label: `Jak dach (${roofColor.label})`, hex: roofColor.hex },
    ...finishes,
  };
}

function LightingPanel({ config, updateLighting }) {
  const projectionSupported = isFrontProjectionAvailable(config.preset);
  const projectionAvailable = projectionSupported && Number(config.frontProjection?.depthM) > 0;
  const gateCount = config.openings.filter((opening) => opening.kind === "gate").length;
  const lighting = config.lighting ?? {};

  return (
    <div className="lighting-panel">
      <div className="lighting-preview-note" role="status">
        <span className="lighting-preview-icon" aria-hidden="true">
          <Moon className="h-4 w-4" />
        </span>
        <span>
          <strong>Tryb prezentacji oświetlenia</strong>
          <small>Scena jest przyciemniona tylko podczas pracy w tej zakładce.</small>
        </span>
      </div>

      <div className="lighting-toggle-list">
        <ToggleRow
          label="Oświetlenie wewnętrzne"
          description="Liniowe oprawy LED rozmieszczone równomiernie pod dachem garażu."
          checked={Boolean(lighting.interiorLighting)}
          onChange={(interiorLighting) => updateLighting({ interiorLighting })}
        />
        <ToggleRow
          label="LED po obrysie dachu"
          description="Ciągła linia światła pod wszystkimi zewnętrznymi krawędziami dachu."
          checked={Boolean(lighting.roofPerimeterLed)}
          onChange={(roofPerimeterLed) => updateLighting({ roofPerimeterLed })}
        />
        <ToggleRow
          label="Lampy podłużne nad bramami"
          description={gateCount > 0
            ? `Automatycznie nad każdą bramą — obecnie ${gateCount} ${gateCount === 1 ? "brama" : "bramy"}.`
            : "Lampy pojawią się automatycznie po dodaniu bramy."}
          checked={Boolean(lighting.gateLamps)}
          onChange={(gateLamps) => updateLighting({ gateLamps })}
        />
        <ToggleRow
          label="Kinkiety zewnętrzne"
          description="Dwa małe kinkiety na elewacji frontowej z miękkim światłem skierowanym w dół."
          checked={Boolean(lighting.exteriorSconces)}
          onChange={(exteriorSconces) => updateLighting({ exteriorSconces })}
        />
        <ToggleRow
          label="LED przy obróbce wypustu"
          description={projectionAvailable
            ? "LED po wewnętrznej stronie obróbki dachu i obu ścian wypustu."
            : projectionSupported
              ? "Najpierw ustaw głębokość wypustu większą niż 0 m w zakładce Bryła."
              : "Opcja wymaga wypustu dostępnego dla garażu pojedynczego lub podwójnego."}
          checked={Boolean(lighting.frontProjectionLed)}
          disabled={!projectionAvailable}
          onChange={(frontProjectionLed) => updateLighting({ frontProjectionLed })}
        />
      </div>

      {!projectionAvailable && (
        <p className="lighting-compatibility-note">
          LED wypustu pozostaje wyłączony dla tego typu obiektu.
        </p>
      )}
    </div>
  );
}

function ToggleRow({ label, description, checked, onChange, disabled = false }) {
  return (
    <button
      className={cn("toggle-row", checked && "active", disabled && "is-disabled")}
      type="button"
      disabled={disabled}
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
    >
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <span className="toggle-switch" aria-hidden="true">
        <span />
      </span>
    </button>
  );
}

function OpeningsPanel({ config, updateOpening, addOpening, duplicateOpening, removeOpening }) {
  const storeApi = useConfiguratorStoreApi();
  const [selectedId, setSelectedId] = useState(config.openings[0]?.id || null);
  const selected = config.openings.find((opening) => opening.id === selectedId) || config.openings[0];
  const selectedIndex = selected ? config.openings.findIndex((opening) => opening.id === selected.id) : -1;

  const addAndSelect = (kind) => {
    addOpening(kind);
    queueMicrotask(() => {
      const openings = storeApi.getState().config.openings;
      setSelectedId(openings.at(-1)?.id || null);
    });
  };

  const duplicateAndSelect = (id) => {
    duplicateOpening(id);
    queueMicrotask(() => {
      const openings = storeApi.getState().config.openings;
      setSelectedId(openings.at(-1)?.id || null);
    });
  };

  return (
    <div className="openings-manager">
      <div className="opening-add-grid">
        <button type="button" onClick={() => addAndSelect("gate")}>
          <Plus className="h-4 w-4" />
          <span>Brama</span>
        </button>
        <button type="button" onClick={() => addAndSelect("door")}>
          <DoorOpen className="h-4 w-4" />
          <span>Drzwi</span>
        </button>
        <button type="button" onClick={() => addAndSelect("window")}>
          <Grid2X2Plus className="h-4 w-4" />
          <span>Okno</span>
        </button>
        <button type="button" onClick={() => addAndSelect("roofWindow")}>
          <ArrowUpRight className="h-4 w-4" />
          <span>Dachowe</span>
        </button>
      </div>

      {config.openings.length > 0 && (
        <div className="opening-selector" role="tablist" aria-label="Otwory w obiekcie">
          {config.openings.map((opening, index) => (
            <button
              key={opening.id}
              type="button"
              role="tab"
              aria-selected={selected?.id === opening.id}
              className={cn(selected?.id === opening.id && "active")}
              onClick={() => setSelectedId(opening.id)}
            >
              <span>{openingTitle(opening, index)}</span>
              <small>{opening.kind === "roofWindow" ? "Dach" : OPENING_WALLS[opening.wall]}</small>
            </button>
          ))}
        </div>
      )}

      {!selected && (
        <div className="opening-empty">
          <DoorOpen className="h-5 w-5" />
          <strong>Dodaj pierwszy otwór</strong>
          <span>Wybierz bramę, drzwi lub okno. Ściana i konstrukcja zostaną dopasowane automatycznie.</span>
        </div>
      )}

      {selected && (
        <div className="opening-workspace">
          <div className="opening-workspace-head">
            <div>
              <span>Edytowany element</span>
              <strong>{openingTitle(selected, selectedIndex)}</strong>
            </div>
            <div className="opening-actions">
              <button type="button" title="Duplikuj" aria-label="Duplikuj otwór" onClick={() => duplicateAndSelect(selected.id)}>
                <Copy className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="danger"
                title="Usuń"
                aria-label="Usuń otwór"
                onClick={() => {
                  removeOpening(selected.id);
                  setSelectedId(null);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {selected.kind === "gate" && <GateFlow opening={selected} updateOpening={updateOpening} />}
          {selected.kind === "door" && <DoorFlow opening={selected} updateOpening={updateOpening} cladding={config.cladding} />}
          {(selected.kind === "window" || selected.kind === "roofWindow") && <WindowFlow opening={selected} updateOpening={updateOpening} />}
          <OpeningEditorV2 opening={selected} updateOpening={updateOpening} dimensions={config.dimensions} />
        </div>
      )}
    </div>
  );
}

function DoorFlow({ opening, updateOpening, cladding }) {
  const [colorModalOpen, setColorModalOpen] = useState(false);
  const model = getDoorModel(opening);
  const color = model.matchCladding ? getCladdingColor(cladding) : getDoorColor(opening);

  const selectModel = (modelKey) => {
    const next = DOOR_MODELS[modelKey];
    updateOpening(opening.id, {
      model: modelKey,
      widthM: Math.max(next.widthRange[0], Math.min(next.widthRange[1], opening.widthM)),
      heightM: Math.max(next.heightRange[0], Math.min(next.heightRange[1], opening.heightM)),
    });
  };

  return (
    <div className="opening-product-flow">
      <div className="opening-product-title">
        <div>
          <span>Model drzwi</span>
          <strong>{model.label}</strong>
          <small>{model.note}</small>
        </div>
        <button
          className="title-color-button"
          type="button"
          disabled={model.matchCladding}
          onClick={() => !model.matchCladding && setColorModalOpen(true)}
        >
          <span className="color-chip" style={{ backgroundColor: color.hex }} />
          <strong>{model.matchCladding ? `Jak poszycie (${color.label})` : color.label}</strong>
        </button>
      </div>
      <ColorModal
        title="Kolor drzwi"
        colors={model.colors}
        selected={opening.color}
        open={colorModalOpen && !model.matchCladding}
        onClose={() => setColorModalOpen(false)}
        onSelect={(nextColor) => {
          updateOpening(opening.id, { color: nextColor });
          setColorModalOpen(false);
        }}
      />
      <div className="opening-model-grid">
        {Object.entries(DOOR_MODELS).map(([key, item]) => (
          <button key={key} className={cn(opening.model === key && "active")} type="button" onClick={() => selectModel(key)}>
            <strong>{item.label}</strong>
            <small>{item.note}</small>
            <span>{item.matchCladding ? "Profil i kolor ściany" : item.embossment === "sectional_panels" ? "Segmenty" : item.glazing ? "Z oknem" : "1 skrzydło"}</span>
          </button>
        ))}
      </div>
      <div className="opening-direction">
        <span>Strona zawiasów</span>
        <div className="segmented">
          <button className={cn(opening.hinge !== "right" && "active")} type="button" onClick={() => updateOpening(opening.id, { hinge: "left" })}>Lewa</button>
          <button className={cn(opening.hinge === "right" && "active")} type="button" onClick={() => updateOpening(opening.id, { hinge: "right" })}>Prawa</button>
        </div>
      </div>
      <ToggleRow
        label="Otwórz drzwi"
        description="Animowany podgląd skrzydła i kierunku otwierania"
        checked={!!opening.open}
        onChange={(open) => updateOpening(opening.id, { open })}
      />
    </div>
  );
}

function WindowFlow({ opening, updateOpening }) {
  const [colorModalOpen, setColorModalOpen] = useState(false);
  const model = getWindowModel(opening);
  const orientation = getWindowOrientation(opening, model);
  const frameColor = getWindowFrameColor(opening);
  const glass = getWindowGlass(opening);
  const operable = model.operation !== "fixed";
  const requestedMode = opening.openMode || (opening.open ? "turn" : "closed");
  const openMode = model.openModes.includes(requestedMode) ? requestedMode : "closed";
  const roofPlacement = opening.kind === "roofWindow";
  const availableModels = Object.entries(WINDOW_MODELS).filter(([, item]) =>
    roofPlacement ? item.placement === "roof" : item.placement !== "roof",
  );

  const selectModel = (modelKey) => {
    const next = WINDOW_MODELS[modelKey];
    const nextOrientation = next.orientationModes?.includes(orientation) ? orientation : "horizontal";
    const [defaultWidth, defaultHeight] = getWindowDefaultSize(next, nextOrientation);
    const ranges = getWindowSizeRanges(next, nextOrientation);
    const usePresetSize = Array.isArray(next.defaultSizeM);
    updateOpening(opening.id, {
      model: modelKey,
      orientation: nextOrientation,
      widthM: Math.max(ranges.widthRange[0], Math.min(ranges.widthRange[1], usePresetSize ? defaultWidth : opening.widthM)),
      heightM: Math.max(ranges.heightRange[0], Math.min(ranges.heightRange[1], usePresetSize ? defaultHeight : opening.heightM)),
      openMode: next.openModes.includes(openMode) ? openMode : "closed",
      open: next.openModes.includes(openMode) ? openMode !== "closed" : false,
    });
  };

  const setOrientation = (nextOrientation) => {
    const [widthM, heightM] = getWindowDefaultSize(model, nextOrientation);
    updateOpening(opening.id, {
      orientation: nextOrientation,
      widthM,
      heightM,
    });
  };

  return (
    <div className="opening-product-flow">
      <div className="opening-product-title">
        <div>
          <span>{roofPlacement ? "System okna dachowego" : "System okienny"}</span>
          <strong>{model.label}</strong>
          <small>{model.note}</small>
        </div>
        <button className="title-color-button" type="button" onClick={() => setColorModalOpen(true)}>
          <span className="color-chip" style={{ backgroundColor: frameColor.hex }} />
          <strong>{frameColor.label}</strong>
        </button>
      </div>
      <ColorModal
        title="Kolor ramy"
        colors={OPENING_FRAME_COLORS}
        selected={opening.frameColor}
        open={colorModalOpen}
        onClose={() => setColorModalOpen(false)}
        onSelect={(frameColorKey) => {
          updateOpening(opening.id, { frameColor: frameColorKey });
          setColorModalOpen(false);
        }}
      />
      <div className="opening-model-grid">
        {availableModels.map(([key, item]) => (
          <button key={key} className={cn(opening.model === key && "active")} type="button" onClick={() => selectModel(key)}>
            <strong>{item.label}</strong>
            <small>{item.note}</small>
            <span>{item.panes} {item.panes === 1 ? "pole" : "pola"}</span>
          </button>
        ))}
      </div>
      {!roofPlacement && model.operation === "fixed" && model.orientationModes?.includes("vertical") && (
        <div className="opening-direction">
          <span>Ustawienie FIX</span>
          <div className="segmented">
            <button className={cn(orientation !== "vertical" && "active")} type="button" onClick={() => setOrientation("horizontal")}>Poziome</button>
            <button className={cn(orientation === "vertical" && "active")} type="button" onClick={() => setOrientation("vertical")}>Pionowe</button>
          </div>
        </div>
      )}
      <Field label="Pakiet szybowy">
        <Select value={opening.glassType} onChange={(event) => updateOpening(opening.id, { glassType: event.target.value })}>
          {Object.entries(WINDOW_GLASS_TYPES).map(([key, item]) => (
            <option key={key} value={key}>{item.label}</option>
          ))}
        </Select>
      </Field>
      <div className="opening-glass-preview">
        <span style={{ backgroundColor: glass.tint }} />
        <div>
          <strong>{glass.label}</strong>
          <small>{glass.transmission >= 0.75 ? "Dużo naturalnego światła" : "Większa prywatność i miękkie światło"}</small>
        </div>
      </div>
      {operable && (
        <>
          {model.panes === 1 && (
            <div className="opening-direction">
              <span>Strona zawiasów</span>
              <div className="segmented">
                <button className={cn(opening.hinge !== "right" && "active")} type="button" onClick={() => updateOpening(opening.id, { hinge: "left" })}>Lewa</button>
                <button className={cn(opening.hinge === "right" && "active")} type="button" onClick={() => updateOpening(opening.id, { hinge: "right" })}>Prawa</button>
              </div>
            </div>
          )}
          <div className="opening-direction window-operation">
            <span>Sposób otwierania</span>
            <div className="segmented three">
              <button className={cn(openMode === "closed" && "active")} type="button" onClick={() => updateOpening(opening.id, { openMode: "closed" })}>Zamknięte</button>
              <button className={cn(openMode === "turn" && "active")} type="button" onClick={() => updateOpening(opening.id, { openMode: "turn" })}>Rozwierne</button>
              <button className={cn(openMode === "tilt" && "active")} type="button" onClick={() => updateOpening(opening.id, { openMode: "tilt" })}>Uchylne</button>
            </div>
            <small className="opening-operation-note">Klamka i skrzydło animują się zgodnie z wybranym trybem.</small>
          </div>
        </>
      )}
    </div>
  );
}

function GateFlow({ opening, updateOpening }) {
  const [activeStep, setActiveStep] = useState(0);
  const [colorModalOpen, setColorModalOpen] = useState(false);
  const access = useConfiguratorAccess();
  const manufacturer = getGateManufacturer(opening);
  const type = getGateType(opening);
  const model = getGateModel(opening);
  const color = getGateColor(opening);
  const availableColors = getGateAvailableColors(opening);
  const visibleGateManufacturers = filterAllowedRecord(
    GATE_MANUFACTURERS,
    access.settings.allowedGateManufacturerIds,
  );

  const compatibleColor = (nextModel, structure, preferredColor) => {
    const allowedKeys = nextModel.structureColors?.[structure] || Object.keys(nextModel.colors);
    return allowedKeys.includes(preferredColor) && nextModel.colors[preferredColor]
      ? preferredColor
      : allowedKeys.find((key) => nextModel.colors[key]) || Object.keys(nextModel.colors)[0];
  };

  const applyType = (gateType) => {
    const nextType = manufacturer.types[gateType];
    const nextModelKey = Object.keys(nextType.models)[0];
    const nextModel = nextType.models[nextModelKey];
    const nextStructure = nextModel.defaultStructure || nextModel.structures?.[0] || "silkline";
    updateOpening(opening.id, {
      gateType,
      model: nextModelKey,
      pattern: nextModel.defaultPattern || "smooth",
      structure: nextStructure,
      layout: nextModel.defaultLayout || "vertical",
      color: compatibleColor(nextModel, nextStructure, opening.color),
    });
  };

  const applyModel = (modelKey) => {
    const nextModel = type.models[modelKey];
    const nextStructure = nextModel.structures
      ? (nextModel.structures.includes(opening.structure) ? opening.structure : nextModel.defaultStructure || nextModel.structures[0])
      : opening.structure;
    updateOpening(opening.id, {
      model: modelKey,
      pattern: nextModel.patterns ? (nextModel.patterns.includes(opening.pattern) ? opening.pattern : nextModel.defaultPattern) : opening.pattern,
      structure: nextStructure,
      layout: nextModel.layouts ? (nextModel.layouts.includes(opening.layout) ? opening.layout : nextModel.defaultLayout) : opening.layout,
      color: compatibleColor(nextModel, nextStructure, opening.color),
    });
  };

  const steps = [
    {
      id: "manufacturer",
      label: "Producent",
      options: Object.entries(visibleGateManufacturers).map(([key, item]) => ({
        key,
        label: item.label,
        meta: "Producent bram",
        active: opening.manufacturer === key,
        onSelect: () => updateOpening(opening.id, { manufacturer: key }),
      })),
    },
    {
      id: "gateType",
      label: "Typ bramy",
      options: Object.entries(manufacturer.types).map(([key, item]) => ({
        key,
        label: item.label,
        meta: "Rodzaj konstrukcji",
        active: opening.gateType === key,
        onSelect: () => applyType(key),
      })),
    },
    {
      id: "model",
      label: "Model",
      options: Object.entries(type.models).map(([key, item]) => ({
        key,
        label: item.label,
        meta: item.note || "Model bramy",
        active: opening.model === key,
        onSelect: () => applyModel(key),
      })),
    },
  ];

  if (opening.gateType === "sectional") {
    steps.push({
      id: "pattern",
      label: "Wzór przetłoczenia",
      options: (model.patterns || []).map((key) => ({
        key,
        label: GATE_PATTERNS[key].label,
        meta: GATE_PATTERNS[key].description,
        image: `/gate_patterns/${key}.svg`,
        active: opening.pattern === key,
        onSelect: () => updateOpening(opening.id, { pattern: key }),
      })),
    });
    steps.push({
      id: "structure",
      label: "Struktura powierzchni",
      options: (model.structures || []).map((key) => ({
        key,
        label: GATE_STRUCTURES[key].label,
        meta: GATE_STRUCTURES[key].description,
        active: opening.structure === key,
        onSelect: () => updateOpening(opening.id, {
          structure: key,
          color: compatibleColor(model, key, opening.color),
        }),
      })),
    });
  }

  const safeStep = Math.min(activeStep, steps.length - 1);
  const currentStep = steps[safeStep];
  const isLastStep = safeStep === steps.length - 1;
  const selectOption = (option) => {
    option.onSelect();
    if (!isLastStep) {
      setActiveStep((step) => Math.min(steps.length - 1, step + 1));
    }
  };

  return (
    <div className="roof-cladding-flow">
      <div className="roof-cladding-title">
        <span>Brama</span>
        <strong>{manufacturer.label} / {type.label} / {model.label} / {color.label}</strong>
      </div>
      <div className="cladding-stage compact">
        <div className="cladding-stage-head">
          <div>
            <span>Krok {safeStep + 1} z {steps.length}</span>
            <h3>{currentStep.label}</h3>
          </div>
          <button className="title-color-button" type="button" onClick={() => setColorModalOpen(true)} aria-label={`Kolor bramy: ${color.label}`}>
            <span className="color-chip" style={{ backgroundColor: color.hex }} />
            <strong>{color.label}</strong>
          </button>
        </div>
        <ColorModal
          title="Kolor bramy"
          colors={filterAllowedColors(availableColors, access.settings.allowedWallColorIds)}
          selected={opening.color}
          open={colorModalOpen}
          onClose={() => setColorModalOpen(false)}
          onSelect={(nextColor) => {
            updateOpening(opening.id, { color: nextColor });
            setColorModalOpen(false);
          }}
        />
        <div
          className={cn(
            "cladding-option-list",
            "compact",
            currentStep.id === "pattern" && "gate-pattern-list",
            opening.gateType === "tilting" && currentStep.id === "model" && "tilting-model-list",
          )}
        >
          {currentStep.options.map((option) => (
            <button key={option.key} className={cn("cladding-option", option.image && "gate-pattern-option", option.active && "active")} onClick={() => selectOption(option)} type="button">
              {option.image && (
                <img className="gate-pattern-thumb" src={option.image} alt={option.label} loading="lazy" />
              )}
              <span className="cladding-option-copy">
                <strong>{option.label}</strong>
                <small>{option.meta}</small>
              </span>
              {option.active ? <Check className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          ))}
        </div>
        <div className="cladding-actions">
          <button className="cladding-secondary" type="button" onClick={() => setActiveStep((step) => Math.max(0, step - 1))} disabled={safeStep === 0}>
            <ArrowLeft className="h-4 w-4" />
            <span>Wstecz</span>
          </button>
          <button className="apply-cladding" type="button" onClick={() => setActiveStep((step) => Math.min(steps.length - 1, step + 1))} disabled={isLastStep}>
            <span>Dalej</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      {access.capabilities.gateAnimations && <div className="flashing-toggle-list">
        <ToggleRow
          label="Otwórz bramę"
          description="Podgląd animacji otwierania w scenie 3D"
          checked={!!opening.open}
          onChange={(open) => updateOpening(opening.id, { open })}
        />
      </div>}
    </div>
  );
}

function RoofCladdingFlow({ cladding, updateCladding }) {
  const [activeStep, setActiveStep] = useState(0);
  const [colorModalOpen, setColorModalOpen] = useState(false);
  const access = useConfiguratorAccess();
  const manufacturer = getRoofCladdingManufacturer(cladding);
  const model = getRoofCladdingModel(cladding);
  const color = getRoofCladdingColor(cladding);
  const visibleRoofManufacturers = filterAllowedRecord(
    ROOF_CLADDING_CATALOG,
    access.settings.allowedPanelManufacturerIds,
  );

  const updateRoofDraft = (patch) => {
    const next = { ...cladding, ...patch };
    const nextManufacturer = getRoofCladdingManufacturer(next);
    const nextModelKey = Object.keys(nextManufacturer.models)[0];
    const nextModel = patch.roofManufacturer ? nextManufacturer.models[nextModelKey] : getRoofCladdingModel(next);
    const nextThickness = nextModel.thicknessMm.includes(next.roofThicknessMm) ? next.roofThicknessMm : nextModel.thicknessMm[0];
    const nextColor = nextModel.colors[next.roofColor] ? next.roofColor : Object.keys(nextModel.colors)[0];

    updateCladding({
      ...patch,
      roofModel: patch.roofManufacturer ? nextModelKey : next.roofModel,
      roofThicknessMm: nextThickness,
      roofColor: nextColor,
    });
  };

  const steps = [
    {
      id: "roofManufacturer",
      label: "Producent dachu",
      options: Object.entries(visibleRoofManufacturers).map(([key, item]) => ({
        key,
        label: item.label,
        meta: "Dostawca plyty dachowej",
        active: cladding.roofManufacturer === key,
        onSelect: () => updateRoofDraft({ roofManufacturer: key }),
      })),
    },
    {
      id: "roofModel",
      label: "Model dachu",
      options: Object.entries(manufacturer.models).map(([key, item]) => ({
        key,
        label: item.label,
        meta: "Plyta warstwowa na dach",
        active: cladding.roofModel === key,
        onSelect: () => updateRoofDraft({ roofModel: key }),
      })),
    },
    {
      id: "roofThickness",
      label: "Grubosc dachu",
      options: model.thicknessMm.map((value) => ({
        key: String(value),
        label: `${value} mm`,
        meta: value === 80 ? "Domyslna grubosc dachu" : "Wariant grubosci",
        active: cladding.roofThicknessMm === value,
        onSelect: () => updateRoofDraft({ roofThicknessMm: value }),
      })),
    },
  ];

  const currentStep = steps[activeStep];
  const isLastStep = activeStep === steps.length - 1;
  const selectOption = (option) => {
    option.onSelect();
    if (!isLastStep) {
      setActiveStep((step) => Math.min(steps.length - 1, step + 1));
    }
  };

  return (
    <div className="roof-cladding-flow">
      <div className="roof-cladding-title">
        <span>Plyta dachowa</span>
        <strong>{manufacturer.label} / {model.label} / {cladding.roofThicknessMm} mm / {color.label}</strong>
      </div>
      <div className="cladding-stage compact">
        <div className="cladding-stage-head">
          <div>
            <span>Krok {activeStep + 1} z {steps.length}</span>
            <h3>{currentStep.label}</h3>
          </div>
          <button className="title-color-button" type="button" onClick={() => setColorModalOpen(true)} aria-label={`Kolor dachu: ${color.label}`}>
            <span className="color-chip" style={{ backgroundColor: color.hex }} />
            <strong>{color.label}</strong>
          </button>
        </div>
        <ColorModal
          title="Kolor plyty dachowej"
          colors={filterAllowedColors(model.colors, access.settings.allowedRoofColorIds)}
          selected={cladding.roofColor}
          open={colorModalOpen}
          onClose={() => setColorModalOpen(false)}
          onSelect={(roofColor) => {
            updateRoofDraft({ roofColor });
            setColorModalOpen(false);
          }}
        />
        <div className="cladding-option-list compact">
          {currentStep.options.map((option) => (
            <button key={option.key} className={cn("cladding-option", option.active && "active")} onClick={() => selectOption(option)} type="button">
              <span className="cladding-option-copy">
                <strong>{option.label}</strong>
                <small>{option.meta}</small>
              </span>
              {option.active ? <Check className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          ))}
        </div>
        <div className="cladding-actions">
          <button className="cladding-secondary" type="button" onClick={() => setActiveStep((step) => Math.max(0, step - 1))} disabled={activeStep === 0}>
            <ArrowLeft className="h-4 w-4" />
            <span>Wstecz</span>
          </button>
          <button className="apply-cladding" type="button" onClick={() => setActiveStep((step) => Math.min(steps.length - 1, step + 1))} disabled={isLastStep}>
            <span>Dalej</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function CladdingFlow({ selection, appliedSelection, onChange, onColorChange, onApply }) {
  const [activeStep, setActiveStep] = useState(0);
  const [colorModalOpen, setColorModalOpen] = useState(false);
  const access = useConfiguratorAccess();
  const manufacturer = getCladdingManufacturer(selection);
  const type = getCladdingType(selection);
  const model = getCladdingModel(selection);
  const color = getCladdingColor(selection);
  const panelLengthM = getWallPanelLengthM(selection);
  const changed = JSON.stringify(selectionForCompare(selection)) !== JSON.stringify(selectionForCompare(appliedSelection));
  const visiblePanelManufacturers = filterAllowedRecord(
    CLADDING_CATALOG,
    access.settings.allowedPanelManufacturerIds,
  );

  const updateDraft = (patch) => {
    const next = { ...selection, ...patch };
    const nextManufacturer = getCladdingManufacturer(next);
    const nextTypeKey = Object.keys(nextManufacturer.types)[0];
    const nextType = patch.manufacturer ? nextManufacturer.types[nextTypeKey] : getCladdingType(next);
    const nextModelKey = Object.keys(nextType.models)[0];
    const nextModel = patch.manufacturer || patch.type ? nextType.models[nextModelKey] : getCladdingModel(next);
    const nextProfile = nextModel.profiles.includes(next.profile) ? next.profile : nextModel.defaultProfile;
    const nextThickness = nextModel.thicknessMm.includes(next.thicknessMm) ? next.thicknessMm : nextModel.thicknessMm[0];
    const nextColor = nextModel.colors[next.color] ? next.color : Object.keys(nextModel.colors)[0];

    onChange({
      ...next,
      type: patch.manufacturer ? nextTypeKey : next.type,
      model: patch.manufacturer || patch.type ? nextModelKey : next.model,
      profile: nextProfile,
      thicknessMm: nextThickness,
      color: nextColor,
    });
  };

  const steps = [
    {
      id: "manufacturer",
      label: "Producent",
      value: manufacturer.label,
      options: Object.entries(visiblePanelManufacturers).map(([key, item]) => ({
        key,
        label: item.label,
        meta: "Dostawca systemu plyt",
        active: selection.manufacturer === key,
        onSelect: () => updateDraft({ manufacturer: key }),
      })),
    },
    {
      id: "model",
      label: "Model",
      value: model.label,
      options: Object.entries(type.models).map(([key, item]) => ({
        key,
        label: item.label,
        meta: "Przetloczenie plyty sciennej",
        previewProfile: item.defaultProfile,
        active: selection.model === key,
        onSelect: () => updateDraft({ model: key }),
      })),
    },
    {
      id: "thickness",
      label: "Grubosc",
      value: `${selection.thicknessMm} mm`,
      options: model.thicknessMm.map((value) => ({
        key: String(value),
        label: `${value} mm`,
        meta: value === 60 ? "Domyslna plyta scienna" : "Wariant grubosci",
        active: selection.thicknessMm === value,
        onSelect: () => updateDraft({ thicknessMm: value }),
      })),
    },
    {
      id: "panelLength",
      label: "Dlugosc plyty",
      value: `${panelLengthM} m`,
      options: WALL_PANEL_LENGTH_STANDARDS.map((option) => ({
        key: String(option.value),
        label: option.label,
        meta: option.description,
        active: panelLengthM === option.value,
        onSelect: () => updateDraft({ panelLengthM: option.value }),
      })),
    },
  ];

  const currentStep = steps[activeStep];
  const isLastStep = activeStep === steps.length - 1;
  const goNext = () => setActiveStep((step) => Math.min(steps.length - 1, step + 1));
  const goBack = () => setActiveStep((step) => Math.max(0, step - 1));
  const selectOption = (option) => {
    option.onSelect();
    if (!isLastStep) {
      setActiveStep((step) => Math.min(steps.length - 1, step + 1));
    }
  };

  return (
    <div className="cladding-flow" aria-label="Wybor poszycia">
      <div className="cladding-stage">
        <div className="cladding-stage-head">
          <div>
            <span>Krok {activeStep + 1} z {steps.length}</span>
            <h3>{currentStep.label}</h3>
          </div>
          <button className="title-color-button" type="button" onClick={() => setColorModalOpen(true)} aria-label={`Kolor scian: ${color.label}`}>
            <span className="color-chip" style={{ backgroundColor: color.hex }} />
            <strong>{color.label}</strong>
          </button>
        </div>
        <ColorModal
          title="Kolor plyty sciennej"
          colors={filterAllowedColors(model.colors, access.settings.allowedWallColorIds)}
          selected={selection.color}
          open={colorModalOpen}
          onClose={() => setColorModalOpen(false)}
          onSelect={(nextColor) => {
            updateDraft({ color: nextColor });
            onColorChange(nextColor);
            setColorModalOpen(false);
          }}
        />

        <div className={cn("cladding-option-list", currentStep.id === "thickness" && "compact")}>
          {currentStep.options.map((option) => (
            <button
              key={option.key}
              className={cn("cladding-option", option.active && "active")}
              onClick={() => selectOption(option)}
              type="button"
            >
              {option.previewProfile && (
                <span className={cn("cladding-profile-thumb", "profile-preview", `profile-${option.previewProfile}`)} aria-hidden="true">
                  <span className="profile-light" />
                  <span className="profile-shadow" />
                </span>
              )}
              <span className="cladding-option-copy">
                <strong>{option.label}</strong>
                <small>{option.meta}</small>
              </span>
              {option.active ? <Check className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          ))}
        </div>

        <div className="cladding-actions">
          <button className="cladding-secondary" type="button" onClick={goBack} disabled={activeStep === 0}>
            <ArrowLeft className="h-4 w-4" />
            <span>Wstecz</span>
          </button>
          {isLastStep ? (
            <button className="apply-cladding" type="button" onClick={() => onApply(selection)} disabled={!changed}>
              <Check className="h-4 w-4" />
              <span>Zastosuj do garazu</span>
            </button>
          ) : (
            <button className="apply-cladding" type="button" onClick={goNext}>
              <span>Dalej</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ColorModal({ title, colors, selected, open, onClose, onSelect }) {
  const [query, setQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState("popular");

  if (!open || typeof document === "undefined") {
    return null;
  }

  const normalizedQuery = query.trim().toLocaleLowerCase("pl");
  const entries = Object.entries(colors);
  const groupFor = (key, item) => {
    if (item.kind === "wood" || item.group === "wood") return "wood";
    if (item.group === "metallic" || ["zinc", "copper", "galvanized", "aluzinc", "metalbrush"].includes(key)) return "metallic";
    if (item.group === "ral" || item.code?.startsWith("RAL") || item.label?.includes("RAL")) return "ral";
    return "popular";
  };
  const groups = [
    ["popular", "Popularne"],
    ["ral", "RAL"],
    ["wood", "Drewno"],
    ["metallic", "Metaliczne"],
  ];
  const availableGroupKeys = new Set([
    "popular",
    ...entries.map(([key, item]) => groupFor(key, item)),
  ]);
  const visibleGroups = groups.filter(([key]) => availableGroupKeys.has(key));
  const effectiveGroup = availableGroupKeys.has(activeGroup) ? activeGroup : "popular";
  const filtered = entries.filter(([key, item]) => {
    const matchesQuery = !normalizedQuery
      || `${key} ${item.label} ${item.code || ""}`.toLocaleLowerCase("pl").includes(normalizedQuery);
    if (!matchesQuery) return false;
    if (normalizedQuery) return true;
    if (effectiveGroup === "popular") return item.popular || key === selected || groupFor(key, item) === "popular";
    return groupFor(key, item) === effectiveGroup;
  });

  return createPortal(
    <div className="color-modal-backdrop" role="presentation" onClick={onClose}>
      <div className="color-modal" role="dialog" aria-modal="true" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <div className="color-modal-head">
          <div>
            <span>Wybierz kolor</span>
            <h3>{title}</h3>
          </div>
          <button className="color-modal-close" type="button" onClick={onClose} aria-label="Zamknij wybor koloru">x</button>
        </div>
        <input
          className="color-modal-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Szukaj po nazwie lub kodzie RAL"
          aria-label="Szukaj wykończenia"
        />
        <div className="color-modal-groups" role="tablist" aria-label="Grupy wykończeń">
          {visibleGroups.map(([key, label]) => (
            <button
              key={key}
              className={cn(effectiveGroup === key && "active")}
              type="button"
              role="tab"
              aria-selected={effectiveGroup === key}
              onClick={() => setActiveGroup(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="color-modal-grid">
          {filtered.map(([key, item]) => (
            <button key={key} className={cn("color-modal-choice", selected === key && "active")} type="button" onClick={() => onSelect(key)}>
              <span
                className={cn("color-modal-swatch", item.preview && "textured")}
                style={{
                  backgroundColor: item.hex,
                  backgroundImage: item.preview ? `url("${item.preview}")` : undefined,
                }}
                aria-hidden="true"
              />
              <span>
                <strong>{item.label}</strong>
                {item.code && <small>{item.code}</small>}
              </span>
              {selected === key && <Check className="h-4 w-4" />}
            </button>
          ))}
          {!filtered.length && <div className="color-modal-empty">Brak wykończeń pasujących do wyszukiwania.</div>}
        </div>
        <p className="color-modal-disclaimer">
          Kolory na ekranie są poglądowe. Przed zamówieniem potwierdź wykończenie na fizycznym wzorniku.
        </p>
      </div>
    </div>,
    document.body,
  );
}

function selectionForCompare(selection) {
  return {
    manufacturer: selection.manufacturer,
    type: selection.type,
    model: selection.model,
    profile: selection.profile,
    thicknessMm: selection.thicknessMm,
    panelLengthM: selection.panelLengthM,
    color: selection.color,
  };
}

function PanelSection({ title, icon: Icon, children }) {
  return (
    <section className="panel-section">
      <div className="panel-section-header">
        <span className="section-icon"><Icon className="h-4 w-4" /></span>
        <h2>{title}</h2>
      </div>
      <div className="panel-section-body">{children}</div>
    </section>
  );
}

function RangeControl({ label, value, display, min, max, step, onChange, compact = false, disabled = false }) {
  return (
    <div className={cn("range-control", compact && "compact", disabled && "is-disabled")}>
      <div className="range-meta">
        <span>{label}</span>
        <strong>{display}</strong>
      </div>
      <Slider min={min} max={max} step={step} value={value} onChange={onChange} disabled={disabled} />
      {!compact && (
        <div className="range-limits">
          <span>{formatMeters(min)}</span>
          <span>{formatMeters(max)}</span>
        </div>
      )}
    </div>
  );
}

function OpeningEditorV2({ opening, updateOpening, dimensions }) {
  const roofPlacement = opening.kind === "roofWindow";
  const title = opening.kind === "gate" ? "Brama" : opening.kind === "door" ? "Drzwi" : roofPlacement ? "Okno dachowe" : "Okno";
  const wallSpan = roofPlacement ? dimensions.widthM : opening.wall === "front" || opening.wall === "back" ? dimensions.widthM : dimensions.lengthM;
  const offsetLimit = Math.max(0.1, (wallSpan - opening.widthM) / 2 - 0.25);
  const model = opening.kind === "door"
    ? getDoorModel(opening)
    : opening.kind === "window" || roofPlacement
      ? getWindowModel(opening)
      : null;
  const orientation = model ? getWindowOrientation(opening, model) : "horizontal";
  const windowRanges = model ? getWindowSizeRanges(model, orientation) : null;
  const widthRange = opening.kind === "gate" ? [1.8, 6] : windowRanges?.widthRange || model?.widthRange || [0.5, 3.6];
  const heightRange = opening.kind === "gate" ? [1.8, 4.5] : windowRanges?.heightRange || model?.heightRange || [0.4, 1.8];
  const maxWidth = Math.max(widthRange[0], Math.min(widthRange[1], wallSpan - 0.8));
  const maxHeight = roofPlacement
    ? Math.max(heightRange[0], Math.min(heightRange[1], dimensions.lengthM - 0.8))
    : Math.max(heightRange[0], Math.min(heightRange[1], dimensions.wallHeightM - opening.sillM - 0.25));
  const roofDepthLimit = Math.max(0.1, (dimensions.lengthM - opening.heightM) / 2 - 0.3);

  return (
    <div className="opening-editor premium">
      <div className="opening-title">
        <PanelTop className="h-4 w-4" />
        <span>{title}</span>
      </div>
      {!roofPlacement && (
        <div className="thickness-grid">
          <Field label="Sciana">
            <Select value={opening.wall} onChange={(event) => updateOpening(opening.id, { wall: event.target.value })}>
              {Object.entries(OPENING_WALLS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </Select>
          </Field>
        </div>
      )}
      <div className="control-stack">
        <RangeControl label={roofPlacement ? "Pozycja w poprzek dachu" : "Pozycja"} value={opening.offsetM} display={formatMeters(opening.offsetM)} min={-offsetLimit} max={offsetLimit} step={0.05} onChange={(value) => updateOpening(opening.id, { offsetM: value })} />
        {roofPlacement && (
          <RangeControl label="Pozycja wzdluz dachu" value={opening.sillM} display={formatMeters(opening.sillM)} min={-roofDepthLimit} max={roofDepthLimit} step={0.05} onChange={(value) => updateOpening(opening.id, { sillM: value })} />
        )}
        <RangeControl label="Szerokosc" value={opening.widthM} display={formatMeters(opening.widthM)} min={widthRange[0]} max={maxWidth} step={0.05} onChange={(value) => updateOpening(opening.id, { widthM: value })} />
        <RangeControl label={roofPlacement ? "Dlugosc na polaci" : "Wysokosc"} value={opening.heightM} display={formatMeters(opening.heightM)} min={heightRange[0]} max={maxHeight} step={0.05} onChange={(value) => updateOpening(opening.id, { heightM: value })} />
        {opening.kind === "window" && (
          <RangeControl
            label="Wysokosc parapetu"
            value={opening.sillM}
            display={formatMeters(opening.sillM)}
            min={0.35}
            max={Math.max(0.35, dimensions.wallHeightM - opening.heightM - 0.25)}
            step={0.05}
            onChange={(value) => updateOpening(opening.id, { sillM: value })}
          />
        )}
      </div>
    </div>
  );
}
