// Osie robocze konstrukcji, rozkład elementów i linia dachu.
//
// Zasada: `runAxis` to oś, wzdłuż której biegnie spad (i krokwie), `longAxis` to
// oś kalenicy/okapu (wzdłuż niej powtarzają się krokwie i biegną płatwie).
// Wszystkie funkcje są czyste i operują na zwykłych tablicach [x, y, z].

import { isGableRoof, roofMetrics, roofRunM, ROOF_RUN_X } from "@/scene/roofMath";

// Osie krokwi leżą o tyle poniżej nominalnej wysokości ściany (grubość poszycia
// + zapas montażowy). Sprzęgnięte z wallTopHeightAt w geometry.js — poszycie
// dachu jest wyrównane do tej samej płaszczyzny, więc NIE zmieniać w oderwaniu.
export const ROOF_STRUCTURE_DROP_M = 0.14;

export function frameAxes(inputs) {
  const runAxis = ROOF_RUN_X.has(inputs.roof.type) ? "x" : "z";
  return { runAxis, longAxis: runAxis === "x" ? "z" : "x" };
}

export function axisSpan(axis, widthM, lengthM) {
  return axis === "x" ? widthM : lengthM;
}

export function pointFromAxes(runAxis, runCoord, longCoord, y) {
  return runAxis === "x" ? [runCoord, y, longCoord] : [longCoord, y, runCoord];
}

export function wallForRunSide(runAxis, runCoord) {
  if (runAxis === "x") return runCoord < 0 ? "left" : "right";
  return runCoord < 0 ? "back" : "front";
}

export function wallForLongSide(runAxis, longCoord) {
  if (runAxis === "x") return longCoord < 0 ? "back" : "front";
  return longCoord < 0 ? "left" : "right";
}

// Rzeczywisty bieg połaci = pełny wymiar budynku wzdłuż osi spadu (nie zwężony
// rozstaw ram). Musi być spójny z wallTopHeightAt w geometry.js.
export function roofRun(inputs) {
  return roofRunM(inputs.roof.type, inputs.dimensions.widthM, inputs.dimensions.lengthM);
}

// Wysokość osi krokwi na współrzędnej biegu. Spadek liczony po RZECZYWISTYM
// biegu połaci, nie po zwężonym rozstawie ram — inaczej krokwie mają inny
// spadek niż realny dach i przebijają poszycie.
export function roofYOnRun(runCoord, inputs) {
  const base = inputs.dimensions.wallHeightM - ROOF_STRUCTURE_DROP_M;
  const { rise } = roofMetrics(inputs);
  const run = roofRun(inputs);
  const t = (runCoord + run / 2) / run;
  const type = inputs.roof.type;

  if (type === "single_right" || type === "single_front") return base + rise * (1 - t);
  if (type === "single_left" || type === "single_back") return base + rise * t;
  return base + rise * (1 - Math.min(1, Math.abs(runCoord) / (run / 2)));
}

export function levelsBelow(maxY, spacing) {
  const levels = [];
  for (let y = spacing; y < maxY - 0.3; y += spacing) {
    levels.push(y);
  }
  return levels;
}

// Rozstaw jest maksymalny — pozycje rozkładane równomiernie od krawędzi do krawędzi.
export function positionsBySpacing(span, spacing, minCount = 2) {
  const count = Math.max(minCount, Math.ceil(span / spacing) + 1);
  return Array.from({ length: count }, (_, index) => -span / 2 + (span * index) / (count - 1));
}

// Dogęszczenie istniejącej siatki tak, by żadna luka nie przekraczała maxGap.
// Używane, gdy słupy muszą stać pod krokwiami, a jednocześnie spełniać
// dopuszczalną rozpiętość płyty ściennej.
export function densifyPositions(positions, maxGap) {
  if (positions.length < 2) return [...positions];
  const out = [positions[0]];
  for (let index = 1; index < positions.length; index += 1) {
    const from = positions[index - 1];
    const to = positions[index];
    const steps = Math.max(1, Math.ceil((to - from) / maxGap - 1e-9));
    for (let step = 1; step <= steps; step += 1) {
      out.push(from + ((to - from) * step) / steps);
    }
  }
  return out;
}

// Dostępny poziomo przedział na danej wysokości w ścianie szczytowej —
// pod skośną linią dachu rygle muszą być przycięte.
export function trimmedRunForLevel(level, inputs, runSpan) {
  const { rise } = roofMetrics(inputs);
  const base = inputs.dimensions.wallHeightM - ROOF_STRUCTURE_DROP_M;
  const clearance = 0.18;
  const type = inputs.roof.type;

  if (level < base - clearance) return [[-runSpan / 2, runSpan / 2]];

  const overBase = Math.max(0, level + clearance - base);
  if (overBase >= rise) return [];

  if (isGableRoof(type)) {
    const half = (runSpan / 2) * (1 - overBase / rise);
    return [[-half, half]];
  }

  const t = overBase / rise;
  if (type === "single_left" || type === "single_back") {
    return [[-runSpan / 2 + runSpan * t, runSpan / 2]];
  }
  return [[-runSpan / 2, runSpan / 2 - runSpan * t]];
}
