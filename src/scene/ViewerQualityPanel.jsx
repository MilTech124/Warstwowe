import { useEffect, useState } from "react";
import { Gauge } from "lucide-react";
import { fpsBridge } from "@/scene/fpsBridge";
import { selectEffectiveQuality, useConfiguratorStore } from "@/store/configuratorStore";

const QUALITY_OPTIONS = [
  { key: "auto", label: "Auto", hint: "Dopasowuje się do wydajności komputera" },
  { key: "low", label: "Niska", hint: "Bez cieni kontaktowych, najlżejsza dla słabszego sprzętu" },
  { key: "balanced", label: "Zbalansowana", hint: "Kompromis między płynnością a wyglądem" },
  { key: "high", label: "Wysoka", hint: "Pełne cienie i tekstury 2k" },
];

const QUALITY_LABELS = {
  low: "Niska",
  balanced: "Zbalansowana",
  high: "Wysoka",
};

function useFps() {
  const [fps, setFps] = useState(fpsBridge.value);
  useEffect(() => fpsBridge.subscribe(setFps), []);
  return fps;
}

export function ViewerQualityPanel() {
  const [open, setOpen] = useState(false);
  const qualityPreference = useConfiguratorStore((state) => state.ui.qualityPreference);
  const autoQuality = useConfiguratorStore((state) => state.ui.autoQuality);
  const effectiveQuality = useConfiguratorStore(selectEffectiveQuality);
  const setQualityPreference = useConfiguratorStore((state) => state.setQualityPreference);
  const fps = useFps();

  const effectiveLabel = QUALITY_LABELS[effectiveQuality] || effectiveQuality;
  const autoDowngraded = qualityPreference === "auto" && autoQuality !== "high";

  return (
    <div className={open ? "viewer-quality open" : "viewer-quality"}>
      <button
        className={open ? "viewer-tool icon-only active" : "viewer-tool icon-only"}
        onClick={() => setOpen((value) => !value)}
        title={`Jakość grafiki: ${effectiveLabel}`}
        aria-expanded={open}
        type="button"
      >
        <Gauge className="h-4 w-4" />
      </button>

      {open && (
        <div className="viewer-quality-menu" role="group" aria-label="Jakość grafiki">
          <p className="viewer-quality-title">Jakość grafiki</p>
          {QUALITY_OPTIONS.map((option) => (
            <button
              key={option.key}
              className={qualityPreference === option.key ? "viewer-tool active" : "viewer-tool"}
              onClick={() => setQualityPreference(option.key)}
              title={option.hint}
              type="button"
            >
              <span>{option.label}</span>
              {option.key === "auto" && qualityPreference === "auto" && (
                <span className="viewer-quality-badge">{effectiveLabel}</span>
              )}
            </button>
          ))}

          <div className="viewer-quality-diagnostics">
            <span>{fps > 0 ? `${fps} FPS` : "Pomiar FPS..."}</span>
            <span>Aktywny poziom: {effectiveLabel}</span>
            {autoDowngraded && <span>Jakość obniżona automatycznie ze względu na wydajność.</span>}
          </div>
        </div>
      )}
    </div>
  );
}
