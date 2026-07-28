// Klasa konstrukcji wynika wyłącznie z gabarytów budynku.
// geometry.js re-eksportuje getStructureClass dla pozostałych modułów.

export const STRUCTURE_CLASSES = {
  garage_frame: {
    id: "garage_frame",
    label: "Szkielet garażowy",
    description: "Spawana rama z profili zamkniętych, sztywność z węzłów, zastrzałów i tarczy poszycia",
  },
  portal_hall: {
    id: "portal_hall",
    label: "Hala z ramami portalowymi",
    description: "Ramy portalowe IPE/HEA, płatwie i rygle zimnogięte, stężenia krzyżowe",
  },
  heavy_hall: {
    id: "heavy_hall",
    label: "Hala ciężka",
    description: "Ramy portalowe o dużej rozpiętości, gęstsze stężenia, wzmocnione fundamentowanie",
  },
};

export function getStructureClass(dimensions) {
  if (dimensions.widthM >= 12 || dimensions.lengthM >= 20) return "heavy_hall";
  if (dimensions.widthM >= 7) return "portal_hall";
  return "garage_frame";
}

export function structureClassLabel(structureClass) {
  return STRUCTURE_CLASSES[structureClass]?.label ?? structureClass;
}
