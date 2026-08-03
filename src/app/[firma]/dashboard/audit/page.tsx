import { Bot, History, User } from "lucide-react";
import { EmptyState, PageHeading } from "@/components/dashboard/DashboardBits";
import { assertCompanyDashboardRole, getCompanyAudit } from "@/server/services/dashboardService";
import { Card, CardContent } from "@/components/ui/card";

const actionLabels: Record<string, string> = {
  "settings.published": "Opublikowano ustawienia konfiguratora",
  "settings.draft_saved": "Zapisano szkic ustawień",
  "order.status_changed": "Zmieniono status zamówienia",
  "subscription.renewed": "Odnowiono subskrypcję",
  "subscription.trial_started": "Rozpoczęto okres próbny",
  "subscription.past_due": "Nieudane obciążenie — okres karencji",
  "subscription.payment_failed": "Płatność nie powiodła się",
  "subscription.canceled": "Anulowano subskrypcję",
  "subscription.expired": "Subskrypcja wygasła",
  "payment.amount_mismatch": "Niezgodna kwota powiadomienia PayU",
  "company.created": "Utworzono firmę",
};

export default async function AuditPage({ params }: { params: Promise<{ firma: string }> }) {
  const { firma } = await params;
  await assertCompanyDashboardRole(firma, ["OWNER", "ADMIN"]);
  const events = await getCompanyAudit(firma);
  const dateFormat = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" });

  return (
    <>
      <PageHeading
        eyebrow="Bezpieczeństwo i kontrola"
        title="Dziennik aktywności"
        description="Pełna historia zmian ustawień, zamówień oraz rozliczeń firmy."
      />
      <Card className="py-0">
        <CardContent className="p-0">
          {events.length ? (
            <ol className="divide-y divide-border">
              {events.map((event: any) => {
                const isSystem = event.actorType === "SYSTEM";
                return (
                  <li key={String(event._id)} className="flex items-center gap-3 px-5 py-3.5">
                    <span
                      aria-hidden="true"
                      className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground"
                    >
                      {isSystem ? <Bot size={17} /> : <User size={17} />}
                    </span>
                    <span className="grid min-w-0 flex-1 leading-tight">
                      <span className="truncate text-sm font-medium">
                        {actionLabels[event.action] || event.action}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {isSystem ? "System" : "Użytkownik"} ·{" "}
                        <time dateTime={new Date(event.createdAt).toISOString()}>
                          {dateFormat.format(new Date(event.createdAt))}
                        </time>
                      </span>
                    </span>
                  </li>
                );
              })}
            </ol>
          ) : (
            <EmptyState
              icon={<History size={28} />}
              title="Brak zarejestrowanych zdarzeń"
              description="Aktywność użytkowników i systemu pojawi się w tym miejscu."
            />
          )}
        </CardContent>
      </Card>
    </>
  );
}
