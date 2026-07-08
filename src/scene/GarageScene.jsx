import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { ContactShadows, Html, OrbitControls, PerspectiveCamera, RoundedBox } from "@react-three/drei";
import { Box, Building2, Home, Warehouse } from "lucide-react";
import { Vector3 } from "three";
import { PRESETS } from "@/config/catalog";
import { useConfiguratorStore } from "@/store/configuratorStore";
import { WallPanels } from "@/scene/WallPanels";
import { RoofSystem } from "@/scene/RoofSystem";
import { FlashingSystem } from "@/scene/FlashingSystem";
import { StructureSystem } from "@/scene/StructureSystem";
import { Openings } from "@/scene/Openings";
import { DimensionOverlay } from "@/scene/DimensionOverlay";
import { ViewerToolbar } from "@/scene/ViewerToolbar";
import { materials } from "@/scene/materials";

const presetIcons = {
  large_hall: Warehouse,
  hall: Building2,
  double_garage: Home,
  single_garage: Box,
};

function CameraRig({ config }) {
  const { camera } = useThree();
  const controlsRef = useRef(null);
  const { widthM, lengthM, wallHeightM } = config.dimensions;
  const radius = Math.max(widthM, lengthM, wallHeightM) * 1.25;

  const view = useMemo(() => {
    if (config.cameraMode === "front") return { position: [0, wallHeightM * 0.75, lengthM / 2 + radius], target: [0, wallHeightM / 2, 0] };
    if (config.cameraMode === "side") return { position: [widthM / 2 + radius, wallHeightM * 0.75, 0], target: [0, wallHeightM / 2, 0] };
    if (config.cameraMode === "top") return { position: [0.001, radius * 1.35, 0.001], target: [0, 0, 0] };
    if (config.cameraMode === "interior") return { position: [0, wallHeightM * 0.8, -lengthM * 0.18], target: [0, wallHeightM * 0.65, lengthM / 2] };
    if (config.cameraMode === "structure") return { position: [widthM * 0.9 + 3, wallHeightM * 0.95 + 2, lengthM * 0.8 + 4], target: [0, wallHeightM / 2, 0] };
    return { position: [widthM * 0.72 + 4, wallHeightM * 0.9 + 2.4, lengthM * 0.8 + 4], target: [0, wallHeightM / 2, 0] };
  }, [config.cameraMode, widthM, lengthM, wallHeightM, radius]);

  useEffect(() => {
    camera.position.set(...view.position);
    camera.lookAt(...view.target);
    if (controlsRef.current) {
      controlsRef.current.target.copy(new Vector3(...view.target));
      controlsRef.current.update();
    }
  }, [camera, view]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      minDistance={2}
      maxDistance={Math.max(20, radius * 2.2)}
      maxPolarAngle={Math.PI * 0.48}
    />
  );
}

function Ground({ config }) {
  const size = Math.max(config.dimensions.widthM, config.dimensions.lengthM) + 8;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.205, 0]} material={materials.siteGround} receiveShadow>
        <planeGeometry args={[size, size]} />
      </mesh>
    </group>
  );
}

function FoundationSlab({ config }) {
  const { widthM, lengthM } = config.dimensions;
  const overhang = 0.35;
  const thickness = 0.18;
  const slabWidth = widthM + overhang * 2;
  const slabLength = lengthM + overhang * 2;
  const jointWidth = 0.018;
  const centerY = -thickness / 2;
  const topY = 0.012;
  const jointCountX = Math.max(0, Math.floor(slabWidth / 4));
  const jointCountZ = Math.max(0, Math.floor(slabLength / 4));
  const stains = [
    { x: -slabWidth * 0.27, z: -slabLength * 0.18, w: slabWidth * 0.22, l: slabLength * 0.16, r: 0.18 },
    { x: slabWidth * 0.18, z: slabLength * 0.24, w: slabWidth * 0.28, l: slabLength * 0.12, r: -0.08 },
    { x: slabWidth * 0.04, z: -slabLength * 0.34, w: slabWidth * 0.18, l: slabLength * 0.1, r: 0.35 },
  ];

  return (
    <group name="foundation-slab">
      <RoundedBox position={[0, centerY, 0]} args={[slabWidth, thickness, slabLength]} radius={0.045} smoothness={3} material={materials.concrete} castShadow receiveShadow />
      <mesh position={[0, centerY - 0.005, slabLength / 2 + 0.002]} material={materials.concreteSide} receiveShadow>
        <boxGeometry args={[slabWidth - 0.08, thickness * 0.82, 0.022]} />
      </mesh>
      <mesh position={[0, centerY - 0.005, -slabLength / 2 - 0.002]} material={materials.concreteSide} receiveShadow>
        <boxGeometry args={[slabWidth - 0.08, thickness * 0.82, 0.022]} />
      </mesh>
      <mesh position={[slabWidth / 2 + 0.002, centerY - 0.005, 0]} material={materials.concreteSide} receiveShadow>
        <boxGeometry args={[0.022, thickness * 0.82, slabLength - 0.08]} />
      </mesh>
      <mesh position={[-slabWidth / 2 - 0.002, centerY - 0.005, 0]} material={materials.concreteSide} receiveShadow>
        <boxGeometry args={[0.022, thickness * 0.82, slabLength - 0.08]} />
      </mesh>
      {Array.from({ length: jointCountX }, (_, index) => {
        const x = -slabWidth / 2 + ((index + 1) * slabWidth) / (jointCountX + 1);
        return (
          <mesh key={`slab-joint-x-${index}`} position={[x, topY, 0]} material={materials.concreteJoint} receiveShadow>
            <boxGeometry args={[jointWidth, 0.006, slabLength - 0.28]} />
          </mesh>
        );
      })}
      {Array.from({ length: jointCountZ }, (_, index) => {
        const z = -slabLength / 2 + ((index + 1) * slabLength) / (jointCountZ + 1);
        return (
          <mesh key={`slab-joint-z-${index}`} position={[0, topY, z]} material={materials.concreteJoint} receiveShadow>
            <boxGeometry args={[slabWidth - 0.28, 0.006, jointWidth]} />
          </mesh>
        );
      })}
      {stains.map((stain, index) => (
        <mesh key={`slab-stain-${index}`} position={[stain.x, topY + 0.002 + index * 0.0005, stain.z]} rotation={[-Math.PI / 2, 0, stain.r]} material={materials.concreteStain} receiveShadow>
          <planeGeometry args={[stain.w, stain.l]} />
        </mesh>
      ))}
    </group>
  );
}

function GarageModel({ config }) {
  const showSkin = config.viewMode === "full";

  return (
    <group name="garage-root">
      <Ground config={config} />
      <FoundationSlab config={config} />
      <StructureSystem config={config} />
      {showSkin && <WallPanels config={config} />}
      {showSkin && <Openings config={config} />}
      {showSkin && <RoofSystem config={config} />}
      {showSkin && <FlashingSystem config={config} />}
      {config.showDimensions && <DimensionOverlay config={config} />}
    </group>
  );
}

function Loader() {
  return (
    <Html center>
      <div className="scene-loader">Ladowanie modelu</div>
    </Html>
  );
}

function SceneStatus({ config }) {
  const area = (config.dimensions.widthM * config.dimensions.lengthM).toFixed(1);
  const preset = PRESETS[config.preset]?.label || "Konfiguracja";

  return (
    <div className="scene-status">
      <span>{config.viewMode === "structure" ? "Konstrukcja" : "Calosc"}</span>
      <span>{preset}</span>
      <span>{config.dimensions.widthM.toFixed(1)} x {config.dimensions.lengthM.toFixed(1)} x {config.dimensions.wallHeightM.toFixed(1)} m</span>
      <span>{area} m2</span>
      <span>Dach {config.roof.pitchPercent}%</span>
    </div>
  );
}

function ViewerPresetOverlay() {
  const config = useConfiguratorStore((state) => state.config);
  const setPreset = useConfiguratorStore((state) => state.setPreset);

  return (
    <div className="viewer-presets" aria-label="Glowne presety">
      {Object.entries(PRESETS).map(([key, preset]) => {
        const Icon = presetIcons[key];
        const selected = config.preset === key;
        return (
          <button key={key} className={`viewer-preset ${selected ? "active" : ""}`} onClick={() => setPreset(key)} type="button">
            <Icon className="h-4 w-4" />
            <span>{preset.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function GarageScene() {
  const config = useConfiguratorStore((state) => state.config);

  return (
    <div className="scene-shell">
      <Canvas
        shadows
        dpr={[1, 1.7]}
        gl={{ antialias: true }}
        onCreated={({ gl }) => {
          gl.localClippingEnabled = true;
        }}
      >
        <color attach="background" args={["#e8edf0"]} />
        <PerspectiveCamera makeDefault fov={42} position={[7, 5, 8]} />
        <ambientLight intensity={0.65} />
        <directionalLight position={[7, 10, 5]} intensity={2.2} castShadow shadow-mapSize={[2048, 2048]} />
        <directionalLight position={[-6, 6, -5]} intensity={0.45} />
        <Suspense fallback={<Loader />}>
          <GarageModel config={config} />
        </Suspense>
        <ContactShadows position={[0, 0.02, 0]} opacity={0.35} blur={2.8} scale={40} />
        <CameraRig config={config} />
      </Canvas>
      <ViewerPresetOverlay />
      <ViewerToolbar />
      <SceneStatus config={config} />
    </div>
  );
}
