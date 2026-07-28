// Nazwy otworów — wspólne dla panelu bocznego i dokumentu zamówienia.

import { OPENING_WALLS } from "@/config/catalog";

const OPENING_KINDS = {
  gate: "Brama",
  door: "Drzwi",
  window: "Okno",
  roofWindow: "Okno dachowe",
};

export function openingKindLabel(kind) {
  return OPENING_KINDS[kind] ?? "Otwór";
}

export function openingTitle(opening, index) {
  return `${openingKindLabel(opening.kind)} ${index + 1}`;
}

export function openingWallLabel(wall) {
  if (wall === "roof") return "Połać dachu";
  return OPENING_WALLS[wall] ?? wall;
}
