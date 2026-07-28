// JEDYNY plik, który nazywa pdfmake.
//
// Ładowanie leniwe: ~1,9 MB (bundle + fonty) nie może wejść do pierwszego
// ładowania strony. Warunkiem jest brak jakiegokolwiek top-level importu
// z "pdfmake" w grafie modułów sięgającym page.jsx — dlatego tylko tutaj.
//
// Ścieżka build/ to samowystarczalny UMD z wbudowanymi shimami fs/zlib, więc
// next.config.mjs nie wymaga żadnych zmian. Import bare "pdfmake" byłby pułapką:
// przebieg SSR ignoruje pole `browser` i sięgnąłby po prawdziwy pdfkit + node fs.

let cached = null;

export async function loadPdfMake() {
  if (cached) return cached;
  if (typeof window === "undefined") {
    throw new Error("Generowanie PDF działa tylko w przeglądarce.");
  }

  const [pdfMakeModule, vfsModule] = await Promise.all([
    import("pdfmake/build/pdfmake.min.js"),
    import("pdfmake/build/vfs_fonts.js"),
  ]);

  const pdfMake = pdfMakeModule.default ?? pdfMakeModule;
  // vfs_fonts eksportuje PŁASKĄ mapę { "Roboto-Regular.ttf": base64, ... } —
  // bez zagnieżdżenia .pdfMake.vfs (to API 0.1.x) i bez własnego `default`.
  const vfs = vfsModule.default ?? vfsModule;

  // API 0.3.x: addVirtualFileSystem, NIE `pdfMake.vfs = ...`.
  pdfMake.addVirtualFileSystem(vfs);

  cached = pdfMake;
  return pdfMake;
}
