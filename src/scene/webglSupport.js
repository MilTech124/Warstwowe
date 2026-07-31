// Bez tego sprawdzenia brak WebGL (stare sterowniki, wyłączona akceleracja,
// zdalny pulpit) kończy się białym prostokątem zamiast konfiguratora.

export function isWebglAvailable() {
  if (typeof window === "undefined") return true;
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!context) return false;
    context.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}
