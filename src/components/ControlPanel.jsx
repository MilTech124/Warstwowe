import { useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronRight,
  Layers3,
  PanelTop,
  Ruler,
  SlidersHorizontal,
} from "lucide-react";
import {
  CLADDING_CATALOG,
  FLASHING_COLORS,
  FLASHING_PACKAGES,
  GATE_MANUFACTURERS,
  GATE_PATTERNS,
  OPENING_WALLS,
  PRESETS,
  ROOF_CLADDING_CATALOG,
  ROOF_TYPES,
  TILTING_LAYOUTS,
  WALL_PANEL_LENGTH_STANDARDS,
  getCladdingColor,
  getCladdingManufacturer,
  getCladdingModel,
  getCladdingType,
  getGateColor,
  getGateManufacturer,
  getGateModel,
  getGateType,
  getRoofCladdingColor,
  getRoofCladdingManufacturer,
  getRoofCladdingModel,
  getWallPanelLengthM,
} from "@/config/catalog";
import { useConfiguratorStore } from "@/store/configuratorStore";
import { cn, formatMeters } from "@/lib/utils";
import { Field, Select, Slider } from "@/components/ui/Field";
import { roofPitchBounds } from "@/scene/geometry";

const dimensionLabels = {
  widthM: "Szerokosc",
  lengthM: "Dlugosc",
  wallHeightM: "Wysokosc",
};

const tabs = [
  { id: "body", label: "Bryla", icon: Ruler },
  { id: "roof", label: "Dach", icon: ArrowUpRight },
  { id: "cladding", label: "Plyty", icon: Layers3 },
  { id: "flashings", label: "Obrobki", icon: SlidersHorizontal },
  { id: "openings", label: "Brama", icon: PanelTop },
];

export function ControlPanel() {
  const [activeTab, setActiveTab] = useState("body");
  const [claddingDraft, setCladdingDraft] = useState(null);
  const config = useConfiguratorStore((state) => state.config);
  const updateDimension = useConfiguratorStore((state) => state.updateDimension);
  const updateRoof = useConfiguratorStore((state) => state.updateRoof);
  const updateOverhang = useConfiguratorStore((state) => state.updateOverhang);
  const updateCladding = useConfiguratorStore((state) => state.updateCladding);
  const updateFlashings = useConfiguratorStore((state) => state.updateFlashings);
  const updateOpening = useConfiguratorStore((state) => state.updateOpening);
  const limits = PRESETS[config.preset].dimensionLimits;
  const roofPitch = roofPitchBounds(config.roof.type);

  return (
    <aside className="control-panel">
      <div className="panel-top">
        <div className="panel-title-row">
          <div>
            <p className="eyebrow">Profesjonalny konfigurator</p>
            <h1>Garaze warstwowe</h1>
          </div>
          <div className="panel-status-dot" aria-hidden="true" />
        </div>
      </div>

      <nav className="config-tabs" aria-label="Kategorie konfiguracji">
        {tabs.map((tab) => {
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
          <PanelSection title="Konfiguracja bramy" icon={PanelTop}>
            {config.openings.map((opening) => (
              <div key={opening.id} className="gate-config">
                {opening.kind === "gate" && <GateFlow opening={opening} updateOpening={updateOpening} />}
                <OpeningEditor opening={opening} updateOpening={updateOpening} dimensions={config.dimensions} />
              </div>
            ))}
          </PanelSection>
        )}

        {activeTab === "flashings" && (
          <PanelSection title="Obrobki blacharskie" icon={SlidersHorizontal}>
            <FlashingsPanel config={config} updateFlashings={updateFlashings} />
          </PanelSection>
        )}
      </div>
    </aside>
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
  return {
    roof_match: { label: `Jak dach (${roofColor.label})`, hex: roofColor.hex },
    anthracite: FLASHING_COLORS.anthracite,
    graphite: FLASHING_COLORS.graphite,
    silver: FLASHING_COLORS.silver,
  };
}

function ToggleRow({ label, description, checked, onChange }) {
  return (
    <button className={cn("toggle-row", checked && "active")} type="button" onClick={() => onChange(!checked)}>
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

function GateFlow({ opening, updateOpening }) {
  const [activeStep, setActiveStep] = useState(0);
  const [colorModalOpen, setColorModalOpen] = useState(false);
  const manufacturer = getGateManufacturer(opening);
  const type = getGateType(opening);
  const model = getGateModel(opening);
  const color = getGateColor(opening);

  const applyType = (gateType) => {
    const nextType = manufacturer.types[gateType];
    const nextModelKey = Object.keys(nextType.models)[0];
    const nextModel = nextType.models[nextModelKey];
    updateOpening(opening.id, {
      gateType,
      model: nextModelKey,
      pattern: nextModel.defaultPattern || "smooth",
      structure: nextModel.structures ? nextModel.structures[0] : "smooth",
      layout: nextModel.defaultLayout || "vertical",
      color: nextModel.colors[opening.color] ? opening.color : Object.keys(nextModel.colors)[0],
    });
  };

  const applyModel = (modelKey) => {
    const nextModel = type.models[modelKey];
    updateOpening(opening.id, {
      model: modelKey,
      pattern: nextModel.patterns ? (nextModel.patterns.includes(opening.pattern) ? opening.pattern : nextModel.defaultPattern) : opening.pattern,
      structure: nextModel.structures ? (nextModel.structures.includes(opening.structure) ? opening.structure : nextModel.structures[0]) : opening.structure,
      layout: nextModel.layouts ? (nextModel.layouts.includes(opening.layout) ? opening.layout : nextModel.defaultLayout) : opening.layout,
      color: nextModel.colors[opening.color] ? opening.color : Object.keys(nextModel.colors)[0],
    });
  };

  const steps = [
    {
      id: "manufacturer",
      label: "Producent",
      options: Object.entries(GATE_MANUFACTURERS).map(([key, item]) => ({
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
  }

  if (opening.gateType === "tilting") {
    steps.push({
      id: "layout",
      label: "Układ wypełnienia",
      options: (model.layouts || []).map((key) => ({
        key,
        label: TILTING_LAYOUTS[key].label,
        meta: TILTING_LAYOUTS[key].description,
        active: opening.layout === key,
        onSelect: () => updateOpening(opening.id, { layout: key }),
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
          colors={model.colors}
          selected={opening.color}
          open={colorModalOpen}
          onClose={() => setColorModalOpen(false)}
          onSelect={(nextColor) => {
            updateOpening(opening.id, { color: nextColor });
            setColorModalOpen(false);
          }}
        />
        <div className={cn("cladding-option-list", "compact", currentStep.id === "pattern" && "gate-pattern-list")}>
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
      <div className="flashing-toggle-list">
        <ToggleRow
          label="Otwórz bramę"
          description="Podgląd animacji otwierania w scenie 3D"
          checked={!!opening.open}
          onChange={(open) => updateOpening(opening.id, { open })}
        />
      </div>
    </div>
  );
}

function RoofCladdingFlow({ cladding, updateCladding }) {
  const [activeStep, setActiveStep] = useState(0);
  const [colorModalOpen, setColorModalOpen] = useState(false);
  const manufacturer = getRoofCladdingManufacturer(cladding);
  const model = getRoofCladdingModel(cladding);
  const color = getRoofCladdingColor(cladding);

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
      options: Object.entries(ROOF_CLADDING_CATALOG).map(([key, item]) => ({
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
          colors={model.colors}
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
  const manufacturer = getCladdingManufacturer(selection);
  const type = getCladdingType(selection);
  const model = getCladdingModel(selection);
  const color = getCladdingColor(selection);
  const panelLengthM = getWallPanelLengthM(selection);
  const changed = JSON.stringify(selectionForCompare(selection)) !== JSON.stringify(selectionForCompare(appliedSelection));

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
      options: Object.entries(CLADDING_CATALOG).map(([key, item]) => ({
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
          colors={model.colors}
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
  if (!open || typeof document === "undefined") {
    return null;
  }

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
        <div className="color-modal-grid">
          {Object.entries(colors).map(([key, item]) => (
            <button key={key} className={cn("color-modal-choice", selected === key && "active")} type="button" onClick={() => onSelect(key)}>
              <span className="color-modal-swatch" style={{ backgroundColor: item.hex }} aria-hidden="true" />
              <span>{item.label}</span>
              {selected === key && <Check className="h-4 w-4" />}
            </button>
          ))}
        </div>
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

function RangeControl({ label, value, display, min, max, step, onChange, compact = false }) {
  return (
    <div className={cn("range-control", compact && "compact")}>
      <div className="range-meta">
        <span>{label}</span>
        <strong>{display}</strong>
      </div>
      <Slider min={min} max={max} step={step} value={value} onChange={onChange} />
      {!compact && (
        <div className="range-limits">
          <span>{formatMeters(min)}</span>
          <span>{formatMeters(max)}</span>
        </div>
      )}
    </div>
  );
}

function OpeningEditor({ opening, updateOpening, dimensions }) {
  const title = opening.kind === "gate" ? "Brama" : opening.kind === "door" ? "Drzwi" : "Okno";
  const wallSpan = opening.wall === "front" || opening.wall === "back" ? dimensions.widthM : dimensions.lengthM;
  const offsetLimit = Math.max(0.1, (wallSpan - opening.widthM) / 2 - 0.25);

  return (
    <div className="opening-editor premium">
      <div className="opening-title">
        <PanelTop className="h-4 w-4" />
        <span>{title}</span>
      </div>
      <div className="thickness-grid">
        <Field label="Sciana">
          <Select value={opening.wall} onChange={(event) => updateOpening(opening.id, { wall: event.target.value })}>
            {Object.entries(OPENING_WALLS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </Select>
        </Field>
      </div>
      <div className="control-stack">
        <RangeControl label="Pozycja" value={opening.offsetM} display={formatMeters(opening.offsetM)} min={-offsetLimit} max={offsetLimit} step={0.05} onChange={(value) => updateOpening(opening.id, { offsetM: value })} />
        <RangeControl label="Szerokosc" value={opening.widthM} display={formatMeters(opening.widthM)} min={0.6} max={Math.max(0.8, wallSpan - 0.8)} step={0.05} onChange={(value) => updateOpening(opening.id, { widthM: value })} />
        <RangeControl label="Wysokosc" value={opening.heightM} display={formatMeters(opening.heightM)} min={0.5} max={Math.max(0.8, dimensions.wallHeightM - opening.sillM - 0.25)} step={0.05} onChange={(value) => updateOpening(opening.id, { heightM: value })} />
      </div>
    </div>
  );
}
