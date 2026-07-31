import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { MathUtils } from "three";
import {
  getWindowFrameColor,
  getWindowGlass,
  getWindowModel,
} from "@/config/catalog";
import { getGlassMaterial, getPaintedMetalMaterial, materials } from "@/scene/materials";
import { sceneQualityProfile } from "@/scene/SceneEnvironment";
import { useConfiguratorStore } from "@/store/configuratorStore";
import { DoubleGlazing, RectFrame, WindowHandle } from "@/scene/openings/Hardware";

function HingeCover({ position, highDetail }) {
  return (
    <group position={position}>
      <RoundedBox
        args={[0.02, highDetail ? 0.062 : 0.046, 0.018]}
        radius={0.007}
        smoothness={3}
        material={materials.hardwarePlastic}
        castShadow={false}
      />
      {highDetail && (
        <mesh position={[0, 0.035, -0.004]} material={materials.gasket}>
          <boxGeometry args={[0.007, 0.025, 0.006]} />
        </mesh>
      )}
    </group>
  );
}

function WindowSash({
  width,
  height,
  model,
  frameMaterial,
  glassMaterial,
  hingeSide,
  operable,
  handleRef,
  highDetail,
}) {
  const profileRail = model.frameProfile === "industrial_60" ? 0.052 : 0.062;
  const glassWidth = Math.max(0.08, width - profileRail * 2 - 0.025);
  const glassHeight = Math.max(0.08, height - profileRail * 2 - 0.025);
  const handleSide = -hingeSide;

  return (
    <group>
      <RectFrame
        width={width}
        height={height}
        rail={profileRail + 0.018}
        depth={0.035}
        material={materials.gasket}
        z={-0.012}
        castShadow={false}
      />
      <RectFrame
        width={width - 0.012}
        height={height - 0.012}
        rail={profileRail}
        depth={0.068}
        material={frameMaterial}
        z={0.018}
      />
      <RectFrame
        width={width - profileRail * 1.25}
        height={height - profileRail * 1.25}
        rail={0.022}
        depth={0.078}
        material={frameMaterial}
        z={0.03}
      />
      <DoubleGlazing
        width={glassWidth}
        height={glassHeight}
        glassMaterial={glassMaterial}
        highDetail={highDetail}
      />
      <RectFrame
        width={glassWidth + 0.035}
        height={glassHeight + 0.035}
        rail={0.018}
        depth={0.018}
        material={materials.gasket}
        z={0.048}
        castShadow={false}
      />

      {operable && model.handleStyle && (
        <group position={[handleSide * (width / 2 - profileRail * 0.62), 0, 0.087]}>
          <WindowHandle side={handleSide} leverRef={handleRef} highDetail={highDetail} />
        </group>
      )}

      {operable && model.hingeCovers && (
        <>
          <HingeCover
            position={[hingeSide * (width / 2 - profileRail * 0.2), height / 2 - 0.115, 0.052]}
            highDetail={highDetail}
          />
          <HingeCover
            position={[hingeSide * (width / 2 - profileRail * 0.2), -height / 2 + 0.115, 0.052]}
            highDetail={highDetail}
          />
        </>
      )}
    </group>
  );
}

function FixedPane({
  width,
  height,
  model,
  frameMaterial,
  glassMaterial,
  highDetail,
}) {
  const profileRail = model.frameProfile === "industrial_60" ? 0.052 : 0.07;
  const glassWidth = Math.max(0.08, width - profileRail * 2 - 0.02);
  const glassHeight = Math.max(0.08, height - profileRail * 2 - 0.02);

  return (
    <group>
      <RectFrame
        width={width}
        height={height}
        rail={profileRail}
        depth={0.064}
        material={frameMaterial}
        z={0.018}
      />
      <RectFrame
        width={glassWidth + 0.05}
        height={glassHeight + 0.05}
        rail={0.018}
        depth={0.024}
        material={materials.gasket}
        z={0.044}
        castShadow={false}
      />
      <DoubleGlazing
        width={glassWidth}
        height={glassHeight}
        glassMaterial={glassMaterial}
        highDetail={highDetail}
      />
    </group>
  );
}

function DrainageSlots({ width, height, highDetail }) {
  if (!highDetail) return null;
  const count = Math.max(2, Math.min(4, Math.round(width / 0.65)));
  return Array.from({ length: count }, (_, index) => {
    const x = -width / 2 + ((index + 1) * width) / (count + 1);
    return (
      <RoundedBox
        key={index}
        args={[0.045, 0.009, 0.012]}
        radius={0.004}
        smoothness={2}
        position={[x, -height / 2 + 0.026, 0.066]}
        material={materials.darkVoid}
      />
    );
  });
}

export function WindowLeaf({ opening, quality = "high" }) {
  const model = getWindowModel(opening);
  const frameColor = getWindowFrameColor(opening);
  const glass = getWindowGlass(opening);
  const frameMaterial = useMemo(
    () => getPaintedMetalMaterial(frameColor, "frame", {
      quality,
      projection: "local",
      roughness: 0.3,
      clearcoat: 0.16,
    }),
    [frameColor, quality],
  );
  const glassMaterial = useMemo(
    () => getGlassMaterial(glass),
    [glass.tint, glass.roughness, glass.transmission],
  );
  const updateOpening = useConfiguratorStore((state) => state.updateOpening);
  const turnRefs = useRef([]);
  const tiltRefs = useRef([]);
  const handleRefs = useRef([]);
  const turnProgress = useRef(opening.openMode === "turn" || (!opening.openMode && opening.open) ? 1 : 0);
  const tiltProgress = useRef(opening.openMode === "tilt" ? 1 : 0);
  const panes = model.panes || 1;
  const mullion = panes > 1 ? 0.055 : 0;
  const sashWidth = (opening.widthM - mullion * (panes - 1)) / panes;
  const operable = model.operation !== "fixed";
  const requestedMode = opening.openMode || (opening.open ? "turn" : "closed");
  const openMode = model.openModes.includes(requestedMode) ? requestedMode : "closed";
  const highDetail = sceneQualityProfile(quality).highDetail;
  const roofPlacement = opening.kind === "roofWindow";

  useFrame((_, dt) => {
    turnProgress.current = MathUtils.damp(turnProgress.current, openMode === "turn" ? 1 : 0, 7, dt);
    tiltProgress.current = MathUtils.damp(tiltProgress.current, openMode === "tilt" ? 1 : 0, 7, dt);
    turnRefs.current.forEach((turnPivot, index) => {
      if (!turnPivot) return;
      const hingeSide = panes === 2
        ? (index === 0 ? -1 : 1)
        : (opening.hinge === "right" ? 1 : -1);
      turnPivot.rotation.y = -hingeSide * turnProgress.current * Math.PI * 0.42;
    });
    tiltRefs.current.forEach((tiltPivot) => {
      if (!tiltPivot) return;
      tiltPivot.rotation.x = -tiltProgress.current * 0.22;
    });
    handleRefs.current.forEach((lever, index) => {
      if (!lever) return;
      const hingeSide = panes === 2
        ? (index === 0 ? -1 : 1)
        : (opening.hinge === "right" ? 1 : -1);
      const handleSide = -hingeSide;
      const turnRotation = -handleSide * Math.PI * 0.5;
      lever.rotation.z = MathUtils.lerp(
        MathUtils.lerp(0, turnRotation, turnProgress.current),
        Math.PI,
        tiltProgress.current,
      );
    });
  });

  const toggle = (event) => {
    if (!operable) return;
    event.stopPropagation();
    updateOpening(opening.id, { openMode: openMode === "closed" ? "turn" : "closed" });
  };

  return (
    <group name="window-system" onClick={operable ? toggle : undefined}>
      <RectFrame
        width={opening.widthM + 0.018}
        height={opening.heightM + 0.018}
        rail={0.078}
        depth={0.09}
        material={frameMaterial}
        z={-0.006}
      />
      <RectFrame
        width={opening.widthM - 0.055}
        height={opening.heightM - 0.055}
        rail={0.025}
        depth={0.055}
        material={materials.gasket}
        z={0.026}
        castShadow={false}
      />

      {Array.from({ length: panes }, (_, index) => {
        const centerX = -opening.widthM / 2 + sashWidth / 2 + index * (sashWidth + mullion);
        const hingeSide = panes === 2
          ? (index === 0 ? -1 : 1)
          : (opening.hinge === "right" ? 1 : -1);
        const pivotX = centerX + hingeSide * sashWidth / 2;
        return (
          <group
            key={index}
            ref={(element) => {
              turnRefs.current[index] = element;
            }}
            position={[pivotX, 0, 0.036]}
          >
            <group
              ref={(element) => {
                tiltRefs.current[index] = element;
              }}
              position={[-hingeSide * sashWidth / 2, -opening.heightM / 2, 0]}
            >
              <group position={[0, opening.heightM / 2, 0]}>
                {operable ? (
                  <WindowSash
                    width={sashWidth}
                    height={opening.heightM}
                    model={model}
                    frameMaterial={frameMaterial}
                    glassMaterial={glassMaterial}
                    hingeSide={hingeSide}
                    operable={operable}
                    handleRef={(element) => {
                      handleRefs.current[index] = element;
                    }}
                    highDetail={highDetail}
                  />
                ) : (
                  <FixedPane
                    width={sashWidth}
                    height={opening.heightM}
                    model={model}
                    frameMaterial={frameMaterial}
                    glassMaterial={glassMaterial}
                    highDetail={highDetail}
                  />
                )}
              </group>
            </group>
          </group>
        );
      })}

      {panes > 1 && Array.from({ length: panes - 1 }, (_, index) => {
        const x = -opening.widthM / 2 + (index + 1) * (sashWidth + mullion) - mullion / 2;
        return (
          <RoundedBox
            key={index}
            args={[mullion, opening.heightM - 0.04, 0.09]}
            radius={0.012}
            smoothness={3}
            position={[x, 0, 0.048]}
            material={frameMaterial}
            castShadow
          />
        );
      })}

      {model.drainage && !roofPlacement && <DrainageSlots width={opening.widthM} height={opening.heightM} highDetail={highDetail} />}
      {!roofPlacement && (
        <mesh
          position={[0, -opening.heightM / 2 - 0.055, 0.065]}
          material={frameMaterial}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[opening.widthM + 0.16, 0.055, 0.19]} />
        </mesh>
      )}
      {highDetail && !roofPlacement && (
        <mesh position={[0, -opening.heightM / 2 - 0.026, 0.16]} rotation={[Math.PI / 2, 0, 0]} material={materials.galvanized}>
          <boxGeometry args={[opening.widthM + 0.12, 0.016, 0.016]} />
        </mesh>
      )}
    </group>
  );
}
