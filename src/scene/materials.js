import { MeshPhysicalMaterial, MeshStandardMaterial } from "three";

export const materials = {
  wall: new MeshStandardMaterial({
    color: "#d6dde1",
    roughness: 0.62,
    metalness: 0.15,
  }),
  wallCore: new MeshStandardMaterial({
    color: "#c4ccd1",
    roughness: 0.78,
    metalness: 0.05,
  }),
  wallStructureMode: new MeshStandardMaterial({
    color: "#d6dde1",
    roughness: 0.7,
    metalness: 0.1,
    transparent: true,
    opacity: 0.18,
  }),
  roof: new MeshStandardMaterial({
    color: "#7c8790",
    roughness: 0.54,
    metalness: 0.28,
  }),
  roofCore: new MeshStandardMaterial({
    color: "#b7c0c6",
    roughness: 0.72,
    metalness: 0.08,
  }),
  roofStructureMode: new MeshStandardMaterial({
    color: "#7c8790",
    roughness: 0.6,
    metalness: 0.22,
    transparent: true,
    opacity: 0.28,
  }),
  steel: new MeshStandardMaterial({
    color: "#2f3d48",
    roughness: 0.42,
    metalness: 0.72,
  }),
  trim: new MeshStandardMaterial({
    color: "#1f2933",
    roughness: 0.5,
    metalness: 0.55,
  }),
  dimension: new MeshStandardMaterial({
    color: "#059669",
    roughness: 0.35,
    metalness: 0.15,
  }),
  gate: new MeshStandardMaterial({
    color: "#383d42",
    roughness: 0.62,
    metalness: 0.2,
  }),
  track: new MeshStandardMaterial({
    color: "#9aa3ab",
    roughness: 0.42,
    metalness: 0.85,
  }),
  roller: new MeshStandardMaterial({
    color: "#1d2228",
    roughness: 0.55,
    metalness: 0.3,
  }),
  gateBox: new MeshStandardMaterial({
    color: "#b6bcc1",
    roughness: 0.4,
    metalness: 0.78,
  }),
  gateSeal: new MeshStandardMaterial({
    color: "#0e1216",
    roughness: 0.85,
    metalness: 0.05,
  }),
  glass: new MeshPhysicalMaterial({
    color: "#9fc5d6",
    roughness: 0.12,
    metalness: 0,
    transmission: 0.25,
    thickness: 0.05,
    transparent: true,
    opacity: 0.55,
  }),
  darkVoid: new MeshStandardMaterial({
    color: "#151a1f",
    roughness: 0.8,
    metalness: 0.1,
  }),
  concrete: new MeshStandardMaterial({
    color: "#aeb3b6",
    roughness: 0.86,
    metalness: 0,
  }),
  concreteSide: new MeshStandardMaterial({
    color: "#8d9295",
    roughness: 0.92,
    metalness: 0,
  }),
  concreteJoint: new MeshStandardMaterial({
    color: "#6f7477",
    roughness: 0.95,
    metalness: 0,
  }),
  concreteStain: new MeshStandardMaterial({
    color: "#c4c8ca",
    roughness: 1,
    metalness: 0,
    transparent: true,
    opacity: 0.28,
  }),
  siteGround: new MeshStandardMaterial({
    color: "#8f9991",
    roughness: 1,
    metalness: 0,
  }),
};
