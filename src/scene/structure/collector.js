// Zbieracz elementów konstrukcji. Generatory (garage.js, hall.js) nie tworzą JSX —
// dopisują tu obiekty opisujące geometrię, a renderer i BOM czytają gotowe tablice.

const DEV = process.env.NODE_ENV !== "production";

// Elementy krótsze niż to pomijamy — po przycięciu wokół otworów i słupów
// zostają czasem skrawki bez sensu montażowego (i zaśmiecałyby BOM).
const MIN_MEMBER_LENGTH_M = 0.05;

// Belki są rysowane z nadmiarem, żeby spawane węzły nie miały szczelin.
// Nadmiar dotyczy WYŁĄCZNIE geometrii — długość w BOM liczona jest z osi.
const DEFAULT_OVERLAP_FACTOR = 1.15;

function distance(a, b) {
  return Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
}

// Podpowiedź ustawienia przekroju: kierunek osi MOCNEJ profilu.
//
// Renderer widzi wyłącznie `start`/`end`, a z samych współrzędnych osi mocnej
// odczytać się nie da: rygiel ścienny i płatew bywają równoległe, a stoją
// inaczej. Decyzja należy więc do modelu — tej samej warstwy, którą pokrywają
// testy .mjs i z której korzystają rysunki.

// Słupy: przekrój ustawiony w płaszczyźnie ramy, bo tam rama się zgina.
// Dla kwadratowych SHS to kosmetyka, dla dwuteowych słupów hali — rzecz istotna.
const FRAME_PLANE_ROLES = new Set([
  "column",
  "cornerPost",
  "post",
  "wallPost",
  "endPost",
  "overOpeningPost",
  "underOpeningPost",
  "openingJamb",
  "projectionPost",
]);

// Rygle ścienne przenoszą wiatr, czyli obciążenie PROSTOPADŁE do ściany —
// tam musi patrzeć ich oś mocna. Płatwie dachowe przenoszą śnieg (pionowo)
// i zostają przy domyślnym ustawieniu środnika w pionie.
const WALL_NORMAL_ROLES = new Set(["girt", "midGirt", "topRail", "sillRail"]);

export function createCollector(prefix, { runAxis = "x" } = {}) {
  const members = [];
  const plates = [];
  const joints = [];
  const warnings = [];
  const counters = new Map();

  const framePlaneUp = runAxis === "x" ? [1, 0, 0] : [0, 0, 1];

  function nextId(role) {
    const next = (counters.get(role) ?? 0) + 1;
    counters.set(role, next);
    return `${prefix}/${role}/${next}`;
  }

  function defaultUp(role, start, end) {
    if (FRAME_PLANE_ROLES.has(role)) return framePlaneUp;
    if (WALL_NORMAL_ROLES.has(role)) {
      // Normalna ściany = iloczyn wektorowy kierunku elementu i pionu. Dla
      // elementu poziomego wychodzi poziomo i prostopadle do ściany.
      const nx = -(end[2] - start[2]);
      const nz = end[0] - start[0];
      const length = Math.hypot(nx, nz);
      if (length > 1e-6) return [nx / length, 0, nz / length];
    }
    // Belka zginana pionowo — środnik pionowo. Dla elementu pochyłego renderer
    // rzutuje tę podpowiedź na płaszczyznę przekroju, co daje środnik
    // prostopadły do spadu, czyli poprawnie.
    return [0, 1, 0];
  }

  // Deduplikacja obejmuje IDENTYFIKATOR OTWORU, nie tylko treść komunikatu.
  // Dwa otwory o tych samych wymiarach na tej samej ścianie dają identyczny tekst,
  // więc klucz po samej treści gubił ostrzeżenie dla drugiego z nich.
  function warn(code, message, extra = {}) {
    const key = `${code}|${extra.openingId ?? ""}|${extra.memberId ?? ""}|${message}`;
    if (warnings.some((entry) => entry.dedupeKey === key)) return;
    warnings.push({ code, message, ...extra, dedupeKey: key });
  }

  return {
    /**
     * @param {{ role, group, profile, start, end, material?, sizeM?, up?, overlapFactor?, minLengthM? }} spec
     * @returns {object|null} dodany element lub null, gdy odrzucony jako zbyt krótki
     */
    addMember({ role, group, profile, start, end, material = "steel", sizeM, up, overlapFactor = DEFAULT_OVERLAP_FACTOR, minLengthM = MIN_MEMBER_LENGTH_M }) {
      const lengthM = distance(start, end);
      if (!(lengthM > minLengthM)) return null;

      const size = sizeM ?? profile?.sizeM ?? 0.06;
      if (DEV && !profile) {
        warn("profile_missing", `Element w roli „${role}" nie ma przypisanego profilu — masa nie zostanie policzona.`, { role });
      }

      const member = {
        id: nextId(role),
        role,
        group,
        profileId: profile?.id ?? null,
        profileLabel: profile?.label ?? null,
        kgPerM: profile?.kgPerM ?? null,
        sizeM: size,
        up: up ?? defaultUp(role, start, end),
        overlapM: size * overlapFactor,
        start,
        end,
        lengthM,
        material,
      };
      members.push(member);
      return member;
    },

    addPlate({ position, columnSizeM, thicknessM, material = "trim", group }) {
      const plateSizeM = columnSizeM * 1.9;
      const plate = {
        id: nextId("basePlate"),
        role: "basePlate",
        position,
        plateSizeM,
        thicknessM,
        boltCount: 4,
        boltDiameterM: 0.008,
        boltOffsetM: plateSizeM / 2 - Math.min(0.025, plateSizeM * 0.18),
        material,
        group,
      };
      plates.push(plate);
      return plate;
    },

    addJoint({ position, sizeM, role = "joint", material = "steel", group }) {
      const joint = { id: nextId("joint"), role, position, sizeM, material, group };
      joints.push(joint);
      return joint;
    },

    warn,

    finish() {
      if (DEV) {
        const seenIds = new Set();
        const seenMidpoints = new Map();
        members.forEach((member) => {
          if (seenIds.has(member.id)) {
            warn("duplicate_id", `Zduplikowany identyfikator elementu: ${member.id}`);
          }
          seenIds.add(member.id);

          // Dwa pokrywające się elementy są niewidoczne w 3D, ale liczą się
          // podwójnie w zestawieniu stali. Kierunek wchodzi do klucza, bo para
          // stężeń krzyżowych ma wspólny środek przy różnych przebiegach.
          const midpoint = [
            (member.start[0] + member.end[0]) / 2,
            (member.start[1] + member.end[1]) / 2,
            (member.start[2] + member.end[2]) / 2,
          ];
          const delta = [0, 1, 2].map((axis) => member.end[axis] - member.start[axis]);
          // Kanonizacja znaku: odwrócenie początku z końcem to ten sam element,
          // ale odbicie (druga przekątna przęsła) już nie.
          const lead = delta.find((value) => Math.abs(value) > 1e-6) ?? 1;
          const direction = delta.map((value) => Math.round((value / Math.sign(lead)) * 50));
          const key = `${member.role}|${midpoint.map((value) => Math.round(value * 200)).join(",")}|${direction.join(",")}`;
          if (seenMidpoints.has(key)) {
            warn(
              "coincident_members",
              `Elementy ${seenMidpoints.get(key)} i ${member.id} pokrywają się — sprawdź podwójne liczenie w zestawieniu stali.`,
            );
          }
          seenMidpoints.set(key, member.id);
        });
      }

      return { members, plates, joints, warnings };
    },
  };
}
