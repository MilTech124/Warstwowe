import { Activity, Bot, History, User } from "lucide-react";
import { PageHeading } from "@/components/dashboard/DashboardBits";
import { assertCompanyDashboardRole, getCompanyAudit } from "@/server/services/dashboardService";

const actionLabels: Record<string, string> = {
  "settings.published": "Opublikowano ustawienia konfiguratora",
  "settings.draft_saved": "Zapisano szkic ustawień",
  "order.status_changed": "Zmieniono status zamówienia",
  "subscription.renewed": "Odnowiono subskrypcję",
  "company.created": "Utworzono firmę",
};

export default async function AuditPage({ params }: { params: Promise<{ firma: string }> }) {
  const { firma } = await params;
  await assertCompanyDashboardRole(firma, ["OWNER", "ADMIN"]);
  const events = await getCompanyAudit(firma);
  return (
    <>
      <PageHeading eyebrow="Bezpieczeństwo i kontrola" title="Dziennik aktywności" description="Pełna historia zmian ustawień, zamówień oraz rozliczeń firmy." />
      <section className="dashboard-card audit-list">
        {events.map((event: any) => (
          <div key={String(event._id)}>
            <span className="audit-icon">{event.actorType === "SYSTEM" ? <Bot size={17} /> : <User size={17} />}</span>
            <div><strong>{actionLabels[event.action] || event.action}</strong><small>{event.actorType === "SYSTEM" ? "System" : "Użytkownik"} · {new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.createdAt))}</small></div>
            <Activity size={16} />
          </div>
        ))}
        {!events.length && <div className="empty-state"><History size={28} /><strong>Brak zarejestrowanych zdarzeń</strong><span>Aktywność użytkowników i systemu pojawi się w tym miejscu.</span></div>}
      </section>
    </>
  );
}
