import { RoundedBox } from "@react-three/drei";
import { materials } from "@/scene/materials";

export function RectFrame({
  width,
  height,
  rail,
  depth,
  material,
  z = 0,
  castShadow = true,
}) {
  return (
    <group position={[0, 0, z]}>
      <mesh position={[0, height / 2 - rail / 2, 0]} material={material} castShadow={castShadow}>
        <boxGeometry args={[width, rail, depth]} />
      </mesh>
      <mesh position={[0, -height / 2 + rail / 2, 0]} material={material} castShadow={castShadow}>
        <boxGeometry args={[width, rail, depth]} />
      </mesh>
      <mesh position={[-width / 2 + rail / 2, 0, 0]} material={material} castShadow={castShadow}>
        <boxGeometry args={[rail, Math.max(0.01, height - rail * 2), depth]} />
      </mesh>
      <mesh position={[width / 2 - rail / 2, 0, 0]} material={material} castShadow={castShadow}>
        <boxGeometry args={[rail, Math.max(0.01, height - rail * 2), depth]} />
      </mesh>
    </group>
  );
}

function Screw({ position }) {
  return (
    <mesh position={position} rotation={[Math.PI / 2, 0, 0]} material={materials.stainlessSteel} castShadow>
      <cylinderGeometry args={[0.008, 0.008, 0.006, 12]} />
    </mesh>
  );
}

export function DoorHandle({ side = 1, style = "long_shield", leverRef, highDetail = true }) {
  const compact = style === "compact_shield";
  const plateHeight = compact ? 0.16 : 0.24;
  const leverLength = compact ? 0.085 : 0.115;
  return (
    <group>
      <RoundedBox
        args={[0.052, plateHeight, 0.022]}
        radius={0.012}
        smoothness={3}
        material={materials.stainlessSteel}
        castShadow
      />
      <mesh position={[0, plateHeight * 0.23, 0.02]} rotation={[Math.PI / 2, 0, 0]} material={materials.stainlessSteel} castShadow>
        <cylinderGeometry args={[0.022, 0.022, 0.035, 20]} />
      </mesh>
      <group ref={leverRef} position={[0, plateHeight * 0.23, 0.043]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={materials.stainlessSteel} castShadow>
          <cylinderGeometry args={[0.014, 0.014, 0.035, 18]} />
        </mesh>
        <RoundedBox
          args={[leverLength, 0.027, 0.027]}
          radius={0.012}
          smoothness={3}
          position={[-side * leverLength * 0.42, 0, 0.014]}
          material={materials.stainlessSteel}
          castShadow
        />
      </group>
      <group position={[0, -plateHeight * 0.25, 0.019]}>
        <mesh material={materials.hardwarePlastic}>
          <boxGeometry args={[0.023, 0.045, 0.015]} />
        </mesh>
        <mesh position={[0, 0.013, 0.009]} rotation={[Math.PI / 2, 0, 0]} material={materials.stainlessSteel}>
          <cylinderGeometry args={[0.008, 0.008, 0.006, 12]} />
        </mesh>
      </group>
      {highDetail && (
        <>
          <Screw position={[0, plateHeight / 2 - 0.025, 0.016]} />
          <Screw position={[0, -plateHeight / 2 + 0.025, 0.016]} />
        </>
      )}
    </group>
  );
}

export function WindowHandle({ side = 1, leverRef, highDetail = true }) {
  return (
    <group>
      <RoundedBox args={[0.038, 0.115, 0.018]} radius={0.009} smoothness={3} material={materials.hardwarePlastic} castShadow />
      <mesh position={[0, 0.018, 0.02]} rotation={[Math.PI / 2, 0, 0]} material={materials.stainlessSteel} castShadow>
        <cylinderGeometry args={[0.017, 0.017, 0.027, 18]} />
      </mesh>
      <group ref={leverRef} position={[0, 0.018, 0.04]}>
        <RoundedBox
          args={[0.026, 0.105, 0.026]}
          radius={0.011}
          smoothness={3}
          position={[0, -0.037, 0.01]}
          material={materials.stainlessSteel}
          castShadow
        />
      </group>
      {highDetail && <Screw position={[0, -0.038, 0.013]} />}
    </group>
  );
}

export function SurfaceHinge({ height = 0.12, highDetail = true }) {
  return (
    <group>
      <mesh material={materials.galvanized} castShadow>
        <cylinderGeometry args={[0.019, 0.019, height, highDetail ? 18 : 10]} />
      </mesh>
      <mesh position={[-0.035, 0.018, -0.002]} material={materials.galvanized} castShadow>
        <boxGeometry args={[0.07, height * 0.46, 0.014]} />
      </mesh>
      <mesh position={[0.035, -0.018, -0.002]} material={materials.galvanized} castShadow>
        <boxGeometry args={[0.07, height * 0.46, 0.014]} />
      </mesh>
      {highDetail && (
        <>
          <mesh position={[0, height / 2 + 0.006, 0]} material={materials.stainlessSteel}>
            <sphereGeometry args={[0.02, 12, 8]} />
          </mesh>
          <Screw position={[-0.046, 0.02, 0.008]} />
          <Screw position={[0.046, -0.02, 0.008]} />
        </>
      )}
    </group>
  );
}

export function ConcealedHingeHint({ height = 0.11, highDetail = true }) {
  const plateHeight = highDetail ? height : height * 0.72;
  return (
    <group>
      <RoundedBox
        args={[0.014, plateHeight, 0.009]}
        radius={0.004}
        smoothness={2}
        material={materials.galvanized}
        castShadow={false}
      />
      {highDetail && (
        <mesh position={[0, 0, 0.006]} material={materials.gasket}>
          <boxGeometry args={[0.006, plateHeight * 0.82, 0.006]} />
        </mesh>
      )}
    </group>
  );
}

export function DoubleGlazing({ width, height, glassMaterial, highDetail = true }) {
  const paneWidth = Math.max(0.04, width - 0.012);
  const paneHeight = Math.max(0.04, height - 0.012);
  const spacerRail = Math.min(0.016, paneWidth * 0.06, paneHeight * 0.06);
  return (
    <group>
      <mesh position={[0, 0, -0.014]} material={glassMaterial} castShadow>
        <boxGeometry args={[paneWidth, paneHeight, 0.008]} />
      </mesh>
      <mesh position={[0, 0, 0.014]} material={glassMaterial} castShadow>
        <boxGeometry args={[paneWidth, paneHeight, 0.008]} />
      </mesh>
      <RectFrame
        width={paneWidth - 0.014}
        height={paneHeight - 0.014}
        rail={spacerRail}
        depth={0.024}
        material={materials.glazingSpacer}
        castShadow={false}
      />
      {highDetail && (
        <RectFrame
          width={paneWidth}
          height={paneHeight}
          rail={0.006}
          depth={0.038}
          material={materials.gasket}
          castShadow={false}
        />
      )}
    </group>
  );
}
