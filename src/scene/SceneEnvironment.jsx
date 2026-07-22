import { useEffect, useMemo } from "react";
import { Environment, useTexture } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import {
  ACESFilmicToneMapping,
  EquirectangularReflectionMapping,
  Object3D,
  PCFSoftShadowMap,
  SRGBColorSpace,
} from "three";
import { setSceneTextureAnisotropy } from "@/scene/materials";

export const SCENE_QUALITY = Object.freeze({
  balanced: {
    dpr: [1, 1.35],
    shadowMapSize: 1024,
    contactShadowResolution: 512,
    contactShadowBlur: 3.4,
    contactShadowOpacity: 0.2,
    environmentIntensity: 0.72,
    backgroundBlurriness: 0.055,
    anisotropy: 4,
  },
  high: {
    dpr: [1, 1.85],
    shadowMapSize: 2048,
    contactShadowResolution: 1024,
    contactShadowBlur: 3,
    contactShadowOpacity: 0.23,
    environmentIntensity: 0.82,
    backgroundBlurriness: 0.035,
    anisotropy: 8,
  },
});

export function detectSceneQuality() {
  if (typeof window === "undefined") return "high";

  const memory = navigator.deviceMemory || 8;
  const cores = navigator.hardwareConcurrency || 8;
  const compactViewport = window.matchMedia("(max-width: 980px)").matches;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return compactViewport || reducedMotion || memory <= 4 || cores <= 4 ? "balanced" : "high";
}

export function SceneEnvironment({ dimensions, cameraMode, quality = "high" }) {
  const { gl } = useThree();
  const profile = SCENE_QUALITY[quality] || SCENE_QUALITY.high;
  const environmentTexture = useTexture("/environment/industrial-yard-day.png");
  const { widthM, lengthM, wallHeightM } = dimensions;
  const footprint = Math.max(widthM, lengthM);
  const shadowExtent = footprint * 0.72 + 4;
  const sunTarget = useMemo(() => new Object3D(), []);
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
    gl.toneMappingExposure = cameraMode === "interior" ? 1.12 : 0.96;
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = PCFSoftShadowMap;
    setSceneTextureAnisotropy(
      Math.min(profile.anisotropy, gl.capabilities.getMaxAnisotropy()),
    );
  }, [cameraMode, gl, profile.anisotropy]);

  useEffect(() => {
    sunTarget.position.set(0, wallHeightM * 0.38, 0);
    sunTarget.updateMatrixWorld();
  }, [sunTarget, wallHeightM]);

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
      <hemisphereLight args={["#dcecff", "#827f78", 0.42]} />
      <directionalLight
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
