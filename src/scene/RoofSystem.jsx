import { Clone, useGLTF } from "@react-three/drei";
import { Color } from "three";
import { getRoofCladdingColor } from "@/config/catalog";
import { roofFootprint, roofMetrics, slopedRoofLength } from "@/scene/geometry";
import { materials } from "@/scene/materials";

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

function RoofPanelGrid({ scene, width, length, material, panelAxis }) {
  const panelsRunAlongX = panelAxis === "x";
  const xCount = Math.max(1, Math.ceil(width / (panelsRunAlongX ? 3 : 1)));
  const zCount = Math.max(1, Math.ceil(length / (panelsRunAlongX ? 1 : 3)));
  const xSegment = width / xCount;
  const zSegment = length / zCount;

  return (
    <group name="roof-cladding-sheets" position={[0, ROOF_PANEL_BASE_Y, 0]}>
      {Array.from({ length: xCount }, (_, xIndex) =>
        Array.from({ length: zCount }, (_, zIndex) => {
          const x = -width / 2 + xSegment * xIndex + xSegment / 2;
          const z = -length / 2 + zSegment * zIndex + zSegment / 2;
          return (
            <Clone
              key={`${xIndex}-${zIndex}`}
              object={scene}
              position={[x, 0, z]}
              rotation={panelsRunAlongX ? [0, Math.PI / 2, 0] : [0, 0, 0]}
              scale={panelsRunAlongX ? [zSegment, 1, xSegment / 3] : [xSegment, 1, zSegment / 3]}
              inject={
                <meshStandardMaterial
                  color={material.color}
                  roughness={material.roughness}
                  metalness={material.metalness}
                  transparent={material.transparent}
                  opacity={material.opacity}
                />
              }
            />
          );
        }),
      )}
      <RoofPanelSeams width={width} length={length} xCount={xCount} zCount={zCount} material={material} panelAxis={panelAxis} />
    </group>
  );
}

function RoofAssembly({ scene, width, length, position, rotation, name, material, coreThickness, panelAxis }) {
  return (
    <group name={name} position={position} rotation={rotation}>
      <mesh name={`${name}-pir-core`} position={[0, -coreThickness / 2, 0]} material={materials.roofCore} castShadow receiveShadow>
        <boxGeometry args={[width, coreThickness, length]} />
      </mesh>
      <RoofPanelGrid scene={scene} width={width} length={length} material={material} panelAxis={panelAxis} />
    </group>
  );
}

function roofPanelAxisForType(roofType) {
  return roofType === "single_left" || roofType === "single_right" || roofType === "gable_left_right"
    ? "x"
    : "z";
}

export function RoofSystem({ config }) {
  const { scene } = useGLTF(ROOF_PANEL_URL);
  const roofColor = getRoofCladdingColor(config.cladding);
  const roofMaterial = config.viewMode === "structure"
    ? materials.roofStructureMode
    : {
      color: roofColor.hex,
      roughness: materials.roof.roughness,
      metalness: materials.roof.metalness,
  };
  const { widthM, lengthM, wallHeightM } = config.dimensions;
  const metrics = roofMetrics(config);
  const { centerX, centerZ, roofWidth, roofLength, frontRun, backRun, leftRun, rightRun } = roofFootprint(config);
  const coreThickness = Math.max(0.06, config.cladding.roofPirThicknessMm / 1000);
  const panelAxis = roofPanelAxisForType(config.roof.type);

  if (config.roof.type === "single_back" || config.roof.type === "single_front") {
    const angle = config.roof.type === "single_back" ? -metrics.angle : metrics.angle;
    const t = (centerZ + lengthM / 2) / lengthM;
    const visibleY = wallHeightM + (config.roof.type === "single_back" ? t : 1 - t) * metrics.rise - 0.03;
    return (
      <group name="roof-root">
        <RoofAssembly scene={scene} name="single-slope-roof" width={roofWidth} length={roofLength} position={[centerX, visibleY, centerZ]} rotation={[angle, 0, 0]} material={roofMaterial} coreThickness={coreThickness} panelAxis={panelAxis} />
      </group>
    );
  }

  if (config.roof.type === "single_right" || config.roof.type === "single_left") {
    const angle = config.roof.type === "single_right" ? -metrics.angle : metrics.angle;
    const t = (centerX + widthM / 2) / widthM;
    const visibleY = wallHeightM + (config.roof.type === "single_left" ? t : 1 - t) * metrics.rise - 0.03;
    return (
      <group name="roof-root">
        <RoofAssembly scene={scene} name="side-slope-roof" width={roofWidth} length={roofLength} position={[centerX, visibleY, centerZ]} rotation={[0, 0, angle]} material={roofMaterial} coreThickness={coreThickness} panelAxis={panelAxis} />
      </group>
    );
  }

  if (config.roof.type === "gable_front_back") {
    const frontSlabLength = slopedRoofLength(frontRun, metrics.angle);
    const backSlabLength = slopedRoofLength(backRun, metrics.angle);
    return (
      <group name="roof-root">
        <RoofAssembly scene={scene} name="gable-front-roof" width={roofWidth} length={frontSlabLength} position={[centerX, wallHeightM + metrics.rise / 2 - 0.03, frontRun / 2]} rotation={[-metrics.angle, 0, 0]} material={roofMaterial} coreThickness={coreThickness} panelAxis={panelAxis} />
        <RoofAssembly scene={scene} name="gable-back-roof" width={roofWidth} length={backSlabLength} position={[centerX, wallHeightM + metrics.rise / 2 - 0.03, -backRun / 2]} rotation={[metrics.angle, 0, 0]} material={roofMaterial} coreThickness={coreThickness} panelAxis={panelAxis} />
      </group>
    );
  }

  return (
    <group name="roof-root">
      <RoofAssembly scene={scene} name="gable-right-roof" width={slopedRoofLength(rightRun, metrics.angle)} length={roofLength} position={[rightRun / 2, wallHeightM + metrics.rise / 2 - 0.03, centerZ]} rotation={[0, 0, -metrics.angle]} material={roofMaterial} coreThickness={coreThickness} panelAxis={panelAxis} />
      <RoofAssembly scene={scene} name="gable-left-roof" width={slopedRoofLength(leftRun, metrics.angle)} length={roofLength} position={[-leftRun / 2, wallHeightM + metrics.rise / 2 - 0.03, centerZ]} rotation={[0, 0, metrics.angle]} material={roofMaterial} coreThickness={coreThickness} panelAxis={panelAxis} />
    </group>
  );
}

useGLTF.preload(ROOF_PANEL_URL);
