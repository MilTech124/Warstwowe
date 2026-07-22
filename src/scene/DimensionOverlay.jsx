import { Html } from "@react-three/drei";
import { Beam } from "@/scene/Beam";
import { materials } from "@/scene/materials";
import { OpeningDimensions } from "@/scene/OpeningDimensions";

// Grubość belek miarek — czytelne z typowej odległości kamery.
const BAR = 0.016;
const BAR_END = 0.012;
// Miarki blisko obrysu budynku (przyklejone), a nie daleko na podłożu.
const GAP = 0.14;
const GROUND_Y = 0.12;

function DimensionLabel({ position, text }) {
  return (
    <Html position={position} center distanceFactor={5} zIndexRange={[50, 0]} prepend>
      <div className="dimension-label-3d">{text}</div>
    </Html>
  );
}

function WidthMeasure({ widthM, lengthM }) {
  const z = lengthM / 2 + GAP;
  return (
    <group name="width-measure">
      <Beam start={[-widthM / 2, GROUND_Y, z]} end={[widthM / 2, GROUND_Y, z]} size={BAR} material={materials.dimension} />
      <Beam start={[-widthM / 2, 0.02, z]} end={[-widthM / 2, 0.3, z]} size={BAR_END} material={materials.dimension} />
      <Beam start={[widthM / 2, 0.02, z]} end={[widthM / 2, 0.3, z]} size={BAR_END} material={materials.dimension} />
      <DimensionLabel position={[0, GROUND_Y + 0.16, z]} text={`${widthM.toFixed(1)} m`} />
    </group>
  );
}

function LengthMeasure({ widthM, lengthM }) {
  const x = widthM / 2 + GAP;
  return (
    <group name="length-measure">
      <Beam start={[x, GROUND_Y, -lengthM / 2]} end={[x, GROUND_Y, lengthM / 2]} size={BAR} material={materials.dimension} />
      <Beam start={[x, 0.02, -lengthM / 2]} end={[x, 0.3, -lengthM / 2]} size={BAR_END} material={materials.dimension} />
      <Beam start={[x, 0.02, lengthM / 2]} end={[x, 0.3, lengthM / 2]} size={BAR_END} material={materials.dimension} />
      <DimensionLabel position={[x, GROUND_Y + 0.16, 0]} text={`${lengthM.toFixed(1)} m`} />
    </group>
  );
}

function HeightMeasure({ widthM, lengthM, wallHeightM }) {
  const x = widthM / 2 + GAP;
  const z = lengthM / 2 + GAP;
  const endLen = 0.18;
  return (
    <group name="height-measure">
      <Beam start={[x, 0, z]} end={[x, wallHeightM, z]} size={BAR} material={materials.dimension} />
      <Beam start={[x - endLen / 2, 0, z]} end={[x + endLen / 2, 0, z]} size={BAR_END} material={materials.dimension} />
      <Beam start={[x - endLen / 2, wallHeightM, z]} end={[x + endLen / 2, wallHeightM, z]} size={BAR_END} material={materials.dimension} />
      <DimensionLabel position={[x + 0.12, wallHeightM / 2, z]} text={`${wallHeightM.toFixed(1)} m`} />
    </group>
  );
}

export function DimensionOverlay({ config }) {
  const { widthM, lengthM, wallHeightM } = config.dimensions;
  return (
    <group name="dimension-overlay">
      <WidthMeasure widthM={widthM} lengthM={lengthM} />
      <LengthMeasure widthM={widthM} lengthM={lengthM} />
      <HeightMeasure widthM={widthM} lengthM={lengthM} wallHeightM={wallHeightM} />
      {config.viewMode === "full" && <OpeningDimensions config={config} />}
    </group>
  );
}
