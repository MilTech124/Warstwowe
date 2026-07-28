// Wąski wycinek konfiguracji, od którego naprawdę zależy szkielet.
//
// Store podmienia cały obiekt `config` przy każdym zapisie, więc memoizacja po
// `config` przeliczałaby model przy zmianie kamery, koloru rynny czy otwarciu okna.
// Nowa referencja modelu wymuszałaby wtedy rekoncyliację kilkuset meshy bez powodu.

import { frontProjectionDepth } from "@/scene/frontProjectionMath";

export const DEFAULT_STRUCTURE = { reinforcement: "standard", snowZone: 2, visible: true };

export function structureInputs(config) {
  return {
    preset: config.preset,
    dimensions: config.dimensions,
    roof: { type: config.roof.type, pitchPercent: config.roof.pitchPercent },
    frontProjection: {
      depthM: frontProjectionDepth(config),
    },
    cladding: {
      wallPirThicknessMm: config.cladding?.wallPirThicknessMm ?? 60,
      roofPirThicknessMm: config.cladding?.roofPirThicknessMm ?? 80,
    },
    // Każdy otwór w ŚCIANIE zmienia szkielet: bramy i drzwi przerywają słup na
    // całej wysokości, okna dzielą go na słupek podokienny i nadprożowy oraz
    // wymagają podramy. Okna dachowe (wall === "roof") nie dotyczą ścian.
    openings: config.openings
      .filter((opening) => opening.wall !== "roof" && ["gate", "door", "window"].includes(opening.kind))
      .map(({ id, kind, wall, offsetM, widthM, heightM, sillM }) => ({ id, kind, wall, offsetM, widthM, heightM, sillM })),
    structure: { ...DEFAULT_STRUCTURE, ...(config.structure ?? {}) },
  };
}

// Klucz memoizacji — tani i odporny na przeoczenie pola przy zmianie kształtu wejść.
export function structureSignature(inputs) {
  return JSON.stringify(inputs);
}
