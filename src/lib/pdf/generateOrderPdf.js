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
 * @returns {Promise<{ fileName: string, blob: Blob }>}
 */
export async function generateOrderPdf({
  getConfig,
  setViewModeOnly,
  setShowDimensions,
  getLightingPreviewSuppressed,
  setLightingPreviewSuppressed,
  setQualityOverride,
  onProgress,
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
  const summary = projectSummary(config);

  report("document", "Składanie dokumentu…");
  const pdfMake = await pdfMakePromise;
  const date = new Date();
  const document = buildOrderDocument({ config, summary, shots, date });
  const orderNo = orderNumberFor(config, date);
  const fileName = `Zamowienie-${orderNo}.pdf`;

  // 0.3.x: całe API jest obietnicowe.
  const pdf = pdfMake.createPdf(document, TABLE_LAYOUTS);
  const blob = await pdf.getBlob();
  await pdf.download(fileName);

  report("done", "Gotowe");
  return { fileName, blob };
}
