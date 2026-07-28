import { Plane, Vector3 } from "three";
import {
  FLASHING_COLORS,
  getRoofCladdingColor,
} from "@/config/catalog";
import { getFrontProjectionFinish } from "@/config/frontProjection";
import {
  frontProjectionRoofAssemblies,
  frontProjectionPortalFasciaAssemblies,
  frontProjectionSideProfiles,
} from "@/scene/frontProjectionMath";
import {
  getFrontProjectionLiningMaterial,
  getPaintedMetalMaterial,
  materialProps,
  materials,
} from "@/scene/materials";

const LINING_THICKNESS_M = 0.022;
const FRONT_CAP_DEPTH_M = 0.035;
const CORE_INSET_M = 0.024;

function topClipPlane(profile) {
  const slope = (profile.endTopY - profile.startTopY) / Math.max(0.001, profile.depthM);
  const intercept = profile.startTopY - slope * profile.zStart;
  return new Plane(new Vector3(0, -1, slope), intercept).normalize();
}

function WingCore({ profile, config }) {
  const thicknessM = Math.max(0.04, (config.cladding?.wallPirThicknessMm ?? 60) / 1000);
  const maxTopY = Math.max(profile.startTopY, profile.endTopY) + 0.08;
  const xDirection = profile.side === "left" ? 1 : -1;
  const x = profile.x + xDirection * (CORE_INSET_M + thicknessM / 2);
  const z = (profile.zStart + profile.zEnd) / 2;
  const clippingPlane = topClipPlane(profile);

  return (
    <mesh
      name={`${profile.side}-front-projection-pir-core`}
      position={[x, maxTopY / 2, z]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[thicknessM, maxTopY, profile.depthM]} />
      <meshStandardMaterial {...materialProps(materials.wallCore, clippingPlane, false)} />
    </mesh>
  );
}

function WingLining({ profile, config, material }) {
  const thicknessM = Math.max(0.04, (config.cladding?.wallPirThicknessMm ?? 60) / 1000);
  const maxTopY = Math.max(profile.startTopY, profile.endTopY) + 0.06;
  const inward = profile.side === "left" ? 1 : -1;
  const x = profile.x + inward * (
    CORE_INSET_M + thicknessM + LINING_THICKNESS_M / 2 + 0.002
  );
  const z = (profile.zStart + profile.zEnd) / 2;

  return (
    <mesh
      name={`${profile.side}-front-projection-inner-lining`}
      position={[x, maxTopY / 2, z]}
      material={material}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[LINING_THICKNESS_M, maxTopY, profile.depthM]} />
      <meshStandardMaterial {...materialProps(material, topClipPlane(profile), false)} />
    </mesh>
  );
}

function WingFrontCap({ profile, config, material }) {
  const thicknessM = Math.max(0.04, (config.cladding?.wallPirThicknessMm ?? 60) / 1000);
  const height = Math.max(0.1, profile.endTopY);
  const inward = profile.side === "left" ? 1 : -1;
  const x = profile.x + inward * (CORE_INSET_M + thicknessM / 2);

  return (
    <mesh
      name={`${profile.side}-front-projection-edge-flashing`}
      position={[x, height / 2, profile.zEnd + FRONT_CAP_DEPTH_M / 2]}
      material={material}
      castShadow
      receiveShadow
    >
      <boxGeometry
        args={[
          CORE_INSET_M + thicknessM + LINING_THICKNESS_M + 0.12,
          height,
          FRONT_CAP_DEPTH_M,
        ]}
      />
    </mesh>
  );
}

function PortalFascia({ assemblies, material }) {
  return assemblies.map((assembly) => (
    <mesh
      key={assembly.name}
      name={assembly.name}
      position={assembly.position}
      rotation={assembly.rotation}
      material={material}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[assembly.width, assembly.height, FRONT_CAP_DEPTH_M]} />
    </mesh>
  ));
}

function RoofLining({ assemblies, material }) {
  return assemblies.map((assembly) => (
    <mesh
      key={assembly.name}
      name={assembly.name}
      position={assembly.position}
      rotation={assembly.rotation}
      material={material}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[assembly.width + 0.012, LINING_THICKNESS_M, assembly.length + 0.012]} />
    </mesh>
  ));
}

export function FrontProjectionSystem({ config, quality = "high" }) {
  const profiles = frontProjectionSideProfiles(config);
  if (!profiles.length) return null;

  const finish = getFrontProjectionFinish(config.frontProjection?.liningFinish);
  const liningMaterial = getFrontProjectionLiningMaterial(finish, quality);
  const flashingFinish = config.flashings?.color === "roof_match"
    ? getRoofCladdingColor(config.cladding)
    : FLASHING_COLORS[config.flashings?.color] || getRoofCladdingColor(config.cladding);
  const flashingMaterial = getPaintedMetalMaterial(flashingFinish, "flashing", {
    quality,
    projection: "world",
  });
  const roofAssemblies = frontProjectionRoofAssemblies(config);
  const portalFasciaAssemblies = frontProjectionPortalFasciaAssemblies(config);

  return (
    <group name="front-projection-root">
      <group name="front-projection-side-wings">
        {profiles.map((sideProfile) => (
          <group key={sideProfile.side} name={`${sideProfile.side}-front-projection-wing`}>
            <WingCore profile={sideProfile} config={config} />
            <WingLining profile={sideProfile} config={config} material={liningMaterial} />
            <WingFrontCap profile={sideProfile} config={config} material={flashingMaterial} />
          </group>
        ))}
      </group>
      <group name="front-projection-roof-lining">
        <RoofLining assemblies={roofAssemblies} material={liningMaterial} />
      </group>
      <group name="front-projection-colored-covers">
        <PortalFascia assemblies={portalFasciaAssemblies} material={flashingMaterial} />
      </group>
    </group>
  );
}
