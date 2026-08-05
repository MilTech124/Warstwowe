// Renderer szkieletu stalowego. Cała logika konstrukcyjna (dobór profili,
// rozstawy, przycinanie wokół otworów) żyje w src/scene/structure/ jako czysty
// model — tutaj zostaje wyłącznie zamiana listy elementów na meshe.

import { memo, useMemo } from "react";
import { Beam } from "@/scene/Beam";
import { materials } from "@/scene/materials";
import { buildStructure } from "@/scene/structure/buildStructure";
import { structureInputs, structureSignature } from "@/scene/structure/inputs";

function BasePlate({ plate }) {
  return (
    <group>
      <mesh position={[plate.position[0], plate.thicknessM / 2, plate.position[2]]} material={materials.trim} castShadow receiveShadow>
        <boxGeometry args={[plate.plateSizeM, plate.thicknessM, plate.plateSizeM]} />
      </mesh>
      {[
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ].map(([sx, sz]) => (
        <mesh
          key={`${plate.id}-anchor-${sx}-${sz}`}
          position={[
            plate.position[0] + sx * plate.boltOffsetM,
            plate.thicknessM + 0.014,
            plate.position[2] + sz * plate.boltOffsetM,
          ]}
          material={materials.track}
          castShadow
        >
          <cylinderGeometry args={[plate.boltDiameterM, plate.boltDiameterM, 0.028, 8]} />
        </mesh>
      ))}
    </group>
  );
}

// Kostka spoiny w węźle — maskuje styk profili o różnych przekrojach.
function JointBlock({ joint }) {
  const size = joint.sizeM * 1.35;
  return (
    <mesh position={joint.position} material={materials[joint.material] ?? materials.steel} castShadow receiveShadow>
      <boxGeometry args={[size, size, size]} />
    </mesh>
  );
}

const StructureMeshes = memo(function StructureMeshes({ model }) {
  return (
    <group name={`structure-${model.plan.structureClass}-${model.plan.roof.type}`}>
      {model.members.map((member) => (
        <Beam
          key={member.id}
          name={member.id}
          start={member.start}
          end={member.end}
          up={member.up}
          profileId={member.profileId}
          size={member.sizeM}
          overlap={member.overlapM}
          material={materials[member.material] ?? materials.steel}
        />
      ))}
      {model.plates.map((plate) => (
        <BasePlate key={plate.id} plate={plate} />
      ))}
      {model.joints.map((joint) => (
        <JointBlock key={joint.id} joint={joint} />
      ))}
    </group>
  );
});

export function StructureSystem({ config }) {
  const inputs = structureInputs(config);
  const signature = structureSignature(inputs);
  // Zależność po sygnaturze, nie po `inputs` — obiekt jest tworzony od nowa
  // przy każdym renderze, a model ma się przeliczać tylko przy realnej zmianie.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const model = useMemo(() => buildStructure(inputs), [signature]);
  const renderModel = useMemo(() => {
    if (config.viewMode === "structure") return model;
    return {
      ...model,
      members: model.members.filter((member) => member.group !== "front-projection-structure"),
      plates: model.plates.filter((plate) => plate.group !== "front-projection-structure"),
      joints: model.joints.filter((joint) => joint.group !== "front-projection-structure"),
    };
  }, [config.viewMode, model]);

  if (inputs.structure.visible === false) return null;
  return <StructureMeshes model={renderModel} />;
}
