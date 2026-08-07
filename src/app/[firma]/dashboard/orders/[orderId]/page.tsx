import Link from "next/link";
import { ArrowLeft, Clock3, Eye, FileDown, FileText, Mail, MapPin, Phone, RefreshCw, UserRound } from "lucide-react";
import { notFound } from "next/navigation";
import { EmptyState, PageHeading, StatusBadge } from "@/components/dashboard/DashboardBits";
import { OrderManager } from "@/components/dashboard/OrderManager";
import { OrderConfigurationDetails } from "@/components/dashboard/OrderConfigurationDetails";
import { getCompanyOrder, getCompanyTeam } from "@/server/services/dashboardService";
import { getConfiguratorBootstrap } from "@/server/services/companyService";
import { orderPdfGenerationAvailable } from "@/domain/orderPdf";
import { quoteWithManualPrice } from "@/domain/pricing/manualPrice";
import { QuoteIncompleteBadge, QuoteTable } from "@/components/dashboard/QuoteTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

function ContactRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span aria-hidden="true" className="mt-0.5 text-muted-foreground">
        {icon}
      </span>
      <span className="grid min-w-0 leading-tight">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="truncate text-sm font-medium">{children}</span>
      </span>
    </div>
  );
}

export default async function OrderDetailsPage({
  params,
}: {
  params: Promise<{ firma: string; orderId: string }>;
}) {
  const { firma, orderId } = await params;
  const [data, team, bootstrap] = await Promise.all([
    getCompanyOrder(firma, orderId),
    getCompanyTeam(firma),
    getConfiguratorBootstrap(firma),
  ]);
  if (!data) notFound();
  const order = data.order as any;
  const effectiveQuote = quoteWithManualPrice(order.quote ?? null, order.manualPrice ?? null);
  const canGeneratePdf = orderPdfGenerationAvailable({
    readOnly: data.readOnly,
    demo: bootstrap?.company.id === "demo-company",
    accessActive: Boolean(bootstrap?.accessActive),
    capability: Boolean(bootstrap?.capabilities.orderPdf),
  });

  return (
    <>
      <Button asChild variant="link" size="sm" className="mb-2 px-0">
        <Link href={`/${firma}/dashboard/orders`}>
          <ArrowLeft size={15} /> Wróć do zamówień
        </Link>
      </Button>

      <PageHeading
        eyebrow="Zamówienie"
        title={order.number}
        description={`Przesłano ${formatDate(order.submittedAt)}`}
        actions={(
          <div className="flex flex-wrap items-center justify-end gap-2">
            <StatusBadge status={order.status} />
            {order.pdfBlobPath && (
              <Button asChild variant="outline" size="sm">
                <a href={`/api/companies/${firma}/orders/${orderId}/pdf`}>
                  <FileDown size={15} /> Pobierz PDF
                </a>
              </Button>
            )}
            {canGeneratePdf && (
              <Button asChild size="sm">
                <Link href={`/${firma}/dashboard/orders/${orderId}/preview?generatePdf=1`}>
                  {order.pdfBlobPath ? <RefreshCw size={15} /> : <FileText size={15} />}
                  {order.pdfBlobPath ? "Wygeneruj ponownie" : "Generuj PDF"}
                </Link>
              </Button>
            )}
          </div>
        )}
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <span className="text-[11px] font-semibold tracking-[0.13em] text-primary uppercase">
                Klient
              </span>
              <CardTitle>Dane kontaktowe</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <ContactRow icon={<UserRound size={16} />} label="Imię i nazwisko / firma">
                {order.customer.name}
              </ContactRow>
              <ContactRow icon={<Mail size={16} />} label="E-mail">
                <a href={`mailto:${order.customer.email}`} className="hover:underline">
                  {order.customer.email}
                </a>
              </ContactRow>
              <ContactRow icon={<Phone size={16} />} label="Telefon">
                <a href={`tel:${order.customer.phone}`} className="hover:underline">
                  {order.customer.phone}
                </a>
              </ContactRow>
              {order.customer.address && (
                <ContactRow icon={<MapPin size={16} />} label="Adres">
                  {order.customer.address}
                </ContactRow>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <span className="text-[11px] font-semibold tracking-[0.13em] text-primary uppercase">
                Specyfikacja zamówienia
              </span>
              <CardTitle>Konfiguracja obiektu</CardTitle>
              <CardDescription>
                Komplet parametrów zapisanych w chwili wysłania zamówienia.
              </CardDescription>
              <CardAction>
                <Button asChild size="sm">
                  <Link href={`/${firma}/dashboard/orders/${orderId}/preview`}>
                    <Eye size={15} /> Zobacz konfigurację 3D
                  </Link>
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <OrderConfigurationDetails
                snapshot={order.configurationSnapshot}
                catalogVersion={order.catalogVersion}
                settingsVersion={order.settingsVersion}
              />
            </CardContent>
          </Card>

          {effectiveQuote && (
            <Card>
              <CardHeader>
                <span className="text-[11px] font-semibold tracking-[0.13em] text-primary uppercase">
                  Wycena
                </span>
                <CardTitle>Zestawienie kosztów</CardTitle>
                <CardDescription>
                  Ceny obowiązujące w chwili złożenia zamówienia. Późniejsze zmiany cennika ich nie
                  ruszają.
                </CardDescription>
                <CardAction className="flex flex-wrap items-center gap-2">
                  {order.priceListVersion != null && (
                    <Badge variant="secondary">Cennik v{order.priceListVersion}</Badge>
                  )}
                  {order.manualPrice && <Badge>Korekta ręczna</Badge>}
                  <QuoteIncompleteBadge quote={effectiveQuote as never} />
                </CardAction>
              </CardHeader>
              <CardContent>
                {order.manualPrice?.reason && (
                  <p className="mb-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
                    Powód korekty: {order.manualPrice.reason}
                  </p>
                )}
                <QuoteTable quote={effectiveQuote as never} />
              </CardContent>
            </Card>
          )}

          <Card className="gap-0">
            <CardHeader className="border-b [.border-b]:pb-5">
              <span className="text-[11px] font-semibold tracking-[0.13em] text-primary uppercase">
                Historia
              </span>
              <CardTitle>Aktywność zamówienia</CardTitle>
              <CardDescription>Chronologiczny zapis zmian i notatek.</CardDescription>
              <CardAction>
                <span
                  aria-hidden="true"
                  className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary"
                >
                  <Clock3 size={18} />
                </span>
              </CardAction>
            </CardHeader>
            <CardContent className="p-0">
              {data.events.length ? (
                <ol className="divide-y divide-border">
                  {data.events.map((event: any) => (
                    <li key={String(event._id)} className="flex gap-3 px-5 py-3.5">
                      <span
                        aria-hidden="true"
                        className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
                      />
                      <span className="grid min-w-0 gap-0.5 leading-tight">
                        <span className="text-sm font-medium">
                          {event.type.replaceAll("_", " ")}
                        </span>
                        {event.note && (
                          <span className="text-sm text-muted-foreground text-pretty">
                            {event.note}
                          </span>
                        )}
                        <time
                          dateTime={new Date(event.createdAt).toISOString()}
                          className="text-xs text-muted-foreground"
                        >
                          {formatDate(event.createdAt)}
                        </time>
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <EmptyState
                  icon={<Clock3 size={24} />}
                  title="Brak zdarzeń"
                  description="Zmiany statusu i notatki pojawią się tutaj."
                />
              )}
            </CardContent>
          </Card>

        </div>

        {data.readOnly ? (
          <Card>
            <CardHeader>
              <span className="text-[11px] font-semibold tracking-[0.13em] text-primary uppercase">
                Nadzór
              </span>
              <CardTitle>Widok tylko do odczytu</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Działania na zamówieniu są wyłączone w trybie superadmina.
              </p>
            </CardContent>
          </Card>
        ) : (
          <OrderManager
            slug={firma}
            orderId={orderId}
            currentStatus={order.status}
            currentAssignee={order.assignedClerkUserId}
            team={team as any[]}
            automaticTotalGross={bootstrap?.capabilities.pricing ? order.quote?.totalGross ?? null : null}
            currentManualPrice={order.manualPrice ?? null}
          />
        )}
      </div>
    </>
  );
}
