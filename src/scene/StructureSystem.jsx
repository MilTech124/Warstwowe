import { getBayPositions, getStructureClass, roofMetrics } from "@/scene/geometry";
import { Beam as RawBeam } from "@/scene/Beam";
import { materials } from "@/scene/materials";

const ROOF_RUN_X = new Set(["single_left", "single_right", "gable_left_right"]);

function Beam({ start, end, size = 0.12, material = materials.steel, name, overlap }) {
  return <RawBeam start={start} end={end} size={size} material={material} name={name} overlap={overlap ?? size * 1.15} />;
}

function structureSpec(structureClass) {
  if (structureClass === "heavy_hall") {
    return {
      baySpacing: 5.5,
      braceSize: 0.048,
      columnSize: 0.26,
      endColumnSize: 0.12,
      frameInset: 0.52,
      gateFrameSize: 0.12,
      girtSize: 0.062,
      haunchLength: 1.15,
      purlinSize: 0.07,
      rafterSize: 0.22,
      wallGirtSpacing: 1.15,
    };
  }
  return {
    baySpacing: 4,
    braceSize: 0.04,
    columnSize: 0.18,
    endColumnSize: 0.095,
    frameInset: 0.38,
    gateFrameSize: 0.095,
    girtSize: 0.052,
    haunchLength: 0.85,
    purlinSize: 0.062,
    rafterSize: 0.155,
    wallGirtSpacing: 1.05,
  };
}

// Dobor profili zamknietych wg roli i rozpietosci elementu — wartosci z praktyki
// producentow, opisane w docs/konstrukcja-garazy-plyta-warstwowa.md.
const GARAGE_PROFILES = {
  post: [
    { maxSpanM: 3.0, sizeM: 0.06, label: "60×60×2" },
    { maxSpanM: 3.6, sizeM: 0.07, label: "70×70×2" },
    { maxSpanM: Infinity, sizeM: 0.08, label: "80×80×3" },
  ],
  cornerPost: [
    { maxSpanM: 3.0, sizeM: 0.07, label: "70×70×2" },
    { maxSpanM: 3.6, sizeM: 0.08, label: "80×80×3" },
    { maxSpanM: Infinity, sizeM: 0.1, label: "100×100×3" },
  ],
  rafter: [
    { maxSpanM: 3.5, sizeM: 0.06, label: "60×40×2" },
    { maxSpanM: 5.0, sizeM: 0.075, label: "80×60×3" },
    { maxSpanM: 7.0, sizeM: 0.09, label: "100×60×3" },
    { maxSpanM: Infinity, sizeM: 0.11, label: "120×60×4" },
  ],
  purlin: [
    { maxSpanM: 3.5, sizeM: 0.04, label: "40×40×2" },
    { maxSpanM: Infinity, sizeM: 0.055, label: "60×40×2" },
  ],
};

function pickProfile(role, spanM) {
  return GARAGE_PROFILES[role].find((step) => spanM <= step.maxSpanM);
}

// Rozstaw podpor poszycia rosnie z gruboscia rdzenia PIR (40 mm -> min, 120 mm -> max).
function panelSupportSpacingM(thicknessMm, minSpacingM, maxSpacingM) {
  const t = Math.min(1, Math.max(0, (thicknessMm - 40) / 80));
  return minSpacingM + t * (maxSpacingM - minSpacingM);
}

// Szkielet garazu z plyt warstwowych: rozstawy wynikaja z grubosci plyt,
// przekroje z wysokosci sciany i rozpietosci polaci.
function garageSpec(config) {
  const { widthM, lengthM, wallHeightM } = config.dimensions;
  const wallThicknessMm = config.cladding?.wallPirThicknessMm ?? 60;
  const roofThicknessMm = config.cladding?.roofPirThicknessMm ?? 80;

  const post = pickProfile("post", wallHeightM);
  const corner = pickProfile("cornerPost", wallHeightM);
  const frameInset = 0.08 + post.sizeM;

  const { runAxis } = frameAxes(config);
  const runSpan = Math.max(1, axisSpan(runAxis, widthM, lengthM) - frameInset * 2);
  const rafterRunM = isGable(config.roof.type) ? runSpan / 2 : runSpan;
  const rafter = pickProfile("rafter", rafterRunM);

  const postSpacing = panelSupportSpacingM(wallThicknessMm, 1.2, 1.8);
  const purlinSpacing = panelSupportSpacingM(roofThicknessMm, 0.9, 1.5);
  const purlin = pickProfile("purlin", postSpacing);
  const gateFrame = post.sizeM >= 0.08 ? post : { sizeM: 0.08, label: "80×80×3" };

  return {
    braceSize: 0.045,
    braceLabel: "50×50×2",
    columnSize: corner.sizeM,
    cornerSize: corner.sizeM,
    cornerLabel: corner.label,
    endColumnSize: 0.06,
    endColumnLabel: "60×60×2",
    frameInset,
    gateFrameSize: gateFrame.sizeM,
    gateFrameLabel: gateFrame.label,
    postSize: post.sizeM,
    postLabel: post.label,
    postSpacing,
    purlinSize: purlin.sizeM,
    purlinLabel: purlin.label,
    purlinSpacing,
    rafterSize: rafter.sizeM,
    rafterLabel: rafter.label,
    railSize: post.sizeM,
    railLabel: post.label,
  };
}

function frameAxes(config) {
  const runAxis = ROOF_RUN_X.has(config.roof.type) ? "x" : "z";
  return {
    runAxis,
    longAxis: runAxis === "x" ? "z" : "x",
  };
}

function axisSpan(axis, widthM, lengthM) {
  return axis === "x" ? widthM : lengthM;
}

function pointFromAxes(runAxis, runCoord, longCoord, y) {
  return runAxis === "x" ? [runCoord, y, longCoord] : [longCoord, y, runCoord];
}

function wallForRunSide(runAxis, runCoord) {
  if (runAxis === "x") return runCoord < 0 ? "left" : "right";
  return runCoord < 0 ? "back" : "front";
}

function wallForLongSide(runAxis, longCoord) {
  if (runAxis === "x") return longCoord < 0 ? "back" : "front";
  return longCoord < 0 ? "left" : "right";
}

function openingWallCoord(opening) {
  if (opening.wall === "front") return opening.offsetM;
  if (opening.wall === "back") return -opening.offsetM;
  if (opening.wall === "left") return -opening.offsetM;
  return opening.offsetM;
}

function wallOpenings(config, wall) {
  return config.openings.filter((opening) => opening.wall === wall);
}

function openingCutsAtLevel(openings, level, clearance = 0.12) {
  return openings
    .filter((opening) => level >= opening.sillM - clearance && level <= opening.sillM + opening.heightM + clearance)
    .map((opening) => {
      const center = openingWallCoord(opening);
      const half = opening.widthM / 2 + clearance;
      return [center - half, center + half];
    })
    .sort((a, b) => a[0] - b[0]);
}

function splitAroundOpenings(start, end, openings, level, clearance = 0.12) {
  const min = Math.min(start, end);
  const max = Math.max(start, end);
  const cuts = openingCutsAtLevel(openings, level, clearance);
  const segments = [];
  let cursor = min;

  cuts.forEach(([cutStart, cutEnd]) => {
    const a = Math.max(min, cutStart);
    const b = Math.min(max, cutEnd);
    if (b <= cursor) return;
    if (a - cursor > 0.18) segments.push([cursor, a]);
    cursor = Math.max(cursor, b);
  });

  if (max - cursor > 0.18) segments.push([cursor, max]);
  return start <= end ? segments : segments.map(([a, b]) => [b, a]);
}

function columnBlockedByOpening(config, wall, coord) {
  return wallOpenings(config, wall).some((opening) => {
    if (opening.kind !== "gate" && opening.kind !== "door") return false;
    if (opening.sillM > 0.15) return false;
    const center = openingWallCoord(opening);
    return Math.abs(coord - center) < opening.widthM / 2 + 0.08;
  });
}

function roofYOnRun(runCoord, config, runSpan) {
  const { wallHeightM } = config.dimensions;
  const { rise } = roofMetrics(config);
  const base = wallHeightM - 0.14;
  const t = (runCoord + runSpan / 2) / runSpan;
  const type = config.roof.type;

  if (type === "single_right" || type === "single_front") return base + rise * (1 - t);
  if (type === "single_left" || type === "single_back") return base + rise * t;
  return base + rise * (1 - Math.min(1, Math.abs(runCoord) / (runSpan / 2)));
}

function isGable(type) {
  return type === "gable_left_right" || type === "gable_front_back";
}

function levelsBelow(maxY, spacing) {
  const levels = [];
  for (let y = spacing; y < maxY - 0.3; y += spacing) {
    levels.push(y);
  }
  return levels;
}

function positionsBySpacing(span, spacing, minCount = 2) {
  const count = Math.max(minCount, Math.ceil(span / spacing) + 1);
  return Array.from({ length: count }, (_, index) => -span / 2 + (span * index) / (count - 1));
}

function trimmedRunForLevel(level, config, runSpan) {
  const { rise } = roofMetrics(config);
  const base = config.dimensions.wallHeightM - 0.14;
  const clearance = 0.18;
  const type = config.roof.type;

  if (level < base - clearance) return [[-runSpan / 2, runSpan / 2]];

  const overBase = Math.max(0, level + clearance - base);
  if (overBase >= rise) return [];

  if (isGable(type)) {
    const half = (runSpan / 2) * (1 - overBase / rise);
    return [[-half, half]];
  }

  const t = overBase / rise;
  if (type === "single_left" || type === "single_back") {
    return [[-runSpan / 2 + runSpan * t, runSpan / 2]];
  }
  return [[-runSpan / 2, runSpan / 2 - runSpan * t]];
}

function BasePlate({ position, size }) {
  const plate = size * 1.9;
  const boltOffset = plate / 2 - Math.min(0.025, plate * 0.18);

  return (
    <group>
      <mesh position={[position[0], 0.018, position[2]]} material={materials.trim} castShadow receiveShadow>
        <boxGeometry args={[plate, 0.035, plate]} />
      </mesh>
      {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sx, sz]) => (
        <mesh
          key={`anchor-${sx}-${sz}`}
          position={[position[0] + sx * boltOffset, 0.048, position[2] + sz * boltOffset]}
          material={materials.track}
          castShadow
        >
          <cylinderGeometry args={[0.008, 0.008, 0.028, 8]} />
        </mesh>
      ))}
    </group>
  );
}

function JointBlock({ position, size }) {
  return (
    <mesh position={position} material={materials.steel} castShadow receiveShadow>
      <boxGeometry args={[size * 1.35, size * 1.35, size * 1.35]} />
    </mesh>
  );
}

function Column({ position, topY, size, material = materials.steel }) {
  const top = Math.max(0.5, topY);
  return (
    <>
      <BasePlate position={position} size={size} />
      <Beam start={[position[0], 0.035, position[2]]} end={[position[0], top, position[2]]} size={size} material={material} />
    </>
  );
}

function PrimaryFrame({ config, runAxis, runSpan, longCoord, spec }) {
  const left = -runSpan / 2;
  const right = runSpan / 2;
  const leftY = roofYOnRun(left, config, runSpan);
  const rightY = roofYOnRun(right, config, runSpan);
  const ridgeY = roofYOnRun(0, config, runSpan);
  const columnTopLeft = leftY + spec.rafterSize * 0.08;
  const columnTopRight = rightY + spec.rafterSize * 0.08;
  const leftWall = wallForRunSide(runAxis, left);
  const rightWall = wallForRunSide(runAxis, right);
  const skipLeftColumn = columnBlockedByOpening(config, leftWall, longCoord);
  const skipRightColumn = columnBlockedByOpening(config, rightWall, longCoord);

  return (
    <group name={`primary-frame-${longCoord.toFixed(2)}`}>
      {!skipLeftColumn && (
        <>
          <Column position={pointFromAxes(runAxis, left, longCoord, 0)} topY={columnTopLeft} size={spec.columnSize} />
          <JointBlock position={pointFromAxes(runAxis, left, longCoord, leftY)} size={spec.columnSize * 0.58} />
        </>
      )}
      {!skipRightColumn && (
        <>
          <Column position={pointFromAxes(runAxis, right, longCoord, 0)} topY={columnTopRight} size={spec.columnSize} />
          <JointBlock position={pointFromAxes(runAxis, right, longCoord, rightY)} size={spec.columnSize * 0.58} />
        </>
      )}

      {isGable(config.roof.type) ? (
        <>
          <Beam start={pointFromAxes(runAxis, left, longCoord, leftY)} end={pointFromAxes(runAxis, 0, longCoord, ridgeY)} size={spec.rafterSize} />
          <Beam start={pointFromAxes(runAxis, 0, longCoord, ridgeY)} end={pointFromAxes(runAxis, right, longCoord, rightY)} size={spec.rafterSize} />
          <JointBlock position={pointFromAxes(runAxis, 0, longCoord, ridgeY)} size={spec.rafterSize * 0.62} />
        </>
      ) : (
        <Beam start={pointFromAxes(runAxis, left, longCoord, leftY)} end={pointFromAxes(runAxis, right, longCoord, rightY)} size={spec.rafterSize} />
      )}

      <Beam
        start={pointFromAxes(runAxis, left, longCoord, columnTopLeft - 0.5)}
        end={pointFromAxes(runAxis, Math.min(left + spec.haunchLength, -0.05), longCoord, roofYOnRun(Math.min(left + spec.haunchLength, -0.05), config, runSpan) - 0.03)}
        size={spec.braceSize}
        material={materials.trim}
      />
      <Beam
        start={pointFromAxes(runAxis, right, longCoord, columnTopRight - 0.5)}
        end={pointFromAxes(runAxis, Math.max(right - spec.haunchLength, 0.05), longCoord, roofYOnRun(Math.max(right - spec.haunchLength, 0.05), config, runSpan) - 0.03)}
        size={spec.braceSize}
        material={materials.trim}
      />
    </group>
  );
}

function EndWallFrame({ config, runAxis, runSpan, longCoord, spec }) {
  const postRuns = positionsBySpacing(runSpan, 2.25, 5);
  const levels = levelsBelow(config.dimensions.wallHeightM, spec.wallGirtSpacing);
  const wall = wallForLongSide(runAxis, longCoord);
  const openings = wallOpenings(config, wall);

  return (
    <group name={`endwall-frame-${longCoord.toFixed(2)}`}>
      {postRuns.filter((runCoord) => !columnBlockedByOpening(config, wall, runCoord)).map((runCoord) => (
        <group key={`end-post-${longCoord}-${runCoord}`}>
          <Column
            position={pointFromAxes(runAxis, runCoord, longCoord, 0)}
            topY={roofYOnRun(runCoord, config, runSpan) + spec.endColumnSize * 0.2}
            size={spec.endColumnSize}
            material={materials.trim}
          />
          <JointBlock
            position={pointFromAxes(runAxis, runCoord, longCoord, roofYOnRun(runCoord, config, runSpan))}
            size={spec.endColumnSize * 0.58}
          />
        </group>
      ))}
      {levels.map((level) =>
        trimmedRunForLevel(level, config, runSpan).map(([startRun, endRun], index) => (
          splitAroundOpenings(startRun, endRun, openings, level).map(([segmentStart, segmentEnd], segmentIndex) => (
            <Beam
              key={`end-girt-${longCoord}-${level}-${index}-${segmentIndex}`}
              start={pointFromAxes(runAxis, segmentStart, longCoord, level)}
              end={pointFromAxes(runAxis, segmentEnd, longCoord, level)}
              size={spec.girtSize}
              material={materials.trim}
            />
          ))
        )),
      )}
    </group>
  );
}

function RoofSecondary({ config, runAxis, runSpan, longSpan, spec }) {
  const runPositions = positionsBySpacing(runSpan, 1.35, 3);
  const longStart = -longSpan / 2;
  const longEnd = longSpan / 2;
  const eaves = [-runSpan / 2, runSpan / 2];

  return (
    <group name="roof-secondary">
      {runPositions.map((runCoord) => (
        <Beam
          key={`purlin-${runCoord}`}
          start={pointFromAxes(runAxis, runCoord, longStart, roofYOnRun(runCoord, config, runSpan) + spec.purlinSize * 0.2)}
          end={pointFromAxes(runAxis, runCoord, longEnd, roofYOnRun(runCoord, config, runSpan) + spec.purlinSize * 0.2)}
          size={spec.purlinSize}
          material={materials.trim}
        />
      ))}
      {eaves.map((runCoord) => (
        <Beam
          key={`eave-strut-${runCoord}`}
          start={pointFromAxes(runAxis, runCoord, longStart, roofYOnRun(runCoord, config, runSpan))}
          end={pointFromAxes(runAxis, runCoord, longEnd, roofYOnRun(runCoord, config, runSpan))}
          size={spec.purlinSize * 1.15}
          material={materials.steel}
        />
      ))}
      {isGable(config.roof.type) && (
        <Beam
          start={pointFromAxes(runAxis, 0, longStart, roofYOnRun(0, config, runSpan) + spec.purlinSize * 0.2)}
          end={pointFromAxes(runAxis, 0, longEnd, roofYOnRun(0, config, runSpan) + spec.purlinSize * 0.2)}
          size={spec.purlinSize * 1.2}
          material={materials.steel}
        />
      )}
    </group>
  );
}

function WallSecondary({ config, runAxis, runSpan, longSpan, spec }) {
  const sideLevels = levelsBelow(config.dimensions.wallHeightM, spec.wallGirtSpacing);
  const longStart = -longSpan / 2;
  const longEnd = longSpan / 2;
  const runSides = [-runSpan / 2, runSpan / 2];

  return (
    <group name="wall-secondary">
      {runSides.map((runCoord) =>
        sideLevels.map((level) =>
          splitAroundOpenings(longStart, longEnd, wallOpenings(config, wallForRunSide(runAxis, runCoord)), level).map(([segmentStart, segmentEnd], segmentIndex) => (
            <Beam
              key={`side-girt-${runCoord}-${level}-${segmentIndex}`}
              start={pointFromAxes(runAxis, runCoord, segmentStart, level)}
              end={pointFromAxes(runAxis, runCoord, segmentEnd, level)}
              size={spec.girtSize}
              material={materials.trim}
            />
          )),
        ),
      )}
    </group>
  );
}

function VerticalBracing({ config, runAxis, runSpan, longSpan, framePositions, spec }) {
  const longStart = framePositions[0] ?? -longSpan / 2;
  const longSecond = framePositions[1] ?? longStart + Math.min(2, longSpan * 0.4);
  const longPenultimate = framePositions.at(-2) ?? -longSecond;
  const longEnd = framePositions.at(-1) ?? longSpan / 2;
  const y0 = 0.35;
  const type = config.roof.type;

  return (
    <group name="hall-bracing">
      {[-runSpan / 2, runSpan / 2].map((runCoord) => {
        const y1 = roofYOnRun(runCoord, config, runSpan) - spec.girtSize;
        return (
          <group key={`wall-x-brace-${runCoord}`}>
            <Beam start={pointFromAxes(runAxis, runCoord, longStart, y0)} end={pointFromAxes(runAxis, runCoord, longSecond, y1)} size={spec.braceSize} material={materials.trim} />
            <Beam start={pointFromAxes(runAxis, runCoord, longStart, y1)} end={pointFromAxes(runAxis, runCoord, longSecond, y0)} size={spec.braceSize} material={materials.trim} />
            <Beam start={pointFromAxes(runAxis, runCoord, longPenultimate, y0)} end={pointFromAxes(runAxis, runCoord, longEnd, y1)} size={spec.braceSize} material={materials.trim} />
            <Beam start={pointFromAxes(runAxis, runCoord, longPenultimate, y1)} end={pointFromAxes(runAxis, runCoord, longEnd, y0)} size={spec.braceSize} material={materials.trim} />
          </group>
        );
      })}
      <RoofPlanBracing config={config} runAxis={runAxis} runSpan={runSpan} framePositions={framePositions} size={spec.braceSize} roofType={type} />
    </group>
  );
}

function roofBracePair(config, runAxis, a, b, startRun, endRun, runSpan, size, key) {
  return (
    <group key={key}>
      <Beam
        start={pointFromAxes(runAxis, startRun, a, roofYOnRun(startRun, config, runSpan) + 0.08)}
        end={pointFromAxes(runAxis, endRun, b, roofYOnRun(endRun, config, runSpan) + 0.08)}
        size={size}
        material={materials.trim}
      />
      <Beam
        start={pointFromAxes(runAxis, endRun, a, roofYOnRun(endRun, config, runSpan) + 0.08)}
        end={pointFromAxes(runAxis, startRun, b, roofYOnRun(startRun, config, runSpan) + 0.08)}
        size={size}
        material={materials.trim}
      />
    </group>
  );
}

function RoofPlanBracing({ config, runAxis, runSpan, framePositions, size }) {
  const longStart = framePositions[0];
  const longSecond = framePositions[1];
  const longPenultimate = framePositions.at(-2);
  const longEnd = framePositions.at(-1);
  const runLeft = -runSpan / 2;
  const runRight = runSpan / 2;
  const bracedBays = [
    [longStart, longSecond],
    [longPenultimate, longEnd],
  ].filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(b - a) > 0.3);

  return (
    <group name="roof-plan-bracing">
      {bracedBays.flatMap(([a, b]) => {
        if (!isGable(config.roof.type)) {
          return [roofBracePair(config, runAxis, a, b, runLeft, runRight, runSpan, size, `roof-brace-${a}-${b}`)];
        }
        return [
          roofBracePair(config, runAxis, a, b, runLeft, 0, runSpan, size, `roof-brace-left-${a}-${b}`),
          roofBracePair(config, runAxis, a, b, 0, runRight, runSpan, size, `roof-brace-right-${a}-${b}`),
        ];
      })}
    </group>
  );
}

function openingInsidePlane(wall, dimensions, inset) {
  if (wall === "front") return { axis: "x", fixedAxis: "z", fixed: dimensions.lengthM / 2 - inset, sign: 1 };
  if (wall === "back") return { axis: "x", fixedAxis: "z", fixed: -dimensions.lengthM / 2 + inset, sign: -1 };
  if (wall === "left") return { axis: "z", fixedAxis: "x", fixed: -dimensions.widthM / 2 + inset, sign: -1 };
  return { axis: "z", fixedAxis: "x", fixed: dimensions.widthM / 2 - inset, sign: 1 };
}

function openingPoint(wallData, coord, y) {
  if (wallData.axis === "x") return [coord, y, wallData.fixed];
  return [wallData.fixed, y, wallData.sign * coord];
}

function OpeningFrames({ config, spec }) {
  return (
    <group name="opening-structural-frames">
      {config.openings.map((opening) => {
        const wallData = openingInsidePlane(opening.wall, config.dimensions, spec.frameInset + 0.05);
        const span = opening.wall === "front" || opening.wall === "back" ? config.dimensions.widthM : config.dimensions.lengthM;
        const halfWidth = Math.min(opening.widthM / 2, span / 2 - 0.35);
        const center = Math.max(-span / 2 + halfWidth, Math.min(span / 2 - halfWidth, opening.offsetM));
        const left = center - halfWidth;
        const right = center + halfWidth;
        const bottom = opening.sillM;
        const top = opening.sillM + opening.heightM;
        const isGate = opening.kind === "gate";
        const size = isGate ? spec.gateFrameSize ?? spec.columnSize * 0.72 : spec.endColumnSize;
        const jambOffset = isGate ? Math.max(0.12, size * 1.35) : Math.max(0.08, size);
        const leftJamb = Math.max(-span / 2 + 0.12, left - jambOffset);
        const rightJamb = Math.min(span / 2 - 0.12, right + jambOffset);
        const headerY = top + size * 0.45;

        return (
          <group key={`opening-frame-${opening.id}`}>
            <Beam start={openingPoint(wallData, leftJamb, 0.035)} end={openingPoint(wallData, leftJamb, headerY)} size={size} material={materials.steel} />
            <Beam start={openingPoint(wallData, rightJamb, 0.035)} end={openingPoint(wallData, rightJamb, headerY)} size={size} material={materials.steel} />
            <Beam start={openingPoint(wallData, leftJamb, headerY)} end={openingPoint(wallData, rightJamb, headerY)} size={size} material={materials.steel} />
            <JointBlock position={openingPoint(wallData, leftJamb, headerY)} size={size * 0.52} />
            <JointBlock position={openingPoint(wallData, rightJamb, headerY)} size={size * 0.52} />
            {opening.kind === "window" && (
              <Beam start={openingPoint(wallData, leftJamb, bottom)} end={openingPoint(wallData, rightJamb, bottom)} size={size * 0.8} material={materials.trim} />
            )}
          </group>
        );
      })}
    </group>
  );
}

// Realny szkielet garazu: slupy narozne i posrednie, podwalina, oczep za spadkiem,
// krokwie wzdluz spadu z platwiami poprzecznymi (lub para krokwi + kalenica dla dwuspadu).
function GarageStructure({ config }) {
  const { widthM, lengthM, wallHeightM } = config.dimensions;
  const spec = garageSpec(config);
  const { runAxis } = frameAxes(config);
  const runSpan = Math.max(1, axisSpan(runAxis, widthM, lengthM) - spec.frameInset * 2);
  const longSpan = Math.max(1, axisSpan(runAxis === "x" ? "z" : "x", widthM, lengthM) - spec.frameInset * 2);
  const runHalf = runSpan / 2;
  const longHalf = longSpan / 2;
  const gable = isGable(config.roof.type);
  const { rise } = roofMetrics(config);
  const roofY = (runCoord) => roofYOnRun(runCoord, config, runSpan);

  const rafterLongPositions = positionsBySpacing(longSpan, spec.postSpacing);
  const interiorLongPositions = rafterLongPositions.slice(1, -1);
  let interiorRunPositions = positionsBySpacing(runSpan, spec.postSpacing).slice(1, -1);
  if (gable && !interiorRunPositions.some((runCoord) => Math.abs(runCoord) < 0.3)) {
    interiorRunPositions = [...interiorRunPositions, 0].sort((a, b) => a - b);
  }
  const purlinRunPositions = positionsBySpacing(runSpan, spec.purlinSpacing, 3)
    .slice(1, -1)
    .filter((runCoord) => !gable || Math.abs(runCoord) > 0.4);

  const runSides = [-runHalf, runHalf];
  const longSides = [-longHalf, longHalf];
  const railLevel = 0.05;
  const girtLevel = wallHeightM * 0.52;
  const hasMidGirt = wallHeightM >= 3.05;
  const hasCollarTies = gable && runSpan >= 4.4 && rise >= 0.5;
  const tieY = wallHeightM - 0.14 + rise * 0.55;
  const tieHalf = runHalf * 0.45;
  const braceDrop = 0.42;
  const braceRun = 0.45;

  return (
    <group name={`garage-structure-${config.roof.type}`}>
      {runSides.map((runCoord) =>
        longSides.map((longCoord) => (
          <group key={`corner-${runCoord}-${longCoord}`}>
            <Column position={pointFromAxes(runAxis, runCoord, longCoord, 0)} topY={roofY(runCoord)} size={spec.cornerSize} />
            <JointBlock position={pointFromAxes(runAxis, runCoord, longCoord, roofY(runCoord))} size={spec.cornerSize * 0.55} />
          </group>
        )),
      )}

      {runSides.map((runCoord) => {
        const wall = wallForRunSide(runAxis, runCoord);
        return interiorLongPositions
          .filter((longCoord) => !columnBlockedByOpening(config, wall, longCoord))
          .map((longCoord) => (
            <Column
              key={`run-wall-post-${runCoord}-${longCoord}`}
              position={pointFromAxes(runAxis, runCoord, longCoord, 0)}
              topY={roofY(runCoord)}
              size={spec.postSize}
            />
          ));
      })}

      {longSides.map((longCoord) => {
        const wall = wallForLongSide(runAxis, longCoord);
        return interiorRunPositions
          .filter((runCoord) => !columnBlockedByOpening(config, wall, runCoord))
          .map((runCoord) => (
            <Column
              key={`long-wall-post-${longCoord}-${runCoord}`}
              position={pointFromAxes(runAxis, runCoord, longCoord, 0)}
              topY={roofY(runCoord)}
              size={spec.postSize}
            />
          ));
      })}

      {runSides.map((runCoord) =>
        splitAroundOpenings(-longHalf, longHalf, wallOpenings(config, wallForRunSide(runAxis, runCoord)), railLevel).map(([segmentStart, segmentEnd], index) => (
          <Beam
            key={`sill-rail-run-${runCoord}-${index}`}
            start={pointFromAxes(runAxis, runCoord, segmentStart, railLevel)}
            end={pointFromAxes(runAxis, runCoord, segmentEnd, railLevel)}
            size={spec.railSize}
            material={materials.trim}
          />
        )),
      )}
      {longSides.map((longCoord) =>
        splitAroundOpenings(-runHalf, runHalf, wallOpenings(config, wallForLongSide(runAxis, longCoord)), railLevel).map(([segmentStart, segmentEnd], index) => (
          <Beam
            key={`sill-rail-long-${longCoord}-${index}`}
            start={pointFromAxes(runAxis, segmentStart, longCoord, railLevel)}
            end={pointFromAxes(runAxis, segmentEnd, longCoord, railLevel)}
            size={spec.railSize}
            material={materials.trim}
          />
        )),
      )}

      {runSides.map((runCoord) => (
        <Beam
          key={`top-rail-${runCoord}`}
          start={pointFromAxes(runAxis, runCoord, -longHalf, roofY(runCoord))}
          end={pointFromAxes(runAxis, runCoord, longHalf, roofY(runCoord))}
          size={spec.railSize}
        />
      ))}

      {hasMidGirt &&
        runSides.map((runCoord) =>
          splitAroundOpenings(-longHalf, longHalf, wallOpenings(config, wallForRunSide(runAxis, runCoord)), girtLevel).map(([segmentStart, segmentEnd], index) => (
            <Beam
              key={`mid-girt-run-${runCoord}-${index}`}
              start={pointFromAxes(runAxis, runCoord, segmentStart, girtLevel)}
              end={pointFromAxes(runAxis, runCoord, segmentEnd, girtLevel)}
              size={spec.railSize * 0.75}
              material={materials.trim}
            />
          )),
        )}
      {hasMidGirt &&
        longSides.map((longCoord) =>
          splitAroundOpenings(-runHalf, runHalf, wallOpenings(config, wallForLongSide(runAxis, longCoord)), girtLevel).map(([segmentStart, segmentEnd], index) => (
            <Beam
              key={`mid-girt-long-${longCoord}-${index}`}
              start={pointFromAxes(runAxis, segmentStart, longCoord, girtLevel)}
              end={pointFromAxes(runAxis, segmentEnd, longCoord, girtLevel)}
              size={spec.railSize * 0.75}
              material={materials.trim}
            />
          )),
        )}

      {rafterLongPositions.map((longCoord) =>
        gable ? (
          <group key={`rafter-pair-${longCoord}`}>
            <Beam start={pointFromAxes(runAxis, -runHalf, longCoord, roofY(-runHalf))} end={pointFromAxes(runAxis, 0, longCoord, roofY(0))} size={spec.rafterSize} />
            <Beam start={pointFromAxes(runAxis, 0, longCoord, roofY(0))} end={pointFromAxes(runAxis, runHalf, longCoord, roofY(runHalf))} size={spec.rafterSize} />
            <JointBlock position={pointFromAxes(runAxis, 0, longCoord, roofY(0))} size={spec.rafterSize * 0.6} />
            {hasCollarTies && (
              <Beam
                start={pointFromAxes(runAxis, -tieHalf, longCoord, tieY)}
                end={pointFromAxes(runAxis, tieHalf, longCoord, tieY)}
                size={spec.rafterSize * 0.7}
                material={materials.trim}
              />
            )}
          </group>
        ) : (
          <Beam
            key={`rafter-${longCoord}`}
            start={pointFromAxes(runAxis, -runHalf, longCoord, roofY(-runHalf))}
            end={pointFromAxes(runAxis, runHalf, longCoord, roofY(runHalf))}
            size={spec.rafterSize}
          />
        ),
      )}

      {gable && (
        <Beam
          start={pointFromAxes(runAxis, 0, -longHalf, roofY(0) - spec.rafterSize * 0.75)}
          end={pointFromAxes(runAxis, 0, longHalf, roofY(0) - spec.rafterSize * 0.75)}
          size={spec.rafterSize * 0.85}
        />
      )}

      {purlinRunPositions.map((runCoord) => (
        <Beam
          key={`purlin-${runCoord}`}
          start={pointFromAxes(runAxis, runCoord, -longHalf, roofY(runCoord))}
          end={pointFromAxes(runAxis, runCoord, longHalf, roofY(runCoord))}
          size={spec.purlinSize}
          material={materials.trim}
        />
      ))}

      {runSides.map((runCoord) => {
        const wall = wallForRunSide(runAxis, runCoord);
        const topY = roofY(runCoord);
        if (topY - braceDrop < 0.8) return null;
        return longSides.map((longCorner) => {
          const inner = longCorner - Math.sign(longCorner) * braceRun;
          if (columnBlockedByOpening(config, wall, inner)) return null;
          return (
            <Beam
              key={`knee-brace-run-${runCoord}-${longCorner}`}
              start={pointFromAxes(runAxis, runCoord, longCorner, topY - braceDrop)}
              end={pointFromAxes(runAxis, runCoord, inner, topY - 0.03)}
              size={spec.braceSize}
              material={materials.trim}
            />
          );
        });
      })}
      {longSides.map((longCoord) => {
        const wall = wallForLongSide(runAxis, longCoord);
        return runSides.map((runCorner) => {
          const inner = runCorner - Math.sign(runCorner) * braceRun;
          const topY = roofY(runCorner);
          if (topY - braceDrop < 0.8 || columnBlockedByOpening(config, wall, inner)) return null;
          return (
            <Beam
              key={`knee-brace-long-${longCoord}-${runCorner}`}
              start={pointFromAxes(runAxis, runCorner, longCoord, topY - braceDrop)}
              end={pointFromAxes(runAxis, inner, longCoord, roofY(inner) - 0.03)}
              size={spec.braceSize}
              material={materials.trim}
            />
          );
        });
      })}

      <OpeningFrames config={config} spec={spec} />
    </group>
  );
}

export function StructureSystem({ config }) {
  const { widthM, lengthM } = config.dimensions;
  const structureClass = getStructureClass(config.dimensions);

  if (structureClass === "garage_frame") {
    return <GarageStructure config={config} />;
  }

  const spec = structureSpec(structureClass);
  const { runAxis } = frameAxes(config);
  const runSpan = Math.max(1, axisSpan(runAxis, widthM, lengthM) - spec.frameInset * 2);
  const longSpan = Math.max(1, axisSpan(runAxis === "x" ? "z" : "x", widthM, lengthM) - spec.frameInset * 2);
  const framePositions = getBayPositions(longSpan, structureClass);

  return (
    <group name={`structural-frame-${structureClass}-${config.roof.type}`}>
      {framePositions.map((longCoord) => (
        <PrimaryFrame
          key={`primary-frame-${longCoord}`}
          config={config}
          runAxis={runAxis}
          runSpan={runSpan}
          longCoord={longCoord}
          spec={spec}
        />
      ))}

      <EndWallFrame config={config} runAxis={runAxis} runSpan={runSpan} longCoord={-longSpan / 2} spec={spec} />
      <EndWallFrame config={config} runAxis={runAxis} runSpan={runSpan} longCoord={longSpan / 2} spec={spec} />
      <RoofSecondary config={config} runAxis={runAxis} runSpan={runSpan} longSpan={longSpan} spec={spec} />
      <WallSecondary config={config} runAxis={runAxis} runSpan={runSpan} longSpan={longSpan} spec={spec} />
      <VerticalBracing config={config} runAxis={runAxis} runSpan={runSpan} longSpan={longSpan} framePositions={framePositions} spec={spec} />
      <OpeningFrames config={config} spec={spec} />
    </group>
  );
}
