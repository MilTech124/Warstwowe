import {
  AdditiveBlending,
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  NoColorSpace,
  RepeatWrapping,
  ShaderChunk,
  SRGBColorSpace,
  TextureLoader,
  Vector2,
} from "three";
import {
  FINISH_PRESETS,
  getFinishForRole,
  resolveFinishMaps,
} from "@/config/materialFinishes";

/**
 * @typedef {"wall" | "roof" | "flashing" | "gate"} PaintedMetalRole
 * @typedef {{
 *   color: string,
 *   roughness: number,
 *   metalness: number,
 *   roughnessMap?: import("three").Texture,
 *   normalMap?: import("three").Texture,
 *   normalScale?: Vector2,
 *   envMapIntensity?: number,
 *   clearcoat?: number,
 *   clearcoatRoughness?: number,
 * }} MaterialPreset
 */

const textureRegistry = [];
const paintedMaterialCache = new Map();
const gateMaterialCache = new Map();
const glassMaterialCache = new Map();
const externalTextureCache = new Map();
const externalTextureLoader = typeof window !== "undefined" ? new TextureLoader() : null;

function findFinishByHex(hex, role) {
  if (!hex) return getFinishForRole(null, role);
  const normalized = String(hex).toLowerCase();
  return Object.values(FINISH_PRESETS).find(
    (finish) => finish.hex?.toLowerCase() === normalized && finish.allowedRoles.includes(role),
  ) || {
    id: `custom-${normalized}`,
    label: normalized,
    kind: "metal",
    hex,
    surfaceFamily: "matte-polyester",
    maps: null,
    scaleM: [0.42, 0.42],
    grainAxis: "isotropic",
    roughness: 0.48,
    metalness: 0.08,
  };
}

function normalizeFinish(finish, role) {
  if (finish?.id) return finish;
  if (typeof finish === "string" && FINISH_PRESETS[finish]) {
    return getFinishForRole(finish, role);
  }
  return findFinishByHex(finish?.hex || finish, role);
}

function loadExternalTexture(path, color = false) {
  if (!path || !externalTextureLoader) return null;
  const key = `${color ? "color" : "data"}:${path}`;
  if (!externalTextureCache.has(key)) {
    const texture = externalTextureLoader.load(path);
    texture.name = `finish:${path}`;
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.colorSpace = color ? SRGBColorSpace : NoColorSpace;
    texture.minFilter = LinearMipmapLinearFilter;
    texture.magFilter = LinearFilter;
    texture.generateMipmaps = true;
    textureRegistry.push(texture);
    externalTextureCache.set(key, texture);
  }
  return externalTextureCache.get(key);
}

function finishTextureProps(finish, quality, role) {
  const maps = resolveFinishMaps(finish, quality, role);
  return {
    map: loadExternalTexture(maps.map, true) || undefined,
    normalMap: loadExternalTexture(maps.normal, false) || undefined,
    roughnessMap: loadExternalTexture(maps.roughness, false) || undefined,
  };
}

function projectedShader(finish, role, projection = "world") {
  const [scaleX = 1, scaleY = 1] = finish.scaleM || [1, 1];
  const axis = typeof finish.grainAxis === "object" ? finish.grainAxis[role] : finish.grainAxis;
  const rotateQuarter = finish.kind === "wood" && axis === "horizontal";
  const shaderKey = [
    "finish-projection-v1",
    finish.id,
    role,
    projection,
    scaleX,
    scaleY,
    rotateQuarter ? "r90" : "r0",
  ].join(":");

  const hook = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
varying vec3 vGarageProjectPosition;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
vGarageProjectPosition = ${projection === "local"
    ? "transformed"
    : "( modelMatrix * vec4( transformed, 1.0 ) ).xyz"};`,
      );

    const projectionFunction = `
varying vec3 vGarageProjectPosition;
vec2 garageProjectedUv() {
  vec3 projectNormal = normalize( cross( dFdx( vGarageProjectPosition ), dFdy( vGarageProjectPosition ) ) );
  vec3 axisWeight = abs( projectNormal );
  vec2 uv;
  if ( axisWeight.y >= axisWeight.x && axisWeight.y >= axisWeight.z ) {
    uv = vec2( vGarageProjectPosition.x, vGarageProjectPosition.z );
  } else if ( axisWeight.x >= axisWeight.z ) {
    uv = vec2( vGarageProjectPosition.z, vGarageProjectPosition.y );
  } else {
    uv = vec2( vGarageProjectPosition.x, vGarageProjectPosition.y );
  }
  uv /= vec2( ${Number(scaleX).toFixed(6)}, ${Number(scaleY).toFixed(6)} );
  ${rotateQuarter ? "uv = vec2( uv.y, -uv.x );" : ""}
  return uv;
}`;

    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>${projectionFunction}`)
      .replace(
        "#include <normal_fragment_begin>",
        ShaderChunk.normal_fragment_begin.replaceAll("vNormalMapUv", "garageProjectedUv()"),
      )
      .replace(
        "#include <map_fragment>",
        ShaderChunk.map_fragment.replaceAll("vMapUv", "garageProjectedUv()"),
      )
      .replace(
        "#include <normal_fragment_maps>",
        ShaderChunk.normal_fragment_maps.replaceAll("vNormalMapUv", "garageProjectedUv()"),
      )
      .replace(
        "#include <roughnessmap_fragment>",
        ShaderChunk.roughnessmap_fragment.replaceAll("vRoughnessMapUv", "garageProjectedUv()"),
      );
  };

  return {
    onBeforeCompile: hook,
    customProgramCacheKey: () => shaderKey,
  };
}

function hashNoise(x, y, seed = 0) {
  const value = Math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453;
  return value - Math.floor(value);
}

function makeTexture(data, size, { color = false, repeat = [1, 1] } = {}) {
  const texture = new DataTexture(data, size, size);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(...repeat);
  texture.colorSpace = color ? SRGBColorSpace : NoColorSpace;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  textureRegistry.push(texture);
  return texture;
}

function createMetalSurfaceMaps(size = 128) {
  const roughness = new Uint8Array(size * size * 4);
  const normal = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const broad = hashNoise(Math.floor(x / 7), Math.floor(y / 5), 2);
      const fine = hashNoise(x, y, 9);
      const rolled = Math.sin((x / size) * Math.PI * 18) * 0.5 + 0.5;
      const rough = Math.round(196 + (broad - 0.5) * 20 + (fine - 0.5) * 7);

      roughness[index] = rough;
      roughness[index + 1] = rough;
      roughness[index + 2] = rough;
      roughness[index + 3] = 255;

      normal[index] = Math.round(128 + (rolled - 0.5) * 7 + (fine - 0.5) * 3);
      normal[index + 1] = Math.round(128 + (broad - 0.5) * 4);
      normal[index + 2] = 255;
      normal[index + 3] = 255;
    }
  }

  return {
    roughnessMap: makeTexture(roughness, size, { repeat: [4, 4] }),
    normalMap: makeTexture(normal, size, { repeat: [4, 4] }),
  };
}

function createConcreteSurfaceMaps(size = 256, pavers = false) {
  const color = new Uint8Array(size * size * 4);
  const roughness = new Uint8Array(size * size * 4);
  const height = new Float32Array(size * size);
  const normal = new Uint8Array(size * size * 4);
  const brickW = 40;
  const brickH = 20;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const pixel = y * size + x;
      const index = pixel * 4;
      const largeNoise = hashNoise(Math.floor(x / 9), Math.floor(y / 9), pavers ? 3 : 5);
      const grain = hashNoise(x, y, pavers ? 11 : 13);
      const row = Math.floor(y / brickH);
      const shiftedX = x + (row % 2) * (brickW / 2);
      const mortar = pavers && (
        shiftedX % brickW < 1.4 ||
        y % brickH < 1.4
      );
      const base = pavers ? 151 : 174;
      const shade = base + (largeNoise - 0.5) * 18 + (grain - 0.5) * 7 - (mortar ? 30 : 0);

      color[index] = Math.max(0, Math.min(255, Math.round(shade * 0.98)));
      color[index + 1] = Math.max(0, Math.min(255, Math.round(shade)));
      color[index + 2] = Math.max(0, Math.min(255, Math.round(shade * 1.01)));
      color[index + 3] = 255;

      const rough = Math.round((pavers ? 222 : 216) + (grain - 0.5) * 24 + (mortar ? 18 : 0));
      roughness[index] = rough;
      roughness[index + 1] = rough;
      roughness[index + 2] = rough;
      roughness[index + 3] = 255;
      height[pixel] = (largeNoise - 0.5) * 0.25 + (grain - 0.5) * 0.08 - (mortar ? 0.7 : 0);
    }
  }

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const left = height[y * size + ((x - 1 + size) % size)];
      const right = height[y * size + ((x + 1) % size)];
      const down = height[((y - 1 + size) % size) * size + x];
      const up = height[((y + 1) % size) * size + x];
      const dx = (right - left) * 0.7;
      const dy = (up - down) * 0.7;
      const length = Math.hypot(dx, dy, 1);

      normal[index] = Math.round(((-dx / length) * 0.5 + 0.5) * 255);
      normal[index + 1] = Math.round(((-dy / length) * 0.5 + 0.5) * 255);
      normal[index + 2] = Math.round(((1 / length) * 0.5 + 0.5) * 255);
      normal[index + 3] = 255;
    }
  }

  const repeat = pavers ? [72, 72] : [3, 3];
  return {
    map: makeTexture(color, size, { color: true, repeat }),
    roughnessMap: makeTexture(roughness, size, { repeat }),
    normalMap: makeTexture(normal, size, { repeat }),
  };
}

function createGateStructureMaps(structure, size = 128) {
  const color = new Uint8Array(size * size * 4);
  const roughness = new Uint8Array(size * size * 4);
  const normal = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const fine = hashNoise(x, y, structure.length);
      const broad = hashNoise(Math.floor(x / 8), Math.floor(y / 8), structure.length + 5);
      const grainWave = Math.sin(y * 0.33 + Math.sin(x * 0.12) * 2.8 + broad * 4.2);
      const wood = structure === "woodgrain";
      const sand = structure === "sandgrain";
      const smooth = structure === "smoothgrain";
      const baseColor = wood ? 220 + grainWave * 12 + (broad - 0.5) * 16 : 244 + (broad - 0.5) * 5;
      const baseRoughness = wood ? 184 : sand ? 166 : smooth ? 126 : 108;
      const roughVariation = wood
        ? grainWave * 12 + (fine - 0.5) * 10
        : sand
          ? (fine - 0.5) * 42
          : (fine - 0.5) * (smooth ? 10 : 5);
      const nx = wood
        ? grainWave * 11 + (fine - 0.5) * 5
        : sand
          ? (fine - 0.5) * 20
          : (fine - 0.5) * (smooth ? 4 : 2);
      const ny = wood
        ? (broad - 0.5) * 8
        : sand
          ? (broad - 0.5) * 16
          : (broad - 0.5) * 3;

      const tone = Math.max(0, Math.min(255, Math.round(baseColor)));
      color[index] = tone;
      color[index + 1] = tone;
      color[index + 2] = tone;
      color[index + 3] = 255;

      const rough = Math.max(0, Math.min(255, Math.round(baseRoughness + roughVariation)));
      roughness[index] = rough;
      roughness[index + 1] = rough;
      roughness[index + 2] = rough;
      roughness[index + 3] = 255;

      normal[index] = Math.max(0, Math.min(255, Math.round(128 + nx)));
      normal[index + 1] = Math.max(0, Math.min(255, Math.round(128 + ny)));
      normal[index + 2] = 255;
      normal[index + 3] = 255;
    }
  }

  const repeat = structure === "woodgrain" ? [1.4, 4.2] : structure === "sandgrain" ? [5, 5] : [2.5, 2.5];
  return {
    map: makeTexture(color, size, { color: true, repeat }),
    roughnessMap: makeTexture(roughness, size, { repeat }),
    normalMap: makeTexture(normal, size, { repeat }),
  };
}

const metalMaps = createMetalSurfaceMaps();
const concreteMaps = createConcreteSurfaceMaps();
const pavingMaps = createConcreteSurfaceMaps(256, true);
const gateStructureMaps = Object.freeze({
  woodgrain: createGateStructureMaps("woodgrain"),
  smoothgrain: createGateStructureMaps("smoothgrain"),
  sandgrain: createGateStructureMaps("sandgrain"),
  silkline: createGateStructureMaps("silkline"),
});

const paintedMetalProfiles = Object.freeze({
  wall: {
    roughness: 0.46,
    metalness: 0.08,
    clearcoat: 0.08,
    clearcoatRoughness: 0.62,
    envMapIntensity: 0.95,
    normalScale: new Vector2(0.22, 0.22),
  },
  roof: {
    roughness: 0.42,
    metalness: 0.1,
    clearcoat: 0.1,
    clearcoatRoughness: 0.56,
    envMapIntensity: 1.08,
    normalScale: new Vector2(0.26, 0.26),
  },
  flashing: {
    roughness: 0.36,
    metalness: 0.12,
    clearcoat: 0.14,
    clearcoatRoughness: 0.48,
    envMapIntensity: 1.12,
    normalScale: new Vector2(0.16, 0.16),
  },
  gate: {
    roughness: 0.48,
    metalness: 0.08,
    clearcoat: 0.1,
    clearcoatRoughness: 0.58,
    envMapIntensity: 0.98,
    normalScale: new Vector2(0.2, 0.2),
  },
});

/** @returns {MaterialPreset} */
export function paintedMetalProps(finishInput, role = "wall", options = {}) {
  const {
    quality = "high",
    projection = role === "gate" || role === "door" || role === "frame" ? "local" : "world",
    ...overrides
  } = options;
  const finish = normalizeFinish(finishInput, role);
  const profile = paintedMetalProfiles[role] || paintedMetalProfiles.wall;
  const externalMaps = finishTextureProps(finish, quality, role);
  const hasExternalMaps = externalMaps.map || externalMaps.normalMap || externalMaps.roughnessMap;
  const shader = projectedShader(finish, role, projection);

  return {
    color: finish.kind === "wood" && externalMaps.map ? "#ffffff" : finish.hex,
    ...profile,
    roughness: finish.roughness ?? profile.roughness,
    metalness: finish.metalness ?? profile.metalness,
    clearcoat: finish.kind === "wood" ? 0.045 : profile.clearcoat,
    clearcoatRoughness: finish.kind === "wood" ? 0.7 : profile.clearcoatRoughness,
    normalScale: finish.kind === "wood"
      ? role === "wall"
        ? new Vector2(0.035, 0.035)
        : new Vector2(0.22, 0.22)
      : profile.normalScale,
    roughnessMap: externalMaps.roughnessMap || metalMaps.roughnessMap,
    normalMap: externalMaps.normalMap || metalMaps.normalMap,
    ...(externalMaps.map ? { map: externalMaps.map } : {}),
    ...(hasExternalMaps || metalMaps.normalMap ? shader : {}),
    ...overrides,
  };
}

function createPhysicalMaterial(props) {
  const material = new MeshPhysicalMaterial(props);
  if (props.onBeforeCompile) material.onBeforeCompile = props.onBeforeCompile;
  if (props.customProgramCacheKey) material.customProgramCacheKey = props.customProgramCacheKey;
  return material;
}

export function getPaintedMetalMaterial(finishInput, role = "wall", overrides = {}) {
  const finish = normalizeFinish(finishInput, role);
  const key = `${role}:${finish.id}:${JSON.stringify(overrides)}`;
  if (!paintedMaterialCache.has(key)) {
    paintedMaterialCache.set(key, createPhysicalMaterial(paintedMetalProps(finish, role, overrides)));
  }
  return paintedMaterialCache.get(key);
}

export function getWoodGateMaterial(finishInput, quality = "high") {
  return getGateSurfaceMaterial(finishInput, "woodgrain", quality);
}

export function getFrontProjectionLiningMaterial(finish, quality = "high") {
  return getPaintedMetalMaterial(finish || "anthracite", "soffit", {
    quality,
    projection: "world",
    roughness: 0.5,
    clearcoat: 0.055,
    clearcoatRoughness: 0.68,
  });
}

export function getGateSurfaceMaterial(finishInput, structure = "silkline", quality = "high") {
  const finish = normalizeFinish(finishInput, "gate");
  const normalizedStructure = gateStructureMaps[structure] ? structure : "silkline";
  const key = `${normalizedStructure}:${finish.id}:${quality}`;
  if (!gateMaterialCache.has(key)) {
    const profile = {
      woodgrain: {
        roughness: 0.64,
        metalness: 0.025,
        clearcoat: 0.035,
        clearcoatRoughness: 0.74,
        envMapIntensity: 0.82,
        normalScale: new Vector2(0.32, 0.32),
      },
      smoothgrain: {
        roughness: 0.43,
        metalness: 0.045,
        clearcoat: 0.09,
        clearcoatRoughness: 0.58,
        envMapIntensity: 0.96,
        normalScale: new Vector2(0.11, 0.11),
      },
      sandgrain: {
        roughness: 0.57,
        metalness: 0.035,
        clearcoat: 0.035,
        clearcoatRoughness: 0.76,
        envMapIntensity: 0.82,
        normalScale: new Vector2(0.28, 0.28),
      },
      silkline: {
        roughness: 0.34,
        metalness: 0.07,
        clearcoat: 0.14,
        clearcoatRoughness: 0.46,
        envMapIntensity: 1.05,
        normalScale: new Vector2(0.045, 0.045),
      },
    }[normalizedStructure];

    const finishProps = paintedMetalProps(finish, "gate", {
      quality,
      projection: "local",
      ...profile,
    });
    if (!finishProps.map && !resolveFinishMaps(finish, quality, "gate").normal) {
      Object.assign(finishProps, gateStructureMaps[normalizedStructure]);
    }
    gateMaterialCache.set(key, createPhysicalMaterial(finishProps));
  }
  return gateMaterialCache.get(key);
}

export function getGlassMaterial({ tint, roughness, transmission }) {
  const key = `${tint}:${roughness}:${transmission}`;
  if (!glassMaterialCache.has(key)) {
    glassMaterialCache.set(
      key,
      new MeshPhysicalMaterial({
        color: tint,
        roughness,
        metalness: 0,
        transmission,
        thickness: 0.022,
        ior: 1.52,
        transparent: true,
        opacity: Math.min(0.9, 0.44 + transmission * 0.5),
        envMapIntensity: 1.38,
        attenuationColor: tint,
        attenuationDistance: 1.6,
        depthWrite: false,
      }),
    );
  }
  return glassMaterialCache.get(key);
}

export function setSceneTextureAnisotropy(value) {
  textureRegistry.forEach((texture) => {
    texture.anisotropy = value;
    if (texture.image) texture.needsUpdate = true;
  });
}

const standardMaterialKeys = [
  "color",
  "roughness",
  "metalness",
  "map",
  "roughnessMap",
  "normalMap",
  "normalScale",
  "envMapIntensity",
  "transparent",
  "opacity",
  "alphaTest",
  "side",
  "depthWrite",
  "onBeforeCompile",
  "customProgramCacheKey",
];

const physicalMaterialKeys = [
  ...standardMaterialKeys,
  "clearcoat",
  "clearcoatRoughness",
  "transmission",
  "thickness",
  "ior",
  "attenuationColor",
  "attenuationDistance",
];

export function materialProps(material, clippingPlanes, physical = true) {
  const props = {};
  const keys = physical ? physicalMaterialKeys : standardMaterialKeys;
  keys.forEach((key) => {
    if (material?.[key] !== undefined && material?.[key] !== null) {
      props[key] = material[key];
    }
  });
  props.clippingPlanes = clippingPlanes
    ? (Array.isArray(clippingPlanes) ? clippingPlanes : [clippingPlanes])
    : [];
  props.clipShadows = true;
  return props;
}

export const materials = {
  wall: getPaintedMetalMaterial("#d6dde1", "wall"),
  wallCore: new MeshStandardMaterial({
    color: "#d7dce0",
    roughness: 0.82,
    metalness: 0.01,
    envMapIntensity: 0.45,
  }),
  wallStructureMode: new MeshStandardMaterial({
    color: "#d6dde1",
    roughness: 0.72,
    metalness: 0.04,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
  }),
  roof: getPaintedMetalMaterial("#7c8790", "roof"),
  roofCore: new MeshStandardMaterial({
    color: "#c7cdd1",
    roughness: 0.78,
    metalness: 0.01,
    envMapIntensity: 0.4,
  }),
  roofStructureMode: new MeshStandardMaterial({
    color: "#7c8790",
    roughness: 0.64,
    metalness: 0.06,
    transparent: true,
    opacity: 0.25,
    depthWrite: false,
  }),
  steel: new MeshStandardMaterial({
    color: "#3a4650",
    roughness: 0.44,
    metalness: 0.48,
    envMapIntensity: 0.9,
  }),
  trim: new MeshStandardMaterial({
    color: "#28333d",
    roughness: 0.46,
    metalness: 0.34,
    envMapIntensity: 0.92,
  }),
  lightingHousing: new MeshStandardMaterial({
    color: "#252b31",
    roughness: 0.38,
    metalness: 0.72,
    envMapIntensity: 0.96,
  }),
  lightingDiffuser: new MeshStandardMaterial({
    color: "#fff7df",
    emissive: "#fff1c2",
    emissiveIntensity: 4.8,
    roughness: 0.34,
    metalness: 0,
    toneMapped: false,
  }),
  lightingLed: new MeshStandardMaterial({
    color: "#fff8e8",
    emissive: "#fff0bd",
    emissiveIntensity: 6.2,
    roughness: 0.28,
    metalness: 0,
    toneMapped: false,
  }),
  lightingGlow: new MeshBasicMaterial({
    color: "#fff1bd",
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    blending: AdditiveBlending,
    toneMapped: false,
  }),
  dimension: new MeshStandardMaterial({
    color: "#059669",
    roughness: 0.38,
    metalness: 0.08,
    envMapIntensity: 0.75,
  }),
  gate: getPaintedMetalMaterial("#383d42", "gate"),
  track: new MeshStandardMaterial({
    color: "#aab2b8",
    roughness: 0.32,
    metalness: 0.82,
    envMapIntensity: 1.2,
  }),
  roller: new MeshStandardMaterial({
    color: "#242a30",
    roughness: 0.54,
    metalness: 0.24,
    envMapIntensity: 0.8,
  }),
  gateBox: new MeshStandardMaterial({
    color: "#b8bec3",
    roughness: 0.34,
    metalness: 0.66,
    envMapIntensity: 1.08,
  }),
  gateSeal: new MeshStandardMaterial({
    color: "#111519",
    roughness: 0.9,
    metalness: 0,
  }),
  rubberSeal: new MeshStandardMaterial({
    color: "#15191c",
    roughness: 0.92,
    metalness: 0,
  }),
  gasket: new MeshStandardMaterial({
    color: "#202427",
    roughness: 0.96,
    metalness: 0,
  }),
  handle: new MeshStandardMaterial({
    color: "#c1c7cb",
    roughness: 0.22,
    metalness: 0.88,
    envMapIntensity: 1.34,
  }),
  stainlessSteel: new MeshStandardMaterial({
    color: "#cbd1d5",
    roughness: 0.2,
    metalness: 0.92,
    envMapIntensity: 1.42,
  }),
  galvanized: new MeshStandardMaterial({
    color: "#9ca8af",
    roughness: 0.42,
    metalness: 0.74,
    envMapIntensity: 1.08,
  }),
  hardwarePlastic: new MeshStandardMaterial({
    color: "#262b2f",
    roughness: 0.58,
    metalness: 0.04,
    envMapIntensity: 0.66,
  }),
  glazingSpacer: new MeshStandardMaterial({
    color: "#3d4144",
    roughness: 0.48,
    metalness: 0.42,
    envMapIntensity: 0.8,
  }),
  hinge: new MeshStandardMaterial({
    color: "#7d878e",
    roughness: 0.34,
    metalness: 0.78,
    envMapIntensity: 1.1,
  }),
  glass: new MeshPhysicalMaterial({
    color: "#c8e3eb",
    roughness: 0.08,
    metalness: 0,
    transmission: 0.82,
    thickness: 0.018,
    ior: 1.5,
    transparent: true,
    opacity: 0.72,
    envMapIntensity: 1.3,
    attenuationColor: "#dceff4",
    attenuationDistance: 1.8,
    depthWrite: false,
  }),
  darkVoid: new MeshStandardMaterial({
    color: "#1b2024",
    roughness: 0.88,
    metalness: 0.02,
    envMapIntensity: 0.35,
  }),
  concrete: new MeshStandardMaterial({
    color: "#ffffff",
    map: concreteMaps.map,
    roughness: 0.9,
    roughnessMap: concreteMaps.roughnessMap,
    normalMap: concreteMaps.normalMap,
    normalScale: new Vector2(0.2, 0.2),
    metalness: 0,
    envMapIntensity: 0.4,
  }),
  concreteSide: new MeshStandardMaterial({
    color: "#9ca1a4",
    roughness: 0.94,
    roughnessMap: concreteMaps.roughnessMap,
    normalMap: concreteMaps.normalMap,
    normalScale: new Vector2(0.16, 0.16),
    metalness: 0,
    envMapIntensity: 0.3,
  }),
  concreteJoint: new MeshStandardMaterial({
    color: "#62686b",
    roughness: 0.98,
    metalness: 0,
  }),
  concreteStain: new MeshStandardMaterial({
    color: "#8d9295",
    roughness: 1,
    metalness: 0,
    transparent: true,
    opacity: 0.1,
    depthWrite: false,
  }),
  siteGround: new MeshStandardMaterial({
    color: "#ffffff",
    map: pavingMaps.map,
    roughness: 0.96,
    roughnessMap: pavingMaps.roughnessMap,
    normalMap: pavingMaps.normalMap,
    normalScale: new Vector2(0.38, 0.38),
    metalness: 0,
    envMapIntensity: 0.28,
  }),
};
