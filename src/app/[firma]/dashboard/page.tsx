import Link from "next/link";
import { ArrowRight, CalendarDays, CheckCircle2, ExternalLink, Inbox, PackageCheck, ShoppingBag } from "lucide-react";
import { MetricCard, PageHeading, StatusBadge } from "@/components/dashboard/DashboardBits";
import { getDashboardOverview } from "@/server/services/dashboardService";

export default async function DashboardHome({ params }: { params: Promise<{ firma: string }> }) {
  const { firma } = await params;
  const data = await getDashboardOverview(firma);
  if (!data || !data.bootstrap) return null;
  const periodEnd = data.subscription?.currentPeriodEnd
    ? new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" }).format(new Date(data.subscription.currentPeriodEnd))
    : "—";
  const chart = data.chart.length ? data.chart : [0];
  const max = Math.max(...chart, 1);

  return (
    <>
      <PageHeading
        eyebrow="Centrum operacyjne"
        title="Dzień dobry"
        description="Najważniejsze informacje o konfiguratorze, zamówieniach i bieżącym dostępie."
        actions={<Link className="primary-button" href={`/${firma}`} target="_blank">Konfigurator <ExternalLink size={15} /></Link>}
      />
      {!data.bootstrap.accessActive && (
        <div className="dashboard-alert danger" role="alert">
          <div><strong>Konfigurator jest wyłączony</strong><span>{data.bootstrap.accessMessage}</span></div>
          <Link href={`/${firma}/dashboard/billing`}>Napraw płatność <ArrowRight size={15} /></Link>
        </div>
      )}
      <div className="metric-grid">
        <MetricCard label="Wszystkie zamówienia" value={data.stats.total} change="+12% vs poprzedni okres" tone="up" icon={<ShoppingBag size={19} />} />
        <MetricCard label="Nowe do obsługi" value={data.stats.new} change="Wymagają kontaktu" icon={<Inbox size={19} />} />
        <MetricCard label="Zaakceptowane" value={data.stats.accepted} change={`${data.stats.conversion}% konwersji`} tone="up" icon={<CheckCircle2 size={19} />} />
        <MetricCard label="Pakiet" value={data.bootstrap.packageCode} change={`Ważny do ${periodEnd}`} icon={<PackageCheck size={19} />} />
      </div>
      <div className="dashboard-two-column">
        <section className="dashboard-card chart-card">
          <div className="card-title">
            <div><span>Sprzedaż</span><h2>Zamówienia w czasie</h2><p>Rozkład liczby przesłanych konfiguracji.</p></div>
            <span className="period-chip"><CalendarDays size={15} /> 12 miesięcy</span>
          </div>
          <div className="bar-chart" role="img" aria-label="Wykres liczby zamówień z ostatnich 12 miesięcy">
            {chart.map((value: number, index: number) => (
              <span key={index} style={{ height: `${Math.max(7, (value / max) * 100)}%` }} title={`${value} zamówień`}>
                <i>{value}</i>
              </span>
            ))}
          </div>
        </section>
        <section className="dashboard-card">
          <div className="card-title"><div><span>Ostatnie</span><h2>Najnowsze zamówienia</h2><p>Sprawy oczekujące na obsługę.</p></div><Link className="card-title-link" href={`/${firma}/dashboard/orders`}>Wszystkie <ArrowRight size={14} /></Link></div>
          <div className="compact-order-list">
            {data.recentOrders.map((order: any) => (
              <Link key={String(order._id)} href={`/${firma}/dashboard/orders/${order._id}`}>
                <span className="order-initial">{order.customer.name.slice(0, 2).toUpperCase()}</span>
                <div><strong>{order.customer.name}</strong><small>{order.number}</small></div>
                <StatusBadge status={order.status} />
                <ArrowRight className="row-arrow" size={15} aria-hidden="true" />
              </Link>
            ))}
            {!data.recentOrders.length && (
              <div className="empty-state compact">
                <Inbox size={22} />
                <strong>Brak nowych zamówień</strong>
                <span>Nowe konfiguracje klientów pojawią się tutaj.</span>
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
