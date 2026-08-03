import { AlertCircle, CheckCircle2, Clock3, CreditCard, Radio, RefreshCw, Webhook } from "lucide-react";
import {
  SuperadminEmpty,
  SuperadminMetric,
  SuperadminPageHeader,
  SuperadminSectionHeader,
  SuperadminStatus,
} from "@/components/superadmin/SuperadminBits";
import { getSuperadminDataset } from "@/server/services/dashboardService";

export default async function SystemBillingPage() {
  const data = await getSuperadminDataset();
  return (
    <>
      <SuperadminPageHeader
        eyebrow="PayU i automatyzacja"
        title="Płatności i stan systemu"
        description="Monitoruj transakcje, odnowienia cykliczne, webhooki i zadania utrzymujące dostęp firm."
        actions={<span className="sa-last-update"><i /> Monitoring aktywny</span>}
      />
      {data.failedAttempts.length ? (
        <div className="sa-alert sa-alert-danger" role="alert">
          <span><AlertCircle size={19} /></span>
          <div><strong>{data.failedAttempts.length} nieudanych odnowień</strong><p>Sprawdź błędy poniżej i zweryfikuj status subskrypcji dotkniętych firm.</p></div>
        </div>
      ) : null}
      <section className="sa-metric-grid" aria-label="Wskaźniki płatności">
        <SuperadminMetric label="Wszystkie płatności" value={data.stats.payments} detail="Zarejestrowane transakcje" icon={CreditCard} />
        <SuperadminMetric label="Błędy odnowień" value={data.failedAttempts.length} detail={data.failedAttempts.length ? "Wymagają interwencji" : "Brak aktywnych błędów"} icon={AlertCircle} tone={data.failedAttempts.length ? "danger" : "positive"} />
        <SuperadminMetric label="Ostatnie webhooki" value={data.recentWebhooks.length} detail="Zapisane zdarzenia PayU" icon={Webhook} />
        <SuperadminMetric label="Harmonogram" value="03:00" detail="Vercel Cron, codziennie" icon={RefreshCw} tone="positive" />
      </section>

      <div className="sa-billing-grid">
        <section className="sa-card sa-span-2">
          <SuperadminSectionHeader eyebrow="PayU" title="Ostatnie płatności" icon={CreditCard} />
          <div className="sa-table-wrap">
            <table className="sa-table">
              <thead><tr><th>Identyfikator</th><th>Status</th><th>Data</th><th className="sa-align-right">Kwota brutto</th></tr></thead>
              <tbody>
                {data.recentPayments.slice(0, 30).map((payment: any) => (
                  <tr key={String(payment._id)}>
                    <td><span className="sa-payment-id">{payment.status === "COMPLETED" ? <CheckCircle2 size={16} /> : <Clock3 size={16} />}<strong>{payment.extOrderId}</strong></span></td>
                    <td><SuperadminStatus status={payment.status} /></td>
                    <td>{new Date(payment.createdAt).toLocaleString("pl-PL")}</td>
                    <td className="sa-align-right"><strong>{Number(payment.amountGross).toLocaleString("pl-PL")} zł</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data.recentPayments.length ? <SuperadminEmpty>Nie zarejestrowano jeszcze żadnej płatności.</SuperadminEmpty> : null}
          </div>
        </section>

        <section className="sa-card">
          <SuperadminSectionHeader eyebrow="Automatyzacja" title="Stan procesów" icon={Radio} />
          <div className="sa-process-list">
            <div><span><i className="is-good" /> PayU Webhook</span><strong>Nasłuchuje</strong><small>Ostatnie zdarzenia: {data.recentWebhooks.length}</small></div>
            <div><span><i className="is-good" /> Cron odnowień</span><strong>Aktywny</strong><small>Codziennie o 03:00 UTC</small></div>
            <div><span><i className={data.failedAttempts.length ? "is-bad" : "is-good"} /> Próby obciążeń</span><strong>{data.failedAttempts.length ? "Uwaga" : "Stabilnie"}</strong><small>{data.failedAttempts.length} błędów w kolejce</small></div>
          </div>
        </section>

        <section className="sa-card sa-span-3">
          <SuperadminSectionHeader eyebrow="Diagnostyka" title="Błędy odnowień" icon={AlertCircle} />
          <div className="sa-diagnostic-list">
            {data.failedAttempts.map((attempt: any) => (
              <article key={String(attempt._id)}>
                <span className="sa-diagnostic-icon"><AlertCircle size={17} /></span>
                <div><strong>{attempt.errorCode || "RENEWAL_FAILED"}</strong><p>{attempt.errorMessage || "Brak szczegółowego opisu błędu."}</p></div>
                <time>{new Date(attempt.attemptedAt).toLocaleString("pl-PL")}</time>
              </article>
            ))}
            {!data.failedAttempts.length ? <SuperadminEmpty>Brak błędów odnowień. Wszystkie procesy rozliczeniowe działają prawidłowo.</SuperadminEmpty> : null}
          </div>
        </section>
      </div>
    </>
  );
}
