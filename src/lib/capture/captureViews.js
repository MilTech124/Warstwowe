// Zrzuty widoków 3D do dokumentu zamówienia.
//
// Kamera ustawiana jest IMPERATYWNIE, z pominięciem animacji CameraRig — czekanie
// na wygaszenie lerpu zajmowałoby ~1 s na widok i użytkownik mógłby w tym czasie
// przeciągnąć mysz. Cały zrzut jednego widoku dzieje się w jednym bloku
// synchronicznym, bo `enableDamping` sprawia, że OrbitControls.update() przelicza
// pozycję kamery z własnego offsetu sferycznego i cofnęłoby nasze ustawienie.

import { useProgress } from "@react-three/drei";
import { cameraView } from "@/scene/cameraViews";
import { captureBridge } from "@/scene/captureBridge";
import { nextFrame, twoFrames } from "@/lib/capture/frames";

export const CAPTURE_VIEWS = [
  { id: "orbit", cameraMode: "orbit", viewMode: "full", label: "Widok perspektywiczny", format: "jpeg" },
  { id: "front", cameraMode: "front", viewMode: "full", label: "Elewacja frontowa", format: "jpeg" },
  { id: "side", cameraMode: "side", viewMode: "full", label: "Elewacja boczna", format: "jpeg" },
  { id: "top", cameraMode: "top", viewMode: "full", label: "Widok z góry", format: "jpeg" },
  { id: "structure", cameraMode: "structure", viewMode: "structure", label: "Szkielet stalowy", format: "png" },
];

const MAX_CAPTURE_PIXELS = 16e6;
const ASSET_TIMEOUT_MS = 15000;

/**
 * Czeka, aż React złoży zmianę trybu widoku i wszystkie assety się doczytają.
 * `!active` samo w sobie jest niejednoznaczne (jest false także zanim cokolwiek
 * się zacznie), dlatego łączymy je z gotowością uchwytu ze <Suspense>.
 */
async function waitForScene(timeoutMs = ASSET_TIMEOUT_MS) {
  const deadline = performance.now() + timeoutMs;
  await twoFrames();

  while (performance.now() < deadline) {
    const { active, loaded, total } = useProgress.getState();
    if (!active && captureBridge.ready() && (total === 0 || loaded >= total)) {
      // Jeszcze dwie klatki, żeby świeżo zamontowane poddrzewo zdążyło się wyrenderować.
      await twoFrames();
      return true;
    }
    await nextFrame();
  }
  return false;
}

function shoot(config, view, { whiteBackground }) {
  const { gl, scene, camera } = captureBridge;
  const { position, target } = cameraView(config, view.cameraMode);

  const previousBackground = scene.background;
  if (whiteBackground) {
    scene.background = null;
    gl.setClearColor(0xffffff, 1);
  }

  try {
    camera.position.set(position[0], position[1], position[2]);
    // Reset „góry" jest konieczny dla widoku z góry — po orbitowaniu obraz
    // mógłby wyjść obrócony.
    camera.up.set(0, 1, 0);
    camera.lookAt(target[0], target[1], target[2]);
    camera.updateMatrixWorld(true);
    camera.updateProjectionMatrix();
    gl.render(scene, camera);

    // Macierz kopiujemy TUTAJ, w tym samym bloku synchronicznym co render:
    // zaraz potem kamera jest przestawiana pod kolejny widok, a opisy muszą
    // trafić dokładnie w tę projekcję, w której powstał obraz.
    const projection = {
      viewProjection: camera.projectionMatrix.clone().multiply(camera.matrixWorldInverse).toArray(),
      // Piksele BUFORA, nie CSS: toDataURL zwraca bitmapę w rozdzielczości
      // podniesionej przez setPixelRatio(scale). Użycie clientWidth dawałoby
      // błąd o czynnik `scale`, widoczny tylko na ekranach HiDPI.
      pixelWidth: gl.domElement.width,
      pixelHeight: gl.domElement.height,
    };

    const dataUrl =
      view.format === "png"
        ? gl.domElement.toDataURL("image/png")
        : gl.domElement.toDataURL("image/jpeg", 0.92);
    return { dataUrl, projection };
  } finally {
    if (whiteBackground) {
      scene.background = previousBackground;
      gl.setClearColor(0x000000, 0);
    }
  }
}

/**
 * @param {object} options
 * @param {() => object} options.getConfig  aktualny config ze store'u
 * @param {(viewMode: string) => void} options.setViewModeOnly
 * @param {(value: boolean) => void} options.setShowDimensions
 * @param {(step: { index: number, total: number, label: string }) => void} [options.onProgress]
 * @returns {Promise<Array<{ id, label, dataUrl, format, projection }>>}
 */
export async function captureViews({
  getConfig,
  setViewModeOnly,
  setShowDimensions,
  getLightingPreviewSuppressed,
  setLightingPreviewSuppressed,
  setQualityOverride,
  onProgress,
}) {
  const initialReady = await waitForScene();
  if (!initialReady) throw new Error("Nie udało się przygotować sceny 3D do wykonania zrzutów.");

  // Canvas o domyślnym rozmiarze 300×150 oznacza, że podglądu nigdy nie zmierzono
  // (ukryta karta lub zerowy kontener) — zrzuty wyszłyby puste albo zniekształcone.
  const bridgeCanvas = captureBridge.gl.domElement;
  if (bridgeCanvas.clientWidth < 320 || bridgeCanvas.clientHeight < 240) {
    throw new Error("Widok 3D jest ukryty lub zbyt mały. Pokaż podgląd modelu i spróbuj ponownie.");
  }

  const original = getConfig();
  const originalViewMode = original.viewMode;
  const originalShowDimensions = original.showDimensions;
  const originalLightingPreviewSuppressed = getLightingPreviewSuppressed?.() ?? false;

  const { gl } = captureBridge;
  const canvas = gl.domElement;
  const cssWidth = canvas.clientWidth || canvas.width;
  const cssHeight = canvas.clientHeight || canvas.height;
  const previousPixelRatio = gl.getPixelRatio();

  // Jedna dźwignia nadpróbkowania. setPixelRatio(2) RAZEM z setSize(w*2, h*2)
  // dałoby 16× pikseli i utratę kontekstu na słabszych GPU.
  const maxTextureSize = gl.capabilities?.maxTextureSize ?? 8192;
  const scale = Math.max(
    1,
    Math.min(3, maxTextureSize / Math.max(cssWidth, cssHeight), Math.sqrt(MAX_CAPTURE_PIXELS / (cssWidth * cssHeight))),
  );

  captureBridge.capturing = true;
  const controls = captureBridge.controls;
  const controlsWereEnabled = controls?.enabled ?? false;
  if (controls) controls.enabled = false;

  const shots = [];

  try {
    setLightingPreviewSuppressed?.(true);
    // Oferta zawsze w pełnej jakości — niezależnie od tego, jaki poziom wybrał
    // użytkownik dla podglądu na swoim sprzęcie. waitForScene poniżej odczeka
    // na doczytanie tekstur 2k.
    setQualityOverride?.("high");
    // Miarki to etykiety DOM (<Html>), które nie trafiają do bufora WebGL —
    // zostałyby same kreski bez opisów. Wymiary idą na rysunki wektorowe.
    if (originalShowDimensions) setShowDimensions(false);

    gl.setPixelRatio(scale);
    gl.setSize(cssWidth, cssHeight, false);

    const byViewMode = ["full", "structure"];
    let index = 0;

    for (const viewMode of byViewMode) {
      const views = CAPTURE_VIEWS.filter((view) => view.viewMode === viewMode);
      if (!views.length) continue;

      setViewModeOnly(viewMode);
      const ready = await waitForScene();
      if (!ready) {
        throw new Error("Nie udało się wczytać modelu 3D w czasie potrzebnym do wykonania zrzutów.");
      }

      const config = getConfig();
      for (const view of views) {
        index += 1;
        onProgress?.({ index, total: CAPTURE_VIEWS.length, label: view.label });
        // Blok synchroniczny: ustawienie kamery + render + odczyt bufora.
        shots.push({
          id: view.id,
          label: view.label,
          format: view.format,
          ...shoot(config, view, { whiteBackground: viewMode === "structure" }),
        });
        // Oddajemy klatkę przeglądarce, żeby pasek postępu się odmalował.
        await nextFrame();
      }
    }

    return shots;
  } finally {
    gl.setPixelRatio(previousPixelRatio);
    gl.setSize(cssWidth, cssHeight, false);
    if (controls) controls.enabled = controlsWereEnabled;
    captureBridge.capturing = false;
    setViewModeOnly(originalViewMode);
    setShowDimensions(originalShowDimensions);
    setLightingPreviewSuppressed?.(originalLightingPreviewSuppressed);
    setQualityOverride?.(null);
  }
}
