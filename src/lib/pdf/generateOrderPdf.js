// Orkiestracja: zrzuty 3D → zestawienia → dokument → pobranie pliku.

import { captureViews } from "@/lib/capture/captureViews";
import { twoFrames } from "@/lib/capture/frames";
import { projectSummary } from "@/lib/projectSummary";
import { buildOrderDocument, orderNumberFor, TABLE_LAYOUTS } from "@/lib/pdf/orderDocument";
import { loadPdfMake } from "@/lib/pdf/loadPdfMake";

/**
 * @param {object} options
 * @param {() => object} options.getConfig
 * @param {(viewMode: string) => void} options.setViewModeOnly
 * @param {(value: boolean) => void} options.setShowDimensions
 * @param {(status: { phase: string, label: string }) => void} [options.onProgress]
 * @param {boolean} [options.download]
 * @returns {Promise<{ fileName: string, blob: Blob }>}
 */
/**
 * Logo producenta jako data URL. Brak lub błąd pobrania nie może zablokować
 * generowania dokumentu — wtedy sekcja zostaje bez znaku marki.
 */
async function logoDataUrl(url) {
  if (!url) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    if (!blob.type.startsWith("image/") || blob.type === "image/svg+xml") return null;
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateOrderPdf({
  getConfig,
  setViewModeOnly,
  setShowDimensions,
  getLightingPreviewSuppressed,
  setLightingPreviewSuppressed,
  setQualityOverride,
  onProgress,
  download = true,
  // Wycena policzona serwerowo przy zapisie zamówienia. Dokument nigdy nie
  // liczy jej sam — bez tego cena w PDF byłaby nieautorytatywna.
  quote = null,
  // Katalog z bootstrapu firmy — źródło logo producenta i parametrów λ / U.
  // Bez niego dokument korzysta z danych katalogu statycznego.
  catalog = null,
}) {
  const report = (phase, label) => onProgress?.({ phase, label });

  // pdfmake i zrzuty startują równolegle: pobranie ~1 MB chunku trwa podobnie
  // długo jak przełączanie widoków, więc nie ma po co czekać sekwencyjnie.
  report("loading", "Wczytywanie generatora PDF…");
  const pdfMakePromise = loadPdfMake();

  // Oddajemy klatkę, żeby przeglądarka odmalowała stan postępu przed wejściem
  // w synchroniczne bloki toDataURL (150–400 ms każdy).
  await twoFrames();

  const shots = await captureViews({
    getConfig,
    setViewModeOnly,
    setShowDimensions,
    getLightingPreviewSuppressed,
    setLightingPreviewSuppressed,
    setQualityOverride,
    onProgress: ({ index, total, label }) => report("capture", `Zrzut ${index}/${total}: ${label}`),
  });

  report("summary", "Liczenie zestawień…");
  const config = getConfig();
  const summary = projectSummary(config, { catalog });

  report("document", "Składanie dokumentu…");
  const pdfMake = await pdfMakePromise;
  const date = new Date();
  const [wallLogo, roofLogo] = await Promise.all([
    logoDataUrl(summary.cladding.wallLogoUrl),
    logoDataUrl(summary.cladding.roofLogoUrl),
  ]);
  const document = buildOrderDocument({
    config,
    summary,
    shots,
    date,
    quote,
    manufacturerLogos: { wall: wallLogo, roof: roofLogo },
  });
  const orderNo = orderNumberFor(config, date);
  const fileName = `Zamowienie-${orderNo}.pdf`;

  // 0.3.x: całe API jest obietnicowe.
  const pdf = pdfMake.createPdf(document, TABLE_LAYOUTS);
  const blob = await pdf.getBlob();
  if (download) await pdf.download(fileName);

  report("done", "Gotowe");
  return { fileName, blob };
}
