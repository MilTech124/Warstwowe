import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Html, OrbitControls, PerformanceMonitor, PerspectiveCamera, RoundedBox } from "@react-three/drei";
import { Box, Building2, Home, Warehouse } from "lucide-react";
import { Vector3 } from "three";
import { PRESETS } from "@/config/catalog";
import { useConfiguratorStore } from "@/store/configuratorStore";
import { WallPanels } from "@/scene/WallPanels";
import { RoofSystem } from "@/scene/RoofSystem";
import { FlashingSystem } from "@/scene/FlashingSystem";
import { GutterSystem } from "@/scene/GutterSystem";
import { StructureSystem } from "@/scene/StructureSystem";
import { Openings } from "@/scene/Openings";
import { DimensionOverlay } from "@/scene/DimensionOverlay";
import { ViewerToolbar } from "@/scene/ViewerToolbar";
import { materials } from "@/scene/materials";
import { detectSceneQuality, SCENE_QUALITY, SceneEnvironment } from "@/scene/SceneEnvironment";

const presetIcons = {
  large_hall: Warehouse,
  hall: Building2,
  double_garage: Home,
  single_garage: Box,
};

const CAMERA_VERTICAL_FOV = (38 * Math.PI) / 180;

function perspectiveFitDistance(span) {
  return (span / 2) / Math.tan(CAMERA_VERTICAL_FOV / 2) * 1.14;
}

function CameraRig({ config }) {
  const { camera } = useThree();
  const controlsRef = useRef(null);
  const desiredPosition = useRef(new Vector3());
  const desiredTarget = useRef(new Vector3());
  const initialized = useRef(false);
  const animating = useRef(false);
  const { widthM, lengthM, wallHeightM } = config.dimensions;
  const frontDistance = perspectiveFitDistance(Math.max(widthM, wallHeightM * 1.35)) * 1.28;
  const sideDistance = perspectiveFitDistance(Math.max(lengthM, wallHeightM * 1.35)) * 1.22;
  const boundsRadius = Math.hypot(widthM, lengthM, wallHeightM) / 2;
  const orbitDistance = (boundsRadius / Math.sin(CAMERA_VERTICAL_FOV / 2)) * 1.18;
  const orbitDirection = useMemo(() => new Vector3(1, 0.25, 1).normalize(), []);

  const view = useMemo(() => {
    const target = new Vector3(0, wallHeightM * 0.52, 0);
    if (config.cameraMode === "front") {
      return {
        position: new Vector3(0, wallHeightM * 0.58, lengthM / 2 + frontDistance),
        target,
      };
    }
    if (config.cameraMode === "side") {
      return {
        position: new Vector3(widthM / 2 + sideDistance, wallHeightM * 0.58, 0),
        target,
      };
    }
    if (config.cameraMode === "top") {
      return {
        position: new Vector3(0.001, perspectiveFitDistance(Math.max(widthM, lengthM)) * 1.18, 0.001),
        target: new Vector3(0, 0, 0),
      };
    }
    if (config.cameraMode === "interior") {
      return {
        position: new Vector3(-widthM * 0.32, Math.min(1.62, wallHeightM * 0.6), -lengthM * 0.32),
        target: new Vector3(widthM * 0.18, Math.min(1.4, wallHeightM * 0.51), lengthM * 0.22),
      };
    }
    if (config.cameraMode === "structure") {
      return {
        position: target.clone().add(orbitDirection.clone().multiplyScalar(orbitDistance * 1.08)),
        target,
      };
    }
    return {
      position: target.clone().add(orbitDirection.clone().multiplyScalar(orbitDistance)),
      target,
    };
  }, [
    config.cameraMode,
    frontDistance,
    lengthM,
    orbitDirection,
    orbitDistance,
    sideDistance,
    wallHeightM,
    widthM,
  ]);

  useEffect(() => {
    desiredPosition.current.copy(view.position);
    desiredTarget.current.copy(view.target);

    if (!initialized.current) {
      camera.position.copy(view.position);
      camera.lookAt(view.target);
      controlsRef.current?.target.copy(view.target);
      controlsRef.current?.update();
      initialized.current = true;
      return;
    }
    animating.current = true;
  }, [camera, view]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls || !animating.current) return;
    const alpha = 1 - Math.exp(-5.4 * delta);
    camera.position.lerp(desiredPosition.current, alpha);
    controls.target.lerp(desiredTarget.current, alpha);
    controls.update();

    if (
      camera.position.distanceToSquared(desiredPosition.current) < 0.0004 &&
      controls.target.distanceToSquared(desiredTarget.current) < 0.0004
    ) {
      camera.position.copy(desiredPosition.current);
      controls.target.copy(desiredTarget.current);
      controlsRef.current.update();
      animating.current = false;
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      enablePan={false}
      minDistance={Math.max(2, Math.min(widthM, lengthM) * 0.34)}
      maxDistance={Math.max(22, orbitDistance * 2.2)}
      minPolarAngle={0.04}
      maxPolarAngle={Math.PI * 0.48}
    />
  );
}

function Ground({ config }) {
  const size = Math.max(150, Math.max(config.dimensions.widthM, config.dimensions.lengthM) * 7.2);
  return (
    <group name="industrial-yard-ground">
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
    </group>
  );
}

function GarageModel({ config, quality }) {
  const showSkin = config.viewMode === "full";

  return (
    <group name="garage-root">
      <Ground config={config} />
      <FoundationSlab config={config} />
      <StructureSystem config={config} />
      {showSkin && <WallPanels config={config} />}
      {showSkin && <Openings config={config} quality={quality} />}
      {showSkin && <RoofSystem config={config} />}
      {showSkin && <FlashingSystem config={config} />}
      {showSkin && <GutterSystem config={config} />}
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
  const [quality, setQuality] = useState(detectSceneQuality);
  const qualityProfile = SCENE_QUALITY[quality];
  const contactShadowKey = [
    quality,
    config.preset,
    config.dimensions.widthM,
    config.dimensions.lengthM,
    config.dimensions.wallHeightM,
    config.openings.map((opening) => `${opening.id}-${opening.openMode || (opening.open ? "open" : "closed")}`).join("-"),
  ].join(":");

  return (
    <div className="scene-shell">
      <Canvas
        shadows="soft"
        dpr={qualityProfile.dpr}
        gl={{ antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: true }}
        onCreated={(state) => {
          state.gl.localClippingEnabled = true;
          if (typeof window !== "undefined") window.__r3fState = state;
        }}
      >
        <PerspectiveCamera makeDefault fov={38} near={0.08} far={320} position={[7, 5, 8]} />
        <PerformanceMonitor
          flipflops={2}
          onDecline={() => setQuality("balanced")}
          onFallback={() => setQuality("balanced")}
        />
        <Suspense fallback={<Loader />}>
          <SceneEnvironment
            dimensions={config.dimensions}
            cameraMode={config.cameraMode}
            quality={quality}
          />
          <GarageModel config={config} quality={quality} />
        </Suspense>
        <ContactShadows
          key={contactShadowKey}
          position={[0, 0.018, 0]}
          opacity={qualityProfile.contactShadowOpacity}
          blur={qualityProfile.contactShadowBlur}
          scale={Math.max(config.dimensions.widthM, config.dimensions.lengthM) * 1.55}
          far={Math.max(8, config.dimensions.wallHeightM * 2.6)}
          resolution={qualityProfile.contactShadowResolution}
          frames={quality === "high" ? 6 : 2}
        />
        <CameraRig config={config} />
      </Canvas>
      <ViewerPresetOverlay />
      <ViewerToolbar />
      <SceneStatus config={config} />
    </div>
  );
}
