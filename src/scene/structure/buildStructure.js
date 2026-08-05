// Czysty model konstrukcji: z wąskiego wycinka konfiguracji buduje listę
// elementów stalowych, blach podstawy i węzłów. Nie zwraca JSX ani obiektów
// three — dzięki temu ten sam model zasila scenę 3D, zestawienie stali (BOM)
// i rysunki wektorowe w PDF.

import { roofMetrics } from "@/scene/roofMath";
import { getStructureClass } from "@/scene/structure/classes";
import { createCollector } from "@/scene/structure/collector";
import { buildGarage } from "@/scene/structure/garage";
import { buildHall } from "@/scene/structure/hall";
import { buildOpeningFrames } from "@/scene/structure/openingFrames";
import { buildFrontProjection } from "@/scene/structure/frontProjection";
import { frameAxes, positionsBySpacing } from "@/scene/structure/axes";
import { garageSpec, hallSpec } from "@/scene/structure/spec";

// Wariant lekki świadomie rozciąga rozstawy poza wartości tabelaryczne z docs §3.1.
// Dla typowych grubości płyty jest to bezpieczne, ale margines sztywności szkieletu
// jest mniejszy, więc dokument ofertowy musi to odnotować.
function warnAboutLightVariant(inputs, spec, collector) {
  if (spec.reinforcement.id !== "light") return;

  const wallMm = inputs.cladding.wallPirThicknessMm;
  const roofMm = inputs.cladding.roofPirThicknessMm;
  const thinPanel = wallMm <= 50 || roofMm <= 60;
  const highSnow = Number(inputs.structure.snowZone) >= 4;

  if (thinPanel || highSnow) {
    collector.warn(
      "light_structure_risk",
      `Konstrukcja lekka przy ${thinPanel ? `cienkiej płycie (ściana ${wallMm} mm, dach ${roofMm} mm)` : `strefie śniegowej ${inputs.structure.snowZone}`} — ` +
        "rozstawy są na granicy praktyki. Sprawdź dopuszczalną rozpiętość w tablicach obciążeniowych producenta płyt " +
        "albo wybierz poziom Standard.",
    );
    return;
  }

  collector.warn(
    "light_structure",
    "Konstrukcja lekka: rozstawy podpór poszycia są szersze od wartości tabelarycznych. " +
      "Przed produkcją potwierdź dopuszczalną rozpiętość płyty w tablicach obciążeniowych producenta.",
  );
}

// Gdy nawet najmocniejszy profil z tablicy nie przenosi obliczeniowego momentu,
// dobór jest poza zakresem katalogu i konfiguracja wymaga projektu indywidualnego.
function warnAboutSectionCapacity(spec, collector) {
  if (spec.sectionsAdequate !== false) return;

  const required = Object.entries(spec.requiredWyCm3 ?? {})
    .map(([role, wy]) => `${role}: ${Math.round(wy)} cm³`)
    .join(", ");
  collector.warn(
    "section_capacity",
    `Obciążenie połaci (${spec.roofLoadKnM2.toFixed(2)} kN/m², strefa śniegowa ${spec.snowZone}) przekracza nośność ` +
      `najmocniejszego profilu z tablicy doboru (wymagany wskaźnik zginania — ${required}). ` +
      "Zagęść rozstaw (poziom Standard lub Wzmocniona), zmniejsz rozstaw ram albo zleć projekt indywidualny.",
  );
}

/**
 * @param {ReturnType<typeof import("./inputs").structureInputs>} inputs
 * @returns {{
 *   members: Array<object>,
 *   plates: Array<object>,
 *   joints: Array<object>,
 *   plan: object,
 *   warnings: Array<{ code: string, message: string }>
 * }}
 */
export function buildStructure(inputs) {
  const structureClass = getStructureClass(inputs.dimensions);
  const isGarage = structureClass === "garage_frame";
  const spec = isGarage ? garageSpec(inputs) : hallSpec(inputs, structureClass);
  // Oś ramy trafia do kolektora, bo to on ustala orientację przekrojów: słupy
  // mają stać osią mocną w płaszczyźnie ramy.
  const { runAxis, longAxis } = frameAxes(inputs);
  const collector = createCollector(isGarage ? "garage" : "hall", { runAxis });

  if (isGarage) {
    buildGarage(inputs, spec, collector);
  } else {
    buildHall(inputs, spec, collector);
  }
  buildOpeningFrames(inputs, spec, collector);
  if (isGarage) {
    buildFrontProjection(inputs, spec, collector);
  }

  warnAboutLightVariant(inputs, spec, collector);
  warnAboutSectionCapacity(spec, collector);

  const { members, plates, joints, warnings } = collector.finish();
  const frameSpacing = isGarage ? spec.rafterSpacing : spec.baySpacing;

  return {
    members,
    plates,
    joints,
    warnings,
    plan: {
      structureClass,
      steelGrade: spec.steelGrade,
      runAxis,
      longAxis,
      runSpan: spec.runSpan,
      longSpan: spec.longSpan,
      frameInset: spec.frameInset,
      framePositions: positionsBySpacing(spec.longSpan, frameSpacing * 1.001),
      spec,
      dimensions: inputs.dimensions,
      roof: { type: inputs.roof.type, pitchPercent: inputs.roof.pitchPercent, ...roofMetrics(inputs) },
    },
  };
}

