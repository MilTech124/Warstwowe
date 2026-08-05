// Zapis toku doboru przekrojów: obciążenia, moment, wymagany i dostępny wskaźnik
// zginania. Asercje trzymają się NIEZMIENNIKÓW (M = qL²/8, Wy = M/f_y), a nie
// konkretnych profili — poprawka tablicy doboru nie powinna wywalać tych testów.

import test from "node:test";
import assert from "node:assert/strict";
import {
  GARAGE_PROFILE_TABLES,
  PROFILES,
  STEEL_YIELD_MPA,
  pickProfileByBending,
  sectionModulusCm3,
  spanPickRecord,
} from "@/config/steelProfiles";
import { buildStructure } from "@/scene/structure/buildStructure";
import { structureInputs } from "@/scene/structure/inputs";
import { roofDesignLoadKnM2, snowGroundLoadKnM2 } from "@/scene/structure/spec";
import { staticsSection } from "@/lib/projectSummary";

const EPS = 1e-9;
const close = (actual, expected, message) =>
  assert.ok(Math.abs(actual - expected) < 1e-6, `${message}: ${actual} ≠ ${expected}`);

function config({
  widthM = 6,
  lengthM = 9,
  wallHeightM = 3,
  snowZone = 3,
  reinforcement = "standard",
  type = "gable_left_right",
} = {}) {
  return {
    preset: widthM > 7 ? "hall" : "double_garage",
    dimensions: { widthM, lengthM, wallHeightM },
    roof: {
      type,
      pitchPercent: type.startsWith("gable") ? 28 : 8,
      overhangM: { front: 0.25, back: 0.25, left: 0.25, right: 0.25 },
    },
    cladding: { wallPirThicknessMm: 60, roofPirThicknessMm: 80 },
    frontProjection: { depthM: 0 },
    structure: { reinforcement, snowZone, visible: true },
    openings: [],
  };
}

const specOf = (options) => buildStructure(structureInputs(config(options))).plan.spec;
const checkOf = (spec, role) => spec.statics.checks.find((entry) => entry.role === role);

// --- obciążenia ---------------------------------------------------------

test("obciążenie obliczeniowe połaci wg PN-EN 1991-1-3 dla wszystkich stref", () => {
  const sk = { 1: 0.7, 2: 0.9, 3: 1.2, 4: 1.6, 5: 2.0 };
  for (const [zone, value] of Object.entries(sk)) {
    close(snowGroundLoadKnM2(Number(zone)), value, `sk strefy ${zone}`);
    // 1,35·G + 1,5·μ₁·sk przy G = 0,15 kN/m² i μ₁ = 0,8
    close(roofDesignLoadKnM2(Number(zone)), 1.35 * 0.15 + 1.5 * 0.8 * value, `obciążenie strefy ${zone}`);
  }
});

test("strefa spoza zakresu nie daje NaN", () => {
  close(roofDesignLoadKnM2(9), roofDesignLoadKnM2(5), "strefa 9 przycina się do 5");
  // Wartość nieprawidłowa (0, undefined, tekst) schodzi do strefy domyślnej 2,
  // a nie do najlżejszej 1 — zaniżenie obciążenia byłoby gorsze niż zawyżenie.
  for (const invalid of [0, undefined, null, "x"]) {
    close(roofDesignLoadKnM2(invalid), roofDesignLoadKnM2(2), `„${invalid}" → strefa domyślna`);
  }
});

// --- wskaźnik zginania --------------------------------------------------

test("sectionModulusCm3: rura z geometrii, dwuteownik z tablicy", () => {
  // I = (b·h³ − (b−2t)(h−2t)³)/12, Wy = 2I/h
  const shs = PROFILES.shs_100x100x3;
  const inertiaMm4 = (100 * 100 ** 3 - 94 * 94 ** 3) / 12;
  close(sectionModulusCm3(shs), (2 * inertiaMm4) / 100 / 1000, "SHS 100×100×3");
  assert.equal(sectionModulusCm3(PROFILES.ipe_160), 109, "IPE 160 wg tablicy wyrobów");
  assert.equal(sectionModulusCm3(PROFILES.rod_m16), 0, "ściąg pracuje na rozciąganie");
});

// --- rekord sprawdzenia ze zginania -------------------------------------

test("rekord zginania jest wewnętrznie spójny", () => {
  const spec = specOf();
  const check = checkOf(spec, "purlin");
  assert.ok(check, "płatew musi mieć sprawdzenie");

  assert.equal(check.method, "bending");
  assert.equal(check.scheme, "simple_beam");
  close(check.loadKnM2, spec.roofLoadKnM2, "obciążenie z planu");
  close(check.spanM, spec.rafterSpacing, "rozpiętość płatwi = rozstaw krokwi");
  close(check.tributaryM, spec.purlinSpacing, "pas zbierany = rozstaw płatwi");

  close(check.lineLoadKnM, check.loadKnM2 * check.tributaryM, "q = load × pas");
  close(check.momentKnM, (check.lineLoadKnM * check.spanM ** 2) / 8, "M = qL²/8");
  close(check.requiredWyCm3, (check.momentKnM * 1e6) / STEEL_YIELD_MPA / 1000, "Wy = M/f_y");
  close(check.providedWyCm3, sectionModulusCm3(PROFILES[check.profileId]), "Wy dobranego profilu");
  close(check.utilisation, check.requiredWyCm3 / check.providedWyCm3, "wytężenie");
  assert.equal(check.adequate, check.providedWyCm3 >= check.requiredWyCm3);
  assert.equal(check.yieldMpa, STEEL_YIELD_MPA);
});

test("requiredWyCm3 w rekordzie zgadza się ze starym polem spec", () => {
  const spec = specOf();
  close(checkOf(spec, "purlin").requiredWyCm3, spec.requiredWyCm3.purlin, "płatew");
});

test("wyższa strefa śniegowa podnosi moment", () => {
  const light = checkOf(specOf({ snowZone: 1 }), "purlin");
  const heavy = checkOf(specOf({ snowZone: 5 }), "purlin");
  assert.ok(heavy.loadKnM2 > light.loadKnM2, "obciążenie rośnie ze strefą");
  assert.ok(heavy.requiredWyCm3 > light.requiredWyCm3, "wymagany wskaźnik rośnie ze strefą");
});

test("providedWyCm3 pochodzi z profilu PO stepUp — wzmocnienie obniża wytężenie", () => {
  // Gdyby rekord brał wskaźnik sprzed podniesienia o stopień, poziom „Wzmocniona"
  // byłby w dokumencie niewidoczny.
  const standard = checkOf(specOf({ reinforcement: "standard" }), "purlin");
  const reinforced = checkOf(specOf({ reinforcement: "reinforced" }), "purlin");
  assert.ok(
    reinforced.providedWyCm3 >= standard.providedWyCm3,
    "wzmocnienie nie może dać słabszego przekroju",
  );
  assert.ok(reinforced.utilisation < standard.utilisation, "wytężenie ma spaść");
});

// --- rekord doboru z rozpiętości ----------------------------------------

test("rekord rozpiętościowy nie udaje sprawdzenia nośności", () => {
  // Progi maxSpanM to praktyka producentów, nie wynik obliczeń — procent byłby
  // zmyślony. `adequate: null` (nie false) chroni warnAboutSectionCapacity.
  const record = spanPickRecord("post", PROFILES.shs_70x70x2, { spanM: 3.2 });
  assert.equal(record.method, "span");
  assert.equal(record.utilisation, null);
  assert.equal(record.adequate, null);
  assert.equal(record.requiredWyCm3, null);
  assert.equal(record.momentKnM, null);
  assert.ok(record.basis.length > 0, "podstawa doboru musi być nazwana");
});

test("wszystkie rekordy rozpiętościowe w modelu mają adequate === null", () => {
  for (const check of specOf().statics.checks.filter((entry) => entry.method === "span")) {
    assert.equal(check.adequate, null, `rola ${check.role}`);
    assert.equal(check.utilisation, null, `rola ${check.role}`);
  }
});

test("hala: rygiel ramy jest dobrany z rozpiętości, płatew ze zginania", () => {
  const spec = specOf({ widthM: 12, lengthM: 24, wallHeightM: 5 });
  assert.equal(spec.kind, "hall");
  assert.equal(checkOf(spec, "rafter").method, "span", "rygiel ramy bez sprawdzenia momentu");
  assert.equal(checkOf(spec, "purlin").method, "bending");
});

// --- filtrowanie po rolach użytych w modelu -----------------------------

test("tabela sprawdzeń nie wymienia ról, których nie ma w modelu", () => {
  const model = buildStructure(structureInputs(config({ widthM: 3.5, lengthM: 6, wallHeightM: 2.7 })));
  const roles = new Set(model.members.map((member) => member.role));
  const { checks } = staticsSection(model);

  assert.ok(checks.length > 0, "tabela nie może być pusta");
  for (const check of checks) {
    assert.ok(roles.has(check.role), `sprawdzenie dla nieistniejącej roli: ${check.role}`);
  }
});

test("mały garaż bez krokwi pośrednich: krokiew znika z tabeli, ale nie z doboru", () => {
  // Płatwie leżą wprost na ryglach górnych skośnych (docs §7). Dobór krokwi i tak
  // się liczy — nie wolno go tylko pokazywać jako elementu zamówienia.
  //
  // Jednospad w tył: spad biegnie wzdłuż długości, więc rozpiętością płatwi jest
  // SZEROKOŚĆ 3,5 m — poniżej praktycznych 3,5 m nośności płatwi, stąd zero krokwi.
  const model = buildStructure(
    structureInputs(config({ widthM: 3.5, lengthM: 6, wallHeightM: 2.7, type: "single_back" })),
  );
  assert.equal(model.plan.spec.interiorRafterCount, 0, "założenie testu: brak krokwi pośrednich");
  assert.ok(!model.members.some((member) => member.role === "rafter"), "w modelu nie ma krokwi");

  assert.ok(
    model.plan.spec.statics.checks.some((check) => check.role === "rafter"),
    "dobór krokwi nadal jest policzony",
  );
  assert.ok(
    !staticsSection(model).checks.some((check) => check.role === "rafter"),
    "ale tabela sprawdzeń go nie pokazuje",
  );
});

// --- sekcja opisowa ------------------------------------------------------

test("staticsSection: wiersze opisowe i tabela mają tę samą długość co checks", () => {
  const model = buildStructure(structureInputs(config()));
  const section = staticsSection(model);

  assert.equal(section.checkRows.length, section.checks.length);
  assert.equal(section.rows.length, 7, "siedem wierszy założeń");
  for (const row of section.rows) {
    assert.equal(row.length, 2, "wiersz klucz-wartość");
    assert.ok(String(row[1]).length > 0, `pusta wartość dla „${row[0]}"`);
  }
  for (const row of section.checkRows) {
    assert.equal(row.length, 7, "siedem kolumn tabeli sprawdzeń");
    assert.ok(row.every((cell) => String(cell).length > 0), "żadna komórka nie może być pusta");
  }
  assert.ok(section.note.includes("PN-EN 1993"), "przypis wskazuje normę wymiarowania");
  assert.ok(section.loads.designLoadKnM2 > 0, "surowe liczby są dostępne dla panelu");
});

test("staticsSection: liczby są sformatowane po polsku", () => {
  const section = staticsSection(buildStructure(structureInputs(config())));
  const designRow = section.rows.find(([key]) => key === "Obciążenie obliczeniowe połaci");
  assert.match(designRow[1], /^\d+,\d{2} kN\/m²$/, "przecinek dziesiętny i jednostka");
});

// --- zgodność z dotychczasowym API --------------------------------------

test("pickProfileByBending nadal zwraca stary kształt wyniku", () => {
  const pick = pickProfileByBending(
    GARAGE_PROFILE_TABLES,
    "purlin",
    { spanM: 3.2, tributaryM: 2.3, loadKnM2: 1.6425 },
    0,
  );
  assert.ok(pick.profile?.id, "profile");
  assert.ok(pick.requiredWyCm3 > EPS, "requiredWyCm3");
  assert.equal(typeof pick.adequate, "boolean", "adequate");
  assert.equal(pick.check.profileId, pick.profile.id, "check opisuje ten sam profil");
});
