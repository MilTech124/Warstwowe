import { roofSurfaceYAt } from "@/scene/frontProjectionMath";
import { frameAxes, positionsBySpacing, ROOF_STRUCTURE_DROP_M } from "@/scene/structure/axes";
import { addColumn } from "@/scene/structure/parts";

const GROUP = "front-projection-structure";
const SILL_Y = 0.05;

function roofStructureY(x, z, inputs) {
  return roofSurfaceYAt(x, z, inputs) - ROOF_STRUCTURE_DROP_M;
}

function addPortalMember(collector, profile, role, start, end, material = "steel") {
  return collector.addMember({
    role,
    group: GROUP,
    profile,
    start,
    end,
    material,
  });
}

export function buildFrontProjection(inputs, spec, collector) {
  const depthM = Number(inputs.frontProjection?.depthM) || 0;
  if (depthM <= 0) return;

  const { widthM, lengthM } = inputs.dimensions;
  const { runAxis } = frameAxes(inputs);
  const xHalf = widthM / 2 - spec.frameInset;
  const baseFrontZ = lengthM / 2 - spec.frameInset;
  const outerFrontZ = baseFrontZ + depthM;
  const postProfile = spec.profiles.projectionPost;
  const headerProfile = spec.profiles.projectionHeader;
  const rafterProfile = spec.profiles.projectionRafter;
  const purlinProfile = spec.profiles.projectionPurlin;

  [-xHalf, xHalf].forEach((x) => {
    const roofY = roofStructureY(x, outerFrontZ, inputs);
    addColumn(collector, {
      role: "projectionPost",
      group: GROUP,
      profile: postProfile,
      position: [x, 0, outerFrontZ],
      topY: roofY - Math.max(headerProfile.sizeM, rafterProfile.sizeM) / 2,
      plateThicknessM: spec.plateThicknessM,
    });
    collector.addJoint({
      position: [x, roofY, outerFrontZ],
      sizeM: postProfile.sizeM * 0.62,
      role: "projectionPost",
      group: GROUP,
    });
    addPortalMember(
      collector,
      spec.profiles.sillRail,
      "projectionSillRail",
      [x, SILL_Y, baseFrontZ],
      [x, SILL_Y, outerFrontZ],
      "trim",
    );
  });

  if (runAxis === "z") {
    const rafterXPositions = positionsBySpacing(spec.longSpan, spec.rafterSpacing * 1.001);
    rafterXPositions.forEach((x) => {
      addPortalMember(
        collector,
        rafterProfile,
        "projectionRafter",
        [x, roofStructureY(x, baseFrontZ, inputs), baseFrontZ],
        [x, roofStructureY(x, outerFrontZ, inputs), outerFrontZ],
      );
    });

    addPortalMember(
      collector,
      headerProfile,
      "projectionHeader",
      [-xHalf, roofStructureY(-xHalf, outerFrontZ, inputs), outerFrontZ],
      [xHalf, roofStructureY(xHalf, outerFrontZ, inputs), outerFrontZ],
    );
    return;
  }

  const gable = inputs.roof.type === "gable_left_right";
  if (gable) {
    const ridge = [0, roofStructureY(0, outerFrontZ, inputs), outerFrontZ];
    addPortalMember(
      collector,
      rafterProfile,
      "projectionRafter",
      [-xHalf, roofStructureY(-xHalf, outerFrontZ, inputs), outerFrontZ],
      ridge,
    );
    addPortalMember(
      collector,
      rafterProfile,
      "projectionRafter",
      ridge,
      [xHalf, roofStructureY(xHalf, outerFrontZ, inputs), outerFrontZ],
    );
    collector.addJoint({
      position: ridge,
      sizeM: rafterProfile.sizeM * 0.62,
      role: "projectionRafter",
      group: GROUP,
    });
  } else {
    addPortalMember(
      collector,
      rafterProfile,
      "projectionRafter",
      [-xHalf, roofStructureY(-xHalf, outerFrontZ, inputs), outerFrontZ],
      [xHalf, roofStructureY(xHalf, outerFrontZ, inputs), outerFrontZ],
    );
  }

  let purlinXPositions = positionsBySpacing(spec.runSpan, spec.purlinSpacing, 3);
  if (gable && !purlinXPositions.some((x) => Math.abs(x) < 0.05)) {
    purlinXPositions = [...purlinXPositions, 0].sort((a, b) => a - b);
  }
  purlinXPositions.forEach((x) => {
    addPortalMember(
      collector,
      purlinProfile,
      "projectionPurlin",
      [x, roofStructureY(x, baseFrontZ, inputs), baseFrontZ],
      [x, roofStructureY(x, outerFrontZ, inputs), outerFrontZ],
      "trim",
    );
  });
}
