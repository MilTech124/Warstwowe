import { MathUtils, Quaternion, Vector3 } from "three";
import { isGableRoof, roofMetrics, roofPitchBounds, slopedRoofLength } from "@/scene/roofMath";
import { effectiveFrontOverhangM } from "@/scene/frontProjectionMath";
import { roofFootprint, wallTopHeightAt } from "@/scene/wallProfile";

// Czysta geometria dachu żyje w roofMath.js (bez three), żeby mógł jej używać
// model konstrukcji. Re-eksport dla modułów, które importują to z geometry.js.
export { isGableRoof, roofMetrics, roofPitchBounds, slopedRoofLength };

// Klasa konstrukcji żyje w structure/classes.js razem z opisami klas.
export { getStructureClass } from "@/scene/structure/classes";

// Obrys dachu i profil ścian nie potrzebują three — mieszkają w wallProfile.js,
// żeby zestawienie materiałowe dało się policzyć po stronie serwera.
export { roofFootprint, wallTopHeightAt };

// Transformacja otworu dachowego do lokalnego układu połaci dachu.
// Środek otworu = (0,0,0), X = wzdłuż okna, Y = w górę połaci, Z = normala na zewnątrz.
export function roofOpeningTransform(opening, config) {
  const { widthM, lengthM, wallHeightM } = config.dimensions;
  const metrics = roofMetrics(config);
  const footprint = roofFootprint(config);
  const normalOffset = 0.075;
  const safeX = MathUtils.clamp(opening.offsetM, -widthM / 2 + opening.widthM / 2 + 0.25, widthM / 2 - opening.widthM / 2 - 0.25);
  const safeZ = MathUtils.clamp(opening.sillM, -lengthM / 2 + opening.heightM / 2 + 0.25, lengthM / 2 - opening.heightM / 2 - 0.25);

  if (config.roof.type === "single_back" || config.roof.type === "single_front") {
    const angle = config.roof.type === "single_back" ? -metrics.angle : metrics.angle;
    const t = (footprint.centerZ + lengthM / 2) / lengthM;
    const visibleY = wallHeightM + (config.roof.type === "single_back" ? t : 1 - t) * metrics.rise - 0.03;
    return {
      position: [footprint.centerX, visibleY, footprint.centerZ],
      rotation: [angle, 0, 0],
      localPosition: [safeX - footprint.centerX, normalOffset, safeZ - footprint.centerZ],
      localRotation: [-Math.PI / 2, 0, 0],
    };
  }

  if (config.roof.type === "single_right" || config.roof.type === "single_left") {
    const angle = config.roof.type === "single_right" ? -metrics.angle : metrics.angle;
    const t = (footprint.centerX + widthM / 2) / widthM;
    const visibleY = wallHeightM + (config.roof.type === "single_left" ? t : 1 - t) * metrics.rise - 0.03;
    return {
      position: [footprint.centerX, visibleY, footprint.centerZ],
      rotation: [0, 0, angle],
      localPosition: [safeX - footprint.centerX, normalOffset, safeZ - footprint.centerZ],
      localRotation: [-Math.PI / 2, 0, 0],
    };
  }

  if (config.roof.type === "gable_front_back") {
    const front = safeZ >= 0;
    const run = front ? footprint.frontRun : footprint.backRun;
    const slabLength = slopedRoofLength(run, metrics.angle);
    const centerZ = front ? footprint.frontRun / 2 : -footprint.backRun / 2;
    return {
      position: [footprint.centerX, wallHeightM + metrics.rise / 2 - 0.03, centerZ],
      rotation: [front ? -metrics.angle : metrics.angle, 0, 0],
      localPosition: [safeX - footprint.centerX, normalOffset, MathUtils.clamp(safeZ - centerZ, -slabLength / 2 + opening.heightM / 2, slabLength / 2 - opening.heightM / 2)],
      localRotation: [-Math.PI / 2, 0, 0],
    };
  }

  const right = safeX >= 0;
  const run = right ? footprint.rightRun : footprint.leftRun;
  const slabWidth = slopedRoofLength(run, metrics.angle);
  const centerX = right ? footprint.rightRun / 2 : -footprint.leftRun / 2;
  return {
    position: [centerX, wallHeightM + metrics.rise / 2 - 0.03, footprint.centerZ],
    rotation: [0, 0, right ? -metrics.angle : metrics.angle],
    localPosition: [MathUtils.clamp(safeX - centerX, -slabWidth / 2 + opening.widthM / 2, slabWidth / 2 - opening.widthM / 2), normalOffset, safeZ - footprint.centerZ],
    localRotation: [-Math.PI / 2, 0, 0],
  };
}

export function wallOpeningAxisCenter(opening, dimensions) {
  const span = opening.wall === "front" || opening.wall === "back" ? dimensions.widthM : dimensions.lengthM;
  const clampedOffset = MathUtils.clamp(opening.offsetM, -span / 2 + opening.widthM / 2, span / 2 - opening.widthM / 2);
  return opening.wall === "back" || opening.wall === "left" ? -clampedOffset : clampedOffset;
}

export function wallOpeningTransform(opening, dimensions) {
  const axisCenter = wallOpeningAxisCenter(opening, dimensions);
  const y = opening.sillM + opening.heightM / 2;
  const normalOffset = 0.025;

  if (opening.wall === "front") {
    return { position: [axisCenter, y, dimensions.lengthM / 2 + normalOffset], rotation: [0, 0, 0], horizontal: "x" };
  }
  if (opening.wall === "back") {
    return { position: [axisCenter, y, -dimensions.lengthM / 2 - normalOffset], rotation: [0, Math.PI, 0], horizontal: "x" };
  }
  if (opening.wall === "left") {
    return { position: [-dimensions.widthM / 2 - normalOffset, y, axisCenter], rotation: [0, -Math.PI / 2, 0], horizontal: "z" };
  }
  return { position: [dimensions.widthM / 2 + normalOffset, y, axisCenter], rotation: [0, Math.PI / 2, 0], horizontal: "z" };
}

export function quaternionBetween(start, end) {
  const a = new Vector3(...start);
  const b = new Vector3(...end);
  const direction = b.clone().sub(a);
  const quaternion = new Quaternion();
  quaternion.setFromUnitVectors(new Vector3(0, 0, 1), direction.clone().normalize());
  return {
    position: a.add(b).multiplyScalar(0.5).toArray(),
    length: direction.length(),
    quaternion,
  };
}
