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
  const stripeWebhooks = data.recentWebhooks.filter((event: any) => event.provider === "STRIPE");
  return (
    <>
      <SuperadminPageHeader
        eyebrow="Stripe Billing"
        title="Płatności i stan systemu"
        description="Monitoruj Checkout, faktury, subskrypcje, webhooki i błędy rozliczeń Stripe."
        actions={<span className="sa-last-update"><i /> Monitoring aktywny</span>}
      />
      {data.failedAttempts.length ? (
        <div className="sa-alert sa-alert-danger" role="alert">
          <span><AlertCircle size={19} /></span>
          <div><strong>{data.failedAttempts.length} nieudanych płatności</strong><p>Klienci mogą zaktualizować metodę płatności w Customer Portal, a Stripe wykona Smart Retries.</p></div>
        </div>
      ) : null}
      <section className="sa-metric-grid" aria-label="Wskaźniki płatności">
        <SuperadminMetric label="Wszystkie płatności" value={data.stats.payments} detail="Płatności Stripe" icon={CreditCard} />
        <SuperadminMetric label="Błędy płatności" value={data.failedAttempts.length} detail={data.failedAttempts.length ? "Wymagają uwagi" : "Brak aktywnych błędów"} icon={AlertCircle} tone={data.failedAttempts.length ? "danger" : "positive"} />
        <SuperadminMetric label="Webhooki Stripe" value={stripeWebhooks.length} detail="Ostatnie zapisane zdarzenia" icon={Webhook} />
        <SuperadminMetric label="Maintenance" value="03:00" detail="Tylko wygaszanie przedpłat" icon={RefreshCw} tone="positive" />
      </section>

      <div className="sa-billing-grid">
        <section className="sa-card sa-span-2">
          <SuperadminSectionHeader eyebrow="Stripe" title="Ostatnie płatności" icon={CreditCard} />
          <div className="sa-table-wrap">
            <table className="sa-table">
              <thead><tr><th>Identyfikator</th><th>Dostawca</th><th>Status</th><th>Data</th><th className="sa-align-right">Kwota brutto</th></tr></thead>
              <tbody>
                {data.recentPayments.slice(0, 30).map((payment: any) => (
                  <tr key={String(payment._id)}>
                    <td><span className="sa-payment-id">{payment.status === "PAID" ? <CheckCircle2 size={16} /> : <Clock3 size={16} />}<strong>{payment.reference || payment.stripeInvoiceId}</strong></span></td>
                    <td>STRIPE</td>
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
            <div><span><i className="is-good" /> Stripe Webhook</span><strong>Nasłuchuje</strong><small>Ostatnie zdarzenia: {stripeWebhooks.length}</small></div>
            <div><span><i className="is-good" /> Stripe Billing</span><strong>Aktywny</strong><small>Odnowienia i Smart Retries po stronie Stripe</small></div>
            <div><span><i className={data.failedAttempts.length ? "is-bad" : "is-good"} /> Płatności</span><strong>{data.failedAttempts.length ? "Uwaga" : "Stabilnie"}</strong><small>{data.failedAttempts.length} ostatnich błędów</small></div>
          </div>
        </section>

        <section className="sa-card sa-span-3">
          <SuperadminSectionHeader eyebrow="Diagnostyka" title="Nieudane płatności" icon={AlertCircle} />
          <div className="sa-diagnostic-list">
            {data.failedAttempts.map((payment: any) => (
              <article key={String(payment._id)}>
                <span className="sa-diagnostic-icon"><AlertCircle size={17} /></span>
                <div><strong>{payment.reference || payment.stripeInvoiceId || "PAYMENT_FAILED"}</strong><p>Stripe odnotował nieudaną próbę płatności. Szczegóły są dostępne w Dashboardzie Stripe.</p></div>
                <time>{new Date(payment.updatedAt || payment.createdAt).toLocaleString("pl-PL")}</time>
              </article>
            ))}
            {!data.failedAttempts.length ? <SuperadminEmpty>Brak błędów płatności.</SuperadminEmpty> : null}
          </div>
        </section>
      </div>
    </>
  );
}
