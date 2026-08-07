// Zakładka „Konstrukcja": klasa szkieletu, poziom wzmocnienia, strefa śniegowa,
// wyliczona tabela profili i ostrzeżenia z modelu.

import { useMemo } from "react";
import { AlertTriangle, Weight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Field, Select } from "@/components/configurator-ui/Field";
import { formatKg, formatNumber, profileTable, staticsSection, utilisationText } from "@/lib/projectSummary";
import { steelBom } from "@/lib/bom/steelBom";
import { roleLabel } from "@/config/steelProfiles";
import { buildStructure } from "@/scene/structure/buildStructure";
import { STRUCTURE_CLASSES } from "@/scene/structure/classes";
import { structureInputs, structureSignature } from "@/scene/structure/inputs";
import { REINFORCEMENT_LEVELS, SNOW_ZONE_HINTS, SNOW_ZONES } from "@/scene/structure/spec";

export function StructurePanel({ config, updateStructure }) {
  const inputs = structureInputs(config);
  const signature = structureSignature(inputs);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const model = useMemo(() => buildStructure(inputs), [signature]);
  const bom = useMemo(() => steelBom(model), [model]);
  const profiles = useMemo(() => profileTable(model.plan.spec, model.members), [model]);
  const statics = useMemo(() => staticsSection(model), [model]);

  const spec = model.plan.spec;
  const structureClass = STRUCTURE_CLASSES[model.plan.structureClass];
  const isGarage = spec.kind === "garage";
  const level = spec.reinforcement;

  return (
    <div className="structure-panel">
      <div className="structure-class">
        <span className="structure-class-badge">{structureClass?.label ?? model.plan.structureClass}</span>
        <p>{structureClass?.description}</p>
        <small>Klasa wynika z gabarytów obiektu — zmienia się automatycznie wraz z wymiarami.</small>
      </div>

      <Field label="Poziom wzmocnienia">
        <div className="reinforcement-grid">
          {Object.values(REINFORCEMENT_LEVELS).map((option) => (
            <button
              key={option.id}
              type="button"
              className={cn("reinforcement-option", level.id === option.id && "active")}
              onClick={() => updateStructure({ reinforcement: option.id })}
            >
              <strong>{option.label}</strong>
              <span>{option.description}</span>
            </button>
          ))}
        </div>
      </Field>

      <Field label="Strefa śniegowa">
        <Select value={String(spec.snowZone)} onChange={(event) => updateStructure({ snowZone: Number(event.target.value) })}>
          {SNOW_ZONES.map((zone) => (
            <option key={zone} value={zone}>
              {`Strefa ${zone} — ${SNOW_ZONE_HINTS[zone]}`}
            </option>
          ))}
        </Select>
        {/* Nieaktualna była poprzednia wersja tej podpowiedzi („koryguje wyłącznie
            rozstaw płatwi"). Od czasu doboru ze zginania strefa wchodzi do
            obciążenia obliczeniowego, więc zmienia też PRZEKRÓJ — docs §3.1a. */}
        <small className="structure-hint">Wchodzi do obciążenia obliczeniowego — zmienia rozstaw płatwi i przekroje.</small>
      </Field>

      <div className="structure-metrics">
        {isGarage ? (
          <>
            <Metric label="Rozstaw krokwi" value={`${formatNumber(spec.rafterSpacing)} m`} note={`${spec.rafterCount} szt.`} />
            <Metric label="Rozstaw słupów" value={`${formatNumber(spec.postSpacing)} m`} note={`PIR ${inputs.cladding.wallPirThicknessMm} mm`} />
            <Metric label="Rozstaw płatwi" value={`${formatNumber(spec.purlinSpacing)} m`} note={`PIR ${inputs.cladding.roofPirThicknessMm} mm`} />
          </>
        ) : (
          <>
            <Metric label="Rozstaw ram" value={`${formatNumber(spec.baySpacing)} m`} note={`${spec.bayCount} szt.`} />
            <Metric label="Słupki ścian" value={`${formatNumber(spec.wallPostSpacing)} m`} note={`PIR ${inputs.cladding.wallPirThicknessMm} mm`} />
            <Metric label="Rozstaw płatwi" value={`${formatNumber(spec.purlinSpacing)} m`} note={`PIR ${inputs.cladding.roofPirThicknessMm} mm`} />
          </>
        )}
      </div>

      <div className="structure-mass">
        <Weight className="h-4 w-4" />
        <div>
          <strong>{formatKg(bom.totalMassKg)}</strong>
          <span>{`stali — ${bom.memberCount} elementów, ${bom.plateCount} blach podstawy, ${bom.anchorCount} kotew`}</span>
        </div>
      </div>

      <div className="structure-profiles">
        <h3>Dobór przekrojów</h3>
        <table>
          <thead>
            <tr>
              <th>Element</th>
              <th>Profil</th>
              <th>Rozstaw</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((row) => (
              <tr key={row.role}>
                <td>{row.roleLabel}</td>
                <td>
                  <span className="profile-label">{row.profileLabel}</span>
                  <small>{row.profileKind}</small>
                </td>
                <td>{row.spacingText}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <small className="structure-hint">
          Gatunek stali: {spec.steelGrade}. Blachy podstawy {formatNumber(spec.plateThicknessM * 1000, 0)} mm, kotwy M12 — 4 szt. na stopę.
        </small>
      </div>

      {/* Założenia obliczeniowe. Te liczby powstawały już wcześniej w spec.js,
          ale nigdzie nie docierały — nie było jak sprawdzić, na czym oparto dobór.
          Kafelki stoją jako osobny wiersz panelu (jak rozstawy wyżej), więc odstęp
          daje `gap` z .structure-panel — bez dokładania reguły CSS. */}
      <div className="structure-metrics">
        <Metric
          label="Śnieg — grunt"
          value={`${formatNumber(statics.loads.skKnM2)} kN/m²`}
          note={`sk, strefa ${statics.loads.snowZone}`}
        />
        <Metric
          label="Śnieg — połać"
          value={`${formatNumber(statics.loads.roofSnowKnM2)} kN/m²`}
          note={`μ₁ = ${formatNumber(statics.loads.shapeCoefficient)}`}
        />
        <Metric
          label="Obliczeniowe"
          value={`${formatNumber(statics.loads.designLoadKnM2)} kN/m²`}
          note={`${formatNumber(statics.loads.gammaG)}·G + ${formatNumber(statics.loads.gammaQ)}·S`}
        />
      </div>

      <div className="structure-profiles">
        <h3>Sprawdzenie przekrojów</h3>
        <table>
          <thead>
            <tr>
              <th>Element</th>
              <th>Rozpiętość</th>
              <th>Wytężenie</th>
            </tr>
          </thead>
          <tbody>
            {statics.checks.map((check) => (
              <tr key={`${check.role}-${check.profileId}`}>
                <td>
                  <span className="profile-label">{check.profileLabel}</span>
                  <small>{roleLabel(check.role)}</small>
                </td>
                <td>{`${formatNumber(check.spanM)} m`}</td>
                <td>{utilisationText(check)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <small className="structure-hint">{statics.note}</small>
      </div>

      {model.warnings.length > 0 && (
        <div className="structure-warnings" role="status">
          <h3>
            <AlertTriangle className="h-4 w-4" />
            {`Uwagi (${model.warnings.length})`}
          </h3>
          <ul>
            {model.warnings.map((warning) => (
              <li key={`${warning.code}-${warning.message.slice(0, 24)}`}>{warning.message}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="structure-disclaimer">
        Konfigurator jest narzędziem wizualizacyjno-ofertowym. Wymiarowanie konstrukcji pod konkretną lokalizację
        (strefa śniegowa i wiatrowa) wykonuje uprawniony konstruktor — zgodnie z PN-EN 1090 i Eurokodami.
      </p>
    </div>
  );
}

function Metric({ label, value, note }) {
  return (
    <div className="structure-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}
