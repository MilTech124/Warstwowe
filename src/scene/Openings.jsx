import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import { MathUtils, MeshStandardMaterial } from "three";
import { wallOpeningTransform } from "@/scene/geometry";
import { materials } from "@/scene/materials";
import { getGateColor, getGateModel } from "@/config/catalog";
import { useConfiguratorStore } from "@/store/configuratorStore";

function Frame({ opening }) {
  const w = opening.widthM;
  const h = opening.heightM;
  const frame = 0.08;
  return (
    <group>
      <mesh position={[0, 0, -0.012]} material={materials.darkVoid}>
        <boxGeometry args={[w, h, 0.04]} />
      </mesh>
      <mesh position={[0, h / 2 + frame / 2, 0]} material={materials.trim} castShadow>
        <boxGeometry args={[w + frame * 2, frame, 0.08]} />
      </mesh>
      <mesh position={[-w / 2 - frame / 2, 0, 0]} material={materials.trim} castShadow>
        <boxGeometry args={[frame, h + frame * 2, 0.08]} />
      </mesh>
      <mesh position={[w / 2 + frame / 2, 0, 0]} material={materials.trim} castShadow>
        <boxGeometry args={[frame, h + frame * 2, 0.08]} />
      </mesh>
      <mesh position={[0, -h / 2 - frame / 2, 0]} material={materials.trim} castShadow>
        <boxGeometry args={[w + frame * 2, frame, 0.08]} />
      </mesh>
    </group>
  );
}

function DoorLeaf({ opening }) {
  return (
    <group>
      <mesh position={[0, 0, 0.018]} material={materials.gate} castShadow>
        <boxGeometry args={[opening.widthM, opening.heightM, 0.055]} />
      </mesh>
      <mesh position={[opening.widthM / 2 - 0.16, 0.05, 0.06]} material={materials.trim}>
        <boxGeometry args={[0.08, 0.035, 0.03]} />
      </mesh>
    </group>
  );
}

function WindowLeaf({ opening }) {
  return (
    <group>
      <mesh position={[0, 0, 0.03]} material={materials.glass}>
        <boxGeometry args={[opening.widthM, opening.heightM, 0.035]} />
      </mesh>
      <mesh position={[0, 0, 0.055]} material={materials.trim}>
        <boxGeometry args={[0.04, opening.heightM, 0.04]} />
      </mesh>
      <mesh position={[0, 0, 0.055]} material={materials.trim}>
        <boxGeometry args={[opening.widthM, 0.04, 0.04]} />
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
    return new MeshStandardMaterial({
      color: color.hex,
      roughness: wood ? 0.72 : structure === "microline" ? 0.6 : 0.5,
      metalness: wood ? 0.05 : 0.22,
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
      <mesh position={[0, 0, faceZ - 0.014]} material={materials.darkVoid}>
        <boxGeometry args={[w, h, 0.02]} />
      </mesh>
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
  const w = opening.widthM;
  const h = opening.heightM;

  const count = Math.max(4, Math.ceil(h / slatH));
  const faceZ = 0.02;
  const boxH = Math.max(0.3, slatH * 3.4);
  const boxDepth = Math.max(0.32, slatH * 3.6);
  const railX = w / 2 + 0.04;

  const closedYs = useMemo(
    () => Array.from({ length: count }, (_, i) => -h / 2 + slatH / 2 + i * slatH),
    [count, h, slatH],
  );

  const slatRefs = useRef([]);
  const sealRef = useRef(null);
  const progress = useRef(opening.open ? 1 : 0);
  const toggle = useGateToggle(opening);

  useFrame((_, dt) => {
    progress.current = MathUtils.damp(progress.current, opening.open ? 1 : 0, 6, dt);
    const shift = progress.current * h;
    closedYs.forEach((cy, i) => {
      const mesh = slatRefs.current[i];
      if (!mesh) return;
      const y = cy + shift;
      mesh.position.y = y;
      mesh.visible = y <= h / 2 - slatH * 0.5; // ponad nadprożem chowa się do skrzynki
    });
    if (sealRef.current) {
      const y = closedYs[0] + shift - slatH * 0.5;
      sealRef.current.position.y = y;
      sealRef.current.visible = y <= h / 2 - slatH;
    }
  });

  return (
    <group name="roller-gate" onClick={toggle}>
      <mesh position={[0, 0, faceZ - 0.03]} material={materials.darkVoid}>
        <boxGeometry args={[w, h, 0.02]} />
      </mesh>

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
          args={[w, slatH * 0.92, 0.05]}
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
    </group>
  );
}

function TiltingRibs({ layout, w, h, depth, material }) {
  const front = depth / 2 + 0.006;
  if (layout === "horizontal") {
    const count = Math.max(4, Math.round(h / 0.12));
    return Array.from({ length: count }, (_, i) => {
      const y = -h / 2 + ((i + 0.5) * h) / count;
      return (
        <mesh key={i} position={[0, y, front]} material={material} castShadow>
          <boxGeometry args={[w - 0.08, 0.05, 0.02]} />
        </mesh>
      );
    });
  }

  // pionowy lub skośny — pionowe żebra, ewentualnie pochylone
  const count = Math.max(5, Math.round(w / 0.12));
  const tilt = layout === "diagonal" ? 0.32 : 0;
  const ribH = layout === "diagonal" ? h * 0.78 : h - 0.08;
  return (
    <group rotation={[0, 0, tilt]}>
      {Array.from({ length: count }, (_, i) => {
        const x = -w / 2 + ((i + 0.5) * w) / count;
        return (
          <mesh key={i} position={[x, 0, front]} material={material} castShadow>
            <boxGeometry args={[0.05, ribH, 0.02]} />
          </mesh>
        );
      })}
    </group>
  );
}

function TiltingGate({ opening }) {
  const material = useGateMaterial(opening);
  const layout = opening.layout || "vertical";
  const w = opening.widthM;
  const h = opening.heightM;
  const faceZ = 0.03;
  const depth = 0.05;

  const pivotRef = useRef(null);
  const progress = useRef(opening.open ? 1 : 0);
  const toggle = useGateToggle(opening);

  useFrame((_, dt) => {
    progress.current = MathUtils.damp(progress.current, opening.open ? 1 : 0, 6, dt);
    const p = progress.current;
    if (pivotRef.current) {
      pivotRef.current.rotation.x = -p * Math.PI * 0.5; // up-and-over
      pivotRef.current.position.set(0, h / 2 + p * 0.12, faceZ + p * 0.28);
    }
  });

  return (
    <group name="tilting-gate" onClick={toggle}>
      <mesh position={[0, 0, -0.01]} material={materials.darkVoid}>
        <boxGeometry args={[w, h, 0.02]} />
      </mesh>

      {/* Skrzydło na zawiasie górnym */}
      <group ref={pivotRef} position={[0, h / 2, faceZ]}>
        <group position={[0, -h / 2, 0]}>
          <RoundedBox args={[w, h, depth]} radius={0.012} smoothness={2} material={material} castShadow receiveShadow />
          <TiltingRibs layout={layout} w={w} h={h} depth={depth} material={material} />
          {/* Klamka */}
          <mesh position={[w / 2 - 0.18, -h * 0.12, depth / 2 + 0.03]} material={materials.trim} castShadow>
            <boxGeometry args={[0.12, 0.04, 0.04]} />
          </mesh>
        </group>
      </group>

      {/* Ramiona / sprężyny naciągowe przy nadprożu */}
      {[-1, 1].map((sx) => (
        <mesh key={sx} position={[sx * (w / 2 + 0.04), h / 2 - 0.05, -0.12]} rotation={[0, 0, Math.PI / 2]} material={materials.steel} castShadow>
          <cylinderGeometry args={[0.02, 0.02, 0.3, 12]} />
        </mesh>
      ))}
    </group>
  );
}

function GateLeaf({ opening }) {
  if (opening.gateType === "roller") return <RollerGate opening={opening} />;
  if (opening.gateType === "tilting") return <TiltingGate opening={opening} />;
  return <SectionalGate opening={opening} />;
}

export function Openings({ config }) {
  return (
    <group name="openings-root">
      {config.openings.map((opening) => {
        const transform = wallOpeningTransform(opening, config.dimensions);
        return (
          <group key={opening.id} position={transform.position} rotation={transform.rotation}>
            <Frame opening={opening} />
            {opening.kind === "gate" && <GateLeaf opening={opening} />}
            {opening.kind === "door" && <DoorLeaf opening={opening} />}
            {opening.kind === "window" && <WindowLeaf opening={opening} />}
          </group>
        );
      })}
    </group>
  );
}
