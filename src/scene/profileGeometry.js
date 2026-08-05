// Geometria three dla przekrojów profili. Cała matematyka konturu żyje
// w profileShape.js (bez three), tutaj zostaje wyłącznie wyciągnięcie i cache.

import { CylinderGeometry, ExtrudeGeometry, Shape } from "three";
import { getProfile } from "@/config/steelProfiles";
import { profileContour } from "@/scene/profileShape";

// Geometrie budujemy o długości 1 m i skalujemy per element wzdłuż osi Z.
// Bez cache hala generowała kilkaset osobnych BufferGeometry na jeden render;
// katalog ma ~30 profili, więc mapa nigdy nie urośnie na tyle, by ją czyścić.
const cache = new Map();

function buildGeometry(profile, fallbackSizeM) {
  const contour = profileContour(profile ?? { sizeM: fallbackSizeM });

  if (contour.kind === "circle") {
    // Walec three stoi wzdłuż Y — obracamy raz, przy tworzeniu geometrii.
    const geometry = new CylinderGeometry(contour.radiusM, contour.radiusM, 1, 10, 1);
    geometry.rotateX(Math.PI / 2);
    return geometry;
  }

  // Kontur jest w płaszczyźnie XY, ExtrudeGeometry wyciąga wzdłuż +Z — czyli
  // dokładnie w osi, na którą `memberTransform` odwzorowuje kierunek elementu.
  const shape = new Shape();
  contour.points.forEach(([u, v], index) => {
    // u to oś MOCNA i ma wypaść na lokalnym Y, bo `up` opisuje właśnie ją.
    if (index === 0) shape.moveTo(v, u);
    else shape.lineTo(v, u);
  });
  shape.closePath();

  const geometry = new ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false, steps: 1 });
  // Wycentrowanie wzdłuż osi: `memberTransform` zwraca punkt ŚRODKOWY elementu,
  // tak jak dotychczasowe boxGeometry.
  geometry.translate(0, 0, -0.5);
  return geometry;
}

/**
 * Geometria profilu o długości 1 m wzdłuż +Z. Element skaluje ją do swojej
 * długości — skalowanie WYŁĄCZNIE w osi Z, bo w X/Y zdeformowałoby przekrój.
 *
 * @param {string|null} profileId
 * @param {number} fallbackSizeM  krawędź kwadratu, gdy profilu nie ma w katalogu
 */
export function profileGeometry(profileId, fallbackSizeM = 0.06) {
  const key = profileId ?? `fallback:${fallbackSizeM.toFixed(4)}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const geometry = buildGeometry(profileId ? getProfile(profileId) : null, fallbackSizeM);
  cache.set(key, geometry);
  return geometry;
}

/** Zwalnia współdzielone geometrie — do użycia przy demontażu sceny w testach. */
export function disposeProfileGeometries() {
  cache.forEach((geometry) => geometry.dispose());
  cache.clear();
}
