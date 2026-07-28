import { useMemo } from "react";
import { Matrix4, Object3D, Quaternion, Vector3 } from "three";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import { materials } from "@/scene/materials";
import {
  exteriorSconcePlacements,
  frontProjectionLedSegments,
  gateLampPlacements,
  interiorLampPlacements,
  interiorSoftLightPlacement,
  roofPerimeterLedSegments,
} from "@/scene/lightingMath";

const LIGHT_COLOR = "#fff1cf";
RectAreaLightUniformsLib.init();

function selectEvenly(items, maximum) {
  if (items.length <= maximum) return items;
  if (maximum <= 1) return [items[Math.floor((items.length - 1) / 2)]];
  return Array.from(
    { length: maximum },
    (_, index) => items[Math.round((index * (items.length - 1)) / (maximum - 1))],
  );
}

function ledSegmentTransform(item) {
  const start = new Vector3(...item.start);
  const end = new Vector3(...item.end);
  const direction = end.clone().sub(start);
  return {
    length: direction.length(),
    position: start.add(end).multiplyScalar(0.5).toArray(),
    quaternion: new Quaternion().setFromUnitVectors(
      new Vector3(0, 0, 1),
      direction.normalize(),
    ),
  };
}

function LedSegment({ item }) {
  const transform = useMemo(
    () => ledSegmentTransform(item),
    [item],
  );
  if (transform.length <= 0.02) return null;

  return (
    <group
      name={item.name}
      position={transform.position}
      quaternion={transform.quaternion}
    >
      <mesh name={`${item.name}-housing`} material={materials.lightingHousing} castShadow>
        <boxGeometry args={[0.05, 0.026, transform.length]} />
      </mesh>
      <mesh
        name={`${item.name}-diffuser`}
        position={[0, -0.02, 0.003]}
        material={materials.lightingLed}
      >
        <boxGeometry args={[0.034, 0.018, transform.length + 0.008]} />
      </mesh>
      <mesh
        name={`${item.name}-emissive-glow`}
        position={[0, -0.026, 0.003]}
        material={materials.lightingGlow}
      >
        <boxGeometry args={[0.065, 0.026, transform.length + 0.025]} />
      </mesh>
    </group>
  );
}

function linearAreaTransform(item) {
  const start = new Vector3(...item.start);
  const end = new Vector3(...item.end);
  const xAxis = end.clone().sub(start).normalize();
  const emitDirection = new Vector3(...item.lightDirection).normalize();
  const zAxis = emitDirection.clone().negate();
  zAxis.addScaledVector(xAxis, -zAxis.dot(xAxis)).normalize();
  const yAxis = zAxis.clone().cross(xAxis).normalize();
  const matrix = new Matrix4().makeBasis(xAxis, yAxis, zAxis);
  return {
    position: start.add(end).multiplyScalar(0.5).addScaledVector(emitDirection, 0.045).toArray(),
    quaternion: new Quaternion().setFromRotationMatrix(matrix),
  };
}

function LinearAreaLight({ item, nightPreview, kind }) {
  const transform = useMemo(() => linearAreaTransform(item), [item]);
  const nightIntensity = kind === "roof" ? 7.5 : 6.2;
  const dayIntensity = kind === "roof" ? 2.8 : 2.3;

  return (
    <rectAreaLight
      name={`${kind}-led-linear-light`}
      position={transform.position}
      quaternion={transform.quaternion}
      color={LIGHT_COLOR}
      intensity={nightPreview ? nightIntensity : dayIntensity}
      width={item.length}
      height={0.055}
    />
  );
}

function GateLamp({ placement, nightPreview, withLight }) {
  const areaTransform = useMemo(
    () => linearAreaTransform({
      start: [-placement.width / 2, -0.045, 0.06],
      end: [placement.width / 2, -0.045, 0.06],
      lightDirection: [0, -0.58, 0.82],
    }),
    [placement.width],
  );

  return (
    <group
      name={`gate-lamp-${placement.id}`}
      position={placement.position}
      rotation={placement.rotation}
    >
      <group position={placement.localPosition}>
        <mesh
          name="gate-lamp-housing"
          position={[0, 0.012, 0.005]}
          material={materials.lightingHousing}
          castShadow
        >
          <boxGeometry args={[placement.width + 0.08, 0.12, 0.09]} />
        </mesh>
        <mesh
          name="gate-lamp-diffuser"
          position={[0, -0.045, 0.055]}
          rotation={[Math.PI * 0.12, 0, 0]}
          material={materials.lightingDiffuser}
        >
          <boxGeometry args={[placement.width, 0.04, 0.05]} />
        </mesh>
        <mesh
          name="gate-lamp-emissive-glow"
          position={[0, -0.058, 0.065]}
          rotation={[Math.PI * 0.12, 0, 0]}
          material={materials.lightingGlow}
        >
          <boxGeometry args={[placement.width + 0.08, 0.06, 0.07]} />
        </mesh>
        {withLight && (
          <rectAreaLight
            name="gate-lamp-linear-light"
            position={areaTransform.position}
            quaternion={areaTransform.quaternion}
            color={LIGHT_COLOR}
            intensity={nightPreview ? 27 : 9.5}
            width={placement.width + 0.14}
            height={0.18}
          />
        )}
      </group>
    </group>
  );
}

function InteriorLamp({ placement }) {
  return (
    <group name={placement.id} position={placement.position}>
      <mesh name="interior-led-housing" material={materials.lightingHousing} castShadow>
        <boxGeometry args={[0.16, 0.08, placement.length + 0.1]} />
      </mesh>
      <mesh
        name="interior-led-diffuser"
        position={[0, -0.052, 0]}
        material={materials.lightingDiffuser}
      >
        <boxGeometry args={[0.115, 0.03, placement.length]} />
      </mesh>
      <mesh
        name="interior-led-emissive-glow"
        position={[0, -0.068, 0]}
        material={materials.lightingGlow}
      >
        <boxGeometry args={[0.2, 0.055, placement.length + 0.12]} />
      </mesh>
    </group>
  );
}

function InteriorSoftLight({ placement, nightPreview }) {
  return (
    <rectAreaLight
      name="interior-garage-soft-area-light"
      position={placement.position}
      rotation={[-Math.PI / 2, 0, 0]}
      color={LIGHT_COLOR}
      intensity={nightPreview ? 0.55 : 0.18}
      width={placement.width}
      height={placement.length}
    />
  );
}

function ExteriorSconce({ placement, nightPreview }) {
  const target = useMemo(() => new Object3D(), []);
  return (
    <group
      name={placement.id}
      position={placement.position}
      rotation={placement.rotation}
    >
      <mesh name="exterior-sconce-housing" material={materials.lightingHousing} castShadow>
        <boxGeometry args={[0.16, 0.25, 0.13]} />
      </mesh>
      <mesh
        name="exterior-sconce-diffuser"
        position={[0, -0.07, 0.075]}
        rotation={[Math.PI * 0.1, 0, 0]}
        material={materials.lightingDiffuser}
      >
        <boxGeometry args={[0.105, 0.075, 0.055]} />
      </mesh>
      <mesh
        name="exterior-sconce-glow"
        position={[0, -0.082, 0.09]}
        rotation={[Math.PI * 0.1, 0, 0]}
        material={materials.lightingGlow}
      >
        <boxGeometry args={[0.16, 0.11, 0.08]} />
      </mesh>
      <spotLight
        name="exterior-sconce-light"
        position={[0, -0.07, 0.13]}
        target={target}
        color={LIGHT_COLOR}
        intensity={nightPreview ? 36 : 12}
        distance={2.8}
        angle={0.62}
        penumbra={0.92}
        decay={2}
      />
      <pointLight
        name="exterior-sconce-wall-glow"
        position={[0, -0.1, -0.015]}
        color={LIGHT_COLOR}
        intensity={nightPreview ? 12.5 : 4}
        distance={1.4}
        decay={2}
      />
      <primitive object={target} position={[0, -0.98, -0.25]} />
    </group>
  );
}

function LedRun({ name, segments, nightPreview, kind, maximumLightSources }) {
  const litSegments = useMemo(
    () => selectEvenly(segments, maximumLightSources),
    [maximumLightSources, segments],
  );
  return (
    <group name={name}>
      {segments.map((item) => <LedSegment key={item.name} item={item} />)}
      {litSegments.map((item) => (
        <LinearAreaLight
          key={`${item.name}-area-light`}
          item={item}
          nightPreview={nightPreview}
          kind={kind}
        />
      ))}
    </group>
  );
}

export function LightingSystem({ config, quality = "high", nightPreview = false }) {
  const lighting = config.lighting ?? {};
  const roofSegments = useMemo(
    () => lighting.roofPerimeterLed ? roofPerimeterLedSegments(config) : [],
    [config, lighting.roofPerimeterLed],
  );
  const projectionSegments = useMemo(
    () => lighting.frontProjectionLed ? frontProjectionLedSegments(config) : [],
    [config, lighting.frontProjectionLed],
  );
  const gateLamps = useMemo(
    () => lighting.gateLamps ? gateLampPlacements(config) : [],
    [config, lighting.gateLamps],
  );
  const interiorLamps = useMemo(
    () => lighting.interiorLighting ? interiorLampPlacements(config) : [],
    [config, lighting.interiorLighting],
  );
  const interiorSoftLight = useMemo(
    () => lighting.interiorLighting ? interiorSoftLightPlacement(config) : null,
    [config, lighting.interiorLighting],
  );
  const exteriorSconces = useMemo(
    () => lighting.exteriorSconces ? exteriorSconcePlacements(config) : [],
    [config, lighting.exteriorSconces],
  );
  const gateLightIds = useMemo(
    () => new Set(selectEvenly(gateLamps, quality === "high" ? 4 : 2).map(({ id }) => id)),
    [gateLamps, quality],
  );

  return (
    <group name="accessory-lighting-root">
      {interiorLamps.length > 0 && (
        <group name="interior-lighting">
          {interiorLamps.map((placement) => (
            <InteriorLamp
              key={placement.id}
              placement={placement}
            />
          ))}
          <InteriorSoftLight placement={interiorSoftLight} nightPreview={nightPreview} />
        </group>
      )}
      {roofSegments.length > 0 && (
        <LedRun
          name="roof-perimeter-led"
          segments={roofSegments}
          nightPreview={nightPreview}
          kind="roof"
          maximumLightSources={roofSegments.length}
        />
      )}
      {gateLamps.map((placement) => (
        <GateLamp
          key={placement.id}
          placement={placement}
          nightPreview={nightPreview}
          withLight={gateLightIds.has(placement.id)}
        />
      ))}
      {exteriorSconces.map((placement) => (
        <ExteriorSconce
          key={placement.id}
          placement={placement}
          nightPreview={nightPreview}
        />
      ))}
      {projectionSegments.length > 0 && (
        <LedRun
          name="front-projection-led"
          segments={projectionSegments}
          nightPreview={nightPreview}
          kind="projection"
          maximumLightSources={projectionSegments.length}
        />
      )}
    </group>
  );
}
