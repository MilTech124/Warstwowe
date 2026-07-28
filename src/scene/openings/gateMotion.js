import { useRef } from "react";
import { MathUtils } from "three";

// Ograniczenie kroku chroni przed przeskokiem po powrocie do zakladki, ale musi byc
// na tyle duze, zeby na slabszym GPU brama nie jechala w zwolnionym tempie.
const STEP_CLAMP_S = 0.1;
const SETTLE_EPS = 1e-4;

// Napedy bram jezdza ze stala predkoscia z miekkim rozruchem i dobiegiem, dlatego
// zamiast wykladniczego damp() uzywamy profilu trapezowego (rozruch, jazda, hamowanie).
const DRIVE_PRESETS = Object.freeze({
  sectional: { speedMps: 0.85, rampSeconds: 0.55, minSeconds: 2.1, maxSeconds: 4.6 },
  roller: { speedMps: 1.05, rampSeconds: 0.4, minSeconds: 1.7, maxSeconds: 3.8 },
  tilting: { speedMps: 1.15, rampSeconds: 0.5, minSeconds: 1.9, maxSeconds: 3.6 },
});

/** Predkosc przelotowa i przyspieszenie w jednostkach postepu (0..1) na sekunde. */
export function createDriveProfile(travelM, profile = "sectional") {
  const preset = DRIVE_PRESETS[profile] || DRIVE_PRESETS.sectional;
  const durationS = MathUtils.clamp(
    Math.max(0.2, travelM) / preset.speedMps,
    preset.minSeconds,
    preset.maxSeconds,
  );
  const rampShare = Math.min(preset.rampSeconds / durationS, 0.45);
  const cruise = 1 / (durationS * (1 - rampShare));

  return { durationS, cruise, accel: cruise / (rampShare * durationS) };
}

/**
 * Jeden krok profilu trapezowego. Zwraca null, gdy brama stoi w skrajnym polozeniu -
 * dzieki temu useFrame nie przelicza geometrii bez potrzeby. Zmiana kierunku w trakcie
 * jazdy jest najpierw wyhamowywana, tak jak w prawdziwym napedzie.
 */
export function stepDrive(state, target, { cruise, accel }, delta) {
  const gap = target - state.progress;

  if (Math.abs(gap) < SETTLE_EPS && Math.abs(state.velocity) < SETTLE_EPS) {
    state.progress = target;
    state.velocity = 0;
    state.settledFrames += 1;
    return state.settledFrames > 1 ? null : target;
  }

  state.settledFrames = 0;
  const step = Math.min(delta, STEP_CLAMP_S);
  const dir = gap >= 0 ? 1 : -1;
  // Predkosc, z ktorej naped zdazy jeszcze wyhamowac dokladnie na koncu przejazdu.
  const arrival = Math.sqrt(2 * accel * Math.abs(gap));

  let velocity = state.velocity + dir * accel * step;
  if (dir * velocity > 0) {
    velocity = dir * Math.min(Math.abs(velocity), cruise, arrival);
  }
  state.velocity = velocity;

  state.progress += state.velocity * step;
  if ((dir > 0 && state.progress >= target) || (dir < 0 && state.progress <= target)) {
    state.progress = target;
    state.velocity = 0;
  }
  state.progress = MathUtils.clamp(state.progress, 0, 1);
  return state.progress;
}

/** Postep 0..1 bramy prowadzony profilem napedu; stan przezywa przerysowania. */
export function useGateDrive(open, travelM, profile = "sectional") {
  const state = useRef(null);
  if (!state.current) {
    state.current = { progress: open ? 1 : 0, velocity: 0, settledFrames: 0 };
  }
  const params = createDriveProfile(travelM, profile);
  const target = open ? 1 : 0;

  return {
    get progress() {
      return state.current.progress;
    },
    advance(delta) {
      return stepDrive(state.current, target, params, delta);
    },
  };
}

/**
 * Tor bramy segmentowej liczony dlugoscia luku od posadzki: pion w swietle otworu,
 * cwierc luku przy nadprozu, potem odcinek poziomy pod stropem.
 */
export function createSectionalPath(heightM, radiusM) {
  const headerY = heightM / 2;
  const arcLengthM = (Math.PI / 2) * radiusM;

  return {
    arcLengthM,
    headerY,
    at(distanceM, out) {
      if (distanceM <= heightM) {
        out.y = -headerY + distanceM;
        out.z = 0;
      } else if (distanceM <= heightM + arcLengthM) {
        const angle = (distanceM - heightM) / radiusM;
        out.y = headerY + radiusM * Math.sin(angle);
        out.z = radiusM * (Math.cos(angle) - 1);
      } else {
        out.y = headerY + radiusM;
        out.z = -radiusM - (distanceM - heightM - arcLengthM);
      }
      return out;
    },
  };
}

/**
 * Panel jest sztywny, wiec zawiasy dolnej i gornej krawedzi lezaza na torze, a sama
 * plyta jest cieciwa miedzy nimi. Dzieki temu segmenty zostaja spiete na luku,
 * zamiast obracac sie kazdy wokol swojego srodka.
 */
export function placeChordOnPath(object, path, fromM, toM, low, high) {
  path.at(fromM, low);
  path.at(toM, high);
  object.position.set(0, (low.y + high.y) / 2, (low.z + high.z) / 2);
  object.rotation.x = Math.atan2(high.z - low.z, high.y - low.y);
}

/**
 * Nawijanie pancerza rolety na wal: spirala Archimedesa parametryzowana dlugoscia
 * pancerza, wiec kolejne warstwy narastaja plynnie (bez skoku promienia na obrot).
 * `y` to wysokosc lameli, jaka miala by przy prostym pancerzu.
 */
export function createRollPath({ curtainLengthM, coreRadiusM, layerPitchM, headerY, clearanceM = 0.045 }) {
  const growth = Math.max(1e-5, layerPitchM) / (Math.PI * 2);
  const angleFor = (wrappedM) =>
    (Math.sqrt(coreRadiusM * coreRadiusM + 2 * growth * Math.max(0, wrappedM)) - coreRadiusM) / growth;
  const coilRadiusM = coreRadiusM + growth * angleFor(curtainLengthM);
  const wrapStartY = headerY + coilRadiusM + clearanceM;

  return {
    coreRadiusM,
    coilRadiusM,
    wrapStartY,
    at(y, out) {
      if (y <= wrapStartY) {
        out.y = y;
        out.z = 0;
        out.angle = 0;
        return out;
      }
      const angle = angleFor(y - wrapStartY);
      const radius = coreRadiusM + growth * angle;
      out.y = wrapStartY + radius * Math.sin(angle);
      out.z = radius * Math.cos(angle) - coreRadiusM;
      out.angle = -angle;
      return out;
    },
  };
}

/**
 * Kinematyka bramy uchylnej: gorna krawedz jedzie w prowadnicy pod stropem, skrzydlo
 * obraca sie do poziomu, a dol wykonuje charakterystyczny wychyl na zewnatrz
 * (sin * sin2 - zerowy na koncach, maksymalny w polowie przejazdu).
 */
export function solveTiltingPose(progress, { heightM, trackRiseM, retractM, sweepM }, out) {
  const phi = (Math.PI / 2) * progress;
  const sin = Math.sin(phi);
  const cos = Math.cos(phi);
  const topY = heightM / 2 + trackRiseM * sin;
  const topZ = -retractM * sin + sweepM * sin * Math.sin(2 * phi);

  out.y = topY - (heightM / 2) * cos;
  out.z = topZ + (heightM / 2) * sin;
  out.angle = -phi;
  return out;
}
