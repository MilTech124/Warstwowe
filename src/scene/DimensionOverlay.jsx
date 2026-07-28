import { Html } from "@react-three/drei";
import { Beam } from "@/scene/Beam";
import { roofFootprint, roofMetrics } from "@/scene/geometry";
import { materials } from "@/scene/materials";
import { OpeningDimensions } from "@/scene/OpeningDimensions";
import { frontProjectionDepth } from "@/scene/frontProjectionMath";

// Grubość belek miarek — czytelne z typowej odległości kamery.
const BAR = 0.016;
const BAR_END = 0.012;
// Miarki blisko obrysu budynku (przyklejone), a nie daleko na podłożu.
const DIMENSION_CLEARANCE = 0.18;
const FOUNDATION_OVERHANG = 0.35;
const GROUND_Y = 0.12;

function DimensionLabel({ position, text }) {
  return (
    <Html position={position} center distanceFactor={5} zIndexRange={[50, 0]} prepend>
      <div className="dimension-label-3d">{text}</div>
    </Html>
  );
}

function outsidePositiveEdge(bodyHalf, roofCenter, roofSize) {
  return Math.max(bodyHalf + FOUNDATION_OVERHANG, roofCenter + roofSize / 2) + DIMENSION_CLEARANCE;
}

function outsideNegativeEdge(bodyHalf, roofCenter, roofSize) {
  return Math.min(-bodyHalf - FOUNDATION_OVERHANG, roofCenter - roofSize / 2) - DIMENSION_CLEARANCE;
}

function WidthMeasure({ widthM, z }) {
  return (
    <group name="width-measure">
      <Beam start={[-widthM / 2, GROUND_Y, z]} end={[widthM / 2, GROUND_Y, z]} size={BAR} material={materials.dimension} />
      <Beam start={[-widthM / 2, 0.02, z]} end={[-widthM / 2, 0.3, z]} size={BAR_END} material={materials.dimension} />
      <Beam start={[widthM / 2, 0.02, z]} end={[widthM / 2, 0.3, z]} size={BAR_END} material={materials.dimension} />
      <DimensionLabel position={[0, GROUND_Y + 0.16, z]} text={`${widthM.toFixed(1)} m`} />
    </group>
  );
}

function LengthMeasure({ lengthM, x }) {
  return (
    <group name="length-measure">
      <Beam start={[x, GROUND_Y, -lengthM / 2]} end={[x, GROUND_Y, lengthM / 2]} size={BAR} material={materials.dimension} />
      <Beam start={[x, 0.02, -lengthM / 2]} end={[x, 0.3, -lengthM / 2]} size={BAR_END} material={materials.dimension} />
      <Beam start={[x, 0.02, lengthM / 2]} end={[x, 0.3, lengthM / 2]} size={BAR_END} material={materials.dimension} />
      <DimensionLabel position={[x, GROUND_Y + 0.16, 0]} text={`${lengthM.toFixed(1)} m`} />
    </group>
  );
}

function ProjectionMeasure({ lengthM, depthM, x }) {
  const zStart = lengthM / 2;
  const zEnd = zStart + depthM;
  return (
    <group name="front-projection-depth-measure">
      <Beam start={[x, GROUND_Y, zStart]} end={[x, GROUND_Y, zEnd]} size={BAR} material={materials.dimension} />
      <Beam start={[x, 0.02, zStart]} end={[x, 0.3, zStart]} size={BAR_END} material={materials.dimension} />
      <Beam start={[x, 0.02, zEnd]} end={[x, 0.3, zEnd]} size={BAR_END} material={materials.dimension} />
      <DimensionLabel position={[x, GROUND_Y + 0.16, (zStart + zEnd) / 2]} text={`Wypust ${depthM.toFixed(2)} m`} />
    </group>
  );
}

function HeightMeasure({ name, heightM, x, z, capAxis = "x", labelSide = 1 }) {
  const endLen = 0.18;
  const bottomCapStart = capAxis === "x" ? [x - endLen / 2, 0, z] : [x, 0, z - endLen / 2];
  const bottomCapEnd = capAxis === "x" ? [x + endLen / 2, 0, z] : [x, 0, z + endLen / 2];
  const topCapStart = capAxis === "x" ? [x - endLen / 2, heightM, z] : [x, heightM, z - endLen / 2];
  const topCapEnd = capAxis === "x" ? [x + endLen / 2, heightM, z] : [x, heightM, z + endLen / 2];
  const labelPosition = capAxis === "x" ? [x + 0.12 * labelSide, heightM / 2, z] : [x, heightM / 2, z + 0.12 * labelSide];

  return (
    <group name={name}>
      <Beam start={[x, 0, z]} end={[x, heightM, z]} size={BAR} material={materials.dimension} />
      <Beam start={bottomCapStart} end={bottomCapEnd} size={BAR_END} material={materials.dimension} />
      <Beam start={topCapStart} end={topCapEnd} size={BAR_END} material={materials.dimension} />
      <DimensionLabel position={labelPosition} text={`${heightM.toFixed(1)} m`} />
    </group>
  );
}

function heightMeasuresForRoof(config, edges) {
  const { wallHeightM } = config.dimensions;
  const highHeightM = roofMetrics(config).ridgeHeight;
  const type = config.roof.type;

  if (type === "single_back") {
    return [
      { name: "height-low-back", heightM: wallHeightM, x: edges.positiveX, z: edges.negativeZ, capAxis: "x", labelSide: 1 },
      { name: "height-high-front", heightM: highHeightM, x: edges.positiveX, z: edges.positiveZ, capAxis: "x", labelSide: 1 },
    ];
  }
  if (type === "single_front") {
    return [
      { name: "height-low-front", heightM: wallHeightM, x: edges.positiveX, z: edges.positiveZ, capAxis: "x", labelSide: 1 },
      { name: "height-high-back", heightM: highHeightM, x: edges.positiveX, z: edges.negativeZ, capAxis: "x", labelSide: 1 },
    ];
  }
  if (type === "single_right") {
    return [
      { name: "height-low-right", heightM: wallHeightM, x: edges.positiveX, z: edges.positiveZ, capAxis: "z", labelSide: 1 },
      { name: "height-high-left", heightM: highHeightM, x: edges.negativeX, z: edges.positiveZ, capAxis: "z", labelSide: 1 },
    ];
  }
  if (type === "single_left") {
    return [
      { name: "height-low-left", heightM: wallHeightM, x: edges.negativeX, z: edges.positiveZ, capAxis: "z", labelSide: 1 },
      { name: "height-high-right", heightM: highHeightM, x: edges.positiveX, z: edges.positiveZ, capAxis: "z", labelSide: 1 },
    ];
  }

  if (type === "gable_front_back") {
    return [
      { name: "height-wall", heightM: wallHeightM, x: edges.positiveX, z: edges.positiveZ, capAxis: "x", labelSide: 1 },
      { name: "height-ridge", heightM: highHeightM, x: edges.positiveX, z: 0, capAxis: "x", labelSide: 1 },
    ];
  }

  return [
    { name: "height-wall", heightM: wallHeightM, x: edges.positiveX, z: edges.positiveZ, capAxis: "x", labelSide: 1 },
    { name: "height-ridge", heightM: highHeightM, x: 0, z: edges.positiveZ, capAxis: "x", labelSide: 1 },
  ];
}

export function DimensionOverlay({ config }) {
  const { widthM, lengthM } = config.dimensions;
  const footprint = roofFootprint(config);
  const outsideX = outsidePositiveEdge(widthM / 2, footprint.centerX, footprint.roofWidth);
  const outsideZ = outsidePositiveEdge(lengthM / 2, footprint.centerZ, footprint.roofLength);
  const edges = {
    positiveX: outsideX,
    negativeX: outsideNegativeEdge(widthM / 2, footprint.centerX, footprint.roofWidth),
    positiveZ: outsideZ,
    negativeZ: outsideNegativeEdge(lengthM / 2, footprint.centerZ, footprint.roofLength),
  };
  const heightMeasures = heightMeasuresForRoof(config, edges);
  const projectionDepthM = frontProjectionDepth(config);

  return (
    <group name="dimension-overlay">
      <WidthMeasure widthM={widthM} z={outsideZ} />
      <LengthMeasure lengthM={lengthM} x={outsideX} />
      {projectionDepthM > 0 && (
        <ProjectionMeasure lengthM={lengthM} depthM={projectionDepthM} x={outsideX + 0.28} />
      )}
      {heightMeasures.map((measure) => <HeightMeasure key={measure.name} {...measure} />)}
      {config.viewMode === "full" && <OpeningDimensions config={config} />}
    </group>
  );
}
