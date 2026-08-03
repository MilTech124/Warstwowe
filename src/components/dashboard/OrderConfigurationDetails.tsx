import {
  Box,
  Construction,
  DoorOpen,
  Droplets,
  Frame,
  Layers3,
  Lightbulb,
  PanelTop,
  Ruler,
} from "lucide-react";
import { PRESETS, ROOF_TYPES } from "@/config/catalog";
import { projectSummary } from "@/lib/projectSummary";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Row = [string, string];

function SectionHeader({
  eyebrow,
  title,
  icon: Icon,
}: {
  eyebrow?: string;
  title: string;
  icon: typeof Box;
}) {
  return (
    <header className="mb-3 flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"
      >
        <Icon size={18} />
      </span>
      <span className="grid leading-tight">
        {eyebrow && (
          <span className="text-[10px] font-semibold tracking-[0.13em] text-muted-foreground uppercase">
            {eyebrow}
          </span>
        )}
        <h3 className="text-sm font-semibold">{title}</h3>
      </span>
    </header>
  );
}

function DetailSection({
  title,
  eyebrow,
  rows,
  icon,
}: {
  title: string;
  eyebrow?: string;
  rows: Row[];
  icon: typeof Box;
}) {
  return (
    <section className="rounded-xl border border-border p-4">
      <SectionHeader eyebrow={eyebrow} title={title} icon={icon} />
      <dl className="grid gap-1.5">
        {rows.map(([label, value], index) => (
          <div key={`${label}-${index}`} className="flex items-baseline justify-between gap-3">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-right text-xs font-medium">{value || "—"}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function basicSummary(snapshot: any) {
  const dimensions = snapshot?.dimensions || {};
  const roof = snapshot?.roof || {};
  const presets = PRESETS as Record<string, { label: string }>;
  const roofTypes = ROOF_TYPES as Record<string, string>;
  return {
    building: {
      title: "Opis obiektu",
      rows: [
        ["Typ obiektu", presets[snapshot?.preset || snapshot?.presetId]?.label || "Konfiguracja własna"],
        ["Szerokość", dimensions.widthM ? `${dimensions.widthM} m` : "—"],
        ["Długość", dimensions.lengthM ? `${dimensions.lengthM} m` : "—"],
        ["Wysokość ścian", dimensions.wallHeightM ? `${dimensions.wallHeightM} m` : "—"],
      ],
    },
    roof: {
      title: "Dach",
      rows: [
        ["Typ dachu", roofTypes[roof.type] || roof.type || "—"],
        ["Spadek", roof.pitchPercent != null ? `${roof.pitchPercent}%` : "—"],
      ],
    },
  };
}

export function OrderConfigurationDetails({
  snapshot,
  catalogVersion,
  settingsVersion,
}: {
  snapshot: any;
  catalogVersion?: number;
  settingsVersion?: number;
}) {
  let summary: any;
  let complete = true;
  try {
    summary = projectSummary(snapshot);
  } catch {
    // Older orders predate the current snapshot schema.
    summary = basicSummary(snapshot);
    complete = false;
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">Schemat v{snapshot?.schemaVersion || "—"}</Badge>
        <Badge variant="secondary">Katalog v{catalogVersion || 1}</Badge>
        <Badge variant="secondary">Ustawienia firmy v{settingsVersion || 1}</Badge>
        <Badge
          variant="outline"
          className={
            complete
              ? "border-success/30 bg-success/10 text-success"
              : "border-warning/35 bg-warning/10 text-warning"
          }
        >
          {complete ? "Pełna konfiguracja" : "Starszy format zamówienia"}
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <DetailSection
          title={summary.building.title}
          eyebrow="Bryła"
          rows={summary.building.rows}
          icon={Ruler}
        />
        <DetailSection
          title={summary.roof.title}
          eyebrow="Geometria"
          rows={summary.roof.rows}
          icon={PanelTop}
        />
        {summary.frontProjection && (
          <DetailSection
            title={summary.frontProjection.title}
            eyebrow="Rozszerzenie"
            rows={summary.frontProjection.rows}
            icon={Construction}
          />
        )}
        {summary.cladding && (
          <>
            <DetailSection
              title="Płyty ścienne"
              eyebrow="Poszycie"
              rows={summary.cladding.wallRows}
              icon={Layers3}
            />
            <DetailSection
              title="Płyty dachowe"
              eyebrow="Poszycie"
              rows={summary.cladding.roofRows}
              icon={Layers3}
            />
          </>
        )}
        {summary.accessorySection && (
          <>
            <DetailSection
              title="Obróbki blacharskie"
              eyebrow="Akcesoria"
              rows={summary.accessorySection.flashingRows}
              icon={Frame}
            />
            <DetailSection
              title="Orynnowanie"
              eyebrow="Akcesoria"
              rows={summary.accessorySection.gutterRows}
              icon={Droplets}
            />
          </>
        )}
        {summary.lighting && (
          <DetailSection
            title={summary.lighting.title}
            eyebrow="Instalacje"
            rows={summary.lighting.rows}
            icon={Lightbulb}
          />
        )}
        {summary.structure && (
          <DetailSection
            title={summary.structure.title}
            eyebrow="Konstrukcja"
            rows={summary.structure.rows}
            icon={Construction}
          />
        )}
      </div>

      {summary.openings?.length > 0 && (
        <section>
          <SectionHeader eyebrow="Otwory" title="Bramy, drzwi i okna" icon={DoorOpen} />
          <div className="grid gap-3 sm:grid-cols-2">
            {summary.openings.map((opening: any, index: number) => (
              <article
                key={`${opening.title}-${index}`}
                className="rounded-xl border border-border p-4"
              >
                <div className="mb-2.5 grid leading-tight">
                  <span className="text-[10px] font-semibold tracking-[0.13em] text-muted-foreground uppercase">
                    {opening.title}
                  </span>
                  <strong className="text-sm font-semibold">
                    {opening.product || "Element otworu"}
                  </strong>
                </div>
                <dl className="grid gap-1.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-xs text-muted-foreground">Umiejscowienie</dt>
                    <dd className="text-right text-xs font-medium">{opening.wall}</dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-xs text-muted-foreground">Wymiary</dt>
                    <dd className="text-right text-xs font-medium">{opening.sizeText}</dd>
                  </div>
                  {opening.colorLabel && (
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-xs text-muted-foreground">Kolor</dt>
                      <dd className="text-right text-xs font-medium">{opening.colorLabel}</dd>
                    </div>
                  )}
                  {opening.details?.length > 0 && (
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-xs text-muted-foreground">Szczegóły</dt>
                      <dd className="text-right text-xs font-medium">
                        {opening.details.join(" · ")}
                      </dd>
                    </div>
                  )}
                </dl>
              </article>
            ))}
          </div>
        </section>
      )}

      {summary.structure?.profileRows?.length > 0 && (
        <section>
          <SectionHeader eyebrow="Stal" title="Dobór profili konstrukcyjnych" icon={Box} />
          <div className="overflow-x-auto rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Element</TableHead>
                  <TableHead>Profil</TableHead>
                  <TableHead className="text-right">Rozstaw</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.structure.profileRows.map((profile: any) => (
                  <TableRow key={`${profile.role}-${profile.profileLabel}`}>
                    <TableCell className="font-medium">{profile.roleLabel}</TableCell>
                    <TableCell>{profile.profileLabel}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {profile.spacingText}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}
    </div>
  );
}
