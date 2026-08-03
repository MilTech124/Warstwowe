import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function PageHeading({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-[760px]">
        {eyebrow && (
          <span className="mb-1.5 block text-[11px] font-semibold tracking-[0.13em] text-primary uppercase">
            {eyebrow}
          </span>
        )}
        <h1 className="text-3xl font-bold tracking-tight text-balance lg:text-[2.35rem]">{title}</h1>
        {description && (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div>}
    </div>
  );
}

export interface MetricTrend {
  /** null when a percentage is meaningless (no comparable previous period). */
  deltaPercent: number | null;
  label: string;
}

export function MetricCard({
  label,
  value,
  hint,
  trend,
  icon,
}: {
  label: string;
  value: string | number;
  /** Static caption, used when there is nothing to compare against. */
  hint?: string;
  trend?: MetricTrend | null;
  icon?: React.ReactNode;
}) {
  const delta = trend?.deltaPercent ?? null;
  const direction = delta === null ? "flat" : delta > 0 ? "up" : delta < 0 ? "down" : "flat";
  const Icon = direction === "up" ? ArrowUpRight : direction === "down" ? ArrowDownRight : Minus;

  return (
    <Card className="gap-0 py-5">
      <CardContent className="px-5">
        <div className="flex items-start justify-between gap-3">
          <span className="text-[13px] font-medium text-muted-foreground">{label}</span>
          {icon && (
            <span
              aria-hidden="true"
              className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"
            >
              {icon}
            </span>
          )}
        </div>
        <strong className="mt-3 block text-3xl leading-none font-bold tracking-tight tabular-nums">
          {value}
        </strong>
        {(trend || hint) && (
          <span
            className={cn(
              "mt-3 flex items-center gap-1.5 text-xs font-medium",
              trend && direction === "up" && "text-success",
              trend && direction === "down" && "text-destructive",
              (!trend || direction === "flat") && "text-muted-foreground",
            )}
          >
            {trend && <Icon size={14} aria-hidden="true" />}
            {trend
              ? `${delta === null ? "" : `${delta > 0 ? "+" : ""}${delta}% `}${trend.label}`
              : hint}
          </span>
        )}
      </CardContent>
    </Card>
  );
}

export const orderStatusLabels: Record<string, string> = {
  NEW: "Nowe",
  CONTACTED: "Kontakt",
  QUOTED: "Wycena",
  ACCEPTED: "Zaakceptowane",
  REJECTED: "Odrzucone",
  ARCHIVED: "Archiwum",
};

/** PayU payment statuses share the badge; the billing table renders them too. */
export const paymentStatusLabels: Record<string, string> = {
  PENDING: "Oczekuje",
  WAITING_FOR_CONFIRMATION: "W potwierdzaniu",
  COMPLETED: "Rozliczona",
  CANCELED: "Anulowana",
  REJECTED: "Odrzucona",
  ERROR: "Błąd",
};

const statusStyles: Record<string, string> = {
  NEW: "border-primary/25 bg-primary/10 text-primary",
  CONTACTED: "border-sky-300/60 bg-sky-50 text-sky-800",
  QUOTED: "border-warning/35 bg-warning/10 text-warning",
  ACCEPTED: "border-success/30 bg-success/10 text-success",
  REJECTED: "border-destructive/30 bg-destructive/10 text-destructive",
  ARCHIVED: "border-border bg-muted text-muted-foreground",
  PENDING: "border-warning/35 bg-warning/10 text-warning",
  WAITING_FOR_CONFIRMATION: "border-warning/35 bg-warning/10 text-warning",
  COMPLETED: "border-success/30 bg-success/10 text-success",
  CANCELED: "border-destructive/30 bg-destructive/10 text-destructive",
  ERROR: "border-destructive/30 bg-destructive/10 text-destructive",
};

const statusDots: Record<string, string> = {
  NEW: "bg-primary",
  CONTACTED: "bg-sky-600",
  QUOTED: "bg-warning",
  ACCEPTED: "bg-success",
  REJECTED: "bg-destructive",
  ARCHIVED: "bg-muted-foreground",
  PENDING: "bg-warning",
  WAITING_FOR_CONFIRMATION: "bg-warning",
  COMPLETED: "bg-success",
  CANCELED: "bg-destructive",
  ERROR: "bg-destructive",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("gap-1.5 font-semibold", statusStyles[status] ?? statusStyles.ARCHIVED)}
    >
      <span
        aria-hidden="true"
        className={cn("size-1.5 rounded-full", statusDots[status] ?? statusDots.ARCHIVED)}
      />
      {orderStatusLabels[status] || paymentStatusLabels[status] || status}
    </Badge>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      {icon && <span className="mb-1 text-muted-foreground">{icon}</span>}
      <strong className="text-sm font-semibold">{title}</strong>
      {description && (
        <span className="max-w-sm text-sm text-muted-foreground text-pretty">{description}</span>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
