import { useEffect, useMemo, useRef } from "react";
import { Environment, useTexture } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import {
  ACESFilmicToneMapping,
  Color,
  EquirectangularReflectionMapping,
  Object3D,
  PCFShadowMap,
  PCFSoftShadowMap,
  SRGBColorSpace,
} from "three";
import { setSceneTextureAnisotropy } from "@/scene/materials";

export const SCENE_QUALITY = Object.freeze({
  low: {
    dpr: [1, 1],
    shadowMapSize: 512,
    softShadows: false,
    contactShadows: false,
    contactShadowResolution: 256,
    contactShadowBlur: 4,
    contactShadowOpacity: 0.16,
    contactShadowFrames: 1,
    environmentIntensity: 0.72,
    backgroundBlurriness: 0.09,
    anisotropy: 1,
    highDetail: false,
    lightSourceCap: 2,
    textureQuality: "balanced",
    animateMood: false,
  },
  balanced: {
    dpr: [1, 1.35],
    shadowMapSize: 1024,
    softShadows: true,
    contactShadows: true,
    contactShadowResolution: 512,
    contactShadowBlur: 3.4,
    contactShadowOpacity: 0.2,
    contactShadowFrames: 2,
    environmentIntensity: 0.72,
    backgroundBlurriness: 0.055,
    anisotropy: 4,
    highDetail: false,
    lightSourceCap: 2,
    textureQuality: "balanced",
    animateMood: true,
  },
  high: {
    dpr: [1, 1.85],
    shadowMapSize: 2048,
    softShadows: true,
    contactShadows: true,
    contactShadowResolution: 1024,
    contactShadowBlur: 3,
    contactShadowOpacity: 0.23,
    contactShadowFrames: 6,
    environmentIntensity: 0.82,
    backgroundBlurriness: 0.035,
    anisotropy: 8,
    highDetail: true,
    lightSourceCap: 4,
    textureQuality: "high",
    animateMood: true,
  },
});

export const QUALITY_LEVELS = Object.freeze(["low", "balanced", "high"]);

export function sceneQualityProfile(quality) {
  return SCENE_QUALITY[quality] || SCENE_QUALITY.high;
}

export function detectSceneQuality() {
  if (typeof window === "undefined") return "high";

  const memory = navigator.deviceMemory || 8;
  const cores = navigator.hardwareConcurrency || 8;
  const compactViewport = window.matchMedia("(max-width: 980px)").matches;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (memory <= 2 || cores <= 2) return "low";
  return compactViewport || reducedMotion || memory <= 4 || cores <= 4 ? "balanced" : "high";
}

export function SceneEnvironment({ dimensions, cameraMode, quality = "high", nightPreview = false }) {
  const { gl, scene } = useThree();
  const profile = sceneQualityProfile(quality);
  const environmentTexture = useTexture("/environment/industrial-yard-day.png");
  const hemisphereRef = useRef(null);
  const sunRef = useRef(null);
  const moodRef = useRef(nightPreview ? 1 : 0);
  const { widthM, lengthM, wallHeightM } = dimensions;
  const footprint = Math.max(widthM, lengthM);
  const shadowExtent = footprint * 0.72 + 4;
  const sunTarget = useMemo(() => new Object3D(), []);
  const reducedMotion = useMemo(
    () => typeof window !== "undefined"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );
  const dayFogColor = useMemo(() => new Color("#dce4e7"), []);
  const nightFogColor = useMemo(() => new Color("#111827"), []);
  const moodFogColor = useMemo(() => new Color(), []);
  const sunPosition = useMemo(
    () => [
      -shadowExtent * 0.8,
      wallHeightM + shadowExtent * 1.2,
      shadowExtent * 0.75,
    ],
    [shadowExtent, wallHeightM],
  );

  useEffect(() => {
    environmentTexture.mapping = EquirectangularReflectionMapping;
    environmentTexture.colorSpace = SRGBColorSpace;
    environmentTexture.needsUpdate = true;
  }, [environmentTexture]);

  useEffect(() => {
    gl.outputColorSpace = SRGBColorSpace;
    gl.toneMapping = ACESFilmicToneMapping;
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = profile.softShadows ? PCFSoftShadowMap : PCFShadowMap;
    gl.shadowMap.needsUpdate = true;
    setSceneTextureAnisotropy(
      Math.min(profile.anisotropy, gl.capabilities.getMaxAnisotropy()),
    );
  }, [gl, profile.anisotropy, profile.softShadows]);

  useEffect(() => {
    sunTarget.position.set(0, wallHeightM * 0.38, 0);
    sunTarget.updateMatrixWorld();
  }, [sunTarget, wallHeightM]);

  useFrame((_, delta) => {
    const target = nightPreview ? 1 : 0;
    const alpha = reducedMotion || !profile.animateMood ? 1 : 1 - Math.exp(-12 * delta);
    moodRef.current += (target - moodRef.current) * alpha;
    const mood = moodRef.current;
    const dayExposure = cameraMode === "interior" ? 1.12 : 0.96;

    gl.toneMappingExposure = dayExposure + (0.5 - dayExposure) * mood;
    scene.environmentIntensity = profile.environmentIntensity
      + (0.14 - profile.environmentIntensity) * mood;
    scene.backgroundIntensity = 0.82 + (0.1 - 0.82) * mood;

    if (hemisphereRef.current) {
      hemisphereRef.current.intensity = 0.42 + (0.08 - 0.42) * mood;
    }
    if (sunRef.current) {
      sunRef.current.intensity = 2.15 + (0.16 - 2.15) * mood;
    }
    if (scene.fog) {
      moodFogColor.copy(dayFogColor).lerp(nightFogColor, mood);
      scene.fog.color.copy(moodFogColor);
    }
  });

  return (
    <>
      <Environment
        map={environmentTexture}
        background
        backgroundBlurriness={profile.backgroundBlurriness}
        backgroundIntensity={0.82}
        environmentIntensity={profile.environmentIntensity}
        backgroundRotation={[0, -0.16, 0]}
        environmentRotation={[0, -0.16, 0]}
      />
      <fog attach="fog" args={["#dce4e7", Math.max(48, footprint * 2.4), Math.max(125, footprint * 5.2)]} />
      <hemisphereLight ref={hemisphereRef} args={["#dcecff", "#827f78", 0.42]} />
      <directionalLight
        ref={sunRef}
        position={sunPosition}
        intensity={2.15}
        color="#fff4df"
        castShadow
        target={sunTarget}
        shadow-mapSize-width={profile.shadowMapSize}
        shadow-mapSize-height={profile.shadowMapSize}
        shadow-camera-left={-shadowExtent}
        shadow-camera-right={shadowExtent}
        shadow-camera-top={shadowExtent}
        shadow-camera-bottom={-shadowExtent}
        shadow-camera-near={0.5}
        shadow-camera-far={Math.max(70, shadowExtent * 5)}
        shadow-bias={-0.00012}
        shadow-normalBias={0.025}
      />
      <primitive object={sunTarget} />
    </>
  );
}

useTexture.preload("/environment/industrial-yard-day.png");
