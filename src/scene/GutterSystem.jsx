import { useMemo } from "react";
import { DoubleSide, Euler, Matrix4, Quaternion, Vector3 } from "three";
import { GUTTER_COLORS, getRoofCladdingColor } from "@/config/catalog";
import { roofFootprint, roofMetrics, slopedRoofLength } from "@/scene/geometry";
import { getPaintedMetalMaterial, materials } from "@/scene/materials";

// ----------------------------------------------------------------------------
// Konwencja lokalna rynny (GutterTrough / GutterHanger / LeafGuard):
//   lokalna os +X = „gora / otwor rynny"   (mapuje na +Y swiata)
//   lokalna os +Y = „dlugosc rynny"          (os cylindra three.js)
//   lokalna os +Z = „strona dachu"           (ku scianie / fascii)
//
// Polozenie rynien liczone jest z RZECZYWISTEJ transformacji polaci dachu
// (te same wzory co RoofSystem / FlashingSystem), wiec rynna trafia dokladnie
// pod krawedz kapania okapu niezaleznie od spadku i zwisow. Dla „odwroconego
// dwuspadu" (dach korytkowy) rynna prowadzona jest w dolinie i odprowadza wode
// do rur na scianach szczytowych.
// ----------------------------------------------------------------------------

const ROOF_PANEL_TOP = 0.06;         // gorna powierzchnia polaci (lokalnie) [m]
const HANGER_SPACING = 0.6;          // rozstaw hakow [m]
const STRAP_SPACING = 1.4;           // rozstaw opasek rury [m]
const DISCHARGE_CLEARANCE = 0.28;    // wysokosc dolnego kolana nad gruntem [m]
const DISCHARGE_PROJECTION = 0.17;   // odsuniecie wyrzutnika od sciany [m]
const DOWNSPOUT_INSET = 0.2;         // odsuniecie rury od naroznika [m]
const LONG_RUN_THRESHOLD = 11;       // dlugosc rynny → dodatkowa rura srodkowa [m]
const SCREW_RADIUS = 0.005;          // promien glowki sruby [m]

const UP = new Vector3(0, 1, 0);

// ----------------------------------------------------------------------------
// Material
// ----------------------------------------------------------------------------

function resolveGutterColor(config) {
  const key = config.gutters?.color;
  if (!key || key === "roof_match") {
    return getRoofCladdingColor(config.cladding).hex;
  }
  return GUTTER_COLORS[key]?.hex || getRoofCladdingColor(config.cladding).hex;
}

// Rynna half-round jest plaszczem otwartym (nie zamknieta bryla), a kamera
// czesto ogląda ja od gory/od wewnatrz otworu — bez DoubleSide tylna strona
// (widziana od strony wnetrza rynny) byla by niewidoczna (efekt przezroczystosci).
function gutterMaterial(config) {
  return getPaintedMetalMaterial(resolveGutterColor(config), "flashing", { side: DoubleSide });
}

const gutterInteriorMaterial = materials.trim.clone();
gutterInteriorMaterial.side = DoubleSide;

// ----------------------------------------------------------------------------
// Geometria pomocnicza
// ----------------------------------------------------------------------------

// Cylinder (domyslnie wzdluz +Y) laczacy 2 punkty swiata → pozycja, obrot, dlugosc.
function tubeBetween(start, end) {
  const a = new Vector3(...start);
  const b = new Vector3(...end);
  const dir = b.clone().sub(a);
  const length = Math.max(1e-4, dir.length());
  const quaternion = new Quaternion().setFromUnitVectors(UP, dir.clone().normalize());
  const position = a.clone().add(b).multiplyScalar(0.5).toArray();
  return { position, quaternion, length };
}

// Kwaternion rynny: lokalne +X→gora, +Y→dlugosc, +Z→strona dachu (inward).
function troughQuaternion(outward) {
  const inward = outward.clone().setY(0).normalize().negate();
  const yAxis = inward.clone().cross(UP).normalize();
  return new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(UP, yAxis, inward));
}

// Buduje opis biegu rynny wzdluz zwyklego (zewnetrznego) okapu.
//   eaveA/eaveB   - narozniki krawedzi kapania (powierzchnia polaci)
//   outward       - poziomy kierunek „od budynku"
//   wallLineConst - wspolrzedna lica sciany (z dla axis "x", x dla axis "z")
//   buildingHalf  - polowa dlugosci sciany wzdluz osi biegu
function makeEdgeRun({ eaveA, eaveB, outward, axis, wallLineConst, buildingHalf, radius, dsRadius, flashingApron }) {
  const outShift = radius * 0.45; // wysuniecie na zewnatrz, by rynna byla widoczna spod okapu

  // Domyslnie rynna wisi tuz pod krawedzia kapania okapu.
  let axisY = eaveA.y - (radius + 0.02);
  // Gdy zamontowany jest (pelnej wysokosci) pas okapowy, rynna montowana jest u
  // jego DOLU — gora rynny tuz pod dolna krawedzia fartucha, tak by kroplowka
  // wpadala do gornej czesci rynny, a sama rynna pozostawala dobrze widoczna
  // ponizej fartucha (a nie chowala sie za nim).
  if (flashingApron != null) {
    const fasciaBottomY = eaveA.y + 0.036 - flashingApron; // dolny brzeg pasa okapowego
    const hangAxis = fasciaBottomY + 0.02 - radius; // gora rynny ~2 cm ponizej dolu fartucha
    const lowestAxis = eaveA.y - 0.32 - radius; // limit dla bardzo glebokiego fartucha (premium)
    axisY = Math.min(axisY, Math.max(hangAxis, lowestAxis));
  }

  const dropY = eaveA.y - axisY;
  const shift = outward.clone().multiplyScalar(outShift).add(new Vector3(0, -dropY, 0));
  const gA = eaveA.clone().add(shift);
  const gB = eaveB.clone().add(shift);
  const mid = gA.clone().add(gB).multiplyScalar(0.5);
  const length = gA.distanceTo(gB);
  const otherWorld = axis === "x" ? mid.z : mid.x;

  const gap = dsRadius + 0.02;
  const alongMax = Math.max(0.1, buildingHalf - DOWNSPOUT_INSET);
  // Dla biegow wzdluz Z (single_left/right, dwuspad) konce rynny wypadaja na
  // scianie frontowej i tylnej. W praktyce montazowej rury spustowe umieszcza
  // sie od tylu budynku (front z brama pozostaje czysty), wiec dla tych biegow
  // pomijamy koniec od strony frontu (+Z).
  const restrictToBack = axis === "z";
  const alongs = restrictToBack
    ? (length >= LONG_RUN_THRESHOLD ? [-alongMax, 0] : [-alongMax])
    : [-alongMax, alongMax];
  if (!restrictToBack && length >= LONG_RUN_THRESHOLD) alongs.push(0);

  const outwardArr = outward.toArray();
  const downspouts = alongs.map((along) =>
    axis === "x"
      ? { outlet: [along, mid.y, otherWorld], wallX: along, wallZ: wallLineConst + outward.z * gap, outward: outwardArr }
      : { outlet: [otherWorld, mid.y, along], wallX: wallLineConst + outward.x * gap, wallZ: along, outward: outwardArr },
  );

  return {
    trough: { position: mid.toArray(), quaternion: troughQuaternion(outward), length },
    downspouts,
  };
}

// Buduje opis rynny dolinowej (dach korytkowy / „odwrocony dwuspad").
// Rynna biegnie wzdluz X w dolinie (z=0), woda splywa do rur na scianach bocznych.
function makeValleyRun({ valleyA, valleyB, radius, dsRadius, widthM }) {
  const drop = radius + 0.02;
  const mid = valleyA.clone().add(valleyB).multiplyScalar(0.5).add(new Vector3(0, -drop, 0));
  const length = valleyA.distanceTo(valleyB);
  const gap = dsRadius + 0.02;
  const z0 = mid.z;

  // Rury na scianach bocznych, na koncach doliny.
  const downspouts = [-1, 1].map((s) => ({
    outlet: [s * (widthM / 2 - DOWNSPOUT_INSET), mid.y, z0],
    wallX: s * (widthM / 2) + s * gap,
    wallZ: z0,
    outward: [s, 0, 0],
  }));

  return {
    // strona „dachu" nieokreslona (dolina po obu stronach) — bierzemy +Z.
    trough: { position: mid.toArray(), quaternion: troughQuaternion(new Vector3(0, 0, 1)), length },
    downspouts,
  };
}

// Zwraca liste biegow rynien dla danej konfiguracji.
function eaveRuns(config) {
  const { widthM, lengthM, wallHeightM } = config.dimensions;
  const metrics = roofMetrics(config);
  const { rise, angle: a } = metrics;
  const { centerX, centerZ, roofWidth, roofLength, frontRun, backRun, leftRun, rightRun } =
    roofFootprint(config);
  const type = config.roof.type;
  const radius = config.gutters.size / 2 / 1000;
  const dsRadius = config.gutters.downspoutSize / 2 / 1000;

  // Dlugosc fartucha pasa okapowego (edgeWidth*1.7 w FlashingSystem) — jesli
  // obrobka okapowa jest wlaczona, rynna osadza sie tak, by przyjac kroplowke.
  const flashingApron =
    config.flashings?.enabled && config.flashings?.roofEdges
      ? (config.flashings.package === "premium" ? 0.14 : 0.10) * 1.7
      : null;

  const slab = (p, euler) =>
    new Matrix4().makeRotationFromEuler(new Euler(...euler)).setPosition(new Vector3(...p));
  const corner = (m, x, y, z) => new Vector3(x, y, z).applyMatrix4(m);
  const edge = (props) => makeEdgeRun({ ...props, radius, dsRadius, flashingApron });

  if (type === "single_back" || type === "single_front") {
    const back = type === "single_back";
    const t = (centerZ + lengthM / 2) / lengthM;
    const visY = wallHeightM + (back ? t : 1 - t) * rise - 0.03;
    const angle = back ? -a : a;
    const zSign = back ? -1 : 1;
    const m = slab([centerX, visY, centerZ], [angle, 0, 0]);
    return [
      edge({
        axis: "x",
        eaveA: corner(m, -roofWidth / 2, ROOF_PANEL_TOP, (zSign * roofLength) / 2),
        eaveB: corner(m, roofWidth / 2, ROOF_PANEL_TOP, (zSign * roofLength) / 2),
        outward: new Vector3(0, 0, zSign),
        wallLineConst: (zSign * lengthM) / 2,
        buildingHalf: widthM / 2,
      }),
    ];
  }

  if (type === "single_left" || type === "single_right") {
    const left = type === "single_left";
    const t = (centerX + widthM / 2) / widthM;
    const visY = wallHeightM + (left ? t : 1 - t) * rise - 0.03;
    const angle = left ? a : -a;
    const xSign = left ? -1 : 1;
    const m = slab([centerX, visY, centerZ], [0, 0, angle]);
    return [
      edge({
        axis: "z",
        eaveA: corner(m, (xSign * roofWidth) / 2, ROOF_PANEL_TOP, -roofLength / 2),
        eaveB: corner(m, (xSign * roofWidth) / 2, ROOF_PANEL_TOP, roofLength / 2),
        outward: new Vector3(xSign, 0, 0),
        wallLineConst: (xSign * widthM) / 2,
        buildingHalf: lengthM / 2,
      }),
    ];
  }

  if (type === "gable_left_right") {
    // „Dwuspad": kalenica wzdluz Z, okapy niskie na lewej i prawej scianie.
    const rW = slopedRoofLength(rightRun, a);
    const lW = slopedRoofLength(leftRun, a);
    const visY = wallHeightM + rise / 2 - 0.03;
    const mR = slab([rightRun / 2, visY, centerZ], [0, 0, -a]);
    const mL = slab([-leftRun / 2, visY, centerZ], [0, 0, a]);
    return [
      edge({
        axis: "z",
        eaveA: corner(mR, rW / 2, ROOF_PANEL_TOP, -roofLength / 2),
        eaveB: corner(mR, rW / 2, ROOF_PANEL_TOP, roofLength / 2),
        outward: new Vector3(1, 0, 0),
        wallLineConst: widthM / 2,
        buildingHalf: lengthM / 2,
      }),
      edge({
        axis: "z",
        eaveA: corner(mL, -lW / 2, ROOF_PANEL_TOP, -roofLength / 2),
        eaveB: corner(mL, -lW / 2, ROOF_PANEL_TOP, roofLength / 2),
        outward: new Vector3(-1, 0, 0),
        wallLineConst: -widthM / 2,
        buildingHalf: lengthM / 2,
      }),
    ];
  }

  if (type === "gable_front_back") {
    // „Odwrocony dwuspad" (dach korytkowy): polacie spadaja do doliny w z=0.
    // Rynna dolinowa wzdluz X odprowadza wode do rur na scianach bocznych.
    const fL = slopedRoofLength(frontRun, a);
    const mF = slab([centerX, wallHeightM + rise / 2 - 0.03, frontRun / 2], [-a, 0, 0]);
    const valleyY = corner(mF, 0, ROOF_PANEL_TOP, -fL / 2).y;
    return [
      makeValleyRun({
        valleyA: new Vector3(-roofWidth / 2, valleyY, 0),
        valleyB: new Vector3(roofWidth / 2, valleyY, 0),
        radius,
        dsRadius,
        widthM,
      }),
    ];
  }

  return [];
}

// ----------------------------------------------------------------------------
// Rynna — przekroj polokragly (half_round) lub kasetonowy (box).
// Uklad lokalny: os Y = dlugosc, otwor na +X, dno na -X.
// ----------------------------------------------------------------------------

function GutterTrough({ length, size, profile, material }) {
  const radius = size / 2 / 1000;

  if (profile === "box") {
    const wall = 0.005;
    const widthBox = size / 1000;
    const depthBox = radius * 1.15;
    return (
      <group name="gutter-trough-box">
        <mesh castShadow receiveShadow material={material} position={[-depthBox / 2, 0, 0]}>
          <boxGeometry args={[wall, length, widthBox]} />
        </mesh>
        <mesh castShadow receiveShadow material={material} position={[0, 0, -widthBox / 2 + wall / 2]}>
          <boxGeometry args={[depthBox, length, wall]} />
        </mesh>
        <mesh castShadow receiveShadow material={material} position={[0, 0, widthBox / 2 - wall / 2]}>
          <boxGeometry args={[depthBox, length, wall]} />
        </mesh>
        <mesh receiveShadow material={gutterInteriorMaterial} position={[-depthBox / 2 + wall * 0.6, 0, 0]}>
          <boxGeometry args={[wall * 0.4, length * 0.998, widthBox - wall * 2]} />
        </mesh>
      </group>
    );
  }

  // half_round: plaszcz na dolnej polowie (x<=0), otwor skierowany na +X.
  return (
    <group name="gutter-trough-half-round">
      <mesh castShadow receiveShadow material={material}>
        <cylinderGeometry args={[radius, radius, length, 24, 1, true, -Math.PI, Math.PI]} />
      </mesh>
      <mesh receiveShadow material={gutterInteriorMaterial}>
        <cylinderGeometry args={[radius - 0.002, radius - 0.002, length * 0.999, 24, 1, true, -Math.PI, Math.PI]} />
      </mesh>
      <mesh castShadow material={material} position={[0, length / 2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[radius, 16, Math.PI / 2, Math.PI]} />
      </mesh>
      <mesh castShadow material={material} position={[0, -length / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[radius, 16, Math.PI / 2, Math.PI]} />
      </mesh>
    </group>
  );
}

function GutterHanger({ size, material }) {
  const radius = size / 2 / 1000;
  const t = 0.0018;
  const w = 0.022;
  const footLen = 0.05;
  return (
    <group name="gutter-hanger">
      <mesh castShadow material={material} position={[radius * 0.85, 0, 0]}>
        <boxGeometry args={[t, w, radius * 2.05]} />
      </mesh>
      <mesh castShadow material={material} position={[radius * 0.4, 0, radius * 0.98]}>
        <boxGeometry args={[radius * 0.95, w, t]} />
      </mesh>
      <mesh castShadow material={material} position={[radius * 0.85, 0, radius * 0.98 + footLen / 2]}>
        <boxGeometry args={[t, w, footLen]} />
      </mesh>
      <mesh
        castShadow
        material={materials.handle}
        position={[radius * 0.85 + t, 0, radius * 0.98 + footLen * 0.7]}
        rotation={[0, 0, Math.PI / 2]}
      >
        <cylinderGeometry args={[SCREW_RADIUS, SCREW_RADIUS, 0.012, 8]} />
      </mesh>
    </group>
  );
}

function GutterHangers({ length, size, material }) {
  const count = Math.max(2, Math.floor(length / HANGER_SPACING) + 1);
  return (
    <group name="gutter-hangers">
      {Array.from({ length: count }, (_, i) => {
        const y = -length / 2 + (length * i) / (count - 1);
        return <GutterHanger key={`hanger-${i}`} size={size} material={material} position={[0, y, 0]} />;
      })}
    </group>
  );
}

function LeafGuard({ length, size, material }) {
  const radius = size / 2 / 1000;
  const wire = 0.0016;
  const crossSpacing = 0.05;
  const crossCount = Math.max(4, Math.floor(length / crossSpacing));
  return (
    <group name="leaf-guard">
      {Array.from({ length: 3 }, (_, i) => {
        const z = -radius * 0.6 + i * radius * 0.6;
        return (
          <mesh key={`long-${i}`} castShadow material={material} position={[radius * 0.92, 0, z]}>
            <boxGeometry args={[wire, length, wire]} />
          </mesh>
        );
      })}
      {Array.from({ length: crossCount }, (_, i) => {
        const y = -length / 2 + (length * i) / (crossCount - 1);
        return (
          <mesh key={`cross-${i}`} castShadow material={material} position={[radius * 0.92, y, 0]}>
            <boxGeometry args={[wire, wire, radius * 1.5]} />
          </mesh>
        );
      })}
    </group>
  );
}

// ----------------------------------------------------------------------------
// Rura spustowa — budowana w WSPOLRZEDNYCH SWIATA.
// ----------------------------------------------------------------------------

function DropOutlet({ outlet, gutterRadius, radius, material }) {
  const height = 0.07;
  return (
    <group name="drop-outlet" position={[outlet[0], outlet[1] - height / 2 - 0.005, outlet[2]]}>
      <mesh castShadow material={material}>
        <cylinderGeometry args={[gutterRadius * 0.7, radius * 1.12, height, 18, 1, true]} />
      </mesh>
    </group>
  );
}

function DownspoutStrap({ x, y, z, radius, angle, material }) {
  const ring = radius + 0.006;
  const legOffset = radius + 0.02;
  return (
    <group name="downspout-strap" position={[x, y, z]} rotation={[0, angle, 0]}>
      <mesh castShadow material={material} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[ring, 0.004, 8, 20]} />
      </mesh>
      <mesh castShadow material={material} position={[legOffset, 0, -ring / 2 - 0.004]}>
        <boxGeometry args={[0.012, 0.03, ring]} />
      </mesh>
      <mesh castShadow material={material} position={[-legOffset, 0, -ring / 2 - 0.004]}>
        <boxGeometry args={[0.012, 0.03, ring]} />
      </mesh>
      <mesh castShadow material={materials.handle} position={[legOffset, 0, -ring - 0.004]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[SCREW_RADIUS, SCREW_RADIUS, 0.012, 8]} />
      </mesh>
      <mesh castShadow material={materials.handle} position={[-legOffset, 0, -ring - 0.004]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[SCREW_RADIUS, SCREW_RADIUS, 0.012, 8]} />
      </mesh>
    </group>
  );
}

function Collar({ from, to, radius, material }) {
  const seg = tubeBetween(from, to);
  return (
    <mesh castShadow material={material} position={seg.position} quaternion={seg.quaternion}>
      <cylinderGeometry args={[radius * 1.14, radius * 1.14, 0.03, 16, 1, true]} />
    </mesh>
  );
}

// Wylot rynny → labedzia szyja do lica sciany → pion → dolne kolano + wyrzutnik.
function DownspoutAssembly({ outlet, wallX, wallZ, outward, radius, gutterRadius, material }) {
  const geo = useMemo(() => {
    const dropBottom = [outlet[0], outlet[1] - 0.05, outlet[2]];
    const wallTop = [wallX, outlet[1] - 0.16, wallZ];
    const pipeBottom = [wallX, DISCHARGE_CLEARANCE, wallZ];
    const dischargeEnd = [
      wallX + outward[0] * DISCHARGE_PROJECTION,
      DISCHARGE_CLEARANCE - 0.09,
      wallZ + outward[2] * DISCHARGE_PROJECTION,
    ];

    const neck = tubeBetween(dropBottom, wallTop);
    const vertical = tubeBetween(wallTop, pipeBottom);
    const discharge = tubeBetween(pipeBottom, dischargeEnd);

    const runLen = vertical.length;
    const strapCount = Math.max(2, Math.floor(runLen / STRAP_SPACING) + 1);
    const strapYs = Array.from({ length: strapCount }, (_, i) => wallTop[1] - (runLen * (i + 0.5)) / strapCount);

    return { dropBottom, wallTop, pipeBottom, dischargeEnd, neck, vertical, discharge, strapYs };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outlet[0], outlet[1], outlet[2], wallX, wallZ, outward[0], outward[2], radius]);

  const strapAngle = Math.atan2(outward[0], outward[2]);

  return (
    <group name="downspout-assembly">
      <DropOutlet outlet={outlet} gutterRadius={gutterRadius} radius={radius} material={material} />

      <mesh castShadow material={material} position={geo.neck.position} quaternion={geo.neck.quaternion}>
        <cylinderGeometry args={[radius, radius, geo.neck.length, 16, 1, true]} />
      </mesh>
      <Collar from={geo.dropBottom} to={geo.wallTop} radius={radius} material={material} />
      <Collar from={geo.wallTop} to={geo.pipeBottom} radius={radius} material={material} />

      <mesh castShadow receiveShadow material={material} position={geo.vertical.position} quaternion={geo.vertical.quaternion}>
        <cylinderGeometry args={[radius, radius, geo.vertical.length, 16, 1, true]} />
      </mesh>

      {geo.strapYs.map((y, i) => (
        <DownspoutStrap key={`strap-${i}`} x={wallX} y={y} z={wallZ} radius={radius} angle={strapAngle} material={material} />
      ))}

      <mesh castShadow receiveShadow material={material} position={geo.discharge.position} quaternion={geo.discharge.quaternion}>
        <cylinderGeometry args={[radius, radius, geo.discharge.length, 16, 1, true]} />
      </mesh>
      <mesh castShadow material={material} position={geo.dischargeEnd} quaternion={geo.discharge.quaternion}>
        <cylinderGeometry args={[radius * 1.05, radius * 1.05, 0.006, 16]} />
      </mesh>
    </group>
  );
}

// ----------------------------------------------------------------------------
// Pojedynczy bieg rynny + rury
// ----------------------------------------------------------------------------

function GutterRun({ run, config, material, hardwareMat }) {
  const size = config.gutters.size;
  const profile = config.gutters.profile;
  const radius = size / 2 / 1000;
  const dsRadius = config.gutters.downspoutSize / 2 / 1000;
  const { trough, downspouts } = run;

  return (
    <group name="gutter-run">
      <group position={trough.position} quaternion={trough.quaternion} name="gutter-trough-group">
        <GutterTrough length={trough.length} size={size} profile={profile} material={material} />
        <GutterHangers length={trough.length} size={size} material={hardwareMat} />
        {config.gutters.leafGuards && <LeafGuard length={trough.length} size={size} material={hardwareMat} />}
      </group>

      {config.gutters.downspouts &&
        downspouts.map((d, i) => (
          <DownspoutAssembly
            key={`downspout-${i}`}
            outlet={d.outlet}
            wallX={d.wallX}
            wallZ={d.wallZ}
            outward={d.outward}
            radius={dsRadius}
            gutterRadius={radius}
            material={material}
          />
        ))}
    </group>
  );
}

// ----------------------------------------------------------------------------
// Root
// ----------------------------------------------------------------------------

export function GutterSystem({ config }) {
  if (!config.gutters?.enabled || config.viewMode === "structure") {
    return null;
  }

  const material = gutterMaterial(config);
  const runs = eaveRuns(config);
  if (runs.length === 0) return null;

  return (
    <group name="garage-gutters">
      {runs.map((run, i) => (
        <GutterRun key={`gutter-run-${i}`} run={run} config={config} material={material} hardwareMat={material} />
      ))}
    </group>
  );
}
