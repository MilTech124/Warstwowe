import { Html } from "@react-three/drei";
import { Beam } from "@/scene/Beam";
import { materials } from "@/scene/materials";

function DimensionLabel({ position, text }) {
  return (
    <Html position={position} center distanceFactor={12}>
      <div className="dimension-label-3d">{text}</div>
    </Html>
  );
}

function WidthMeasure({ widthM, lengthM }) {
  const z = lengthM / 2 + 0.42;
  const y = 0.22;
  return (
    <group name="width-measure">
      <Beam start={[-widthM / 2, y, z]} end={[widthM / 2, y, z]} size={0.035} material={materials.dimension} />
      <Beam start={[-widthM / 2, 0.02, z]} end={[-widthM / 2, 0.48, z]} size={0.03} material={materials.dimension} />
      <Beam start={[widthM / 2, 0.02, z]} end={[widthM / 2, 0.48, z]} size={0.03} material={materials.dimension} />
      <Beam start={[-widthM / 2, y, lengthM / 2]} end={[-widthM / 2, y, z]} size={0.022} material={materials.dimension} />
      <Beam start={[widthM / 2, y, lengthM / 2]} end={[widthM / 2, y, z]} size={0.022} material={materials.dimension} />
      <DimensionLabel position={[0, y + 0.25, z]} text={`Szerokość ${widthM.toFixed(1)} m`} />
    </group>
  );
}

function LengthMeasure({ widthM, lengthM }) {
  const x = widthM / 2 + 0.42;
  const y = 0.22;
  return (
    <group name="length-measure">
      <Beam start={[x, y, -lengthM / 2]} end={[x, y, lengthM / 2]} size={0.035} material={materials.dimension} />
      <Beam start={[x, 0.02, -lengthM / 2]} end={[x, 0.48, -lengthM / 2]} size={0.03} material={materials.dimension} />
      <Beam start={[x, 0.02, lengthM / 2]} end={[x, 0.48, lengthM / 2]} size={0.03} material={materials.dimension} />
      <Beam start={[widthM / 2, y, -lengthM / 2]} end={[x, y, -lengthM / 2]} size={0.022} material={materials.dimension} />
      <Beam start={[widthM / 2, y, lengthM / 2]} end={[x, y, lengthM / 2]} size={0.022} material={materials.dimension} />
      <DimensionLabel position={[x, y + 0.25, 0]} text={`Długość ${lengthM.toFixed(1)} m`} />
    </group>
  );
}

function HeightMeasure({ widthM, lengthM, wallHeightM }) {
  const x = widthM / 2 + 0.28;
  const z = lengthM / 2 + 0.28;
  return (
    <group name="height-measure">
      <Beam start={[x, 0, z]} end={[x, wallHeightM, z]} size={0.035} material={materials.dimension} />
      <Beam start={[x - 0.22, 0, z]} end={[x + 0.22, 0, z]} size={0.03} material={materials.dimension} />
      <Beam start={[x - 0.22, wallHeightM, z]} end={[x + 0.22, wallHeightM, z]} size={0.03} material={materials.dimension} />
      <Beam start={[widthM / 2, wallHeightM, lengthM / 2]} end={[x, wallHeightM, z]} size={0.022} material={materials.dimension} />
      <DimensionLabel position={[x + 0.15, wallHeightM / 2, z]} text={`Wysokość ${wallHeightM.toFixed(1)} m`} />
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
    </group>
  );
}
