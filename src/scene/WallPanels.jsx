import { Clone, useGLTF } from "@react-three/drei";
import { Color, Plane, Vector3 } from "three";
import { getCladdingColor, getCladdingProfile, getWallPanelLengthM, WALL_PANEL_DIMENSIONS, WALL_PROFILES } from "@/config/catalog";
import { materialProps, materials, paintedMetalProps } from "@/scene/materials";
import { wallTopHeightAt } from "@/scene/geometry";
import { GATE_OPENING_CLEARANCE_M } from "@/scene/openings/gateGeometry";

const ROOF_CLEARANCE_M = 0.035;
const HORIZONTAL_PANEL_HEIGHT_M = WALL_PANEL_DIMENSIONS.moduleWidthM;
const JOINT_FLASHING_WIDTH_M = 0.12;
const JOINT_FLASHING_DEPTH_M = 0.008;
const JOINT_FLASHING_OFFSET_M = JOINT_FLASHING_DEPTH_M / 2 + 0.001;

function PanelInstance({ scene, position, rotation, scale, material, clippingPlane }) {
  return (
    <Clone
      object={scene}
      position={position}
      rotation={rotation}
      scale={scale}
      inject={<meshPhysicalMaterial {...materialProps(material, clippingPlane)} />}
    />
  );
}

function sideNeedsRidgeSplit(side, config) {
  return (
    (config.roof.type === "gable_left_right" && (side === "front" || side === "back")) ||
    (config.roof.type === "gable_front_back" && (side === "left" || side === "right"))
  );
}

function wallSegments(length, includeRidge = false) {
  if (includeRidge) {
    const makeSide = (start, end) => {
      const sideLength = Math.abs(end - start);
      const count = Math.max(1, Math.ceil(sideLength));
      const step = (end - start) / count;
      return Array.from({ length: count }, (_, index) => {
        const a = start + step * index;
        const b = start + step * (index + 1);
        return {
          center: (a + b) / 2,
          length: Math.abs(b - a),
          start: a,
          end: b,
        };
      });
    };

    return [
      ...makeSide(-length / 2, 0),
      ...makeSide(0, length / 2),
    ];
  }

  const count = Math.max(1, Math.ceil(length));
  const segment = length / count;
  const edges = Array.from({ length: count + 1 }, (_, index) => -length / 2 + segment * index);

  return edges.slice(0, -1).map((start, index) => {
    const end = edges[index + 1];
    return {
      center: (start + end) / 2,
      length: end - start,
      start,
      end,
    };
  });
}

function horizontalPanelSegments(length, maxPanelLengthM) {
  const makeRun = (start, end) => {
    const runLength = Math.abs(end - start);
    const count = Math.max(1, Math.ceil(runLength / maxPanelLengthM));
    const step = (end - start) / count;

    return Array.from({ length: count }, (_, index) => {
      const segmentStart = start + step * index;
      const segmentEnd = start + step * (index + 1);
      return {
        center: (segmentStart + segmentEnd) / 2,
        length: Math.abs(segmentEnd - segmentStart),
        start: segmentStart,
        end: segmentEnd,
      };
    });
  };

  return makeRun(-length / 2, length / 2);
}

// Otwory w ukladzie osi swiata danej sciany (x dla przod/tyl, z dla boków).
function wallOpeningRects(config, side) {
  const sign = side === "back" || side === "left" ? -1 : 1;
  return config.openings
    .filter((opening) => opening.wall === side)
    .map((opening) => {
      const center = sign * opening.offsetM;
      const trimClearance = opening.kind === "gate" ? GATE_OPENING_CLEARANCE_M : opening.kind === "door" ? 0.026 : opening.kind === "window" ? 0.042 : 0;
      return {
        x0: center - opening.widthM / 2 - trimClearance,
        x1: center + opening.widthM / 2 + trimClearance,
        y0: Math.max(0, opening.sillM - trimClearance),
        y1: opening.sillM + opening.heightM + trimClearance,
      };
    });
}

// Prostokat poszycia minus otwory: paski pelnej wysokosci po bokach otworu
// oraz pasy nad i pod otworem — tak sie realnie docina plyte na budowie.
function piecesAroundOpenings(x0, x1, y0, y1, rects) {
  const eps = 0.02;
  const hit = rects.filter((rect) => rect.x1 > x0 + eps && rect.x0 < x1 - eps && rect.y1 > y0 + eps && rect.y0 < y1 - eps);
  if (!hit.length) return [{ x0, x1, y0, y1 }];

  const pieces = [];
  const cuts = hit
    .map((rect) => [Math.max(x0, rect.x0), Math.min(x1, rect.x1)])
    .sort((a, b) => a[0] - b[0]);
  let cursor = x0;
  cuts.forEach(([cutStart, cutEnd]) => {
    if (cutStart - cursor > eps) pieces.push({ x0: cursor, x1: cutStart, y0, y1 });
    cursor = Math.max(cursor, cutEnd);
  });
  if (x1 - cursor > eps) pieces.push({ x0: cursor, x1, y0, y1 });

  hit.forEach((rect) => {
    const cutStart = Math.max(x0, rect.x0);
    const cutEnd = Math.min(x1, rect.x1);
    if (rect.y0 > y0 + eps) pieces.push({ x0: cutStart, x1: cutEnd, y0, y1: Math.min(y1, rect.y0) });
    if (rect.y1 < y1 - eps) pieces.push({ x0: cutStart, x1: cutEnd, y0: Math.max(y0, rect.y1), y1 });
  });
  return pieces;
}

function wallAxis(side) {
  return side === "front" || side === "back" ? "x" : "z";
}

function wallAxisLength(side, config) {
  return wallAxis(side) === "x" ? config.dimensions.widthM : config.dimensions.lengthM;
}

function wallHeightAtWorldAxis(side, axisValue, config) {
  return wallTopHeightAt(side, axisValue, config) - ROOF_CLEARANCE_M;
}

function wallCutPlane(side, config, start, end) {
  const length = wallAxisLength(side, config);
  const a0 = start ?? -length / 2;
  const a1 = end ?? length / 2;
  const h0 = wallHeightAtWorldAxis(side, a0, config);
  const h1 = wallHeightAtWorldAxis(side, a1, config);
  const slope = (h1 - h0) / Math.max(0.001, a1 - a0);
  const intercept = h0 - slope * a0;
  const normal = wallAxis(side) === "x" ? new Vector3(slope, -1, 0) : new Vector3(0, -1, slope);
  return new Plane(normal, intercept).normalize();
}

function horizontalPanelCutPlanes(side, config, start, end) {
  if (sideNeedsRidgeSplit(side, config) && start < 0 && end > 0) {
    return [
      wallCutPlane(side, config, start, 0),
      wallCutPlane(side, config, 0, end),
    ];
  }
  return [wallCutPlane(side, config, start, end)];
}

// Pozioma plaszczyzna tnaca: keepAbove=true zostawia y >= yValue (docina dol),
// keepAbove=false zostawia y <= yValue (docina gore). Pozwala przyciac modul
// okladziny do granic kawalka wokol otworu bez zmiany skoku przetloczen.
function horizontalClipPlane(keepAbove, yValue) {
  const normal = new Vector3(0, keepAbove ? 1 : -1, 0);
  const constant = keepAbove ? -yValue : yValue;
  return new Plane(normal, constant);
}

function wallMaxHeight(side, config, start, end) {
  const length = wallAxisLength(side, config);
  const a0 = start ?? -length / 2;
  const a1 = end ?? length / 2;
  const midpoint = (a0 + a1) / 2;
  return Math.max(
    wallHeightAtWorldAxis(side, a0, config),
    wallHeightAtWorldAxis(side, midpoint, config),
    wallHeightAtWorldAxis(side, a1, config),
  ) + 0.15;
}

function coreBoxProps(side, piece, thickness, config) {
  const { widthM, lengthM } = config.dimensions;
  const innerOffset = 0.024;
  const centerAxis = (piece.x0 + piece.x1) / 2;
  const centerY = (piece.y0 + piece.y1) / 2;
  const run = piece.x1 - piece.x0;
  const height = piece.y1 - piece.y0;

  if (side === "front") {
    return { position: [centerAxis, centerY, lengthM / 2 - innerOffset - thickness / 2], args: [run, height, thickness] };
  }
  if (side === "back") {
    return { position: [centerAxis, centerY, -lengthM / 2 + innerOffset + thickness / 2], args: [run, height, thickness] };
  }
  if (side === "left") {
    return { position: [-widthM / 2 + innerOffset + thickness / 2, centerY, centerAxis], args: [thickness, height, run] };
  }
  return { position: [widthM / 2 - innerOffset - thickness / 2, centerY, centerAxis], args: [thickness, height, run] };
}

function WallCoreRun({ length, side, config }) {
  const thickness = Math.max(0.04, config.cladding.wallPirThicknessMm / 1000);
  const mat = config.viewMode === "structure" ? materials.wallStructureMode : materials.wallCore;
  const panels = wallSegments(length, sideNeedsRidgeSplit(side, config));
  const openingRects = wallOpeningRects(config, side);

  return panels.flatMap((panel, index) => {
    const height = wallMaxHeight(side, config, panel.start, panel.end);
    const clippingPlane = wallCutPlane(side, config, panel.start, panel.end);

    return piecesAroundOpenings(panel.start, panel.end, 0, height, openingRects).map((piece, pieceIndex) => {
      const box = coreBoxProps(side, piece, thickness, config);
      return (
        <mesh key={`${side}-core-${index}-${pieceIndex}`} name={`${side}-wall-core-segment`} position={box.position} castShadow receiveShadow>
          <boxGeometry args={box.args} />
          <meshStandardMaterial {...materialProps(mat, clippingPlane, false)} />
        </mesh>
      );
    });
  });
}

function WallCore({ config }) {
  const { widthM, lengthM } = config.dimensions;
  return (
    <group name="pir-wall-core">
      <WallCoreRun length={widthM} side="front" config={config} />
      <WallCoreRun length={widthM} side="back" config={config} />
      <WallCoreRun length={lengthM} side="left" config={config} />
      <WallCoreRun length={lengthM} side="right" config={config} />
    </group>
  );
}

function panelTransform(side, axisStart, rowCenter, config) {
  const { widthM, lengthM } = config.dimensions;

  if (side === "front") {
    return { position: [axisStart, rowCenter, lengthM / 2], rotation: [0, 0, -Math.PI / 2] };
  }
  if (side === "back") {
    return { position: [axisStart, rowCenter, -lengthM / 2], rotation: [0, Math.PI, Math.PI / 2] };
  }
  if (side === "left") {
    return { position: [-widthM / 2, rowCenter, axisStart], rotation: [0, -Math.PI / 2, -Math.PI / 2] };
  }
  return { position: [widthM / 2, rowCenter, axisStart], rotation: [0, Math.PI / 2, Math.PI / 2] };
}

function HorizontalPanelRun({ scene, length, side, config }) {
  const panels = horizontalPanelSegments(length, getWallPanelLengthM(config.cladding));
  const openingRects = wallOpeningRects(config, side);
  const color = getCladdingColor(config.cladding);
  const material = config.viewMode === "structure"
    ? materials.wallStructureMode
    : paintedMetalProps(color.hex, "wall");
  return panels.flatMap((panel, panelIndex) => {
    const clippingPlanes = horizontalPanelCutPlanes(side, config, panel.start, panel.end);
    const panelHeight = wallMaxHeight(side, config, panel.start, panel.end);
    const rowCount = Math.max(1, Math.ceil(panelHeight / HORIZONTAL_PANEL_HEIGHT_M));

    return Array.from({ length: rowCount }, (_, rowIndex) => {
      const rowStart = rowIndex * HORIZONTAL_PANEL_HEIGHT_M;
      const rowEnd = Math.min(panelHeight, rowStart + HORIZONTAL_PANEL_HEIGHT_M);

      return piecesAroundOpenings(panel.start, panel.end, rowStart, rowEnd, openingRects).map((piece, pieceIndex) => {
        // Modul renderujemy zawsze w natywnej skali (stala wysokosc pasa =
        // staly skok przetloczen). Do granic kawalka wokol otworu docinamy go
        // plaszczyznami, a nie sciskajac skala — inaczej pasek nad brama mial
        // inne (gestsze) przetloczenia niz reszta sciany.
        const transform = panelTransform(side, piece.x0, rowStart + HORIZONTAL_PANEL_HEIGHT_M / 2, config);
        const pieceClips = [...clippingPlanes];
        if (piece.y0 > rowStart + 0.01) pieceClips.push(horizontalClipPlane(true, piece.y0));
        if (piece.y1 < rowEnd - 0.01) pieceClips.push(horizontalClipPlane(false, piece.y1));

        return (
          <PanelInstance
            key={`${side}-${panelIndex}-row-${rowIndex}-${pieceIndex}`}
            scene={scene}
            position={transform.position}
            rotation={transform.rotation}
            scale={[HORIZONTAL_PANEL_HEIGHT_M, (piece.x1 - piece.x0) / 3, 1]}
            material={material}
            clippingPlane={pieceClips}
          />
        );
      });
    }).flat();
  });
}

function flashingIntervals(side, axisPosition, height, config) {
  const blocked = config.openings
    .filter((opening) => opening.wall === side && Math.abs(opening.offsetM - axisPosition) <= opening.widthM / 2 + JOINT_FLASHING_WIDTH_M / 2)
    .map((opening) => ({
      start: Math.max(0, opening.sillM),
      end: Math.min(height, opening.sillM + opening.heightM),
    }))
    .filter((opening) => opening.end > opening.start)
    .sort((a, b) => a.start - b.start);

  const intervals = [];
  let cursor = 0;
  blocked.forEach((opening) => {
    if (opening.start > cursor) intervals.push({ start: cursor, end: opening.start });
    cursor = Math.max(cursor, opening.end);
  });
  if (cursor < height) intervals.push({ start: cursor, end: height });
  return intervals.filter((interval) => interval.end - interval.start > 0.01);
}

function JointFlashing({ side, axisPosition, start, end, config, material }) {
  const { widthM, lengthM } = config.dimensions;
  const height = end - start;
  const y = start + height / 2;

  if (side === "front" || side === "back") {
    const direction = side === "front" ? 1 : -1;
    return (
      <mesh name={`${side}-horizontal-panel-joint-flashing`} position={[axisPosition, y, direction * (lengthM / 2 + JOINT_FLASHING_OFFSET_M)]} castShadow receiveShadow>
        <boxGeometry args={[JOINT_FLASHING_WIDTH_M, height, JOINT_FLASHING_DEPTH_M]} />
        <meshPhysicalMaterial {...material} />
      </mesh>
    );
  }

  const direction = side === "right" ? 1 : -1;
  return (
    <mesh name={`${side}-horizontal-panel-joint-flashing`} position={[direction * (widthM / 2 + JOINT_FLASHING_OFFSET_M), y, axisPosition]} castShadow receiveShadow>
      <boxGeometry args={[JOINT_FLASHING_DEPTH_M, height, JOINT_FLASHING_WIDTH_M]} />
      <meshPhysicalMaterial {...material} />
    </mesh>
  );
}

function PanelJointFlashings({ length, side, config }) {
  const panels = horizontalPanelSegments(length, getWallPanelLengthM(config.cladding));
  const joints = panels.slice(0, -1).map((panel) => panel.end);
  const color = getCladdingColor(config.cladding);
  const material = paintedMetalProps(color.hex, "flashing");

  return joints.flatMap((axisPosition, jointIndex) => {
    const height = Math.max(0, wallHeightAtWorldAxis(side, axisPosition, config));
    return flashingIntervals(side, axisPosition, height, config).map((interval, intervalIndex) => (
      <JointFlashing
        key={`${side}-joint-${jointIndex}-${intervalIndex}`}
        side={side}
        axisPosition={axisPosition}
        start={interval.start}
        end={interval.end}
        config={config}
        material={material}
      />
    ));
  });
}

const ROW_SEAM_HEIGHT_M = 0.02;
const ROW_SEAM_DEPTH_M = 0.006;
const ROW_SEAM_OFFSET_M = 0.0055;

function rowSeamTransform(side, config, intervalStart, intervalEnd, level) {
  const { widthM, lengthM } = config.dimensions;
  const center = (intervalStart + intervalEnd) / 2;
  const run = intervalEnd - intervalStart;

  if (side === "front") {
    return { position: [center, level, lengthM / 2 + ROW_SEAM_OFFSET_M], args: [run, ROW_SEAM_HEIGHT_M, ROW_SEAM_DEPTH_M] };
  }
  if (side === "back") {
    return { position: [center, level, -lengthM / 2 - ROW_SEAM_OFFSET_M], args: [run, ROW_SEAM_HEIGHT_M, ROW_SEAM_DEPTH_M] };
  }
  if (side === "left") {
    return { position: [-widthM / 2 - ROW_SEAM_OFFSET_M, level, center], args: [ROW_SEAM_DEPTH_M, ROW_SEAM_HEIGHT_M, run] };
  }
  return { position: [widthM / 2 + ROW_SEAM_OFFSET_M, level, center], args: [ROW_SEAM_DEPTH_M, ROW_SEAM_HEIGHT_M, run] };
}

// Poziome zamki miedzy pasami plyt (laczenie pioro-wpust co 1 m modul).
function PanelRowSeams({ length, side, config }) {
  if (config.viewMode === "structure") return null;

  const color = getCladdingColor(config.cladding);
  const seamColor = new Color(color.hex).lerp(new Color("#0d1218"), 0.45);
  const openingRects = wallOpeningRects(config, side);
  const maxTop = wallMaxHeight(side, config);
  const baseIntervals = sideNeedsRidgeSplit(side, config)
    ? [[-length / 2, 0], [0, length / 2]]
    : [[-length / 2, length / 2]];

  const levels = [];
  for (let level = HORIZONTAL_PANEL_HEIGHT_M; level < maxTop; level += HORIZONTAL_PANEL_HEIGHT_M) {
    levels.push(level);
  }

  return levels.flatMap((level) =>
    baseIntervals.flatMap(([intervalStart, intervalEnd], intervalIndex) => {
      const cuts = openingRects
        .filter((rect) => rect.y0 < level - 0.03 && rect.y1 > level + 0.03)
        .map((rect) => [rect.x0, rect.x1])
        .sort((a, b) => a[0] - b[0]);

      const segments = [];
      let cursor = intervalStart;
      cuts.forEach(([cutStart, cutEnd]) => {
        const a = Math.max(intervalStart, cutStart);
        const b = Math.min(intervalEnd, cutEnd);
        if (b <= cursor) return;
        if (a - cursor > 0.03) segments.push([cursor, a]);
        cursor = Math.max(cursor, b);
      });
      if (intervalEnd - cursor > 0.03) segments.push([cursor, intervalEnd]);

      return segments.map(([segmentStart, segmentEnd], segmentIndex) => {
        const transform = rowSeamTransform(side, config, segmentStart, segmentEnd, level);
        const clippingPlane = wallCutPlane(side, config, segmentStart, segmentEnd);
        return (
          <mesh
            key={`${side}-row-seam-${level}-${intervalIndex}-${segmentIndex}`}
            name={`${side}-panel-row-seam`}
            position={transform.position}
          >
            <boxGeometry args={transform.args} />
            <meshStandardMaterial color={seamColor} roughness={0.8} metalness={0.15} clippingPlanes={[clippingPlane]} />
          </mesh>
        );
      });
    }),
  );
}

export function WallPanels({ config }) {
  const profile = getCladdingProfile(config.cladding);
  const { scene } = useGLTF(profile.url);
  const { widthM, lengthM } = config.dimensions;

  return (
    <group name="wall-panels">
      <WallCore config={config} />
      <HorizontalPanelRun scene={scene} length={widthM} side="front" config={config} />
      <HorizontalPanelRun scene={scene} length={widthM} side="back" config={config} />
      <HorizontalPanelRun scene={scene} length={lengthM} side="left" config={config} />
      <HorizontalPanelRun scene={scene} length={lengthM} side="right" config={config} />
      <group name="horizontal-panel-row-seams">
        <PanelRowSeams length={widthM} side="front" config={config} />
        <PanelRowSeams length={widthM} side="back" config={config} />
        <PanelRowSeams length={lengthM} side="left" config={config} />
        <PanelRowSeams length={lengthM} side="right" config={config} />
      </group>
      <group name="horizontal-panel-joint-flashings">
        <PanelJointFlashings length={widthM} side="front" config={config} />
        <PanelJointFlashings length={widthM} side="back" config={config} />
        <PanelJointFlashings length={lengthM} side="left" config={config} />
        <PanelJointFlashings length={lengthM} side="right" config={config} />
      </group>
    </group>
  );
}

Object.values(WALL_PROFILES).forEach((profile) => useGLTF.preload(profile.url));
