import { Clone, useGLTF } from "@react-three/drei";
import { Color, Euler, MathUtils, Matrix4, Plane, Vector3 } from "three";
import { getRoofCladdingColor } from "@/config/catalog";
import { roofFootprint, roofMetrics, slopedRoofLength } from "@/scene/geometry";
import { materialProps, materials, paintedMetalProps } from "@/scene/materials";

const ROOF_PANEL_URL = "/wall_panels/repeatable_sandwich_panel_1m.glb";
const ROOF_PANEL_THICKNESS = 0.115;
const ROOF_PANEL_TOP_Y = 0.06;
const ROOF_PANEL_BASE_Y = ROOF_PANEL_TOP_Y - ROOF_PANEL_THICKNESS;
const SEAM_WIDTH = 0.013;
const SEAM_HEIGHT = 0.005;
const SEAM_Y = ROOF_PANEL_THICKNESS + 0.006;

function roofSeamColors(color) {
  const base = new Color(color);
  const shadow = base.clone().lerp(new Color("#0d1218"), 0.5);

  return { shadow };
}

function RoofPanelSeams({ width, length, xCount, zCount, material, panelAxis }) {
  const xSegment = width / xCount;
  const zSegment = length / zCount;
  const { shadow } = roofSeamColors(material.color);
  const xBoundaries = Array.from({ length: Math.max(0, xCount - 1) }, (_, index) => -width / 2 + xSegment * (index + 1));
  const zBoundaries = Array.from({ length: Math.max(0, zCount - 1) }, (_, index) => -length / 2 + zSegment * (index + 1));
  const panelsRunAlongX = panelAxis === "x";
  const boundaries = panelsRunAlongX ? zBoundaries : xBoundaries;

  return (
    <group name="roof-panel-seams" position={[0, SEAM_Y, 0]}>
      {boundaries.map((value) => (
        <mesh
          key={`${panelAxis}-${value}`}
          name={`roof-panel-seam-along-${panelAxis}`}
          position={panelsRunAlongX ? [0, 0, value] : [value, 0, 0]}
          renderOrder={5}
        >
          <boxGeometry args={panelsRunAlongX ? [width, SEAM_HEIGHT, SEAM_WIDTH] : [SEAM_WIDTH, SEAM_HEIGHT, length]} />
          <meshStandardMaterial color={shadow} roughness={0.82} metalness={0.12} />
        </mesh>
      ))}
    </group>
  );
}

function clampCutoutRect(cutout, width, length) {
  const halfW = width / 2;
  const halfL = length / 2;
  const clearance = 0.018;
  const cutWidth = Math.min(width - 0.02, cutout.width + clearance);
  const cutLength = Math.min(length - 0.02, cutout.length + clearance);
  const x = MathUtils.clamp(cutout.x, -halfW + cutWidth / 2, halfW - cutWidth / 2);
  const z = MathUtils.clamp(cutout.z, -halfL + cutLength / 2, halfL - cutLength / 2);

  return {
    xMin: x - cutWidth / 2,
    xMax: x + cutWidth / 2,
    zMin: z - cutLength / 2,
    zMax: z + cutLength / 2,
  };
}

function roofCellsAroundCutouts(width, length, cutouts = []) {
  if (!cutouts.length) {
    return [{ x: 0, z: 0, width, length }];
  }

  const rects = cutouts.map((cutout) => clampCutoutRect(cutout, width, length));
  const xBounds = [-width / 2, width / 2];
  const zBounds = [-length / 2, length / 2];
  rects.forEach((rect) => {
    xBounds.push(rect.xMin, rect.xMax);
    zBounds.push(rect.zMin, rect.zMax);
  });

  const sortedX = [...new Set(xBounds.map((value) => Number(MathUtils.clamp(value, -width / 2, width / 2).toFixed(4))))].sort((a, b) => a - b);
  const sortedZ = [...new Set(zBounds.map((value) => Number(MathUtils.clamp(value, -length / 2, length / 2).toFixed(4))))].sort((a, b) => a - b);
  const cells = [];

  for (let xi = 0; xi < sortedX.length - 1; xi += 1) {
    for (let zi = 0; zi < sortedZ.length - 1; zi += 1) {
      const xMin = sortedX[xi];
      const xMax = sortedX[xi + 1];
      const zMin = sortedZ[zi];
      const zMax = sortedZ[zi + 1];
      const cellWidth = xMax - xMin;
      const cellLength = zMax - zMin;
      if (cellWidth <= 0.015 || cellLength <= 0.015) continue;
      const x = (xMin + xMax) / 2;
      const z = (zMin + zMax) / 2;
      const insideCutout = rects.some((rect) =>
        x > rect.xMin + 0.001 &&
        x < rect.xMax - 0.001 &&
        z > rect.zMin + 0.001 &&
        z < rect.zMax - 0.001,
      );
      if (!insideCutout) {
        cells.push({ x, z, width: cellWidth, length: cellLength });
      }
    }
  }

  return cells;
}

function baseRoofPanelCells(width, length, panelAxis) {
  const panelsRunAlongX = panelAxis === "x";
  const xCount = Math.max(1, Math.ceil(width / (panelsRunAlongX ? 3 : 1)));
  const zCount = Math.max(1, Math.ceil(length / (panelsRunAlongX ? 1 : 3)));
  const xSegment = width / xCount;
  const zSegment = length / zCount;

  return Array.from({ length: xCount }, (_, xIndex) =>
    Array.from({ length: zCount }, (_, zIndex) => {
      const xMin = -width / 2 + xSegment * xIndex;
      const xMax = xMin + xSegment;
      const zMin = -length / 2 + zSegment * zIndex;
      const zMax = zMin + zSegment;
      return {
        xMin,
        xMax,
        zMin,
        zMax,
        x: (xMin + xMax) / 2,
        z: (zMin + zMax) / 2,
        width: xSegment,
        length: zSegment,
      };
    }),
  ).flat();
}

function rectCell(xMin, xMax, zMin, zMax) {
  const width = xMax - xMin;
  const length = zMax - zMin;
  if (width <= 0.015 || length <= 0.015) return null;
  return {
    xMin,
    xMax,
    zMin,
    zMax,
    x: (xMin + xMax) / 2,
    z: (zMin + zMax) / 2,
    width,
    length,
  };
}

function clippedCell(cell, source) {
  return cell ? { ...cell, role: "cutout-fragment", source: source.source || source } : null;
}

function subtractRectFromCell(cell, cutout) {
  const ixMin = Math.max(cell.xMin, cutout.xMin);
  const ixMax = Math.min(cell.xMax, cutout.xMax);
  const izMin = Math.max(cell.zMin, cutout.zMin);
  const izMax = Math.min(cell.zMax, cutout.zMax);
  const intersects = ixMin < ixMax - 0.001 && izMin < izMax - 0.001;

  if (!intersects) return [cell];

  // Zachowujemy informacje o pelnym panelu zrodlowym. Fragment bedzie dociety
  // plaszczyznami bez zmiany skali i rytmu przetloczen modelu GLB.
  return [
    clippedCell(rectCell(cell.xMin, ixMin, cell.zMin, cell.zMax), cell),
    clippedCell(rectCell(ixMax, cell.xMax, cell.zMin, cell.zMax), cell),
    clippedCell(rectCell(ixMin, ixMax, cell.zMin, izMin), cell),
    clippedCell(rectCell(ixMin, ixMax, izMax, cell.zMax), cell),
  ].filter(Boolean);
}

function roofPanelCellsWithCutouts(width, length, panelAxis, cutouts = []) {
  const cells = baseRoofPanelCells(width, length, panelAxis);
  if (!cutouts.length) return cells;
  const rects = cutouts.map((cutout) => clampCutoutRect(cutout, width, length));

  return rects.reduce(
    (parts, rect) => parts.flatMap((cell) => subtractRectFromCell(cell, rect)),
    cells,
  );
}

function roofFragmentClipPlanes(cell, assemblyPosition, assemblyRotation) {
  const roofMatrix = new Matrix4()
    .makeRotationFromEuler(new Euler(...assemblyRotation))
    .setPosition(new Vector3(...assemblyPosition));

  return [
    new Plane(new Vector3(1, 0, 0), -cell.xMin),
    new Plane(new Vector3(-1, 0, 0), cell.xMax),
    new Plane(new Vector3(0, 0, 1), -cell.zMin),
    new Plane(new Vector3(0, 0, -1), cell.zMax),
  ].map((plane) => plane.applyMatrix4(roofMatrix));
}

function RoofCoreSegments({ name, width, length, coreThickness, cutouts }) {
  const cells = roofCellsAroundCutouts(width, length, cutouts);
  return (
    <group name={`${name}-pir-core-segmented`}>
      {cells.map((cell, index) => (
        <mesh key={index} name={`${name}-pir-core-part`} position={[cell.x, -coreThickness / 2, cell.z]} material={materials.roofCore} castShadow receiveShadow>
          <boxGeometry args={[cell.width, coreThickness, cell.length]} />
        </mesh>
      ))}
    </group>
  );
}

function RoofPanelGrid({ scene, width, length, material, panelAxis, cutouts = [], assemblyPosition, assemblyRotation }) {
  const panelsRunAlongX = panelAxis === "x";
  const xCount = Math.max(1, Math.ceil(width / (panelsRunAlongX ? 3 : 1)));
  const zCount = Math.max(1, Math.ceil(length / (panelsRunAlongX ? 1 : 3)));
  const panelCells = roofPanelCellsWithCutouts(width, length, panelAxis, cutouts);

  return (
    <group name="roof-cladding-sheets" position={[0, ROOF_PANEL_BASE_Y, 0]}>
      {panelCells.map((cell, index) => {
        const source = cell.source || cell;
        const clippingPlanes = cell.role === "cutout-fragment"
          ? roofFragmentClipPlanes(cell, assemblyPosition, assemblyRotation)
          : [];
        return (
          <Clone
            key={index}
            object={scene}
            position={[source.x, 0, source.z]}
            rotation={panelsRunAlongX ? [0, Math.PI / 2, 0] : [0, 0, 0]}
            scale={panelsRunAlongX ? [source.length, 1, source.width / 3] : [source.width, 1, source.length / 3]}
            inject={<meshPhysicalMaterial {...materialProps(material, clippingPlanes)} />}
          />
        );
      })}
      <RoofPanelSeams width={width} length={length} xCount={xCount} zCount={zCount} material={material} panelAxis={panelAxis} />
    </group>
  );
}

function RoofCutoutReveals({ cutouts, width, length, coreThickness }) {
  if (!cutouts.length) return null;
  const rects = cutouts.map((cutout) => clampCutoutRect(cutout, width, length));
  return (
    <group name="roof-window-cutout-reveals">
      {rects.map((rect, index) => {
        const x = (rect.xMin + rect.xMax) / 2;
        const z = (rect.zMin + rect.zMax) / 2;
        const cutWidth = rect.xMax - rect.xMin;
        const cutLength = rect.zMax - rect.zMin;
        const rail = 0.035;
        const y = -coreThickness / 2 + 0.002;
        return (
          <group key={index} name="roof-window-cutout-reveal">
            <mesh position={[x, y, rect.zMin - rail / 2]} material={materials.roofCore} receiveShadow>
              <boxGeometry args={[cutWidth + rail * 2, coreThickness, rail]} />
            </mesh>
            <mesh position={[x, y, rect.zMax + rail / 2]} material={materials.roofCore} receiveShadow>
              <boxGeometry args={[cutWidth + rail * 2, coreThickness, rail]} />
            </mesh>
            <mesh position={[rect.xMin - rail / 2, y, z]} material={materials.roofCore} receiveShadow>
              <boxGeometry args={[rail, coreThickness, cutLength]} />
            </mesh>
            <mesh position={[rect.xMax + rail / 2, y, z]} material={materials.roofCore} receiveShadow>
              <boxGeometry args={[rail, coreThickness, cutLength]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function RoofAssembly({ scene, width, length, position, rotation, name, material, coreThickness, panelAxis, cutouts = [] }) {
  return (
    <group name={name} position={position} rotation={rotation}>
      <RoofCoreSegments name={name} width={width} length={length} coreThickness={coreThickness} cutouts={cutouts} />
      <RoofPanelGrid scene={scene} width={width} length={length} material={material} panelAxis={panelAxis} cutouts={cutouts} assemblyPosition={position} assemblyRotation={rotation} />
      <RoofCutoutReveals cutouts={cutouts} width={width} length={length} coreThickness={coreThickness} />
    </group>
  );
}

function roofPanelAxisForType(roofType) {
  return roofType === "single_left" || roofType === "single_right" || roofType === "gable_left_right"
    ? "x"
    : "z";
}

function roofWindowCutouts(config, assembly) {
  const roofWindows = config.openings?.filter((opening) => opening.kind === "roofWindow") || [];
  if (!roofWindows.length) return [];

  const { widthM, lengthM } = config.dimensions;
  const footprint = roofFootprint(config);
  const metrics = roofMetrics(config);
  return roofWindows
    .map((opening) => {
      if (assembly === "single" || assembly === "side-single") {
        return {
          x: opening.offsetM - footprint.centerX,
          z: opening.sillM - footprint.centerZ,
          width: opening.widthM,
          length: opening.heightM,
        };
      }
      if (assembly === "gable-front") {
        if (opening.sillM < 0) return null;
        return {
          x: opening.offsetM - footprint.centerX,
          z: opening.sillM - footprint.frontRun / 2,
          width: opening.widthM,
          length: opening.heightM,
        };
      }
      if (assembly === "gable-back") {
        if (opening.sillM >= 0) return null;
        return {
          x: opening.offsetM - footprint.centerX,
          z: opening.sillM + footprint.backRun / 2,
          width: opening.widthM,
          length: opening.heightM,
        };
      }
      if (assembly === "gable-right") {
        if (opening.offsetM < 0) return null;
        return {
          x: opening.offsetM - footprint.rightRun / 2,
          z: opening.sillM - footprint.centerZ,
          width: opening.widthM,
          length: opening.heightM,
        };
      }
      if (assembly === "gable-left") {
        if (opening.offsetM >= 0) return null;
        return {
          x: opening.offsetM + footprint.leftRun / 2,
          z: opening.sillM - footprint.centerZ,
          width: opening.widthM,
          length: opening.heightM,
        };
      }
      return null;
    })
    .filter(Boolean)
    .filter((cutout) => Math.abs(cutout.x) < widthM || Math.abs(cutout.z) < lengthM || metrics.rise >= 0);
}

export function RoofSystem({ config }) {
  const { scene } = useGLTF(ROOF_PANEL_URL);
  const roofColor = getRoofCladdingColor(config.cladding);
  const roofMaterial = config.viewMode === "structure"
    ? materials.roofStructureMode
    : paintedMetalProps(roofColor.hex, "roof");
  const { widthM, lengthM, wallHeightM } = config.dimensions;
  const metrics = roofMetrics(config);
  const { centerX, centerZ, roofWidth, roofLength, frontRun, backRun, leftRun, rightRun } = roofFootprint(config);
  // Widoczny rdzen plyty dachowej — smuklejszy, aby krawedz dachu nie wygladala
  // na zbyt gruba (powierzchnia dachu pozostaje na tej samej wysokosci).
  const coreThickness = Math.max(0.05, config.cladding.roofPirThicknessMm / 1000 * 0.7);
  const panelAxis = roofPanelAxisForType(config.roof.type);

  if (config.roof.type === "single_back" || config.roof.type === "single_front") {
    const angle = config.roof.type === "single_back" ? -metrics.angle : metrics.angle;
    const t = (centerZ + lengthM / 2) / lengthM;
    const visibleY = wallHeightM + (config.roof.type === "single_back" ? t : 1 - t) * metrics.rise - 0.03;
    return (
      <group name="roof-root">
        <RoofAssembly scene={scene} name="single-slope-roof" width={roofWidth} length={roofLength} position={[centerX, visibleY, centerZ]} rotation={[angle, 0, 0]} material={roofMaterial} coreThickness={coreThickness} panelAxis={panelAxis} cutouts={roofWindowCutouts(config, "single")} />
      </group>
    );
  }

  if (config.roof.type === "single_right" || config.roof.type === "single_left") {
    const angle = config.roof.type === "single_right" ? -metrics.angle : metrics.angle;
    const t = (centerX + widthM / 2) / widthM;
    const visibleY = wallHeightM + (config.roof.type === "single_left" ? t : 1 - t) * metrics.rise - 0.03;
    return (
      <group name="roof-root">
        <RoofAssembly scene={scene} name="side-slope-roof" width={roofWidth} length={roofLength} position={[centerX, visibleY, centerZ]} rotation={[0, 0, angle]} material={roofMaterial} coreThickness={coreThickness} panelAxis={panelAxis} cutouts={roofWindowCutouts(config, "side-single")} />
      </group>
    );
  }

  if (config.roof.type === "gable_front_back") {
    const frontSlabLength = slopedRoofLength(frontRun, metrics.angle);
    const backSlabLength = slopedRoofLength(backRun, metrics.angle);
    return (
      <group name="roof-root">
        <RoofAssembly scene={scene} name="gable-front-roof" width={roofWidth} length={frontSlabLength} position={[centerX, wallHeightM + metrics.rise / 2 - 0.03, frontRun / 2]} rotation={[-metrics.angle, 0, 0]} material={roofMaterial} coreThickness={coreThickness} panelAxis={panelAxis} cutouts={roofWindowCutouts(config, "gable-front")} />
        <RoofAssembly scene={scene} name="gable-back-roof" width={roofWidth} length={backSlabLength} position={[centerX, wallHeightM + metrics.rise / 2 - 0.03, -backRun / 2]} rotation={[metrics.angle, 0, 0]} material={roofMaterial} coreThickness={coreThickness} panelAxis={panelAxis} cutouts={roofWindowCutouts(config, "gable-back")} />
      </group>
    );
  }

  return (
    <group name="roof-root">
      <RoofAssembly scene={scene} name="gable-right-roof" width={slopedRoofLength(rightRun, metrics.angle)} length={roofLength} position={[rightRun / 2, wallHeightM + metrics.rise / 2 - 0.03, centerZ]} rotation={[0, 0, -metrics.angle]} material={roofMaterial} coreThickness={coreThickness} panelAxis={panelAxis} cutouts={roofWindowCutouts(config, "gable-right")} />
      <RoofAssembly scene={scene} name="gable-left-roof" width={slopedRoofLength(leftRun, metrics.angle)} length={roofLength} position={[-leftRun / 2, wallHeightM + metrics.rise / 2 - 0.03, centerZ]} rotation={[0, 0, metrics.angle]} material={roofMaterial} coreThickness={coreThickness} panelAxis={panelAxis} cutouts={roofWindowCutouts(config, "gable-left")} />
    </group>
  );
}

useGLTF.preload(ROOF_PANEL_URL);
