// Zestawienie stali z modelu konstrukcji.
//
// Długości brane są z osi elementów (member.lengthM), a NIE z geometrii mesha —
// ta jest wydłużona o `overlapM`, żeby spawane węzły nie miały szczelin.

import { ANCHOR, STEEL_DENSITY_KG_M3, roleLabel } from "@/config/steelProfiles";

// Zapas na docinanie profili z odcinków handlowych.
export const CUTTING_ALLOWANCE = 0.05;

// Rozstaw kotew mocujących podwalinę do płyty fundamentowej.
const SILL_ANCHOR_SPACING_M = 1.0;

export function steelBom(model) {
  const groups = new Map();

  model.members.forEach((member) => {
    const key = `${member.role}|${member.profileId ?? "brak"}`;
    const row =
      groups.get(key) ??
      {
        key,
        role: member.role,
        roleLabel: roleLabel(member.role),
        profileId: member.profileId,
        profileLabel: member.profileLabel ?? "profil nieokreślony",
        kgPerM: member.kgPerM,
        count: 0,
        totalLengthM: 0,
        massKg: 0,
      };

    row.count += 1;
    row.totalLengthM += member.lengthM;
    if (member.kgPerM != null) row.massKg += member.lengthM * member.kgPerM;
    groups.set(key, row);
  });

  const rows = [...groups.values()].sort((a, b) => b.massKg - a.massKg || a.roleLabel.localeCompare(b.roleLabel, "pl"));
  const profileMassKg = rows.reduce((sum, row) => sum + row.massKg, 0);
  const membersWithoutProfile = rows.filter((row) => row.profileId == null).reduce((sum, row) => sum + row.count, 0);

  // Blachy podstawy: kwadrat × grubość × gęstość stali.
  const plateMassKg = model.plates.reduce(
    (sum, plate) => sum + plate.plateSizeM * plate.plateSizeM * plate.thicknessM * STEEL_DENSITY_KG_M3,
    0,
  );
  // Kotwy stóp słupów...
  const plateAnchorCount = model.plates.reduce((sum, plate) => sum + plate.boltCount, 0);
  // ...oraz kotwienie samej podwaliny. Słupki pośrednie są w niej wspawane i nie
  // mają własnych stóp, więc obciążenie schodzi do płyty przez podwalinę
  // kotwioną co ~1 m.
  const sillRailLengthM = model.members
    .filter((member) => member.role === "sillRail" || member.role === "projectionSillRail")
    .reduce((sum, member) => sum + member.lengthM, 0);
  const sillAnchorCount = Math.ceil(sillRailLengthM / SILL_ANCHOR_SPACING_M);
  const anchorCount = plateAnchorCount + sillAnchorCount;

  const plateRows = groupPlates(model.plates);

  return {
    rows,
    plateRows,
    anchorCount,
    anchorLabel: ANCHOR.label,
    anchorMassKg: anchorCount * ANCHOR.massKg,
    profileMassKg,
    plateMassKg,
    // Węzły/kostki spoin i drobnica montażowa — ryczałt na podstawie masy profili.
    fixingsMassKg: profileMassKg * 0.02,
    membersWithoutProfile,
    get totalMassKg() {
      return this.profileMassKg + this.plateMassKg + this.anchorMassKg + this.fixingsMassKg;
    },
    memberCount: model.members.length,
    plateCount: model.plates.length,
  };
}

function groupPlates(plates) {
  const groups = new Map();
  plates.forEach((plate) => {
    const sizeMm = Math.round(plate.plateSizeM * 1000);
    const thicknessMm = Math.round(plate.thicknessM * 1000);
    const key = `${sizeMm}x${thicknessMm}`;
    const row =
      groups.get(key) ??
      {
        key,
        label: `Blacha podstawy ${sizeMm}×${sizeMm}×${thicknessMm}`,
        count: 0,
        massKg: 0,
      };
    row.count += 1;
    row.massKg += plate.plateSizeM * plate.plateSizeM * plate.thicknessM * STEEL_DENSITY_KG_M3;
    groups.set(key, row);
  });
  return [...groups.values()].sort((a, b) => b.massKg - a.massKg);
}

// Zapotrzebowanie na materiał hutniczy per profil (do zamówienia u dostawcy).
export function steelOrderByProfile(bom) {
  const groups = new Map();
  bom.rows.forEach((row) => {
    if (!row.profileId) return;
    const existing = groups.get(row.profileId) ?? { profileId: row.profileId, profileLabel: row.profileLabel, kgPerM: row.kgPerM, lengthM: 0 };
    existing.lengthM += row.totalLengthM;
    groups.set(row.profileId, existing);
  });

  return [...groups.values()]
    .map((entry) => ({
      ...entry,
      orderLengthM: entry.lengthM * (1 + CUTTING_ALLOWANCE),
      massKg: entry.lengthM * (1 + CUTTING_ALLOWANCE) * entry.kgPerM,
    }))
    .sort((a, b) => b.massKg - a.massKg);
}
