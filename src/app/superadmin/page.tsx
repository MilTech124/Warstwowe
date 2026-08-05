import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  Building2,
  CheckCircle2,
  CreditCard,
  PackageOpen,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import {
  SuperadminEmpty,
  SuperadminMetric,
  SuperadminPageHeader,
  SuperadminSectionHeader,
  SuperadminStatus,
} from "@/components/superadmin/SuperadminBits";
import { getSuperadminDataset } from "@/server/services/dashboardService";

export default async function SuperadminPage() {
  const data = await getSuperadminDataset();
  const activityRate = data.stats.companies ? Math.round((data.stats.active / data.stats.companies) * 100) : 0;

  return (
    <>
      <SuperadminPageHeader
        eyebrow="SaaS Control Center"
        title="Centrum operacyjne"
        description="Najważniejsze dane o sprzedaży, klientach i kondycji platformy — bez przełączania kontekstu."
        actions={<span className="sa-last-update"><i /> Dane bieżące</span>}
      />

      {data.stats.failed > 0 ? (
        <div className="sa-alert sa-alert-danger" role="alert">
          <span><AlertTriangle size={19} /></span>
          <div><strong>Wymagana interwencja</strong><p>{data.stats.failed} firm ma nieudaną płatność i może utracić dostęp do konfiguratora.</p></div>
          <Link href="/superadmin/billing">Sprawdź płatności <ArrowRight size={15} /></Link>
        </div>
      ) : (
        <div className="sa-alert sa-alert-success" role="status">
          <span><CheckCircle2 size={19} /></span>
          <div><strong>Płatności działają prawidłowo</strong><p>Brak aktywnych błędów odnowień wymagających interwencji.</p></div>
        </div>
      )}

      <section className="sa-metric-grid" aria-label="Kluczowe wskaźniki">
        <SuperadminMetric label="Wszystkie firmy" value={data.stats.companies} detail={`${data.stats.active} z aktywnym dostępem`} icon={Building2} tone="positive" />
        <SuperadminMetric label="MRR brutto" value={`${data.stats.mrr.toLocaleString("pl-PL")} zł`} detail="Subskrypcje miesięczne" icon={TrendingUp} tone="positive" />
        <SuperadminMetric label="Zamówienia" value={data.stats.orders} detail="W całej platformie" icon={ShoppingCart} />
        <SuperadminMetric label="Nieudane płatności" value={data.stats.failed} detail={data.stats.failed ? "Wymagają uwagi" : "Brak alertów"} icon={CreditCard} tone={data.stats.failed ? "danger" : "positive"} />
      </section>

      <div className="sa-overview-grid">
        <section className="sa-card sa-span-2">
          <SuperadminSectionHeader eyebrow="Ostatnie rejestracje" title="Nowe firmy" icon={Building2} action={<Link className="sa-text-link" href="/superadmin/companies">Wszystkie <ArrowRight size={14} /></Link>} />
          <div className="sa-table-wrap">
            <table className="sa-table">
              <thead><tr><th>Firma</th><th>Pakiet</th><th>Status</th><th className="sa-align-right">Akcja</th></tr></thead>
              <tbody>
                {data.companies.slice(0, 6).map((company: any) => (
                  <tr key={String(company._id)}>
                    <td><span className="sa-entity"><i>{company.displayName.slice(0, 2).toUpperCase()}</i><span><strong>{company.displayName}</strong><small>/{company.slug}</small></span></span></td>
                    <td><span className="sa-plan-tag">{company.subscription?.packageCode || "Brak"}</span></td>
                    <td><SuperadminStatus status={company.subscription?.status || "ONBOARDING"} /></td>
                    <td className="sa-align-right"><Link className="sa-row-action" href="/superadmin/companies" aria-label={`Zarządzaj firmą ${company.displayName}`}><ArrowRight size={16} /></Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data.companies.length ? <SuperadminEmpty>Brak firm. Pierwsza pojawi się po zakończeniu onboardingu.</SuperadminEmpty> : null}
          </div>
        </section>

        <section className="sa-card">
          <SuperadminSectionHeader eyebrow="Kondycja platformy" title="Stan usług" icon={Boxes} />
          <div className="sa-health-score">
            <div style={{ "--score": `${activityRate * 3.6}deg` } as React.CSSProperties}><span><strong>{activityRate}%</strong><small>aktywnych firm</small></span></div>
          </div>
          <div className="sa-health-list">
            <div><span><i className="is-good" /> Baza i API</span><strong>Online</strong></div>
            <div><span><i className="is-good" /> Harmonogram odnowień</span><strong>Co 5 min</strong></div>
            <div><span><i className={data.stats.failed ? "is-bad" : "is-good"} /> Stripe</span><strong>{data.stats.failed ? "Sprawdź" : "Stabilnie"}</strong></div>
          </div>
        </section>

        <section className="sa-card sa-span-3">
          <SuperadminSectionHeader eyebrow="Szybkie operacje" title="Zarządzaj platformą" />
          <div className="sa-command-grid">
            <Link href="/superadmin/companies"><span><Building2 /></span><div><strong>Firmy i dostęp</strong><small>Pakiety, daty, statusy i nadpisania</small></div><ArrowRight /></Link>
            <Link href="/superadmin/plans"><span><PackageOpen /></span><div><strong>Pakiety SaaS</strong><small>Ceny, funkcje i limity kont</small></div><ArrowRight /></Link>
            <Link href="/superadmin/catalog"><span><Boxes /></span><div><strong>Katalog globalny</strong><small>Producenci, płyty i bramy</small></div><ArrowRight /></Link>
          </div>
        </section>
      </div>
    </>
  );
}
