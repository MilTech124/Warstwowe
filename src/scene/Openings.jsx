import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { MathUtils } from "three";
import { roofOpeningTransform, wallOpeningTransform } from "@/scene/geometry";
import { getPaintedMetalMaterial, getWoodGateMaterial, materials } from "@/scene/materials";
import {
  getCladdingColor,
  getDoorColor,
  getDoorModel,
  getGateColor,
  getGateModel,
  getWindowFrameColor,
  TILTING_LAYOUTS,
} from "@/config/catalog";
import { useConfiguratorStore } from "@/store/configuratorStore";
import { DoorLeaf as DetailedDoorLeaf } from "@/scene/openings/Doors";
import { WindowLeaf as DetailedWindowLeaf } from "@/scene/openings/Windows";
import {
  GateLeaf as RealisticGateLeaf,
  GateOpeningFrame,
} from "@/scene/openings/Gates";
import { getGateMountMetrics } from "@/scene/openings/gateGeometry";
import { fitProfilePitch, T10SheetModules } from "@/scene/openings/T10Sheet";

function StandardFrame({ opening, cladding }) {
  const w = opening.widthM;
  const h = opening.heightM;
  const frame = opening.kind === "gate" ? 0.08 : opening.kind === "door" ? 0.035 : 0.055;
  const doorModel = opening.kind === "door" ? getDoorModel(opening) : null;
  const frameColor = opening.kind === "door"
    ? (doorModel?.matchCladding ? getCladdingColor(cladding) : getDoorColor(opening))
    : opening.kind === "window" || opening.kind === "roofWindow"
      ? getWindowFrameColor(opening)
      : null;
  const frameMaterial = useMemo(
    () => frameColor
      ? getPaintedMetalMaterial(frameColor.hex, "flashing", { roughness: 0.34 })
      : materials.trim,
    [frameColor?.hex],
  );
  const showBottom = opening.kind === "window" || opening.kind === "roofWindow";
  const revealDepth = opening.kind === "gate" ? 0 : Math.max(0.08, (cladding?.wallPirThicknessMm || cladding?.thicknessMm || 60) / 1000 + 0.045);
  const trimZ = opening.kind === "gate" ? -0.055 : -0.145;
  const trimDepth = opening.kind === "gate" ? 0.045 : 0.035;
  return (
    <group name={`${opening.kind}-reveal`}>
      {opening.kind !== "gate" && (
        <group name={`${opening.kind}-reveal-tunnel`} position={[0, 0, -revealDepth / 2]}>
          <mesh position={[0, h / 2 + frame / 2, 0]} material={frameMaterial} receiveShadow>
            <boxGeometry args={[w + frame * 2, frame, revealDepth]} />
          </mesh>
          <mesh position={[-w / 2 - frame / 2, 0, 0]} material={frameMaterial} receiveShadow>
            <boxGeometry args={[frame, h + frame * 2, revealDepth]} />
          </mesh>
          <mesh position={[w / 2 + frame / 2, 0, 0]} material={frameMaterial} receiveShadow>
            <boxGeometry args={[frame, h + frame * 2, revealDepth]} />
          </mesh>
          <mesh position={[0, -h / 2 - frame / 2, 0]} material={opening.kind === "door" ? materials.stainlessSteel : frameMaterial} receiveShadow>
            <boxGeometry args={[w + frame * 2, frame, revealDepth]} />
          </mesh>
        </group>
      )}
      <mesh position={[0, h / 2 + frame / 2, trimZ]} material={frameMaterial} castShadow>
        <boxGeometry args={[w + frame * 2, frame, trimDepth]} />
      </mesh>
      <mesh position={[-w / 2 - frame / 2, 0, trimZ]} material={frameMaterial} castShadow>
        <boxGeometry args={[frame, h + frame * 2, trimDepth]} />
      </mesh>
      <mesh position={[w / 2 + frame / 2, 0, trimZ]} material={frameMaterial} castShadow>
        <boxGeometry args={[frame, h + frame * 2, trimDepth]} />
      </mesh>
      {showBottom && (
        <mesh position={[0, -h / 2 - frame / 2, trimZ]} material={frameMaterial} castShadow>
          <boxGeometry args={[w + frame * 2, frame, trimDepth]} />
        </mesh>
      )}
      {!showBottom && (
        <mesh position={[0, -h / 2 + 0.012, trimZ + 0.015]} material={materials.rubberSeal}>
          <boxGeometry args={[w, 0.025, trimDepth]} />
        </mesh>
      )}
    </group>
  );
}

function Frame({ opening, config }) {
  if (opening.kind === "gate") {
    return <GateOpeningFrame opening={opening} config={config} />;
  }
  return <StandardFrame opening={opening} cladding={config.cladding} />;
}

function useOpeningToggle(opening) {
  const updateOpening = useConfiguratorStore((state) => state.updateOpening);
  return (event) => {
    event.stopPropagation();
    updateOpening(opening.id, { open: !opening.open });
  };
}

function DoorPanel({ width, height, model, material, handleSide = 1 }) {
  const glassHeight = model.glazing > 0 ? height * model.glazing : 0;
  const ribCount = model.panelLayout === "vertical"
    ? Math.max(4, Math.round(width / 0.14))
    : Math.max(3, Math.round(height / 0.34));
  return (
    <group>
      <RoundedBox args={[width - 0.018, height - 0.018, 0.062]} radius={0.012} smoothness={2} material={material} castShadow receiveShadow />
      {model.panelLayout === "vertical"
        ? Array.from({ length: ribCount - 1 }, (_, index) => {
            const x = -width / 2 + ((index + 1) * width) / ribCount;
            return (
              <mesh key={index} position={[x, -glassHeight * 0.32, 0.035]} material={materials.darkVoid}>
                <boxGeometry args={[0.012, Math.max(0.25, height - glassHeight - 0.14), 0.008]} />
              </mesh>
            );
          })
        : Array.from({ length: ribCount - 1 }, (_, index) => {
            const usableHeight = Math.max(0.3, height - glassHeight - 0.12);
            const y = -height / 2 + 0.06 + ((index + 1) * usableHeight) / ribCount;
            return (
              <mesh key={index} position={[0, y, 0.035]} material={materials.darkVoid}>
                <boxGeometry args={[width - 0.08, 0.01, 0.008]} />
              </mesh>
            );
          })}
      {glassHeight > 0 && (
        <group position={[0, height / 2 - glassHeight / 2 - 0.09, 0.04]}>
          <mesh material={materials.rubberSeal}>
            <boxGeometry args={[width - 0.15, glassHeight, 0.025]} />
          </mesh>
          <mesh position={[0, 0, 0.018]} material={materials.glass} castShadow>
            <boxGeometry args={[width - 0.2, glassHeight - 0.05, 0.018]} />
          </mesh>
        </group>
      )}
      <group position={[handleSide * (width / 2 - 0.13), -height * 0.05, 0.078]}>
        <mesh material={materials.handle} castShadow>
          <boxGeometry args={[0.035, 0.15, 0.035]} />
        </mesh>
        <mesh position={[-handleSide * 0.045, 0.055, 0]} material={materials.handle} castShadow>
          <boxGeometry args={[0.09, 0.028, 0.035]} />
        </mesh>
        <mesh position={[0, -0.13, -0.003]} material={materials.handle}>
          <cylinderGeometry args={[0.018, 0.018, 0.012, 16]} />
        </mesh>
      </group>
    </group>
  );
}

function DoorLeaf({ opening }) {
  const model = getDoorModel(opening);
  const color = getDoorColor(opening);
  const material = useMemo(
    () => getPaintedMetalMaterial(color.hex, "gate", { roughness: 0.4, clearcoat: 0.12 }),
    [color.hex],
  );
  const leafRefs = useRef([]);
  const progress = useRef(opening.open ? 1 : 0);
  const toggle = useOpeningToggle(opening);
  const leafCount = model.leafCount || 1;
  const gap = leafCount === 2 ? 0.018 : 0;
  const leafWidth = opening.widthM / leafCount - gap;

  useFrame((_, dt) => {
    progress.current = MathUtils.damp(progress.current, opening.open ? 1 : 0, 7, dt);
    leafRefs.current.forEach((leaf, index) => {
      if (!leaf) return;
      const hingeSide = leafCount === 2
        ? (index === 0 ? -1 : 1)
        : (opening.hinge === "right" ? 1 : -1);
      leaf.rotation.y = hingeSide * progress.current * Math.PI * 0.53;
    });
  });

  return (
    <group name="service-door" onClick={toggle}>
      <mesh position={[0, 0, -0.025]} material={materials.darkVoid}>
        <boxGeometry args={[opening.widthM, opening.heightM, 0.025]} />
      </mesh>
      {Array.from({ length: leafCount }, (_, index) => {
        const hingeSide = leafCount === 2
          ? (index === 0 ? -1 : 1)
          : (opening.hinge === "right" ? 1 : -1);
        const centerX = leafCount === 2
          ? (index === 0 ? -opening.widthM / 4 : opening.widthM / 4)
          : 0;
        const pivotX = centerX + hingeSide * leafWidth / 2;
        return (
          <group
            key={index}
            ref={(element) => {
              leafRefs.current[index] = element;
            }}
            position={[pivotX, 0, 0.035]}
          >
            <group position={[-hingeSide * leafWidth / 2, 0, 0]}>
              <DoorPanel width={leafWidth} height={opening.heightM} model={model} material={material} handleSide={-hingeSide} />
            </group>
          </group>
        );
      })}
      {Array.from({ length: leafCount }, (_, leafIndex) => {
        const x = leafCount === 2
          ? (leafIndex === 0 ? -opening.widthM / 2 + 0.015 : opening.widthM / 2 - 0.015)
          : (opening.hinge === "right" ? opening.widthM / 2 - 0.015 : -opening.widthM / 2 + 0.015);
        return [0.22, 0.5, 0.78].map((ratio) => (
          <mesh key={`${leafIndex}-${ratio}`} position={[x, -opening.heightM / 2 + opening.heightM * ratio, 0.07]} rotation={[Math.PI / 2, 0, 0]} material={materials.hinge} castShadow>
            <cylinderGeometry args={[0.018, 0.018, 0.11, 14]} />
          </mesh>
        ));
      })}
    </group>
  );
}

function WindowSash({ width, height, frameMaterial, glassMaterial }) {
  const frame = Math.min(0.065, width * 0.1, height * 0.1);
  return (
    <group>
      <mesh position={[0, 0, -0.006]} material={materials.rubberSeal}>
        <boxGeometry args={[width, height, 0.025]} />
      </mesh>
      <mesh position={[0, 0, 0.012]} material={glassMaterial} castShadow>
        <boxGeometry args={[Math.max(0.08, width - frame * 2), Math.max(0.08, height - frame * 2), 0.018]} />
      </mesh>
      <mesh position={[0, height / 2 - frame / 2, 0.034]} material={frameMaterial} castShadow>
        <boxGeometry args={[width, frame, 0.062]} />
      </mesh>
      <mesh position={[0, -height / 2 + frame / 2, 0.034]} material={frameMaterial} castShadow>
        <boxGeometry args={[width, frame, 0.062]} />
      </mesh>
      <mesh position={[-width / 2 + frame / 2, 0, 0.034]} material={frameMaterial} castShadow>
        <boxGeometry args={[frame, height, 0.062]} />
      </mesh>
      <mesh position={[width / 2 - frame / 2, 0, 0.034]} material={frameMaterial} castShadow>
        <boxGeometry args={[frame, height, 0.062]} />
      </mesh>
    </group>
  );
}

function WindowLeaf({ opening }) {
  const model = getWindowModel(opening);
  const frameColor = getWindowFrameColor(opening);
  const glass = getWindowGlass(opening);
  const frameMaterial = useMemo(
    () => getPaintedMetalMaterial(frameColor.hex, "flashing", { roughness: 0.3, clearcoat: 0.16 }),
    [frameColor.hex],
  );
  const glassMaterial = useMemo(() => getGlassMaterial(glass), [glass.tint, glass.roughness, glass.transmission]);
  const sashRefs = useRef([]);
  const progress = useRef(opening.open ? 1 : 0);
  const toggle = useOpeningToggle(opening);
  const panes = model.panes || 1;
  const mullion = panes > 1 ? 0.055 : 0;
  const sashWidth = (opening.widthM - mullion * (panes - 1)) / panes;
  const operable = model.operation !== "fixed";

  useFrame((_, dt) => {
    progress.current = MathUtils.damp(progress.current, opening.open && operable ? 1 : 0, 7, dt);
    sashRefs.current.forEach((sash, index) => {
      if (!sash) return;
      const hingeSide = panes === 2
        ? (index === 0 ? -1 : 1)
        : (opening.hinge === "right" ? 1 : -1);
      sash.rotation.y = hingeSide * progress.current * Math.PI * 0.42;
    });
  });

  return (
    <group name="window-system" onClick={operable ? toggle : undefined}>
      <mesh position={[0, 0, -0.026]} material={materials.darkVoid}>
        <boxGeometry args={[opening.widthM, opening.heightM, 0.025]} />
      </mesh>
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
              sashRefs.current[index] = element;
            }}
            position={[pivotX, 0, 0.03]}
          >
            <group position={[-hingeSide * sashWidth / 2, 0, 0]}>
              <WindowSash width={sashWidth} height={opening.heightM} frameMaterial={frameMaterial} glassMaterial={glassMaterial} />
              {operable && (
                <mesh position={[-hingeSide * (sashWidth / 2 - 0.075), 0, 0.083]} material={materials.handle} castShadow>
                  <boxGeometry args={[0.025, 0.13, 0.027]} />
                </mesh>
              )}
            </group>
          </group>
        );
      })}
      <mesh position={[0, -opening.heightM / 2 - 0.055, 0.07]} material={frameMaterial} castShadow receiveShadow>
        <boxGeometry args={[opening.widthM + 0.14, 0.055, 0.18]} />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Bramy WIŚNIOWSKI
// ---------------------------------------------------------------------------

function useGateMaterial(opening) {
  const color = getGateColor(opening);
  const structure = opening.structure;
  return useMemo(() => {
    const wood = color.wood || structure === "woodgrain";
    if (wood) return getWoodGateMaterial(color.hex);
    return getPaintedMetalMaterial(color.hex, "gate", {
      roughness: structure === "microline" ? 0.56 : 0.46,
    });
  }, [color.hex, color.wood, structure]);
}

function useGateToggle(opening) {
  const updateOpening = useConfiguratorStore((state) => state.updateOpening);
  return (event) => {
    event.stopPropagation();
    updateOpening(opening.id, { open: !opening.open });
  };
}

// Kaseton płaski z podwójną linią ramki (przetłoczenie kasetonowe)
function CassettePanel({ w, panelH, depth, material }) {
  const front = depth / 2;
  const count = Math.max(3, Math.round(w / 0.66));
  const gap = 0.045;
  const margin = 0.05;
  const border = 0.035;
  const cellW = (w - margin * 2 - gap * (count - 1)) / count;
  const cellH = panelH - margin * 2;
  return (
    <group>
      <RoundedBox args={[w, panelH, depth]} radius={0.01} smoothness={2} material={material} castShadow receiveShadow />
      {Array.from({ length: count }, (_, i) => {
        const x = -w / 2 + margin + cellW / 2 + i * (cellW + gap);
        return (
          <group key={i} position={[x, 0, front]}>
            {/* wpuszczona linia — zewnętrzna ramka kasetonu (cień u wejścia we wgłębienie) */}
            <mesh position={[0, 0, -0.0015]} material={materials.darkVoid}>
              <boxGeometry args={[cellW, cellH, 0.006]} />
            </mesh>
            {/* pierwszy stopień wgłębienia */}
            <RoundedBox args={[cellW - border, cellH - border, 0.01]} radius={0.012} smoothness={3} position={[0, 0, -0.0055]} material={material} />
            {/* druga, wewnętrzna linia ramki — głębszy rowek */}
            <mesh position={[0, 0, -0.006]} material={materials.darkVoid}>
              <boxGeometry args={[cellW - border * 1.6, cellH - border * 1.6, 0.003]} />
            </mesh>
            {/* dno wgłębienia kasetonu — najgłębiej schowane pole */}
            <RoundedBox args={[cellW - border * 2.4, cellH - border * 2.4, 0.012]} radius={0.01} smoothness={3} position={[0, 0, -0.0075]} material={material} />
          </group>
        );
      })}
    </group>
  );
}

// Lico panelu segmentowego z przetłoczeniami (poziome rowki = pasy nad ciemnym tłem)
function GatePanel({ w, panelH, depth, pattern, material }) {
  if (pattern === "cassette") {
    return <CassettePanel w={w} panelH={panelH} depth={depth} material={material} />;
  }

  let bands = 1;
  let groove = 0;
  if (pattern === "high") {
    bands = Math.max(2, Math.round(panelH / 0.3)); // 1 linia na segment
    groove = 0.012;
  } else if (pattern === "low") {
    bands = Math.max(3, Math.round(panelH / 0.2)); // 2 linie na segment
    groove = 0.007;
  }

  if (bands === 1) {
    // bez przetłoczeń — pełny gładki panel
    return <RoundedBox args={[w, panelH, depth]} radius={0.01} smoothness={2} material={material} castShadow receiveShadow />;
  }

  const bandH = (panelH - groove * (bands - 1)) / bands;
  return (
    <group>
      {/* ciemne tło — rowki między pasami czytają się jako cień */}
      <mesh position={[0, 0, depth / 2 - 0.02]} material={materials.darkVoid}>
        <boxGeometry args={[w * 0.997, panelH, 0.02]} />
      </mesh>
      {Array.from({ length: bands }, (_, i) => {
        const cy = -panelH / 2 + bandH / 2 + i * (bandH + groove);
        return (
          <RoundedBox
            key={i}
            args={[w, bandH, depth]}
            radius={Math.min(0.01, bandH * 0.3)}
            smoothness={2}
            position={[0, cy, 0]}
            material={material}
            castShadow
            receiveShadow
          />
        );
      })}
    </group>
  );
}

function GateTracks({ w, h, r, zV, horizLength }) {
  const railX = w / 2 + 0.05;
  const topY = h / 2;
  const horizY = topY + r;
  const horizZ = zV - r - horizLength / 2;
  const rollerCount = Math.max(3, Math.round(h / 0.5));
  const rollerYs = Array.from({ length: rollerCount }, (_, i) => -h / 2 + ((i + 0.5) * h) / rollerCount);

  const Side = ({ sx }) => (
    <group>
      <mesh position={[sx * railX, 0, zV]} material={materials.track} castShadow receiveShadow>
        <boxGeometry args={[0.05, h, 0.07]} />
      </mesh>
      <mesh position={[sx * railX, topY, zV - r]} rotation={[0, -Math.PI / 2, 0]} material={materials.track} castShadow>
        <torusGeometry args={[r, 0.022, 10, 16, Math.PI / 2]} />
      </mesh>
      <mesh position={[sx * railX, horizY, horizZ]} material={materials.track} castShadow receiveShadow>
        <boxGeometry args={[0.05, 0.06, horizLength]} />
      </mesh>
      <mesh position={[sx * railX, horizY + 0.16, horizZ - horizLength * 0.32]} material={materials.track}>
        <boxGeometry args={[0.025, 0.32, 0.03]} />
      </mesh>
      {rollerYs.map((cy, index) => (
        <mesh key={index} position={[sx * (w / 2 + 0.025), cy, zV]} rotation={[0, 0, Math.PI / 2]} material={materials.roller} castShadow>
          <cylinderGeometry args={[0.028, 0.028, 0.06, 14]} />
        </mesh>
      ))}
    </group>
  );

  return (
    <group name="gate-tracks">
      <Side sx={1} />
      <Side sx={-1} />
      <mesh position={[0, horizY, zV - r]} rotation={[0, 0, Math.PI / 2]} material={materials.roller} castShadow>
        <cylinderGeometry args={[0.018, 0.018, w + 0.3, 16]} />
      </mesh>
      {[-1, 1].map((sx) => (
        <mesh key={sx} position={[sx * w * 0.16, horizY, zV - r]} rotation={[0, 0, Math.PI / 2]} material={materials.track} castShadow>
          <cylinderGeometry args={[0.042, 0.042, w * 0.24, 18]} />
        </mesh>
      ))}
      <mesh position={[0, horizY, zV - r]} material={materials.track} castShadow>
        <boxGeometry args={[0.1, 0.14, 0.05]} />
      </mesh>
    </group>
  );
}

function SectionalGate({ opening }) {
  const material = useGateMaterial(opening);
  const model = getGateModel(opening);
  const pattern = opening.pattern || model.defaultPattern || "smooth";
  const w = opening.widthM;
  const h = opening.heightM;

  const panelHeightM = model.panelHeightM || 0.5;
  const count = Math.max(3, Math.round(h / panelHeightM));
  const groove = 0.016;
  const panelH = (h - groove * (count - 1)) / count;
  const depth = 0.06;
  const faceZ = 0.025;

  // Parametry toru jezdnego (spójne z GateTracks)
  const r = Math.min(0.35, h * 0.22);
  const zV = -0.05;
  const topY = h / 2;
  const horizY = topY + r;
  const horizLength = Math.max(0.9, h * 0.95);
  const arc = (r * Math.PI) / 2;

  const closedCenters = useMemo(
    () => Array.from({ length: count }, (_, i) => -h / 2 + panelH / 2 + i * (panelH + groove)),
    [count, h, panelH],
  );

  const panelRefs = useRef([]);
  const progress = useRef(opening.open ? 1 : 0);
  const toggle = useGateToggle(opening);

  useFrame((_, dt) => {
    progress.current = MathUtils.damp(progress.current, opening.open ? 1 : 0, 6, dt);
    const shift = progress.current * h;
    closedCenters.forEach((cy, i) => {
      const group = panelRefs.current[i];
      if (!group) return;
      const s = cy + h / 2 + shift; // dystans wzdłuż toru od dołu
      let y;
      let z;
      let rotX;
      if (s <= h) {
        y = -h / 2 + s;
        z = MathUtils.lerp(faceZ, zV, MathUtils.clamp(shift / 0.18, 0, 1));
        rotX = 0;
      } else if (s <= h + arc) {
        const th = (s - h) / r;
        y = topY + r * Math.sin(th);
        z = zV - r + r * Math.cos(th);
        rotX = th;
      } else {
        const d = Math.min(s - (h + arc), horizLength);
        y = horizY;
        z = zV - r - d;
        rotX = Math.PI / 2;
      }
      group.position.set(0, y, z);
      group.rotation.x = rotX;
    });
  });

  return (
    <group name="sectional-gate" onClick={toggle}>
      {closedCenters.map((cy, i) => (
        <group
          key={i}
          ref={(el) => {
            panelRefs.current[i] = el;
          }}
          position={[0, cy, faceZ]}
        >
          <GatePanel w={w} panelH={panelH} depth={depth} pattern={pattern} material={material} />
        </group>
      ))}
      <GateTracks w={w} h={h} r={r} zV={zV} horizLength={horizLength} />
    </group>
  );
}

function RollerGate({ opening }) {
  const material = useGateMaterial(opening);
  const model = getGateModel(opening);
  const slatH = (model.slatHeightMm || 77) / 1000;
  const slatDepth = Math.min(0.022, slatH * 0.25);
  const w = opening.widthM;
  const h = opening.heightM;

  const count = Math.max(4, Math.ceil(h / slatH));
  const faceZ = 0.02;
  const boxH = Math.max(0.34, slatH * 3.6);
  const boxDepth = Math.max(0.36, slatH * 3.8);
  const shaftRadius = Math.max(0.1, slatH * 1.25);
  const shaftZ = faceZ - shaftRadius;
  const railX = w / 2 + 0.04;

  const closedYs = useMemo(
    () => Array.from({ length: count }, (_, i) => -h / 2 + slatH / 2 + i * slatH),
    [count, h, slatH],
  );

  const slatRefs = useRef([]);
  const sealRef = useRef(null);
  const progress = useRef(opening.open ? 1 : 0);
  const toggle = useGateToggle(opening);

  const placeOnRollPath = (object, distance) => {
    const angle = distance / shaftRadius;
    const radius = shaftRadius + (angle / (Math.PI * 2)) * slatDepth * 0.85;
    object.position.set(
      0,
      h / 2 + radius * Math.sin(angle),
      shaftZ + radius * Math.cos(angle),
    );
    object.rotation.x = angle;
  };

  useFrame((_, dt) => {
    progress.current = MathUtils.damp(progress.current, opening.open ? 1 : 0, 3.2, dt);
    const shift = progress.current * h;
    closedYs.forEach((cy, i) => {
      const mesh = slatRefs.current[i];
      if (!mesh) return;
      const y = cy + shift;
      if (y <= h / 2) {
        mesh.position.set(0, y, faceZ);
        mesh.rotation.x = 0;
      } else {
        placeOnRollPath(mesh, y - h / 2);
      }
    });
    if (sealRef.current) {
      const y = closedYs[0] + shift - slatH * 0.5;
      if (y <= h / 2) {
        sealRef.current.position.set(0, y, faceZ);
        sealRef.current.rotation.x = 0;
      } else {
        placeOnRollPath(sealRef.current, y - h / 2);
      }
    }
  });

  return (
    <group name="roller-gate" onClick={toggle}>
      {/* Prowadnice boczne */}
      <mesh position={[-railX, 0, faceZ - 0.012]} material={materials.track} castShadow receiveShadow>
        <boxGeometry args={[0.05, h + 0.04, 0.08]} />
      </mesh>
      <mesh position={[railX, 0, faceZ - 0.012]} material={materials.track} castShadow receiveShadow>
        <boxGeometry args={[0.05, h + 0.04, 0.08]} />
      </mesh>

      {/* Kurtyna z profili */}
      {closedYs.map((cy, i) => (
        <RoundedBox
          key={i}
          ref={(el) => {
            slatRefs.current[i] = el;
          }}
          args={[w, slatH * 0.92, slatDepth]}
          radius={Math.min(0.018, slatH * 0.35)}
          smoothness={2}
          position={[0, cy, faceZ]}
          material={material}
          castShadow
          receiveShadow
        />
      ))}

      {/* Profil dolny z uszczelką */}
      <mesh ref={sealRef} position={[0, closedYs[0] - slatH * 0.5, faceZ]} material={materials.gateSeal}>
        <boxGeometry args={[w, 0.03, 0.055]} />
      </mesh>

      {/* Skrzynka nawojowa nad nadprożem */}
      <RoundedBox args={[w + 0.2, boxH, boxDepth]} radius={0.04} smoothness={3} position={[0, h / 2 + boxH / 2, faceZ - boxDepth / 2 + 0.05]} material={materials.gateBox} castShadow receiveShadow />
      <mesh position={[0, h / 2, shaftZ]} rotation={[0, 0, Math.PI / 2]} material={materials.galvanized} castShadow>
        <cylinderGeometry args={[0.042, 0.042, w + 0.12, 20]} />
      </mesh>
    </group>
  );
}

function TiltingGateHandle({ depth, height }) {
  const front = depth / 2 + 0.045;
  return (
    <group name="tilting-gate-central-pvc1-handle" position={[0, -height * 0.14, front]}>
      <RoundedBox args={[0.058, 0.145, 0.017]} radius={0.006} smoothness={2} material={materials.hardwarePlastic} castShadow />
      <mesh position={[0, 0.026, 0.02]} rotation={[Math.PI / 2, 0, 0]} material={materials.hardwarePlastic} castShadow>
        <cylinderGeometry args={[0.018, 0.018, 0.034, 20]} />
      </mesh>
      <RoundedBox args={[0.126, 0.024, 0.03]} radius={0.006} smoothness={2} position={[0.008, 0.026, 0.036]} material={materials.hardwarePlastic} castShadow />
      <mesh position={[0, -0.038, 0.019]} rotation={[Math.PI / 2, 0, 0]} material={materials.hardwarePlastic} castShadow>
        <cylinderGeometry args={[0.012, 0.012, 0.023, 18]} />
      </mesh>
      <mesh position={[0, -0.038, 0.033]} material={materials.handle} castShadow>
        <boxGeometry args={[0.0035, 0.012, 0.0035]} />
      </mesh>
    </group>
  );
}

function TiltingGate({ opening }) {
  const material = useGateMaterial(opening);
  const model = getGateModel(opening);
  const layout = opening.layout || model.defaultLayout || "vertical_low";
  const layoutSpec = TILTING_LAYOUTS[layout] || TILTING_LAYOUTS.vertical_low;
  const w = opening.widthM;
  const h = opening.heightM;
  const sheetWidth = w - 0.075;
  const sheetHeight = h - 0.075;
  const profileSpan = layoutSpec.orientation === "horizontal" ? sheetHeight : sheetWidth;
  const nominalProfileSpan = layoutSpec.orientation === "horizontal" ? h : w;
  const profilePitch = fitProfilePitch(profileSpan, layoutSpec.pitchM, layoutSpec.fitMode, nominalProfileSpan);
  const faceZ = 0.03;
  const depth = 0.05;

  const motionRef = useRef(null);
  const progress = useRef(opening.open ? 1 : 0);
  const toggle = useGateToggle(opening);

  useFrame((_, dt) => {
    progress.current = MathUtils.damp(progress.current, opening.open ? 1 : 0, 3, dt);
    const p = MathUtils.smoothstep(progress.current, 0, 1);
    const outwardSweep = Math.sin(Math.PI * p) * 0.22;
    if (motionRef.current) {
      motionRef.current.rotation.x = -p * Math.PI * 0.5;
      motionRef.current.position.set(
        0,
        p * (h / 2 + 0.12),
        faceZ + outwardSweep - p * (h / 2 + 0.24),
      );
    }
  });

  return (
    <group name="tilting-gate" onClick={toggle}>
      <group ref={motionRef} position={[0, 0, faceZ]}>
        <RoundedBox args={[w, h, depth]} radius={0.012} smoothness={2} material={material} castShadow receiveShadow />
        <group position={[0, 0, depth / 2 + 0.001]}>
          <T10SheetModules
            width={sheetWidth}
            height={sheetHeight}
            orientation={layoutSpec.orientation}
            pitch={profilePitch}
            depth={layoutSpec.depthM}
            profileKind={layoutSpec.profileKind}
            material={material}
          />
        </group>
        <TiltingGateHandle depth={depth} height={h} />
        <mesh position={[0, -h / 2 - 0.012, 0]} material={materials.gateSeal}>
          <boxGeometry args={[w, 0.025, depth + 0.012]} />
        </mesh>
      </group>

      {[-1, 1].map((sx) => (
        <group key={sx}>
          <mesh position={[sx * (w / 2 + 0.04), h / 2 + 0.12, -h / 2 - 0.14]} material={materials.track} castShadow receiveShadow>
            <boxGeometry args={[0.04, 0.045, h + 0.28]} />
          </mesh>
          <mesh position={[sx * (w / 2 + 0.04), h / 2 - 0.05, -0.12]} rotation={[0, 0, Math.PI / 2]} material={materials.steel} castShadow>
            <cylinderGeometry args={[0.02, 0.02, 0.3, 12]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function GateLeaf({ opening }) {
  if (opening.gateType === "roller") return <RollerGate opening={opening} />;
  if (opening.gateType === "tilting") return <TiltingGate opening={opening} />;
  return <SectionalGate opening={opening} />;
}

export function Openings({ config, quality = "high" }) {
  return (
    <group name="openings-root">
      {config.openings.map((opening) => {
        if (opening.kind === "roofWindow") {
          const roofTransform = roofOpeningTransform(opening, config);
          return (
            <group key={opening.id} position={roofTransform.position} rotation={roofTransform.rotation}>
              <group position={roofTransform.localPosition} rotation={roofTransform.localRotation}>
                <Frame opening={opening} config={config} />
                <group position={[0, 0, -0.06]}>
                  <DetailedWindowLeaf opening={opening} quality={quality} />
                </group>
              </group>
            </group>
          );
        }
        const transform = wallOpeningTransform(opening, config.dimensions);
        const insertZ = opening.kind === "door" ? -0.035 : -0.18;
        const gateMount = opening.kind === "gate"
          ? getGateMountMetrics(opening, config.cladding, config.flashings)
          : null;
        const legacyGateZ = gateMount
          ? gateMount.leafFaceZ - (opening.gateType === "tilting" ? 0.03 : 0.02)
          : 0;
        return (
          <group key={opening.id} position={transform.position} rotation={transform.rotation}>
            <Frame opening={opening} config={config} />
            {opening.kind === "gate" && opening.gateType === "sectional" && (
              <RealisticGateLeaf opening={opening} config={config} />
            )}
            {opening.kind === "gate" && opening.gateType !== "sectional" && (
              <group position={[0, 0, legacyGateZ]}>
                <GateLeaf opening={opening} />
              </group>
            )}
            {opening.kind === "door" && (
              <group position={[0, 0, insertZ]}>
                <DetailedDoorLeaf opening={opening} quality={quality} cladding={config.cladding} />
              </group>
            )}
            {opening.kind === "window" && (
              <group position={[0, 0, insertZ]}>
                <DetailedWindowLeaf opening={opening} quality={quality} />
              </group>
            )}
          </group>
        );
      })}
    </group>
  );
}
