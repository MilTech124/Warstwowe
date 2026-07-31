import { CalendarDays, CreditCard, ShieldCheck } from "lucide-react";
import { BillingManager } from "@/components/dashboard/BillingManager";
import { PageHeading, StatusBadge } from "@/components/dashboard/DashboardBits";
import { assertCompanyDashboardRole, getCompanyPayments, getDashboardOverview } from "@/server/services/dashboardService";
import type { PackageCode } from "@/types/saas";
import { getAvailablePlans } from "@/server/services/planService";
import { reconcileLatestCompanyPayment } from "@/server/services/paymentStatusService";

export default async function BillingPage({
  params,
  searchParams,
}: {
  params: Promise<{ firma: string }>;
  searchParams: Promise<{ payu?: string }>;
}) {
  const { firma } = await params;
  const access: any = await assertCompanyDashboardRole(firma, ["OWNER"]);
  if ((await searchParams).payu === "return" && access?.company?._id) {
    try {
      await reconcileLatestCompanyPayment(access.company._id);
    } catch {
      // The signed webhook can still complete the update asynchronously.
    }
  }
  const [overview, payments, plans] = await Promise.all([
    getDashboardOverview(firma),
    getCompanyPayments(firma),
    getAvailablePlans(),
  ]);
  if (!overview?.bootstrap) return null;
  const subscription: any = overview.subscription || {};
  return (
    <>
      <PageHeading eyebrow="Finanse" title="Rozliczenia" description="Zarządzaj pakietem, okresem dostępu oraz płatnościami obsługiwanymi przez PayU." />
      <div className="billing-summary-grid">
        <section className="dashboard-card billing-summary"><span className="catalog-icon"><CreditCard /></span><div><small>Aktualny pakiet</small><strong>{overview.bootstrap.packageCode}</strong><p>{subscription.billingMode || "RECURRING_MONTHLY"}</p></div></section>
        <section className="dashboard-card billing-summary"><span className="catalog-icon"><CalendarDays /></span><div><small>Dostęp ważny do</small><strong>{subscription.currentPeriodEnd ? new Intl.DateTimeFormat("pl-PL").format(new Date(subscription.currentPeriodEnd)) : "—"}</strong><p>Status: {subscription.status || "ACTIVE"}</p></div></section>
        <section className="dashboard-card billing-summary"><span className="catalog-icon secure"><ShieldCheck /></span><div><small>Karta PayU</small><strong>{subscription.cardMask || "Brak zapisanej maski"}</strong><p>Dane karty bezpiecznie przechowuje PayU</p></div></section>
      </div>
      <BillingManager
        slug={firma}
        currentPackage={overview.bootstrap.packageCode as PackageCode}
        plans={plans}
        cancelAtPeriodEnd={Boolean(subscription.cancelAtPeriodEnd)}
      />
      <section className="dashboard-card table-card">
        <div className="card-title"><div><span>Historia</span><h2>Płatności</h2></div></div>
        <div className="data-table">
          <div className="table-row payment-row table-head"><span>Identyfikator</span><span>Data</span><span>Kwota brutto</span><span>Status</span></div>
          {payments.map((payment: any) => <div key={String(payment._id)} className="table-row payment-row"><strong data-label="Identyfikator">{payment.extOrderId}</strong><span data-label="Data">{new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" }).format(new Date(payment.createdAt))}</span><span data-label="Kwota brutto">{Number(payment.amountGross).toFixed(2)} zł</span><span data-label="Status"><StatusBadge status={payment.status} /></span></div>)}
          {!payments.length && <div className="empty-state"><CreditCard size={27} /><strong>Brak historii płatności</strong><span>Potwierdzone transakcje PayU będą widoczne w tej sekcji.</span></div>}
        </div>
      </section>
    </>
  );
}
