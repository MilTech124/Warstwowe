import { Html } from "@react-three/drei";
import { Beam } from "@/scene/Beam";
import { materials } from "@/scene/materials";
import { roofOpeningTransform, wallOpeningTransform, wallTopHeightAt } from "@/scene/geometry";

// Grubość elementów miarki — wystarczająco widoczna z typowej odległości kamery.
const LINE = 0.016;
const EXT = 0.009;
const ARROW_L = 0.085;
const ARROW_HALF = 0.42; // rad (~24°)
// Offset wzdłuż normali ściany — miarka przed licem, bez z-fightowania z panelem.
const FACE_Z = 0.07;

function DimTag({ position, text }) {
  return (
    <Html position={position} center distanceFactor={5} zIndexRange={[50, 0]} prepend>
      <div className="dimension-tag">{text}</div>
    </Html>
  );
}

// Dwa groty strzałki w wierzchołku `apex`; sign +1 → grot wskazuje +axis, -1 → -axis.
function ArrowHead({ axis, apex, sign, color }) {
  const cos = Math.cos(ARROW_HALF);
  const sin = Math.sin(ARROW_HALF);
  let p1;
  let p2;
  if (axis === "x") {
    const bx = apex[0] - sign * ARROW_L * cos;
    p1 = [bx, apex[1] + ARROW_L * sin, apex[2]];
    p2 = [bx, apex[1] - ARROW_L * sin, apex[2]];
  } else {
    const by = apex[1] - sign * ARROW_L * cos;
    p1 = [apex[0] + ARROW_L * sin, by, apex[2]];
    p2 = [apex[0] - ARROW_L * sin, by, apex[2]];
  }
  return (
    <group>
      <Beam start={apex} end={p1} size={LINE} material={color} />
      <Beam start={apex} end={p2} size={LINE} material={color} />
    </group>
  );
}

// Linia wymiarowa (pozioma dla axis "x", pionowa dla "y") z grotami skierowanymi do środka.
function DimLine({ axis, from, to, at, color }) {
  const a = axis === "x" ? [from, at, FACE_Z] : [at, from, FACE_Z];
  const b = axis === "x" ? [to, at, FACE_Z] : [at, to, FACE_Z];
  return (
    <group>
      <Beam start={a} end={b} size={LINE} material={color} />
      <ArrowHead axis={axis} apex={a} sign={+1} color={color} />
      <ArrowHead axis={axis} apex={b} sign={-1} color={color} />
    </group>
  );
}

// Cienka linia odniesienia (odsadzka) od krawędzi elementu do linii wymiarowej.
function Extension({ x, y, from, to, color }) {
  return <Beam start={[x, from, FACE_Z]} end={[x, to, FACE_Z]} size={EXT} material={color} />;
}

function OpeningDim({ opening, config, wallSpan }) {
  const w = opening.widthM;
  const h = opening.heightM;
  const sill = opening.sillM || 0;
  const color = materials.dimension;

  // Układ lokalny otworu: środek = (0,0,0), X = wzdłuż ściany, Y = pion, Z = normala.
  const leftX = -w / 2;
  const rightX = w / 2;
  const bottomY = -h / 2;
  const topY = h / 2;

  // Krawędzie ściany w układzie lokalnym otworu (środek ściany = x = -offsetM).
  const wallLeftX = -wallSpan / 2 - opening.offsetM;
  const wallRightX = wallSpan / 2 - opening.offsetM;

  // Dół i góra ściany (góra uwzględnia skos dachu) w układzie lokalnym otworu.
  const wallTopY = wallTopHeightAt(opening.wall, opening.offsetM, config) - (sill + h / 2);
  const wallBottomY = -(sill + h / 2);

  const showSill = sill > 0.001;
  const showLintel = wallTopY - topY > 0.06;
  const leftGap = leftX - wallLeftX;
  const rightGap = wallRightX - rightX;

  // Wybór strony na miarki pionowe (wysokość/parapet/nadproże): tam, gdzie jest więcej miejsca.
  const sideGap = rightGap >= leftGap ? rightGap : leftGap;
  const sideX = rightGap >= leftGap ? rightX : leftX;

  // Wymiary odległości poziomych od krawędzi ściany — pod otworem, wewnątrz obrysu ściany.
  const edgeLineY = bottomY - 0.16;

  return (
    <group name={`opening-dim-${opening.id}`}>
      {/* Szerokość otworu — pozioma linia przez środek, etykieta nad górną krawędzią */}
      <DimLine axis="x" from={leftX} to={rightX} at={0} color={color} />
      <DimTag position={[0, topY + 0.2, FACE_Z]} text={`${w.toFixed(2)} m`} />

      {/* Wysokość otworu — pionowa linia wzdłuż wybranej krawędzi, etykieta obok środka */}
      <DimLine axis="y" from={bottomY} to={topY} at={sideX} color={color} />
      <DimTag position={[sideX, 0, FACE_Z]} text={`${h.toFixed(2)} m`} />

      {/* Odległość od lewej krawędzi ściany — pozioma linia pod otworem, wewnątrz obrysu */}
      {leftGap > 0.08 && (
        <>
          <DimLine axis="x" from={wallLeftX} to={leftX} at={edgeLineY} color={color} />
          <Extension x={wallLeftX} from={edgeLineY} to={bottomY} color={color} />
          <Extension x={leftX} from={edgeLineY} to={bottomY} color={color} />
          <DimTag position={[(wallLeftX + leftX) / 2, edgeLineY - 0.16, FACE_Z]} text={`${leftGap.toFixed(2)} m`} />
        </>
      )}

      {/* Odległość do prawej krawędzi ściany — pozioma linia pod otworem, wewnątrz obrysu */}
      {rightGap > 0.08 && (
        <>
          <DimLine axis="x" from={rightX} to={wallRightX} at={edgeLineY} color={color} />
          <Extension x={rightX} from={edgeLineY} to={bottomY} color={color} />
          <Extension x={wallRightX} from={edgeLineY} to={bottomY} color={color} />
          <DimTag position={[(rightX + wallRightX) / 2, edgeLineY - 0.16, FACE_Z]} text={`${rightGap.toFixed(2)} m`} />
        </>
      )}

      {/* Parapet — od dołu ściany do dołu otworu, wzdłuż wybranej krawędzi */}
      {showSill && (
        <>
          <DimLine axis="y" from={wallBottomY} to={bottomY} at={sideX} color={color} />
          <DimTag position={[sideX, (wallBottomY + bottomY) / 2, FACE_Z]} text={`${sill.toFixed(2)} m`} />
        </>
      )}

      {/* Nadproże — od góry otworu do góry ściany, wzdłuż wybranej krawędzi */}
      {showLintel && (
        <>
          <DimLine axis="y" from={topY} to={wallTopY} at={sideX} color={color} />
          <DimTag position={[sideX, (topY + wallTopY) / 2, FACE_Z]} text={`${(wallTopY - topY).toFixed(2)} m`} />
        </>
      )}
    </group>
  );
}

// Otwory dachowe: tylko szerokość i wysokość (odległości od krawędzi dachu nie mają sensu).
function RoofOpeningDim({ opening }) {
  const w = opening.widthM;
  const h = opening.heightM;
  const color = materials.dimension;
  return (
    <group name={`roof-opening-dim-${opening.id}`}>
      <DimLine axis="x" from={-w / 2} to={w / 2} at={0} color={color} />
      <DimTag position={[0, h / 2 + 0.18, FACE_Z]} text={`${w.toFixed(2)} m`} />
      <DimLine axis="y" from={-h / 2} to={h / 2} at={-w / 2} color={color} />
      <DimTag position={[-w / 2, h / 2 + 0.18, FACE_Z]} text={`${h.toFixed(2)} m`} />
    </group>
  );
}

export function OpeningDimensions({ config }) {
  const { widthM, lengthM } = config.dimensions;
  return (
    <group name="opening-dimensions">
      {config.openings.map((opening) => {
        if (opening.kind === "roofWindow") {
          const roofTransform = roofOpeningTransform(opening, config);
          return (
            <group key={opening.id} position={roofTransform.position} rotation={roofTransform.rotation}>
              <group position={roofTransform.localPosition} rotation={roofTransform.localRotation}>
                <RoofOpeningDim opening={opening} />
              </group>
            </group>
          );
        }
        const transform = wallOpeningTransform(opening, config.dimensions);
        const wallSpan = opening.wall === "front" || opening.wall === "back" ? widthM : lengthM;
        return (
          <group key={opening.id} position={transform.position} rotation={transform.rotation}>
            <OpeningDim opening={opening} config={config} wallSpan={wallSpan} />
          </group>
        );
      })}
    </group>
  );
}
