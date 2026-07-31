import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

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
    <div className="dashboard-page-heading">
      <div className="page-heading-copy">
        {eyebrow && <span className="page-eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  change,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: string | number;
  change?: string;
  tone?: "up" | "down" | "neutral";
  icon?: React.ReactNode;
}) {
  const Icon = tone === "up" ? ArrowUpRight : tone === "down" ? ArrowDownRight : Minus;
  return (
    <article className="metric-card" data-tone={tone}>
      <div className="metric-card-top">
        <span>{label}</span>
        {icon && <i className="metric-icon" aria-hidden="true">{icon}</i>}
      </div>
      <strong className="metric-value">{value}</strong>
      {change && <small className={tone}><Icon size={14} aria-hidden="true" /> {change}</small>}
    </article>
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

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`status-badge status-${status.toLowerCase()}`}>
      <i aria-hidden="true" />
      {orderStatusLabels[status] || status}
    </span>
  );
}
