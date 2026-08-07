"use client";

import { useState } from "react";

const num = (value: number, digits = 1) => value.toFixed(digits).replace(".", ",");

type Field = { key: "width" | "depth" | "height" | "pitch"; label: string; min: number; max: number; step: number; unit: string };

const FIELDS: Field[] = [
  { key: "width", label: "Szerokość", min: 3, max: 18, step: 0.1, unit: "m" },
  { key: "depth", label: "Długość", min: 5, max: 36, step: 0.1, unit: "m" },
  { key: "height", label: "Wysokość ścianki", min: 2.3, max: 7, step: 0.1, unit: "m" },
  { key: "pitch", label: "Spadek dachu", min: 5, max: 45, step: 1, unit: "%" },
];

/**
 * Podgląd tego, co konfigurator liczy z samej bryły.
 *
 * Świadomie pokazuje tylko powierzchnie i obwód — nie cenę. Wycena wymaga cennika
 * firmy i pełnej geometrii z otworami, więc udawanie jej tutaj byłoby kłamstwem.
 */
export function GeometryCalculator() {
  const [dims, setDims] = useState({ width: 9, depth: 15, height: 4.5, pitch: 15 });

  const angle = Math.atan(dims.pitch / 100);
  const footprint = dims.width * dims.depth;
  const perimeter = 2 * (dims.width + dims.depth);
  const walls = perimeter * dims.height;
  const roof = footprint / Math.cos(angle);
  const ridge = dims.height + dims.width * (dims.pitch / 100);

  const results = [
    { label: "Powierzchnia zabudowy", value: num(footprint), unit: "m²" },
    { label: "Poszycie ścian w obrysie", value: num(walls), unit: "m²" },
    { label: "Połać dachowa po spadku", value: num(roof), unit: "m²" },
    { label: "Obwód — obróbki i rynny", value: num(perimeter), unit: "mb" },
    { label: "Wysokość w kalenicy", value: num(ridge, 2), unit: "m" },
    { label: "Kąt połaci", value: num((angle * 180) / Math.PI), unit: "°" },
  ];

  return (
    <div className="w3-calc">
      <div className="w3-calc-controls">
        {FIELDS.map((field) => (
          <label className="w3-calc-field" key={field.key}>
            <span>
              {field.label}
              <b>
                {num(dims[field.key], field.key === "pitch" ? 0 : 1)} {field.unit}
              </b>
            </span>
            <input
              type="range"
              min={field.min}
              max={field.max}
              step={field.step}
              value={dims[field.key]}
              onChange={(event) =>
                setDims((prev) => ({ ...prev, [field.key]: Number(event.target.value) }))
              }
            />
          </label>
        ))}
      </div>

      <div className="w3-calc-results" aria-live="polite">
        {results.map((row) => (
          <div key={row.label}>
            <small>{row.label}</small>
            <strong>
              {row.value} <em>{row.unit}</em>
            </strong>
          </div>
        ))}
      </div>

      <p className="w3-calc-note">
        Szacunek dla bryły prostopadłościennej z dachem jednospadowym. Konfigurator liczy pełną
        geometrię — z otworami, okapami, wypustem i podziałem na pasy płyt.
      </p>
    </div>
  );
}
