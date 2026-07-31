import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Minus, SearchX } from "lucide-react";

export function SuperadminPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="sa-page-header">
      <div>
        <span className="sa-eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions ? <div className="sa-page-actions">{actions}</div> : null}
    </header>
  );
}

export function SuperadminMetric({
  label,
  value,
  detail,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: React.ReactNode;
  detail?: string;
  icon: LucideIcon;
  tone?: "positive" | "warning" | "danger" | "neutral";
}) {
  const TrendIcon = tone === "positive" ? ArrowUpRight : tone === "danger" ? ArrowDownRight : Minus;
  return (
    <article className={`sa-metric sa-tone-${tone}`}>
      <div className="sa-metric-top">
        <span>{label}</span>
        <span className="sa-metric-icon" aria-hidden="true"><Icon size={18} /></span>
      </div>
      <strong>{value}</strong>
      {detail ? <small><TrendIcon size={13} aria-hidden="true" />{detail}</small> : null}
    </article>
  );
}

export function SuperadminSectionHeader({
  eyebrow,
  title,
  icon: Icon,
  action,
}: {
  eyebrow?: string;
  title: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
}) {
  return (
    <div className="sa-section-header">
      <div>
        {eyebrow ? <span>{eyebrow}</span> : null}
        <h2>{title}</h2>
      </div>
      <div className="sa-section-action">
        {action}
        {Icon ? <Icon size={19} aria-hidden="true" /> : null}
      </div>
    </div>
  );
}

export function SuperadminEmpty({ children }: { children: React.ReactNode }) {
  return (
    <div className="sa-empty">
      <span aria-hidden="true"><SearchX size={20} /></span>
      <p>{children}</p>
    </div>
  );
}

export function SuperadminStatus({ status }: { status: string }) {
  const normalized = status.toLowerCase().replaceAll("_", "-");
  return (
    <span className={`sa-status sa-status-${normalized}`}>
      <i aria-hidden="true" />
      {status.replaceAll("_", " ")}
    </span>
  );
}
