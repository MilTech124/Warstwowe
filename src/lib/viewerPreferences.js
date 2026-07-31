const QUALITY_KEY = "konfigurator:viewer-quality";

export const QUALITY_PREFERENCES = Object.freeze(["auto", "low", "balanced", "high"]);

export function isQualityPreference(value) {
  return QUALITY_PREFERENCES.includes(value);
}

export function readQualityPreference() {
  if (typeof window === "undefined") return "auto";
  try {
    const stored = window.localStorage.getItem(QUALITY_KEY);
    return isQualityPreference(stored) ? stored : "auto";
  } catch {
    // Tryb prywatny lub zablokowany storage - wracamy do trybu automatycznego.
    return "auto";
  }
}

export function writeQualityPreference(value) {
  if (typeof window === "undefined" || !isQualityPreference(value)) return;
  try {
    window.localStorage.setItem(QUALITY_KEY, value);
  } catch {
    // Brak zapisu nie może przerwać interakcji z konfiguratorem.
  }
}
