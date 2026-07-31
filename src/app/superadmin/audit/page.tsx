import { Activity, ScrollText, ShieldCheck } from "lucide-react";
import {
  SuperadminEmpty,
  SuperadminPageHeader,
  SuperadminSectionHeader,
  SuperadminStatus,
} from "@/components/superadmin/SuperadminBits";
import { getSuperadminDataset } from "@/server/services/dashboardService";

export default async function GlobalAuditPage() {
  const data = await getSuperadminDataset();
  return (
    <>
      <SuperadminPageHeader
        eyebrow="Bezpieczeństwo"
        title="Globalny dziennik audytu"
        description="Niezmienna historia operacji administracyjnych, systemowych i zmian wykonywanych w obrębie firm."
        actions={<span className="sa-page-count"><ScrollText size={16} /> {data.recentAudit.length} zdarzeń</span>}
      />
      <section className="sa-card">
        <SuperadminSectionHeader eyebrow="Chronologicznie" title="Ostatnia aktywność" icon={Activity} />
        <div className="sa-audit-list">
          {data.recentAudit.map((event: any) => (
            <article key={String(event._id)}>
              <span className={`sa-audit-icon ${event.actorType === "SUPERADMIN" ? "is-admin" : ""}`}>
                {event.actorType === "SUPERADMIN" ? <ShieldCheck size={17} /> : <Activity size={17} />}
              </span>
              <div className="sa-audit-main">
                <strong>{event.action}</strong>
                <span><code>{event.entityType}</code><small>{event.entityId || "system"}</small></span>
              </div>
              <SuperadminStatus status={event.actorType} />
              <time dateTime={new Date(event.createdAt).toISOString()}>{new Date(event.createdAt).toLocaleString("pl-PL")}</time>
            </article>
          ))}
          {!data.recentAudit.length ? <SuperadminEmpty>Dziennik jest jeszcze pusty. Pierwsze zdarzenia pojawią się po operacji administracyjnej.</SuperadminEmpty> : null}
        </div>
      </section>
    </>
  );
}
