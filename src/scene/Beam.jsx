import { useMemo } from "react";
import { quaternionBetween } from "@/scene/geometry";
import { materials } from "@/scene/materials";

export function Beam({ start, end, size = 0.12, material = materials.steel, name, overlap = 0 }) {
  const transform = useMemo(() => quaternionBetween(start, end), [start, end]);

  return (
    <mesh name={name} position={transform.position} quaternion={transform.quaternion} material={material} castShadow receiveShadow>
      <boxGeometry args={[size, size, transform.length + overlap]} />
    </mesh>
  );
}
