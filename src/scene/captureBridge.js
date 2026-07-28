// Uchwyt do renderera scenariusza spoza Reacta — używany przez generator PDF.
//
// Zastępuje wcześniejsze `window.__r3fState`, które było ustawiane w onCreated,
// czyli PRZED montażem <PerspectiveCamera makeDefault>, i trzymało tymczasową
// kamerę fallbackową (inne fov/near/far) — każdy zrzut przez ten uchwyt
// renderowałby z niewłaściwej kamery.

export const captureBridge = {
  gl: null,
  scene: null,
  camera: null,
  controls: null,
  // Gdy true, CameraRig i OrbitControls nie ruszają kamery — zrzut ustawia ją sam.
  capturing: false,

  ready() {
    return Boolean(this.gl && this.scene && this.camera);
  },
};
