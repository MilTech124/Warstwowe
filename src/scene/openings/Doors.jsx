import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Clone, RoundedBox, useGLTF } from "@react-three/drei";
import { MathUtils } from "three";
import {
  getCladdingColor,
  getCladdingProfile,
  getDoorColor,
  getDoorModel,
  WALL_PANEL_DIMENSIONS,
  WALL_PROFILES,
} from "@/config/catalog";
import { getPaintedMetalMaterial, materialProps, materials } from "@/scene/materials";
import { sceneQualityProfile } from "@/scene/SceneEnvironment";
import { useConfiguratorStore } from "@/store/configuratorStore";
import { ConcealedHingeHint, DoorHandle, DoubleGlazing, RectFrame, SurfaceHinge } from "@/scene/openings/Hardware";

function HorizontalEmbossments({ width, height, count, material, centerY = 0, topInset = 0.06, bottomInset = 0.06 }) {
  const usableHeight = Math.max(0.2, height - topInset - bottomInset);
  const gap = 0.055;
  const panelHeight = (usableHeight - gap * (count - 1)) / count;
  return Array.from({ length: count }, (_, index) => {
    const y = centerY - height / 2 + bottomInset + panelHeight / 2 + index * (panelHeight + gap);
    return (
      <group key={index} position={[0, y, 0.034]}>
        <RoundedBox
          args={[width - 0.095, panelHeight, 0.012]}
          radius={0.018}
          smoothness={3}
          material={materials.darkVoid}
        />
        <RoundedBox
          args={[width - 0.145, Math.max(0.04, panelHeight - 0.05), 0.014]}
          radius={0.014}
          smoothness={3}
          position={[0, 0, 0.009]}
          material={material}
          castShadow
        />
      </group>
    );
  });
}

function TrapezoidRib({ x, height, depth, material }) {
  const capWidth = 0.038;
  const slopeWidth = 0.028;
  return (
    <group position={[x, 0, 0.034]}>
      <RoundedBox
        args={[capWidth, height, depth]}
        radius={0.006}
        smoothness={2}
        position={[0, 0, depth * 0.45]}
        material={material}
        castShadow
      />
      <mesh position={[-(capWidth + slopeWidth) / 2, 0, 0]} rotation={[0, -0.48, 0]} material={material} castShadow>
        <boxGeometry args={[slopeWidth, height, depth * 0.72]} />
      </mesh>
      <mesh position={[(capWidth + slopeWidth) / 2, 0, 0]} rotation={[0, 0.48, 0]} material={material} castShadow>
        <boxGeometry args={[slopeWidth, height, depth * 0.72]} />
      </mesh>
    </group>
  );
}

function HorizontalCladdingRib({ y, width, depth, material }) {
  const capHeight = 0.032;
  const slopeHeight = 0.024;
  return (
    <group position={[0, y, 0.034]}>
      <RoundedBox
        args={[width, capHeight, depth]}
        radius={0.005}
        smoothness={2}
        position={[0, 0, depth * 0.45]}
        material={material}
        castShadow
      />
      <mesh position={[0, -(capHeight + slopeHeight) / 2, 0]} rotation={[0.48, 0, 0]} material={material} castShadow>
        <boxGeometry args={[width, slopeHeight, depth * 0.72]} />
      </mesh>
      <mesh position={[0, (capHeight + slopeHeight) / 2, 0]} rotation={[-0.48, 0, 0]} material={material} castShadow>
        <boxGeometry args={[width, slopeHeight, depth * 0.72]} />
      </mesh>
    </group>
  );
}

function TrapezoidEmbossments({ width, height, pitch, depth, material }) {
  const count = Math.max(4, Math.floor((width - 0.1) / pitch));
  const actualPitch = (width - 0.12) / count;
  return Array.from({ length: count }, (_, index) => (
    <TrapezoidRib
      key={index}
      x={-width / 2 + 0.06 + actualPitch * (index + 0.5)}
      height={height - 0.1}
      depth={depth}
      material={material}
    />
  ));
}

function CladdingEmbossments({ width, height, profile, material }) {
  if (profile === "smooth") {
    return (
      <RoundedBox
        args={[width - 0.085, height - 0.085, 0.01]}
        radius={0.014}
        smoothness={3}
        position={[0, 0, 0.037]}
        material={material}
        castShadow
      />
    );
  }
  const settings = {
    linear: { pitch: 0.16, depth: 0.012 },
    macro_linear: { pitch: 0.26, depth: 0.017 },
    micro_linear: { pitch: 0.065, depth: 0.007 },
    micro_wave: { pitch: 0.075, depth: 0.009 },
  }[profile] || { pitch: 0.16, depth: 0.012 };
  const horizontalCount = Math.max(5, Math.floor((height - 0.08) / settings.pitch));
  const horizontalPitch = (height - 0.1) / horizontalCount;
  return Array.from({ length: horizontalCount }, (_, index) => {
    const y = -height / 2 + 0.05 + horizontalPitch * (index + 0.5);
    if (profile === "macro_linear" || profile === "linear") {
      return <HorizontalCladdingRib key={index} y={y} width={width - 0.08} depth={settings.depth} material={material} />;
    }
    return (
      <RoundedBox
        key={index}
        args={[width - 0.08, Math.max(0.008, horizontalPitch * 0.22), settings.depth]}
        radius={0.004}
        smoothness={2}
        position={[0, y, 0.038 + settings.depth * 0.35]}
        material={material}
        castShadow
      />
    );
  });
}

function CladdingPanelSkin({ width, height, scene, material }) {
  const rowHeight = WALL_PANEL_DIMENSIONS.moduleWidthM;
  const rowCount = Math.max(1, Math.floor((height - 0.08) / rowHeight));
  return (
    <group position={[-width / 2 + 0.04, -height / 2 + rowHeight / 2, 0.052]}>
      {Array.from({ length: rowCount }, (_, index) => (
        <Clone
          key={index}
          object={scene}
          position={[0, index * rowHeight, 0]}
          rotation={[0, 0, -Math.PI / 2]}
          scale={[rowHeight, (width - 0.08) / 3, 1]}
          inject={<meshPhysicalMaterial {...materialProps(material)} />}
        />
      ))}
    </group>
  );
}

function SectionalEmbossments({ width, height, segmentHeight, material }) {
  const count = Math.max(4, Math.round(height / segmentHeight));
  const joint = 0.014;
  const panelHeight = (height - 0.065 - joint * (count - 1)) / count;
  return (
    <group>
      <mesh position={[0, 0, 0.034]} material={materials.darkVoid}>
        <boxGeometry args={[width - 0.055, height - 0.055, 0.012]} />
      </mesh>
      {Array.from({ length: count }, (_, index) => {
        const y = -height / 2 + 0.0325 + panelHeight / 2 + index * (panelHeight + joint);
        return (
          <RoundedBox
            key={index}
            args={[width - 0.06, panelHeight, 0.018]}
            radius={0.009}
            smoothness={2}
            position={[0, y, 0.045]}
            material={material}
            castShadow
            receiveShadow
          />
        );
      })}
    </group>
  );
}

function PassiveDoorBolts({ height, meetingSide, highDetail }) {
  if (!highDetail) return null;
  return (
    <group position={[meetingSide * 0.035, 0, 0.078]}>
      <mesh material={materials.galvanized} castShadow>
        <boxGeometry args={[0.025, height - 0.2, 0.018]} />
      </mesh>
      {[-1, 1].map((verticalSide) => (
        <group key={verticalSide} position={[0, verticalSide * (height / 2 - 0.13), 0.012]}>
          <RoundedBox args={[0.06, 0.12, 0.028]} radius={0.01} smoothness={2} material={materials.galvanized} castShadow />
          <mesh position={[0, verticalSide * 0.075, 0]} material={materials.stainlessSteel}>
            <cylinderGeometry args={[0.009, 0.009, 0.15, 12]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function DoorPanel({
  width,
  height,
  model,
  material,
  handleSide,
  activeLeaf,
  leverRef,
  highDetail,
  claddingProfile,
  claddingScene,
}) {
  const glassHeight = model.glazing > 0 ? height * model.glazing : 0;
  const lowerHeight = glassHeight > 0 ? height - glassHeight - 0.15 : height;
  const glassWidth = width - 0.18;

  return (
    <group>
      <RoundedBox
        args={[width - 0.018, height - 0.018, 0.062]}
        radius={0.012}
        smoothness={3}
        material={material}
        castShadow
        receiveShadow
      />
      <RectFrame
        width={width - 0.03}
        height={height - 0.03}
        rail={0.025}
        depth={0.016}
        material={material}
        z={0.038}
      />
      <RectFrame
        width={width - 0.006}
        height={height - 0.006}
        rail={0.014}
        depth={0.02}
        material={materials.gasket}
        z={-0.036}
        castShadow={false}
      />

      {model.embossment === "trapezoid_t10" && (
        <TrapezoidEmbossments
          width={width}
          height={height}
          pitch={model.ribPitchM}
          depth={model.ribDepthM}
          material={material}
        />
      )}

      {model.embossment === "cladding_profile" && (
        claddingScene
          ? <CladdingPanelSkin width={width} height={height} scene={claddingScene} material={material} />
          : (
            <CladdingEmbossments
              width={width}
              height={height}
              profile={claddingProfile}
              material={material}
            />
          )
      )}

      {model.embossment === "sectional_panels" && (
        <SectionalEmbossments
          width={width}
          height={height}
          segmentHeight={model.segmentHeightM || 0.42}
          material={material}
        />
      )}

      {(model.embossment === "horizontal_inset" || model.embossment === "vision_frame") && (
        <HorizontalEmbossments
          width={width}
          height={lowerHeight}
          count={model.embossmentCount || 3}
          material={material}
          centerY={glassHeight > 0 ? -(glassHeight + 0.15) / 2 : 0}
          topInset={glassHeight > 0 ? 0.02 : 0.07}
          bottomInset={0.07}
        />
      )}

      {glassHeight > 0 && (
        <group position={[0, height / 2 - glassHeight / 2 - 0.075, 0.052]}>
          <RectFrame width={glassWidth + 0.075} height={glassHeight + 0.075} rail={0.038} depth={0.032} material={materials.gasket} />
          <RectFrame width={glassWidth + 0.035} height={glassHeight + 0.035} rail={0.024} depth={0.04} material={material} z={0.013} />
          <DoubleGlazing width={glassWidth} height={glassHeight} glassMaterial={materials.glass} highDetail={highDetail} />
        </group>
      )}

      {activeLeaf && (
        <group position={[handleSide * (width / 2 - 0.115), -height * 0.04, 0.087]}>
          <DoorHandle
            side={handleSide}
            style={model.handleStyle}
            leverRef={leverRef}
            highDetail={highDetail}
          />
        </group>
      )}

      {!activeLeaf && model.passiveBolt && (
        <PassiveDoorBolts height={height} meetingSide={-handleSide} highDetail={highDetail} />
      )}
    </group>
  );
}

export function DoorLeaf({ opening, quality = "high", cladding }) {
  const model = getDoorModel(opening);
  const claddingProfile = getCladdingProfile(cladding);
  const { scene: claddingScene } = useGLTF(claddingProfile.url);
  const color = model.matchCladding ? getCladdingColor(cladding) : getDoorColor(opening);
  const material = useMemo(
    () => getPaintedMetalMaterial(color, "door", {
      quality,
      projection: "local",
      roughness: 0.4,
      clearcoat: 0.12,
    }),
    [color, quality],
  );
  const updateOpening = useConfiguratorStore((state) => state.updateOpening);
  const leafRefs = useRef([]);
  const handleRefs = useRef([]);
  const progress = useRef(opening.open ? 1 : 0);
  const leafCount = model.leafCount || 1;
  const gap = leafCount === 2 ? 0.022 : 0;
  const leafWidth = opening.widthM / leafCount - gap;
  const highDetail = sceneQualityProfile(quality).highDetail;

  useFrame((_, dt) => {
    progress.current = MathUtils.damp(progress.current, opening.open ? 1 : 0, 7, dt);
    leafRefs.current.forEach((leaf, index) => {
      if (!leaf) return;
      const hingeSide = leafCount === 2
        ? (index === 0 ? -1 : 1)
        : (opening.hinge === "right" ? 1 : -1);
      const activeLeaf = leafCount === 1 || index === 1;
      const leafProgress = activeLeaf
        ? progress.current
        : MathUtils.smoothstep(progress.current, 0.24, 0.96);
      leaf.rotation.y = hingeSide * leafProgress * Math.PI * 0.53;
    });
    handleRefs.current.forEach((lever, index) => {
      if (!lever) return;
      const activeLeaf = leafCount === 1 || index === 1;
      const hingeSide = leafCount === 2
        ? (index === 0 ? -1 : 1)
        : (opening.hinge === "right" ? 1 : -1);
      const handlePress = activeLeaf
        ? Math.sin(MathUtils.clamp(progress.current * 5, 0, 1) * Math.PI)
        : 0;
      lever.rotation.z = hingeSide * handlePress * 0.42;
    });
  });

  const toggle = (event) => {
    event.stopPropagation();
    updateOpening(opening.id, { open: !opening.open });
  };

  return (
    <group name="service-door" onClick={toggle}>
      <RectFrame
        width={opening.widthM + 0.018}
        height={opening.heightM + 0.018}
        rail={0.032}
        depth={0.07}
        material={materials.gasket}
        z={-0.018}
      />

      {Array.from({ length: leafCount }, (_, index) => {
        const hingeSide = leafCount === 2
          ? (index === 0 ? -1 : 1)
          : (opening.hinge === "right" ? 1 : -1);
        const centerX = leafCount === 2
          ? (index === 0 ? -opening.widthM / 4 : opening.widthM / 4)
          : 0;
        const pivotX = centerX + hingeSide * leafWidth / 2;
        const activeLeaf = leafCount === 1 || index === 1;
        return (
          <group
            key={index}
            ref={(element) => {
              leafRefs.current[index] = element;
            }}
            position={[pivotX, 0, 0.035]}
          >
            <group position={[-hingeSide * leafWidth / 2, 0, 0]}>
              <DoorPanel
                width={leafWidth}
                height={opening.heightM}
                model={model}
                material={material}
                handleSide={-hingeSide}
                activeLeaf={activeLeaf}
                leverRef={(element) => {
                  handleRefs.current[index] = element;
                }}
                highDetail={highDetail}
                claddingProfile={cladding?.profile || cladding?.wallProfile || "smooth"}
                claddingScene={model.matchCladding ? claddingScene : null}
              />
            </group>
          </group>
        );
      })}

      {Array.from({ length: leafCount }, (_, leafIndex) => {
        const x = leafCount === 2
          ? (leafIndex === 0 ? -opening.widthM / 2 + 0.018 : opening.widthM / 2 - 0.018)
          : (opening.hinge === "right" ? opening.widthM / 2 - 0.018 : -opening.widthM / 2 + 0.018);
        const hingeHints = model.hingeStyle === "surface_3d" ? [0.2, 0.5, 0.8] : [0.23, 0.77];
        return hingeHints.map((ratio) => (
          <group key={`${leafIndex}-${ratio}`} position={[x, -opening.heightM / 2 + opening.heightM * ratio, model.hingeStyle === "surface_3d" ? 0.07 : 0.082]}>
            {model.hingeStyle === "surface_3d" ? (
              <SurfaceHinge height={0.09} highDetail={highDetail} />
            ) : (
              <ConcealedHingeHint height={0.105} highDetail={highDetail} />
            )}
          </group>
        ));
      })}

      {leafCount === 2 && model.astragal && (
        <RoundedBox
          args={[0.065, opening.heightM - 0.035, 0.095]}
          radius={0.012}
          smoothness={3}
          position={[0, 0, 0.07]}
          material={material}
          castShadow
        />
      )}
      <mesh position={[0, -opening.heightM / 2 + 0.015, 0.035]} material={materials.stainlessSteel} receiveShadow>
        <boxGeometry args={[opening.widthM, 0.03, 0.12]} />
      </mesh>
    </group>
  );
}

Object.values(WALL_PROFILES).forEach((profile) => useGLTF.preload(profile.url));
