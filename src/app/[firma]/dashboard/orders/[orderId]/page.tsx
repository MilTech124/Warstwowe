import Link from "next/link";
import { ArrowLeft, Box, Clock3, FileText, Mail, PackageCheck, Phone, UserRound } from "lucide-react";
import { notFound } from "next/navigation";
import { PageHeading, StatusBadge } from "@/components/dashboard/DashboardBits";
import { OrderManager } from "@/components/dashboard/OrderManager";
import { getCompanyOrder, getCompanyTeam } from "@/server/services/dashboardService";

function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default async function OrderDetailsPage({
  params,
}: {
  params: Promise<{ firma: string; orderId: string }>;
}) {
  const { firma, orderId } = await params;
  const [data, team] = await Promise.all([getCompanyOrder(firma, orderId), getCompanyTeam(firma)]);
  if (!data) notFound();
  const order = data.order as any;

  return (
    <>
      <Link className="back-link" href={`/${firma}/dashboard/orders`}><ArrowLeft size={15} /> Wróć do zamówień</Link>
      <PageHeading
        eyebrow="Zamówienie"
        title={order.number}
        description={`Przesłano ${formatDate(order.submittedAt)}`}
        actions={<StatusBadge status={order.status} />}
      />
      <div className="order-detail-layout">
        <div className="order-detail-main">
          <section className="dashboard-card order-contact-card">
            <div className="card-title"><div><span>Klient</span><h2>Dane kontaktowe</h2></div></div>
            <div className="contact-grid">
              <div><UserRound size={16} /><span><small>Imię i nazwisko / firma</small><strong>{order.customer.name}</strong></span></div>
              <div><Mail size={16} /><span><small>E-mail</small><a href={`mailto:${order.customer.email}`}>{order.customer.email}</a></span></div>
              <div><Phone size={16} /><span><small>Telefon</small><a href={`tel:${order.customer.phone}`}>{order.customer.phone}</a></span></div>
            </div>
          </section>
          <section className="dashboard-card order-snapshot-card">
            <div className="card-title">
              <div><span>Snapshot v{order.configurationSnapshot?.schemaVersion || "—"}</span><h2>Konfiguracja obiektu</h2></div>
              <span className="card-heading-icon"><Box size={20} /></span>
            </div>
            <div className="snapshot-summary">
              <article><span>Preset</span><strong>{order.configurationSnapshot?.presetId || "Konfiguracja własna"}</strong></article>
              <article><span>Wymiary</span><strong>{Object.values(order.configurationSnapshot?.dimensions || {}).join(" × ") || "—"}</strong></article>
              <article><span>Wersja katalogu</span><strong>{order.catalogVersion || 1}</strong></article>
              <article><span>Wersja ustawień</span><strong>{order.settingsVersion}</strong></article>
            </div>
            <details className="snapshot-json">
              <summary><PackageCheck size={16} /> Pełny snapshot konfiguracji</summary>
              <pre>{JSON.stringify(order.configurationSnapshot, null, 2)}</pre>
            </details>
          </section>
          <section className="dashboard-card">
            <div className="card-title"><div><span>Historia</span><h2>Aktywność zamówienia</h2><p>Chronologiczny zapis zmian i notatek.</p></div><span className="card-heading-icon"><Clock3 size={19} /></span></div>
            <div className="order-timeline">
              {data.events.map((event: any) => (
                <div key={String(event._id)}>
                  <i />
                  <span>
                    <strong>{event.type.replaceAll("_", " ")}</strong>
                    {event.note && <p>{event.note}</p>}
                    <small>{formatDate(event.createdAt)}</small>
                  </span>
                </div>
              ))}
            </div>
          </section>
          {order.pdfBlobPath && (
            <a className="secondary-button" href={`/api/companies/${firma}/orders/${orderId}/pdf`}>
              <FileText size={15} /> Pobierz PDF zamówienia
            </a>
          )}
        </div>
        {data.readOnly ? (
          <section className="dashboard-card order-manager">
            <div className="card-title"><div><span>Nadzór</span><h2>Widok tylko do odczytu</h2></div></div>
            <p className="muted-copy">Działania na zamówieniu są wyłączone w trybie superadmina.</p>
          </section>
        ) : (
          <OrderManager
            slug={firma}
            orderId={orderId}
            currentStatus={order.status}
            currentAssignee={order.assignedClerkUserId}
            team={team as any[]}
          />
        )}
      </div>
    </>
  );
}
