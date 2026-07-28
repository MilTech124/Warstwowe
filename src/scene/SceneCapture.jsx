// Rejestruje renderer, scenę i AKTUALNĄ kamerę w captureBridge.
//
// Montowany wewnątrz <Suspense> — gdy boundary wpada w fallback (np. doładowanie
// GLB po powrocie z trybu konstrukcji), komponent się odmontowuje i zeruje uchwyt.
// Dzięki temu `captureBridge.ready()` jest samo w sobie dowodem, że scena stoi
// i zrzut nie wyjdzie pusty.

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { captureBridge } from "@/scene/captureBridge";

export function SceneCapture() {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const camera = useThree((state) => state.camera);

  useEffect(() => {
    captureBridge.gl = gl;
    captureBridge.scene = scene;
    captureBridge.camera = camera;

    return () => {
      if (captureBridge.gl === gl) {
        captureBridge.gl = null;
        captureBridge.scene = null;
        captureBridge.camera = null;
      }
    };
  }, [gl, scene, camera]);

  return null;
}
