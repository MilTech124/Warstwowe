import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Html, OrbitControls, PerformanceMonitor, PerspectiveCamera, RoundedBox } from "@react-three/drei";
import { Box, Building2, Home, Warehouse } from "lucide-react";
import { Vector3 } from "three";
import { PRESETS } from "@/config/catalog";
import { selectEffectiveQuality, useConfiguratorStore } from "@/store/configuratorStore";
import { readQualityPreference } from "@/lib/viewerPreferences";
import { WallPanels } from "@/scene/WallPanels";
import { RoofSystem } from "@/scene/RoofSystem";
import { FlashingSystem } from "@/scene/FlashingSystem";
import { GutterSystem } from "@/scene/GutterSystem";
import { StructureSystem } from "@/scene/StructureSystem";
import { Openings } from "@/scene/Openings";
import { DimensionOverlay } from "@/scene/DimensionOverlay";
import { FrontProjectionSystem } from "@/scene/FrontProjectionSystem";
import { LightingSystem } from "@/scene/LightingSystem";
import { ViewerToolbar } from "@/scene/ViewerToolbar";
import { ViewerQualityPanel } from "@/scene/ViewerQualityPanel";
import { SceneCapture } from "@/scene/SceneCapture";
import { captureBridge } from "@/scene/captureBridge";
import { fpsBridge } from "@/scene/fpsBridge";
import { materials } from "@/scene/materials";
import { detectSceneQuality, sceneQualityProfile, SceneEnvironment } from "@/scene/SceneEnvironment";
import { isWebglAvailable } from "@/scene/webglSupport";
import { frontProjectionDepth } from "@/scene/frontProjectionMath";
import { roofFootprint } from "@/scene/geometry";
import { cameraView, orbitFitDistance } from "@/scene/cameraViews";
import { useConfiguratorAccess } from "@/configurator/ConfiguratorContext";

const presetIcons = {
  large_hall: Warehouse,
  hall: Building2,
  double_garage: Home,
  single_garage: Box,
};

function CameraRig({ config }) {
  const { camera } = useThree();
  const controlsRef = useRef(null);
  const desiredPosition = useRef(new Vector3());
  const desiredTarget = useRef(new Vector3());
  const initialized = useRef(false);
  const animating = useRef(false);
  const { widthM, lengthM } = config.dimensions;
  const orbitDistance = orbitFitDistance(config);

  // Kadry liczy cameraViews.js — TA SAMA funkcja, której używają zrzuty do PDF.
  // Wcześniej ta matematyka istniała tu w drugiej kopii; rozjazd między kopiami
  // dawałby zdjęcie w ofercie inne niż obraz, który klient zaakceptował na ekranie.
  const cameraSignature = [
    config.cameraMode,
    widthM,
    lengthM,
    config.dimensions.wallHeightM,
    config.roof.type,
    config.roof.pitchPercent,
    config.roof.overhangM.front,
    config.roof.overhangM.back,
    config.roof.overhangM.left,
    config.roof.overhangM.right,
    frontProjectionDepth(config),
  ].join("|");

  // Zależność po sygnaturze, nie po `config` — store podmienia cały obiekt przy
  // każdym zapisie, więc zmiana koloru rynny restartowałaby animację kamery.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const view = useMemo(() => {
    const { position, target } = cameraView(config, config.cameraMode);
    return { position: new Vector3(...position), target: new Vector3(...target) };
  }, [cameraSignature]);

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

  // Rejestracja kontrolek, żeby generator PDF mógł je zamrozić na czas zrzutu.
  useEffect(() => {
    captureBridge.controls = controlsRef.current;
    return () => {
      if (captureBridge.controls === controlsRef.current) captureBridge.controls = null;
    };
  });

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    // Podczas zrzutu kamerę ustawia captureViews — rig nie może jej cofać.
    if (captureBridge.capturing) return;
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
  const projectionDepthM = frontProjectionDepth(config);
  const overhang = 0.35;
  const thickness = 0.18;
  const slabWidth = widthM + overhang * 2;
  const slabLength = lengthM + overhang * 2 + projectionDepthM;
  const centerZ = projectionDepthM / 2;
  const jointWidth = 0.018;
  const centerY = -thickness / 2;
  const topY = 0.012;
  const jointCountX = Math.max(0, Math.floor(slabWidth / 4));
  const jointCountZ = Math.max(0, Math.floor(slabLength / 4));

  return (
    <group name="foundation-slab" position={[0, 0, centerZ]}>
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

function GarageModel({ config, quality, nightPreview }) {
  const showSkin = config.viewMode === "full";
  const access = useConfiguratorAccess();

  return (
    <group name="garage-root">
      <Ground config={config} />
      <FoundationSlab config={config} />
      <StructureSystem config={config} />
      {showSkin && <WallPanels config={config} quality={quality} />}
      {showSkin && <Openings config={config} quality={quality} />}
      {showSkin && <RoofSystem config={config} quality={quality} />}
      {showSkin && access.capabilities.frontProjection && <FrontProjectionSystem config={config} quality={quality} />}
      {showSkin && <FlashingSystem config={config} quality={quality} />}
      {showSkin && <GutterSystem config={config} quality={quality} />}
      {showSkin && access.capabilities.lighting && <LightingSystem config={config} quality={quality} nightPreview={nightPreview} />}
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

const QUALITY_LADDER = ["low", "balanced", "high"];

function degradeQuality(quality) {
  const index = QUALITY_LADDER.indexOf(quality);
  return QUALITY_LADDER[Math.max(0, index - 1)] || "balanced";
}

function FpsProbe() {
  const frames = useRef(0);
  const elapsed = useRef(0);

  useFrame((_, delta) => {
    frames.current += 1;
    elapsed.current += delta;
    if (elapsed.current >= 0.5) {
      fpsBridge.publish(Math.round(frames.current / elapsed.current));
      frames.current = 0;
      elapsed.current = 0;
    }
  });

  return null;
}

function SceneUnavailable({ reason, onRetry }) {
  const lost = reason === "lost";
  return (
    <div className="scene-unavailable" role="alert">
      <h2>Podgląd 3D niedostępny</h2>
      <p>
        {lost
          ? "Przeglądarka przerwała renderowanie sceny 3D. Zwykle pomaga zamknięcie innych kart lub programów obciążających kartę graficzną."
          : "Ta przeglądarka lub karta graficzna nie obsługuje WebGL. Zaktualizuj przeglądarkę i sterowniki karty graficznej albo włącz akcelerację sprzętową."}
      </p>
      {lost && (
        <button className="viewer-tool active" onClick={onRetry} type="button">
          Spróbuj ponownie
        </button>
      )}
    </div>
  );
}

function SceneStatus({ config }) {
  const area = (config.dimensions.widthM * config.dimensions.lengthM).toFixed(1);
  const preset = PRESETS[config.preset]?.label || "Konfiguracja";
  const projectionDepthM = frontProjectionDepth(config);

  return (
    <div className="scene-status">
      <span>{config.viewMode === "structure" ? "Konstrukcja" : "Calosc"}</span>
      <span>{preset}</span>
      <span>{config.dimensions.widthM.toFixed(1)} x {config.dimensions.lengthM.toFixed(1)} x {config.dimensions.wallHeightM.toFixed(1)} m</span>
      <span>{area} m2</span>
      <span>Dach {config.roof.pitchPercent}%</span>
      {projectionDepthM > 0 && <span>Wypust {projectionDepthM.toFixed(2)} m</span>}
    </div>
  );
}

function ViewerPresetOverlay() {
  const config = useConfiguratorStore((state) => state.config);
  const setPreset = useConfiguratorStore((state) => state.setPreset);
  const access = useConfiguratorAccess();
  const visiblePresets = Object.entries(PRESETS).filter(
    ([key]) => !access.settings.allowedPresetIds.length || access.settings.allowedPresetIds.includes(key),
  );

  return (
    <div className="viewer-presets" aria-label="Glowne presety">
      {visiblePresets.map(([key, preset]) => {
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

const VIEWER_WATERMARK_MARKS = 6;

function ViewerWatermark({ branding }) {
  const logoUrl = branding?.logoUrl;
  const label = branding?.name || "Konfigurator";

  return (
    <div className={`viewer-watermark ${logoUrl ? "has-logo" : "text-fallback"}`} aria-hidden="true">
      {Array.from({ length: VIEWER_WATERMARK_MARKS }, (_, index) => (
        logoUrl
          ? <img key={index} src={logoUrl} alt="" draggable="false" />
          : <span key={index}>{label}</span>
      ))}
    </div>
  );
}

export function GarageScene() {
  const storedConfig = useConfiguratorStore((state) => state.config);
  const access = useConfiguratorAccess();
  const config = useMemo(() => ({
    ...storedConfig,
    viewMode: access.capabilities.structureView ? storedConfig.viewMode : "full",
    cameraMode:
      !access.capabilities.structureView && storedConfig.cameraMode === "structure"
        ? "orbit"
        : storedConfig.cameraMode,
    frontProjection: access.capabilities.frontProjection
      ? storedConfig.frontProjection
      : { ...(storedConfig.frontProjection ?? {}), depthM: 0 },
    lighting: access.capabilities.lighting
      ? storedConfig.lighting
      : {
          interiorLighting: false,
          roofPerimeterLed: false,
          gateLamps: false,
          exteriorSconces: false,
          frontProjectionLed: false,
        },
    openings: access.capabilities.gateAnimations
      ? storedConfig.openings
      : storedConfig.openings.map((opening) =>
          opening.kind === "gate" ? { ...opening, open: false } : opening,
        ),
  }), [access.capabilities, storedConfig]);
  const activeTab = useConfiguratorStore((state) => state.ui.activeTab);
  const lightingPreviewSuppressed = useConfiguratorStore((state) => state.ui.lightingPreviewSuppressed);
  const quality = useConfiguratorStore(selectEffectiveQuality);
  const autoQuality = useConfiguratorStore((state) => state.ui.autoQuality);
  const setQualityPreference = useConfiguratorStore((state) => state.setQualityPreference);
  const setAutoQuality = useConfiguratorStore((state) => state.setAutoQuality);
  const [glState, setGlState] = useState("ok");
  const [canvasKey, setCanvasKey] = useState(0);

  // Detekcja i odczyt zapisanego wyboru dopiero po montażu - store powstaje też
  // w SSR, a localStorage/navigator w initializerze dałyby hydration mismatch.
  useEffect(() => {
    setAutoQuality(detectSceneQuality());
    const stored = readQualityPreference();
    if (stored !== "auto") setQualityPreference(stored);
    if (!isWebglAvailable()) setGlState("unsupported");
  }, [setAutoQuality, setQualityPreference]);

  const nightPreview = activeTab === "lighting" && !lightingPreviewSuppressed;
  const qualityProfile = sceneQualityProfile(quality);
  // Klucz celowo obejmuje TYLKO to, co zmienia rzut budynku. Nie dokładaj tu
  // profili ani poziomu wzmocnienia: przekroje nie zmieniają obrysu, a każde
  // przełączenie wymuszałoby przepieczenie cieni kontaktowych bez zysku.
  const contactShadowKey = [
    quality,
    config.preset,
    config.dimensions.widthM,
    config.dimensions.lengthM,
    config.dimensions.wallHeightM,
    frontProjectionDepth(config),
    config.openings.map((opening) => `${opening.id}-${opening.openMode || (opening.open ? "open" : "closed")}`).join("-"),
  ].join(":");
  const footprint = roofFootprint(config);

  if (glState !== "ok") {
    return (
      <div className="scene-shell">
        <ViewerWatermark branding={access.company.branding} />
        <SceneUnavailable
          reason={glState}
          onRetry={() => {
            setGlState("ok");
            setCanvasKey((value) => value + 1);
          }}
        />
      </div>
    );
  }

  return (
    <div className="scene-shell">
      <ViewerWatermark branding={access.company.branding} />
      <Canvas
        key={canvasKey}
        shadows={qualityProfile.softShadows ? "soft" : "percentage"}
        dpr={qualityProfile.dpr}
        gl={{ antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: true }}
        onCreated={(state) => {
          state.gl.localClippingEnabled = true;
          const canvas = state.gl.domElement;
          canvas.addEventListener("webglcontextlost", (event) => {
            // Bez preventDefault przeglądarka nie przywróci kontekstu.
            event.preventDefault();
            setGlState("lost");
          });
          canvas.addEventListener("webglcontextrestored", () => {
            // Renderer trzyma zasoby wiszące na martwym kontekście - scenę
            // odtwarzamy od zera przez remount Canvasa.
            setGlState("ok");
            setCanvasKey((value) => value + 1);
          });
        }}
      >
        <PerspectiveCamera makeDefault fov={38} near={0.08} far={320} position={[7, 5, 8]} />
        <PerformanceMonitor
          flipflops={2}
          onDecline={() => setAutoQuality(degradeQuality(autoQuality))}
          onFallback={() => setAutoQuality(degradeQuality(autoQuality))}
        />
        <FpsProbe />
        <Suspense fallback={<Loader />}>
          <SceneEnvironment
            dimensions={config.dimensions}
            cameraMode={config.cameraMode}
            quality={quality}
            nightPreview={nightPreview}
          />
          <GarageModel config={config} quality={quality} nightPreview={nightPreview} />
          <SceneCapture />
        </Suspense>
        {qualityProfile.contactShadows && (
          <ContactShadows
            key={contactShadowKey}
            position={[0, 0.018, 0]}
            opacity={qualityProfile.contactShadowOpacity}
            blur={qualityProfile.contactShadowBlur}
            scale={Math.max(footprint.roofWidth, footprint.roofLength) * 1.55}
            far={Math.max(8, config.dimensions.wallHeightM * 2.6)}
            resolution={qualityProfile.contactShadowResolution}
            frames={qualityProfile.contactShadowFrames}
          />
        )}
        <CameraRig config={config} />
      </Canvas>
      <ViewerPresetOverlay />
      <ViewerQualityPanel />
      <ViewerToolbar />
      <SceneStatus config={config} />
    </div>
  );
}
