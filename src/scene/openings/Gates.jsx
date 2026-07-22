import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BufferGeometry,
  Float32BufferAttribute,
  MathUtils,
} from "three";
import {
  FLASHING_COLORS,
  getGateColor,
  getGateModel,
  getRoofCladdingColor,
} from "@/config/catalog";
import {
  getGateSurfaceMaterial,
  getPaintedMetalMaterial,
  materials,
} from "@/scene/materials";
import { useConfiguratorStore } from "@/store/configuratorStore";
import {
  GATE_FLASHING_SHEET_M,
  getGateMountMetrics,
  getTiltingProfileMetrics,
} from "@/scene/openings/gateGeometry";

function useGateToggle(opening) {
  const updateOpening = useConfiguratorStore((state) => state.updateOpening);
  return (event) => {
    event.stopPropagation();
    updateOpening(opening.id, { open: !opening.open });
  };
}

function useGateMaterial(opening) {
  const color = getGateColor(opening);
  const structure = opening.gateType === "sectional" ? opening.structure : "silkline";
  return useMemo(
    () => getGateSurfaceMaterial(color.hex, color.wood ? "woodgrain" : structure),
    [color.hex, color.wood, structure],
  );
}

function resolveFlashingHex(config) {
  if (config.flashings?.color === "roof_match") {
    return getRoofCladdingColor(config.cladding).hex;
  }
  return FLASHING_COLORS[config.flashings?.color]?.hex || getRoofCladdingColor(config.cladding).hex;
}

export function GateOpeningFrame({ opening, config }) {
  const metrics = getGateMountMetrics(opening, config.cladding, config.flashings);
  const material = useMemo(
    () => getPaintedMetalMaterial(resolveFlashingHex(config), "flashing", {
      roughness: 0.38,
      clearcoat: 0.1,
    }),
    [config.cladding, config.flashings?.color],
  );
  const w = opening.widthM;
  const h = opening.heightM;
  const flange = metrics.trimWidthM;
  const frontZ = metrics.flashingFaceZ;
  const revealZ = (metrics.revealFrontZ + metrics.revealBackZ) / 2;
  const revealDepth = metrics.revealDepthM;
  const sealDepth = 0.014;
  const showFrontFlange = config.flashings?.enabled !== false;

  return (
    <group name="gate-folded-opening-flashings">
      {showFrontFlange && (
        <group name="gate-front-flange">
          <mesh position={[-w / 2 - flange / 2, 0, frontZ]} material={material} castShadow receiveShadow>
            <boxGeometry args={[flange, h + flange * 2, GATE_FLASHING_SHEET_M]} />
          </mesh>
          <mesh position={[w / 2 + flange / 2, 0, frontZ]} material={material} castShadow receiveShadow>
            <boxGeometry args={[flange, h + flange * 2, GATE_FLASHING_SHEET_M]} />
          </mesh>
          <mesh position={[0, h / 2 + flange / 2, frontZ]} material={material} castShadow receiveShadow>
            <boxGeometry args={[w + flange * 2, flange, GATE_FLASHING_SHEET_M]} />
          </mesh>
          <mesh position={[0, h / 2 + flange * 0.16, frontZ + 0.01]} material={material} castShadow>
            <boxGeometry args={[w + flange * 2, GATE_FLASHING_SHEET_M, 0.022]} />
          </mesh>
        </group>
      )}

      <group name="gate-reveal-liners">
        <mesh position={[-w / 2, 0, revealZ]} material={material} receiveShadow>
          <boxGeometry args={[GATE_FLASHING_SHEET_M, h, revealDepth]} />
        </mesh>
        <mesh position={[w / 2, 0, revealZ]} material={material} receiveShadow>
          <boxGeometry args={[GATE_FLASHING_SHEET_M, h, revealDepth]} />
        </mesh>
        <mesh position={[0, h / 2, revealZ]} material={material} receiveShadow>
          <boxGeometry args={[w, GATE_FLASHING_SHEET_M, revealDepth]} />
        </mesh>
      </group>

      <group name="gate-perimeter-seals" position={[0, 0, metrics.leafFaceZ + 0.009]}>
        <mesh position={[-w / 2 + 0.012, 0, 0]} material={materials.gateSeal}>
          <boxGeometry args={[0.024, h, sealDepth]} />
        </mesh>
        <mesh position={[w / 2 - 0.012, 0, 0]} material={materials.gateSeal}>
          <boxGeometry args={[0.024, h, sealDepth]} />
        </mesh>
        <mesh position={[0, h / 2 - 0.012, 0]} material={materials.gateSeal}>
          <boxGeometry args={[w - 0.024, 0.024, sealDepth]} />
        </mesh>
      </group>
    </group>
  );
}

function GateGroove({ width, y = 0, vertical = false }) {
  return vertical ? (
    <group position={[y, 0, 0.0008]}>
      <mesh material={materials.gasket}>
        <boxGeometry args={[0.0024, width, 0.0018]} />
      </mesh>
      <mesh position={[0.0035, 0, 0.0008]} material={materials.galvanized}>
        <boxGeometry args={[0.0012, width, 0.001]} />
      </mesh>
    </group>
  ) : (
    <group position={[0, y, 0.0008]}>
      <mesh material={materials.gasket}>
        <boxGeometry args={[width, 0.0024, 0.0018]} />
      </mesh>
      <mesh position={[0, 0.0035, 0.0008]} material={materials.galvanized}>
        <boxGeometry args={[width, 0.0012, 0.001]} />
      </mesh>
    </group>
  );
}

function CassetteRelief({ width, height, material }) {
  const columns = Math.max(3, Math.round(width / 0.72));
  const marginX = 0.075;
  const marginY = 0.055;
  const gap = 0.045;
  const cellWidth = (width - marginX * 2 - gap * (columns - 1)) / columns;
  const cellHeight = Math.max(0.12, height - marginY * 2);

  return Array.from({ length: columns }, (_, index) => {
    const x = -width / 2 + marginX + cellWidth / 2 + index * (cellWidth + gap);
    const border = Math.min(0.026, cellHeight * 0.16);
    return (
      <group key={index} position={[x, 0, 0.001]}>
        <mesh position={[0, cellHeight / 2 - border / 2, 0.0015]} material={material}>
          <boxGeometry args={[cellWidth, border, 0.003]} />
        </mesh>
        <mesh position={[0, -cellHeight / 2 + border / 2, 0.0015]} material={material}>
          <boxGeometry args={[cellWidth, border, 0.003]} />
        </mesh>
        <mesh position={[-cellWidth / 2 + border / 2, 0, 0.0015]} material={material}>
          <boxGeometry args={[border, cellHeight, 0.003]} />
        </mesh>
        <mesh position={[cellWidth / 2 - border / 2, 0, 0.0015]} material={material}>
          <boxGeometry args={[border, cellHeight, 0.003]} />
        </mesh>
        <mesh position={[0, 0, -0.001]} material={material} receiveShadow>
          <boxGeometry args={[cellWidth - border * 2, cellHeight - border * 2, 0.0015]} />
        </mesh>
      </group>
    );
  });
}

function SectionalPanel({ width, height, depth, pattern, material }) {
  const vPitch = 0.082;
  const vCount = Math.max(4, Math.floor(width / vPitch));

  return (
    <group>
      <mesh position={[0, 0, -depth / 2]} material={material} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
      </mesh>
      {pattern === "high" && <GateGroove width={width - 0.03} />}
      {pattern === "low" && (
        <>
          <GateGroove width={width - 0.03} y={-height / 6} />
          <GateGroove width={width - 0.03} y={height / 6} />
        </>
      )}
      {pattern === "cassette" && <CassetteRelief width={width} height={height} material={material} />}
      {pattern === "v" && Array.from({ length: vCount - 1 }, (_, index) => {
        const x = -width / 2 + ((index + 1) * width) / vCount;
        return <GateGroove key={index} width={height - 0.025} y={x} vertical />;
      })}
    </group>
  );
}

function SectionalTracks({ width, height, radius, depth }) {
  const railX = width / 2 + 0.065;
  const railZ = -depth - 0.055;
  const horizontalY = height / 2 + radius;
  const horizontalLength = height + 0.65;

  return (
    <group name="sectional-inner-tracks">
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * railX, 0, railZ]} material={materials.track} castShadow receiveShadow>
            <boxGeometry args={[0.034, height, 0.045]} />
          </mesh>
          <mesh position={[side * railX, height / 2, -radius]} rotation={[0, -Math.PI / 2, 0]} material={materials.track} castShadow>
            <torusGeometry args={[radius, 0.016, 8, 20, Math.PI / 2]} />
          </mesh>
          <mesh position={[side * railX, horizontalY, -radius - horizontalLength / 2]} material={materials.track} castShadow receiveShadow>
            <boxGeometry args={[0.034, 0.045, horizontalLength]} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, horizontalY + 0.12, -radius - 0.14]} material={materials.galvanized} castShadow>
        <boxGeometry args={[width + 0.28, 0.035, 0.035]} />
      </mesh>
    </group>
  );
}

function SectionalGate({ opening }) {
  const material = useGateMaterial(opening);
  const model = getGateModel(opening);
  const pattern = opening.pattern || model.defaultPattern || "smooth";
  const visibleWidth = opening.widthM;
  const panelWidth = visibleWidth + 0.08;
  const height = opening.heightM;
  const depth = model.panelThicknessM || 0.04;
  const count = Math.max(3, Math.round(height / (model.panelHeightM || 0.55)));
  const joint = 0.004;
  const panelHeight = (height - joint * (count - 1)) / count;
  const radius = Math.min(0.32, Math.max(0.22, height * 0.14));
  const arcLength = radius * Math.PI / 2;
  const closedCenters = useMemo(
    () => Array.from({ length: count }, (_, index) => -height / 2 + panelHeight / 2 + index * (panelHeight + joint)),
    [count, height, panelHeight],
  );
  const panelRefs = useRef([]);
  const progress = useRef(opening.open ? 1 : 0);
  const toggle = useGateToggle(opening);

  useFrame((_, delta) => {
    progress.current = MathUtils.damp(progress.current, opening.open ? 1 : 0, 6.5, delta);
    const shift = progress.current * height;
    closedCenters.forEach((closedY, index) => {
      const panel = panelRefs.current[index];
      if (!panel) return;
      const distance = closedY + height / 2 + shift;
      let y = -height / 2 + distance;
      let z = 0;
      let rotationX = 0;

      if (distance > height && distance <= height + arcLength) {
        const angle = (distance - height) / radius;
        y = height / 2 + radius * Math.sin(angle);
        z = -radius + radius * Math.cos(angle);
        rotationX = angle;
      } else if (distance > height + arcLength) {
        const horizontalDistance = distance - height - arcLength;
        y = height / 2 + radius;
        z = -radius - horizontalDistance;
        rotationX = Math.PI / 2;
      }

      panel.position.set(0, y, z);
      panel.rotation.x = rotationX;
    });
  });

  return (
    <group name="sectional-gate-realistic" onClick={toggle}>
      {closedCenters.map((centerY, index) => (
        <group
          key={index}
          ref={(element) => {
            panelRefs.current[index] = element;
          }}
          position={[0, centerY, 0]}
        >
          <SectionalPanel width={panelWidth} height={panelHeight} depth={depth} pattern={pattern} material={material} />
          {[-1, 1].map((side) => (
            <mesh key={side} position={[side * (panelWidth / 2 + 0.025), 0, -depth - 0.015]} rotation={[0, 0, Math.PI / 2]} material={materials.roller} castShadow>
              <cylinderGeometry args={[0.022, 0.022, 0.05, 14]} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[0, -height / 2 - 0.013, -depth * 0.35]} material={materials.gateSeal}>
        <boxGeometry args={[visibleWidth, 0.026, 0.032]} />
      </mesh>
      <SectionalTracks width={visibleWidth} height={height} radius={radius} depth={depth} />
    </group>
  );
}

function RollerShaftCover({ width, radius, coverType }) {
  const coverWidth = width + 0.25;
  const coverHeight = radius * 2 + 0.08;
  const coverDepth = radius * 2 + 0.12;
  const centerY = radius + 0.04;
  const centerZ = -radius - 0.07;

  return (
    <group name={`roller-${coverType}-shaft-cover`}>
      <mesh position={[0, centerY, centerZ]} material={materials.gateBox} castShadow receiveShadow>
        <boxGeometry args={[coverWidth, coverHeight, coverType === "full" ? coverDepth : 0.045]} />
      </mesh>
      {coverType === "full" && (
        <mesh position={[0, 0.025, centerZ]} material={materials.gateBox} castShadow>
          <boxGeometry args={[coverWidth, 0.045, coverDepth]} />
        </mesh>
      )}
      <mesh position={[0, centerY, centerZ]} rotation={[0, 0, Math.PI / 2]} material={materials.galvanized} castShadow>
        <cylinderGeometry args={[0.045, 0.045, width + 0.16, 20]} />
      </mesh>
    </group>
  );
}

function RollerGate({ opening }) {
  const material = useGateMaterial(opening);
  const model = getGateModel(opening);
  const slatHeight = (model.slatHeightMm || 77) / 1000;
  const slatDepth = (model.slatDepthMm || 19) / 1000;
  const width = opening.widthM + 0.025;
  const height = opening.heightM;
  const count = Math.max(5, Math.ceil(height / slatHeight));
  const shaftRadius = 0.16;
  const closedCenters = useMemo(
    () => Array.from({ length: count }, (_, index) => -height / 2 + slatHeight / 2 + index * slatHeight),
    [count, height, slatHeight],
  );
  const slatRefs = useRef([]);
  const bottomRef = useRef(null);
  const progress = useRef(opening.open ? 1 : 0);
  const toggle = useGateToggle(opening);

  const placeOnRollPath = (object, distanceAboveHeader) => {
    const angle = distanceAboveHeader / shaftRadius;
    const layer = Math.floor(angle / (Math.PI * 2));
    const radius = shaftRadius + layer * slatDepth * 0.72;
    object.position.y = height / 2 + radius * Math.sin(angle);
    object.position.z = -radius + radius * Math.cos(angle);
    object.rotation.x = angle;
  };

  useFrame((_, delta) => {
    progress.current = MathUtils.damp(progress.current, opening.open ? 1 : 0, 6.5, delta);
    const shift = progress.current * height;
    closedCenters.forEach((closedY, index) => {
      const slat = slatRefs.current[index];
      if (!slat) return;
      const y = closedY + shift;
      if (y <= height / 2) {
        slat.position.set(0, y, 0);
        slat.rotation.x = 0;
      } else {
        placeOnRollPath(slat, y - height / 2);
      }
    });

    if (bottomRef.current) {
      const y = -height / 2 + shift;
      if (y <= height / 2) {
        bottomRef.current.position.set(0, y, 0);
        bottomRef.current.rotation.x = 0;
      } else {
        placeOnRollPath(bottomRef.current, y - height / 2);
      }
    }
  });

  return (
    <group name="roller-gate-realistic" onClick={toggle}>
      <group name="roller-inner-guides">
        {[-1, 1].map((side) => (
          <group key={side}>
            <mesh position={[side * (opening.widthM / 2 + 0.055), 0, -0.075]} material={materials.track} castShadow receiveShadow>
              <boxGeometry args={[0.055, height + 0.08, 0.1]} />
            </mesh>
            <mesh position={[side * (opening.widthM / 2 + 0.022), 0, -0.012]} material={materials.gateSeal}>
              <boxGeometry args={[0.012, height, 0.025]} />
            </mesh>
          </group>
        ))}
      </group>

      {closedCenters.map((centerY, index) => (
        <group
          key={index}
          ref={(element) => {
            slatRefs.current[index] = element;
          }}
          position={[0, centerY, 0]}
        >
          <mesh position={[0, 0, -slatDepth / 2]} rotation={[0, 0, Math.PI / 2]} material={material} castShadow receiveShadow>
            <capsuleGeometry args={[slatHeight * 0.46, Math.max(0.01, width - slatHeight * 0.92), 4, 8]} />
          </mesh>
          <mesh position={[0, -slatHeight * 0.42, -0.001]} material={materials.gasket}>
            <boxGeometry args={[width - 0.03, 0.002, 0.003]} />
          </mesh>
        </group>
      ))}

      <group ref={bottomRef} position={[0, -height / 2, 0]}>
        <mesh position={[0, 0.03, -0.02]} material={material} castShadow>
          <boxGeometry args={[width, (model.bottomProfileMm || 85) / 1000, 0.04]} />
        </mesh>
        {[0, 0.012, 0.024].map((offset) => (
          <mesh key={offset} position={[0, -0.02, -0.012 - offset]} rotation={[0, 0, Math.PI / 2]} material={materials.gateSeal}>
            <cylinderGeometry args={[0.006, 0.006, width - 0.02, 10]} />
          </mesh>
        ))}
      </group>

      <group position={[0, height / 2, 0]}>
        <RollerShaftCover width={opening.widthM} radius={shaftRadius} coverType={model.shaftCover || "partial"} />
      </group>
    </group>
  );
}

function makeTrapezoidRibGeometry(length, baseWidth, topWidth, depth, horizontal) {
  const geometry = new BufferGeometry();
  const halfLength = length / 2;
  const halfBase = baseWidth / 2;
  const halfTop = topWidth / 2;
  const points = horizontal
    ? [
        [-halfLength, -halfBase, -depth], [halfLength, -halfBase, -depth],
        [-halfLength, halfBase, -depth], [halfLength, halfBase, -depth],
        [-halfLength, -halfTop, 0], [halfLength, -halfTop, 0],
        [-halfLength, halfTop, 0], [halfLength, halfTop, 0],
      ]
    : [
        [-halfBase, -halfLength, -depth], [-halfBase, halfLength, -depth],
        [halfBase, -halfLength, -depth], [halfBase, halfLength, -depth],
        [-halfTop, -halfLength, 0], [-halfTop, halfLength, 0],
        [halfTop, -halfLength, 0], [halfTop, halfLength, 0],
      ];
  const faces = [
    0, 1, 3, 0, 3, 2,
    4, 6, 7, 4, 7, 5,
    0, 4, 5, 0, 5, 1,
    2, 3, 7, 2, 7, 6,
    0, 2, 6, 0, 6, 4,
    1, 5, 7, 1, 7, 3,
  ];
  const positions = [];
  faces.forEach((index) => positions.push(...points[index]));
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function T10Sheet({ width, height, layout, material }) {
  const profile = getTiltingProfileMetrics(layout);
  const horizontal = profile.horizontal;
  const diagonal = profile.diagonal;
  const span = horizontal ? height : width;
  const run = horizontal ? width : height;
  const count = Math.max(4, Math.floor(span / profile.pitchM));
  const pitch = span / count;
  const ribGeometry = useMemo(
    () => makeTrapezoidRibGeometry(
      diagonal ? run * 0.84 : run - 0.035,
      Math.min(pitch * 0.62, 0.055),
      Math.min(pitch * 0.28, 0.024),
      profile.profileDepthM,
      horizontal,
    ),
    [diagonal, horizontal, pitch, profile.profileDepthM, run],
  );

  return (
    <group rotation={[0, 0, diagonal ? 0.32 : 0]}>
      <mesh position={[0, 0, -profile.profileDepthM - 0.0015]} material={material} castShadow receiveShadow>
        <boxGeometry args={[width - 0.025, height - 0.025, 0.003]} />
      </mesh>
      {Array.from({ length: count }, (_, index) => {
        const axis = -span / 2 + pitch / 2 + index * pitch;
        return (
          <mesh
            key={index}
            geometry={ribGeometry}
            position={horizontal ? [0, axis, 0] : [axis, 0, 0]}
            material={material}
            castShadow
            receiveShadow
          />
        );
      })}
    </group>
  );
}

function CityVentilation({ width, height, layout, material }) {
  if (layout === "city_louver") {
    const rows = 7;
    return (
      <group position={[0, 0, 0.002]}>
        {Array.from({ length: rows }, (_, index) => {
          const y = -height * 0.28 + (index * height * 0.56) / (rows - 1);
          return (
            <group key={index} position={[0, y, 0]}>
              <mesh material={materials.darkVoid}>
                <boxGeometry args={[width * 0.58, 0.026, 0.004]} />
              </mesh>
              <mesh position={[0, 0.017, 0.006]} rotation={[0.12, 0, 0]} material={material} castShadow>
                <boxGeometry args={[width * 0.6, 0.028, 0.012]} />
              </mesh>
            </group>
          );
        })}
      </group>
    );
  }

  const columns = Math.max(8, Math.min(18, Math.floor(width / 0.12)));
  return (
    <group position={[0, 0, 0.002]}>
      {[-0.12, 0.12].flatMap((ratio, row) =>
        Array.from({ length: columns }, (_, index) => {
          const x = -width * 0.42 + (index * width * 0.84) / (columns - 1);
          return (
            <mesh key={`${row}-${index}`} position={[x, height * ratio, 0]} material={materials.darkVoid}>
              <boxGeometry args={[0.034, 0.014, 0.004]} />
            </mesh>
          );
        }),
      )}
    </group>
  );
}

function TiltingGate({ opening }) {
  const material = useGateMaterial(opening);
  const model = getGateModel(opening);
  const layout = opening.layout || model.defaultLayout || "vertical_low";
  const width = opening.widthM + 0.045;
  const height = opening.heightM;
  const depth = 0.045;
  const motionRef = useRef(null);
  const progress = useRef(opening.open ? 1 : 0);
  const toggle = useGateToggle(opening);

  useFrame((_, delta) => {
    progress.current = MathUtils.damp(progress.current, opening.open ? 1 : 0, 5.8, delta);
    const p = MathUtils.smoothstep(progress.current, 0, 1);
    const outwardSweep = Math.sin(Math.PI * p) * 0.36;
    const inwardTravel = p * (height / 2 + 0.32);
    if (motionRef.current) {
      motionRef.current.position.set(0, p * (height / 2 + 0.14), outwardSweep - inwardTravel);
      motionRef.current.rotation.x = -p * Math.PI / 2;
    }
  });

  return (
    <group name="tilting-gate-realistic" onClick={toggle}>
      <group name="tilting-inner-mechanism">
        {[-1, 1].map((side) => (
          <group key={side}>
            <mesh position={[side * (opening.widthM / 2 + 0.07), height / 2 + 0.13, -height * 0.5]} material={materials.track} castShadow receiveShadow>
              <boxGeometry args={[0.04, 0.045, height + 0.5]} />
            </mesh>
            <mesh position={[side * (opening.widthM / 2 + 0.07), 0.18, -0.09]} rotation={[Math.PI / 2, 0, 0]} material={materials.galvanized} castShadow>
              <cylinderGeometry args={[0.026, 0.026, 0.38, 14]} />
            </mesh>
            <mesh position={[side * (opening.widthM / 2 + 0.07), -0.08, -0.09]} rotation={[Math.PI / 2, 0, 0]} material={materials.track}>
              <torusGeometry args={[0.035, 0.009, 6, 22, Math.PI * 4]} />
            </mesh>
          </group>
        ))}
      </group>

      <group ref={motionRef}>
        <mesh position={[0, 0, -depth / 2 - 0.012]} material={materials.darkVoid}>
          <boxGeometry args={[width + 0.035, height + 0.035, 0.018]} />
        </mesh>
        <mesh position={[0, 0, -depth / 2]} material={material} castShadow receiveShadow>
          <boxGeometry args={[width, height, depth]} />
        </mesh>
        <T10Sheet width={width - 0.04} height={height - 0.04} layout={layout} material={material} />
        {(layout === "city_perforated" || layout === "city_louver") && (
          <CityVentilation width={width} height={height} layout={layout} material={material} />
        )}
        <mesh position={[width / 2 - 0.2, -height * 0.12, 0.022]} material={materials.handle} castShadow>
          <boxGeometry args={[0.13, 0.038, 0.034]} />
        </mesh>
        <mesh position={[0, -height / 2 - 0.012, -0.006]} material={materials.gateSeal}>
          <boxGeometry args={[opening.widthM, 0.026, 0.032]} />
        </mesh>
      </group>
    </group>
  );
}

export function GateLeaf({ opening, config }) {
  const metrics = getGateMountMetrics(opening, config.cladding, config.flashings);

  return (
    <group name="gate-mounted-behind-opening" position={[0, 0, metrics.leafFaceZ]}>
      {opening.gateType === "roller" && <RollerGate opening={opening} />}
      {opening.gateType === "tilting" && <TiltingGate opening={opening} />}
      {opening.gateType !== "roller" && opening.gateType !== "tilting" && <SectionalGate opening={opening} />}
    </group>
  );
}
