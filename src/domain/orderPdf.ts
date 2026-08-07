export const ORDER_PDF_MAX_BYTES = 20 * 1024 * 1024;

export function orderPdfGenerationAvailable({
  readOnly = false,
  accessActive,
  capability,
}: {
  readOnly?: boolean;
  accessActive: boolean;
  capability: boolean;
  demo?: boolean;
}) {
  return !readOnly && accessActive && capability;
}

export function orderPdfUploadError(file: { type: string; size: number } | null) {
  if (!file || file.type !== "application/pdf") return "Oczekiwano pliku PDF.";
  if (file.size > ORDER_PDF_MAX_BYTES) return "PDF przekracza limit 20 MB.";
  return null;
}
