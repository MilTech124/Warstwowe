import { create } from "zustand";
import { DEFAULT_CLADDING_SELECTION, DEFAULT_GATE_SELECTION, DEFAULT_ROOF_CLADDING_SELECTION, PRESETS, getWallPanelLengthM } from "@/config/catalog";
import { clamp } from "@/lib/utils";
import { roofPitchBounds } from "@/scene/geometry";

const defaultConfig = {
  schemaVersion: 1,
  preset: "single_garage",
  dimensions: { ...PRESETS.single_garage.dimensions },
  viewMode: "full",
  cameraMode: "orbit",
  showDimensions: true,
  roof: {
    type: "single_back",
    pitchPercent: 7,
    overhangM: { front: 0.2, back: 0.2, left: 0.2, right: 0.2 },
  },
  cladding: {
    ...DEFAULT_CLADDING_SELECTION,
    ...DEFAULT_ROOF_CLADDING_SELECTION,
    wallProfile: DEFAULT_CLADDING_SELECTION.profile,
    wallPirThicknessMm: DEFAULT_CLADDING_SELECTION.thicknessMm,
    roofPirThicknessMm: DEFAULT_ROOF_CLADDING_SELECTION.roofThicknessMm,
  },
  flashings: {
    enabled: true,
    package: "standard",
    color: "roof_match",
    corners: true,
    roofEdges: true,
    ridge: true,
  },
  structure: {
    visible: true,
    mode: "visual_rules",
  },
  openings: [
    {
      id: "main-gate",
      kind: "gate",
      wall: "front",
      offsetM: 0,
      widthM: 2.8,
      heightM: 2.25,
      sillM: 0,
      ...DEFAULT_GATE_SELECTION,
    },
  ],
};

function fitOpeningsToDimensions(openings, dimensions) {
  return openings.map((opening) => {
    const wallSpan = opening.wall === "front" || opening.wall === "back" ? dimensions.widthM : dimensions.lengthM;
    const maxWidth = Math.max(0.6, wallSpan - 0.8);
    const widthM = clamp(opening.widthM, 0.5, maxWidth);
    const halfFree = Math.max(0, (wallSpan - widthM) / 2 - 0.25);
    const maxHeight = Math.max(1, dimensions.wallHeightM - opening.sillM - 0.25);
    return {
      ...opening,
      widthM,
      heightM: clamp(opening.heightM, 0.5, maxHeight),
      offsetM: clamp(opening.offsetM, -halfFree, halfFree),
    };
  });
}

export const useConfiguratorStore = create((set) => ({
  config: defaultConfig,
  setPreset: (preset) =>
    set((state) => {
      const dimensions = { ...PRESETS[preset].dimensions };
      return {
        config: {
          ...state.config,
          preset,
          dimensions,
          openings: fitOpeningsToDimensions(state.config.openings, dimensions),
        },
      };
    }),
  setViewMode: (viewMode) =>
    set((state) => ({
      config: {
        ...state.config,
        viewMode,
        cameraMode: viewMode === "structure" ? "structure" : state.config.cameraMode,
      },
    })),
  setCameraMode: (cameraMode) =>
    set((state) => ({ config: { ...state.config, cameraMode } })),
  setShowDimensions: (showDimensions) =>
    set((state) => ({ config: { ...state.config, showDimensions } })),
  updateDimension: (key, value) =>
    set((state) => {
      const [min, max] = PRESETS[state.config.preset].dimensionLimits[key];
      const dimensions = {
        ...state.config.dimensions,
        [key]: clamp(value, min, max),
      };
      return {
        config: {
          ...state.config,
          dimensions,
          openings: fitOpeningsToDimensions(state.config.openings, dimensions),
        },
      };
    }),
  updateRoof: (patch) =>
    set((state) => {
      const nextRoof = { ...state.config.roof, ...patch };
      const bounds = roofPitchBounds(nextRoof.type);
      nextRoof.pitchPercent = patch.type && state.config.roof.pitchPercent < bounds.min
        ? bounds.fallback
        : clamp(nextRoof.pitchPercent, bounds.min, bounds.max);
      return {
        config: {
          ...state.config,
          roof: nextRoof,
        },
      };
    }),
  updateOverhang: (side, value) =>
    set((state) => ({
      config: {
        ...state.config,
        roof: {
          ...state.config.roof,
          overhangM: {
            ...state.config.roof.overhangM,
            [side]: clamp(value, 0, 0.8),
          },
        },
      },
    })),
  updateCladding: (patch) =>
    set((state) => ({
      config: {
        ...state.config,
        cladding: {
          ...state.config.cladding,
          ...patch,
          panelLengthM: getWallPanelLengthM({ ...state.config.cladding, ...patch }),
          wallProfile: patch.profile ?? patch.wallProfile ?? state.config.cladding.wallProfile,
          wallPirThicknessMm: patch.thicknessMm ?? patch.wallPirThicknessMm ?? state.config.cladding.wallPirThicknessMm,
          roofPirThicknessMm: patch.roofThicknessMm ?? patch.roofPirThicknessMm ?? state.config.cladding.roofPirThicknessMm,
        },
      },
    })),
  updateFlashings: (patch) =>
    set((state) => ({
      config: {
        ...state.config,
        flashings: { ...state.config.flashings, ...patch },
      },
    })),
  updateOpening: (id, patch) =>
    set((state) => {
      const openings = state.config.openings.map((opening) =>
        opening.id === id ? { ...opening, ...patch } : opening,
      );
      return {
        config: {
          ...state.config,
          openings: fitOpeningsToDimensions(openings, state.config.dimensions),
        },
      };
    }),
}));
