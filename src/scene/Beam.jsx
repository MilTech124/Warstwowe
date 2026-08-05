import { useMemo } from "react";
import { memberTransform } from "@/scene/geometry";
import { profileGeometry } from "@/scene/profileGeometry";
import { materials } from "@/scene/materials";

/**
 * Jeden element konstrukcji. Geometria przekroju jest WSPÓŁDZIELONA (cache po
 * profilu, długość 1 m), a element skaluje ją do swojej długości — dzięki temu
 * hala z kilkuset elementami alokuje kilka geometrii zamiast kilkuset.
 *
 * Skalowanie wyłącznie w osi Z: to oś wyciągnięcia, więc zmienia długość.
 * Skala w X/Y zdeformowałaby przekrój, dlatego zostaje twardo na 1.
 */
export function Beam({ start, end, up, profileId, size = 0.12, material = materials.steel, name, overlap = 0 }) {
  const transform = useMemo(() => memberTransform(start, end, up), [start, end, up]);
  const geometry = useMemo(() => profileGeometry(profileId, size), [profileId, size]);

  return (
    <mesh
      name={name}
      geometry={geometry}
      position={transform.position}
      quaternion={transform.quaternion}
      scale={[1, 1, transform.length + overlap]}
      material={material}
      castShadow
      receiveShadow
    />
  );
}
