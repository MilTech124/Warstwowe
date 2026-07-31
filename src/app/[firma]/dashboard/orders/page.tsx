import Link from "next/link";
import { Download, Eye, FileSearch, Plus, Search, SlidersHorizontal } from "lucide-react";
import { PageHeading, StatusBadge, orderStatusLabels } from "@/components/dashboard/DashboardBits";
import { getCompanyOrders } from "@/server/services/dashboardService";
import { getConfiguratorBootstrap } from "@/server/services/companyService";

export default async function OrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ firma: string }>;
  searchParams: Promise<{ status?: string; search?: string }>;
}) {
  const { firma } = await params;
  const query = await searchParams;
  const [orders, bootstrap] = await Promise.all([
    getCompanyOrders(firma, query),
    getConfiguratorBootstrap(firma),
  ]);
  return (
    <>
      <PageHeading
        eyebrow="Lejek sprzedaży"
        title="Zamówienia"
        description="Konfiguracje przesłane przez klientów, kontakt i historia obsługi."
        actions={
          <>
            {bootstrap?.capabilities.csvExport && <a className="secondary-button" href={`/api/companies/${firma}/orders/export`}><Download size={15} /> Eksport CSV</a>}
            <Link className="primary-button" href={`/${firma}`}><Plus size={15} /> Nowa konfiguracja</Link>
          </>
        }
      />
      <section className="dashboard-card table-card">
        <form className="table-filters">
          <label className="search-field"><Search size={17} aria-hidden="true" /><input name="search" defaultValue={query.search} aria-label="Szukaj zamówienia" placeholder="Numer, klient lub e-mail…" /></label>
          <label className="filter-select">
            <SlidersHorizontal size={16} aria-hidden="true" />
            <select name="status" defaultValue={query.status || "ALL"} aria-label="Status zamówienia">
              <option value="ALL">Wszystkie statusy</option>
              {Object.entries(orderStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <button className="secondary-button" type="submit">Filtruj</button>
        </form>
        <div className="data-table orders-table">
          <div className="table-row table-head"><span>Numer</span><span>Klient</span><span>Kontakt</span><span>Data</span><span>Status</span><span /></div>
          {orders.map((order: any) => (
            <div className="table-row" key={String(order._id)}>
              <strong data-label="Numer">{order.number}</strong>
              <span data-label="Klient">{order.customer.name}</span>
              <span data-label="Kontakt" className="contact-cell"><small>{order.customer.email}</small><small>{order.customer.phone}</small></span>
              <span data-label="Data">{new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" }).format(new Date(order.submittedAt))}</span>
              <span data-label="Status"><StatusBadge status={order.status} /></span>
              <Link className="table-action" aria-label={`Podgląd zamówienia ${order.number}`} href={`/${firma}/dashboard/orders/${order._id}`}><Eye size={16} /></Link>
            </div>
          ))}
          {!orders.length && <div className="empty-state"><FileSearch size={28} /><strong>Nie znaleziono zamówień</strong><span>Zmień kryteria wyszukiwania lub utwórz nową konfigurację.</span></div>}
        </div>
      </section>
    </>
  );
}
