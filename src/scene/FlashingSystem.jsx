import { FLASHING_COLORS, getRoofCladdingColor } from "@/config/catalog";
import { roofFootprint, roofMetrics, slopedRoofLength, wallTopHeightAt } from "@/scene/geometry";
import { paintedMetalProps } from "@/scene/materials";

const SHEET_THICKNESS = 0.012;
const ROOF_EDGE_FLASHING_Y = 0.07;

function flashingMaterial(config) {
  const color = config.flashings.color === "roof_match"
    ? getRoofCladdingColor(config.cladding).hex
    : FLASHING_COLORS[config.flashings.color]?.hex || getRoofCladdingColor(config.cladding).hex;

  return paintedMetalProps(color, "flashing");
}

function Sheet({ name, position, rotation = [0, 0, 0], args, material }) {
  return (
    <mesh name={name} position={position} rotation={rotation} castShadow receiveShadow>
      <boxGeometry args={args} />
      <meshPhysicalMaterial {...material} />
    </mesh>
  );
}

// Listwa cokolowa u podstawy plyt, przerwana na bramach i drzwiach.
function BaseFlashings({ config, material }) {
  const { widthM, lengthM } = config.dimensions;
  const height = config.flashings.package === "premium" ? 0.12 : 0.09;
  const offset = 0.016;
  const dripDepth = 0.024;

  const sides = [
    { side: "front", length: widthM, sign: 1 },
    { side: "back", length: widthM, sign: -1 },
    { side: "left", length: lengthM, sign: -1 },
    { side: "right", length: lengthM, sign: 1 },
  ];

  return (
    <group name="base-flashings">
      {sides.map(({ side, length, sign }) => {
        const cuts = config.openings
          .filter((opening) => opening.wall === side && opening.sillM < 0.12)
          .map((opening) => {
            const axisSign = side === "back" || side === "left" ? -1 : 1;
            const center = axisSign * opening.offsetM;
            return [center - opening.widthM / 2 - 0.02, center + opening.widthM / 2 + 0.02];
          })
          .sort((a, b) => a[0] - b[0]);

        const segments = [];
        let cursor = -length / 2;
        cuts.forEach(([cutStart, cutEnd]) => {
          if (cutStart - cursor > 0.05) segments.push([cursor, cutStart]);
          cursor = Math.max(cursor, cutEnd);
        });
        if (length / 2 - cursor > 0.05) segments.push([cursor, length / 2]);

        return segments.map(([segmentStart, segmentEnd], index) => {
          const center = (segmentStart + segmentEnd) / 2;
          const run = segmentEnd - segmentStart;
          const facePosition = side === "front" || side === "back"
            ? [center, height / 2 + 0.004, sign * (lengthM / 2 + offset)]
            : [sign * (widthM / 2 + offset), height / 2 + 0.004, center];
          const faceArgs = side === "front" || side === "back"
            ? [run, height, SHEET_THICKNESS]
            : [SHEET_THICKNESS, height, run];
          const dripPosition = side === "front" || side === "back"
            ? [center, 0.008, sign * (lengthM / 2 + offset + dripDepth / 2)]
            : [sign * (widthM / 2 + offset + dripDepth / 2), 0.008, center];
          const dripArgs = side === "front" || side === "back"
            ? [run, SHEET_THICKNESS, dripDepth]
            : [dripDepth, SHEET_THICKNESS, run];

          return (
            <group key={`${side}-base-flashing-${index}`} name={`${side}-base-flashing`}>
              <Sheet name={`${side}-base-flashing-face`} position={facePosition} args={faceArgs} material={material} />
              <Sheet name={`${side}-base-flashing-drip`} position={dripPosition} args={dripArgs} material={material} />
            </group>
          );
        });
      })}
    </group>
  );
}

function CornerFlashings({ config, material, width }) {
  if (!config.flashings.corners) return null;

  const { widthM, lengthM } = config.dimensions;
  const leg = width;
  const corners = [
    { name: "front-left", x: -widthM / 2 - 0.018, z: lengthM / 2 + 0.018, xIn: 1, zIn: -1, sides: ["front", "left"], offsets: [-widthM / 2, lengthM / 2] },
    { name: "front-right", x: widthM / 2 + 0.018, z: lengthM / 2 + 0.018, xIn: -1, zIn: -1, sides: ["front", "right"], offsets: [widthM / 2, lengthM / 2] },
    { name: "back-left", x: -widthM / 2 - 0.018, z: -lengthM / 2 - 0.018, xIn: 1, zIn: 1, sides: ["back", "left"], offsets: [-widthM / 2, -lengthM / 2] },
    { name: "back-right", x: widthM / 2 + 0.018, z: -lengthM / 2 - 0.018, xIn: -1, zIn: 1, sides: ["back", "right"], offsets: [widthM / 2, -lengthM / 2] },
  ];

  return (
    <group name="corner-flashings">
      {corners.map((corner) => {
        const height = Math.max(
          wallTopHeightAt(corner.sides[0], corner.offsets[0], config),
          wallTopHeightAt(corner.sides[1], corner.offsets[1], config),
        );
        return (
          <group key={corner.name} name={`corner-flashing-${corner.name}`}>
            <Sheet name={`${corner.name}-wall-face-return`} position={[corner.x + (corner.xIn * leg) / 2, height / 2, corner.z]} args={[leg, height, SHEET_THICKNESS]} material={material} />
            <Sheet name={`${corner.name}-side-face-return`} position={[corner.x, height / 2, corner.z + (corner.zIn * leg) / 2]} args={[SHEET_THICKNESS, height, leg]} material={material} />
          </group>
        );
      })}
    </group>
  );
}

function EaveFlashing({ name, side, width, length, material, edgeWidth, inset = 0 }) {
  const direction = side === "front" ? 1 : -1;
  const lip = edgeWidth * 0.92;
  const apron = edgeWidth * 1.7;
  const hem = edgeWidth * 0.28;
  const clearWidth = Math.max(0.2, width - inset * 2);
  const y = ROOF_EDGE_FLASHING_Y;
  const z = direction * length / 2;

  return (
    <group name={`${name}-${side}-eave-flashing`}>
      <Sheet name={`${name}-${side}-eave-top-leg`} position={[0, y, z - direction * lip / 2]} args={[clearWidth, SHEET_THICKNESS, lip]} material={material} />
      <Sheet name={`${name}-${side}-eave-apron`} position={[0, y - apron / 2, z + direction * SHEET_THICKNESS / 2]} args={[clearWidth, apron, SHEET_THICKNESS]} material={material} />
      <Sheet name={`${name}-${side}-eave-drip-hem`} position={[0, y - apron, z + direction * hem / 2]} args={[clearWidth, SHEET_THICKNESS, hem]} material={material} />
    </group>
  );
}

function VergeFlashing({ name, side, width, length, material, edgeWidth, inset = 0 }) {
  const direction = side === "right" ? 1 : -1;
  const topLeg = edgeWidth * 0.92;
  const face = edgeWidth * 1.95;
  const returnLip = edgeWidth * 0.34;
  const clearLength = Math.max(0.2, length - inset * 2);
  const y = ROOF_EDGE_FLASHING_Y;
  const x = direction * width / 2;

  return (
    <group name={`${name}-${side}-verge-flashing`}>
      <Sheet name={`${name}-${side}-verge-top-leg`} position={[x - direction * topLeg / 2, y, 0]} args={[topLeg, SHEET_THICKNESS, clearLength]} material={material} />
      <Sheet name={`${name}-${side}-verge-face`} position={[x + direction * SHEET_THICKNESS / 2, y - face / 2, 0]} args={[SHEET_THICKNESS, face, clearLength]} material={material} />
      <Sheet name={`${name}-${side}-verge-return-lip`} position={[x - direction * returnLip / 2, y - face, 0]} args={[returnLip, SHEET_THICKNESS, clearLength]} material={material} />
    </group>
  );
}

function RoofEdgeSet({ name, width, length, position, rotation, material, edgeWidth, edges = {} }) {
  const visibleEdges = {
    front: true,
    back: true,
    left: true,
    right: true,
    ...edges,
  };

  const eaveInset = -edgeWidth * 0.08;
  const vergeInset = -edgeWidth * 0.08;

  return (
    <group name={name} position={position} rotation={rotation}>
      {visibleEdges.front && <EaveFlashing name={name} side="front" width={width} length={length} material={material} edgeWidth={edgeWidth} inset={visibleEdges.left || visibleEdges.right ? eaveInset : 0} />}
      {visibleEdges.back && <EaveFlashing name={name} side="back" width={width} length={length} material={material} edgeWidth={edgeWidth} inset={visibleEdges.left || visibleEdges.right ? eaveInset : 0} />}
      {visibleEdges.left && <VergeFlashing name={name} side="left" width={width} length={length} material={material} edgeWidth={edgeWidth} inset={visibleEdges.front || visibleEdges.back ? vergeInset : 0} />}
      {visibleEdges.right && <VergeFlashing name={name} side="right" width={width} length={length} material={material} edgeWidth={edgeWidth} inset={visibleEdges.front || visibleEdges.back ? vergeInset : 0} />}
    </group>
  );
}

function RidgeCap({ name, position, length, direction, material, width, roofAngle }) {
  const capWidth = width * 1.62;
  const crownWidth = SHEET_THICKNESS * 2;
  const sideWing = (capWidth - crownWidth) / 2 + SHEET_THICKNESS * 1.2;
  const crestHeight = SHEET_THICKNESS * 2.1;
  const creaseOffset = crownWidth / 2;
  const wingOverlap = width * 0.12;
  const wingStart = creaseOffset - wingOverlap;
  const wingAngle = Math.max(0.18, roofAngle);
  const horizontal = direction === "x";

  return (
    <group name={name} position={position}>
      <Sheet
        name={`${name}-crown-flat`}
        position={[0, crestHeight, 0]}
        args={horizontal ? [length, SHEET_THICKNESS, crownWidth] : [crownWidth, SHEET_THICKNESS, length]}
        material={material}
      />
      <Sheet
        name={`${name}-left-wing`}
        position={horizontal ? [0, crestHeight - SHEET_THICKNESS, -wingStart - sideWing / 2] : [-wingStart - sideWing / 2, crestHeight - SHEET_THICKNESS, 0]}
        rotation={horizontal ? [-wingAngle, 0, 0] : [0, 0, wingAngle]}
        args={horizontal ? [length, SHEET_THICKNESS, sideWing] : [sideWing, SHEET_THICKNESS, length]}
        material={material}
      />
      <Sheet
        name={`${name}-right-wing`}
        position={horizontal ? [0, crestHeight - SHEET_THICKNESS, wingStart + sideWing / 2] : [wingStart + sideWing / 2, crestHeight - SHEET_THICKNESS, 0]}
        rotation={horizontal ? [wingAngle, 0, 0] : [0, 0, -wingAngle]}
        args={horizontal ? [length, SHEET_THICKNESS, sideWing] : [sideWing, SHEET_THICKNESS, length]}
        material={material}
      />
    </group>
  );
}

function RoofFlashings({ config, material, edgeWidth }) {
  if (!config.flashings.roofEdges && !config.flashings.ridge) return null;

  const { widthM, lengthM, wallHeightM } = config.dimensions;
  const metrics = roofMetrics(config);
  const { centerX, centerZ, roofWidth, roofLength, frontRun, backRun, leftRun, rightRun } = roofFootprint(config);

  if (config.roof.type === "single_back" || config.roof.type === "single_front") {
    const angle = config.roof.type === "single_back" ? -metrics.angle : metrics.angle;
    const t = (centerZ + lengthM / 2) / lengthM;
    const visibleY = wallHeightM + (config.roof.type === "single_back" ? t : 1 - t) * metrics.rise - 0.004;
    return config.flashings.roofEdges && (
      <RoofEdgeSet name="single-slope-roof-flashings" width={roofWidth} length={roofLength} position={[centerX, visibleY, centerZ]} rotation={[angle, 0, 0]} material={material} edgeWidth={edgeWidth} />
    );
  }

  if (config.roof.type === "single_right" || config.roof.type === "single_left") {
    const angle = config.roof.type === "single_right" ? -metrics.angle : metrics.angle;
    const t = (centerX + widthM / 2) / widthM;
    const visibleY = wallHeightM + (config.roof.type === "single_left" ? t : 1 - t) * metrics.rise - 0.004;
    return config.flashings.roofEdges && (
      <RoofEdgeSet name="side-slope-roof-flashings" width={roofWidth} length={roofLength} position={[centerX, visibleY, centerZ]} rotation={[0, 0, angle]} material={material} edgeWidth={edgeWidth} />
    );
  }

  if (config.roof.type === "gable_front_back") {
    const frontSlabLength = slopedRoofLength(frontRun, metrics.angle);
    const backSlabLength = slopedRoofLength(backRun, metrics.angle);
    const visibleY = wallHeightM + metrics.rise / 2 - 0.004;
    return (
      <group name="gable-front-back-flashings">
        {config.flashings.roofEdges && (
          <>
            <RoofEdgeSet name="gable-front-roof-flashings" width={roofWidth} length={frontSlabLength} position={[centerX, visibleY, frontRun / 2]} rotation={[-metrics.angle, 0, 0]} material={material} edgeWidth={edgeWidth} edges={{ back: false }} />
            <RoofEdgeSet name="gable-back-roof-flashings" width={roofWidth} length={backSlabLength} position={[centerX, visibleY, -backRun / 2]} rotation={[metrics.angle, 0, 0]} material={material} edgeWidth={edgeWidth} edges={{ front: false }} />
          </>
        )}
        {config.flashings.ridge && <RidgeCap name="ridge-flashing-cap" position={[centerX, wallHeightM + metrics.rise + 0.045, 0]} length={roofWidth + edgeWidth * 0.1} direction="x" material={material} width={edgeWidth} roofAngle={metrics.angle} />}
      </group>
    );
  }

  const rightSlabWidth = slopedRoofLength(rightRun, metrics.angle);
  const leftSlabWidth = slopedRoofLength(leftRun, metrics.angle);
  const visibleY = wallHeightM + metrics.rise / 2 - 0.004;
  return (
    <group name="gable-left-right-flashings">
      {config.flashings.roofEdges && (
        <>
          <RoofEdgeSet name="gable-right-roof-flashings" width={rightSlabWidth} length={roofLength} position={[rightRun / 2, visibleY, centerZ]} rotation={[0, 0, -metrics.angle]} material={material} edgeWidth={edgeWidth} edges={{ left: false }} />
          <RoofEdgeSet name="gable-left-roof-flashings" width={leftSlabWidth} length={roofLength} position={[-leftRun / 2, visibleY, centerZ]} rotation={[0, 0, metrics.angle]} material={material} edgeWidth={edgeWidth} edges={{ right: false }} />
        </>
      )}
      {config.flashings.ridge && <RidgeCap name="ridge-flashing-cap" position={[0, wallHeightM + metrics.rise + 0.045, centerZ]} length={roofLength + edgeWidth * 0.1} direction="z" material={material} width={edgeWidth} roofAngle={metrics.angle} />}
    </group>
  );
}

export function FlashingSystem({ config }) {
  if (!config.flashings?.enabled || config.viewMode === "structure") {
    return null;
  }

  const material = flashingMaterial(config);
  // Smuklejsze obrobki krawedzi dachu (okap, wiatrownice, kalenica skaluja sie
  // z edgeWidth, wiec zmniejszamy je proporcjonalnie i spojnie).
  const edgeWidth = config.flashings.package === "premium" ? 0.14 : 0.10;
  const panelBasedLeg = config.cladding.wallPirThicknessMm / 1000 + 0.06;
  const cornerWidth = config.flashings.package === "premium"
    ? Math.max(0.18, panelBasedLeg + 0.04)
    : Math.max(0.15, panelBasedLeg);

  return (
    <group name="garage-flashings">
      <BaseFlashings config={config} material={material} />
      <CornerFlashings config={config} material={material} width={cornerWidth} />
      <RoofFlashings config={config} material={material} edgeWidth={edgeWidth} />
    </group>
  );
}
