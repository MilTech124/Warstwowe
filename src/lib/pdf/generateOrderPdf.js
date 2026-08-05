// Orkiestracja: zrzuty 3D → zestawienia → dokument → pobranie pliku.

import { captureViews } from "@/lib/capture/captureViews";
import { annotateShots } from "@/lib/capture/annotateShot";
import { twoFrames } from "@/lib/capture/frames";
import { projectSummary } from "@/lib/projectSummary";
import { buildOrderDocument, orderNumberFor, orderPdfFileName, TABLE_LAYOUTS } from "@/lib/pdf/orderDocument";
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
  // Dane rejestrowe wykonawcy (getOrderPdfContractor). Bez nich dokument zostaje
  // neutralny — tak jak działał, zanim doszło firmowanie.
  contractor = null,
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

  // Wymiary domalowujemy PO zrzutach: wnętrze `shoot` musi zostać synchroniczne,
  // ale nakładanie opisów już nie — i tak dotyczy gotowych bitmap.
  report("annotate", "Opisywanie wizualizacji…");
  const annotatedShots = await annotateShots(shots, config);

  report("document", "Składanie dokumentu…");
  const pdfMake = await pdfMakePromise;
  const date = new Date();
  const [wallLogo, roofLogo, contractorLogo] = await Promise.all([
    logoDataUrl(summary.cladding.wallLogoUrl),
    logoDataUrl(summary.cladding.roofLogoUrl),
    logoDataUrl(contractor?.logoUrl),
  ]);
  const document = buildOrderDocument({
    config,
    summary,
    shots: annotatedShots,
    date,
    quote,
    contractor,
    contractorLogo,
    manufacturerLogos: { wall: wallLogo, roof: roofLogo },
  });
  const orderNo = orderNumberFor(config, date);
  // Numer zamówienia ma postać KOD/2026/0001 — ukośniki nie mogą wejść do nazwy pliku.
  const fileName = orderPdfFileName(orderNo);

  // 0.3.x: całe API jest obietnicowe.
  const pdf = pdfMake.createPdf(document, TABLE_LAYOUTS);
  const blob = await pdf.getBlob();
  if (download) await pdf.download(fileName);

  report("done", "Gotowe");
  return { fileName, blob };
}
