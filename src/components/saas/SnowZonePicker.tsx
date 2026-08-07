"use client";

import { useState } from "react";
import { Snowflake } from "lucide-react";
import {
  LOAD_FACTOR_G,
  LOAD_FACTOR_Q,
  ROOF_DEAD_LOAD_KN_M2,
  SNOW_SHAPE_COEFFICIENT,
  SNOW_ZONE_HINTS,
  SNOW_ZONE_SK_KN_M2,
  SNOW_ZONES,
  roofDesignLoadKnM2,
} from "@/scene/structure/spec";

const num = (value: number, digits = 2) => value.toFixed(digits).replace(".", ",");

/**
 * Wybór strefy śniegowej z podglądem obciążenia.
 *
 * Liczby biorą się z tego samego modułu, który liczy konstrukcję w konfiguratorze
 * i cytuje ją w ofercie PDF — żadnej kopii tablicy sk po stronie marketingu.
 */
export function SnowZonePicker() {
  const [zone, setZone] = useState(2);

  const sk = SNOW_ZONE_SK_KN_M2[zone as keyof typeof SNOW_ZONE_SK_KN_M2];
  const roofSnow = SNOW_SHAPE_COEFFICIENT * sk;
  const design = roofDesignLoadKnM2(zone);
  const maxDesign = roofDesignLoadKnM2(5);

  return (
    <div className="w3-zone">
      <div className="w3-zone-head">
        <span className="w3-zone-eyebrow">
          <Snowflake size={14} /> Wybierz strefę śniegową
        </span>
        <span className="w3-zone-hint">{SNOW_ZONE_HINTS[zone as keyof typeof SNOW_ZONE_HINTS]}</span>
      </div>

      <div className="w3-zone-tabs" role="tablist" aria-label="Strefa śniegowa">
        {SNOW_ZONES.map((value: number) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={value === zone}
            className={`w3-zone-tab ${value === zone ? "is-on" : ""}`}
            onClick={() => setZone(value)}
          >
            {value}
          </button>
        ))}
      </div>

      <div className="w3-zone-readout">
        <div>
          <small>sk — grunt</small>
          <strong>{num(sk)}</strong>
          <em>kN/m²</em>
        </div>
        <div>
          <small>s = μ₁·sk — połać</small>
          <strong>{num(roofSnow)}</strong>
          <em>kN/m²</em>
        </div>
        <div className="is-primary">
          <small>obciążenie obliczeniowe</small>
          <strong>{num(design)}</strong>
          <em>kN/m²</em>
        </div>
      </div>

      <div className="w3-zone-bar" aria-hidden="true">
        <i style={{ width: `${Math.round((design / maxDesign) * 100)}%` }} />
      </div>

      <p className="w3-zone-formula">
        {LOAD_FACTOR_G} · {num(ROOF_DEAD_LOAD_KN_M2)} + {LOAD_FACTOR_Q} · {num(roofSnow)} ={" "}
        <b>{num(design)} kN/m²</b> — kombinacja SGN, z której dobierany jest każdy przekrój.
      </p>
    </div>
  );
}
