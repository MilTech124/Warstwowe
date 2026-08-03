import Link from "next/link";
import {
  ArrowRight,
  BadgeDollarSign,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  Inbox,
  PackageCheck,
  ShoppingBag,
} from "lucide-react";
import {
  EmptyState,
  MetricCard,
  PageHeading,
  StatusBadge,
} from "@/components/dashboard/DashboardBits";
import { OrdersChart } from "@/components/dashboard/OrdersChart";
import { formatPln } from "@/components/dashboard/QuoteTable";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardOverview } from "@/server/services/dashboardService";

export default async function DashboardHome({ params }: { params: Promise<{ firma: string }> }) {
  const { firma } = await params;
  const data = await getDashboardOverview(firma);
  if (!data || !data.bootstrap) return null;

  const periodEnd = data.subscription?.currentPeriodEnd
    ? new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" }).format(
        new Date(data.subscription.currentPeriodEnd),
      )
    : "—";

  return (
    <>
      <PageHeading
        eyebrow="Centrum operacyjne"
        title="Dzień dobry"
        description="Najważniejsze informacje o konfiguratorze, zamówieniach i bieżącym dostępie."
        actions={
          <Button asChild>
            <Link href={`/${firma}`} target="_blank">
              Konfigurator <ExternalLink size={15} />
            </Link>
          </Button>
        }
      />

      {!data.bootstrap.accessActive && (
        <Alert variant="destructive" className="mb-5">
          <AlertTitle>Konfigurator jest wyłączony</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>{data.bootstrap.accessMessage}</span>
            <Button asChild variant="outline" size="sm">
              <Link href={`/${firma}/dashboard/billing`}>
                Napraw płatność <ArrowRight size={15} />
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Wszystkie zamówienia"
          value={data.stats.total}
          trend={data.trend}
          hint="Brak danych porównawczych"
          icon={<ShoppingBag size={18} />}
        />
        <MetricCard
          label="Nowe do obsługi"
          value={data.stats.new}
          hint="Wymagają kontaktu"
          icon={<Inbox size={18} />}
        />
        <MetricCard
          label="Zaakceptowane"
          value={data.stats.accepted}
          hint={`${data.stats.conversion}% konwersji`}
          icon={<CheckCircle2 size={18} />}
        />
        {data.bootstrap.capabilities.pricing && data.quotedValue ? (
          <MetricCard
            label="Suma wycen"
            value={formatPln(data.quotedValue.totalGross)}
            hint={`${data.quotedValue.orderCount} wycenionych zamówień`}
            icon={<BadgeDollarSign size={18} />}
          />
        ) : (
          <MetricCard
            label="Pakiet"
            value={data.bootstrap.packageCode}
            hint={`Ważny do ${periodEnd}`}
            icon={<PackageCheck size={18} />}
          />
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <span className="text-[11px] font-semibold tracking-[0.13em] text-primary uppercase">
              Sprzedaż
            </span>
            <CardTitle>Zamówienia w czasie</CardTitle>
            <CardDescription>Rozkład liczby przesłanych konfiguracji.</CardDescription>
            <CardAction>
              <Badge variant="outline" className="gap-1.5">
                <CalendarDays size={13} /> 12 miesięcy
              </Badge>
            </CardAction>
          </CardHeader>
          <CardContent>
            <OrdersChart data={data.chart} />
          </CardContent>
        </Card>

        <Card className="gap-0">
          <CardHeader className="border-b [.border-b]:pb-5">
            <span className="text-[11px] font-semibold tracking-[0.13em] text-primary uppercase">
              Ostatnie
            </span>
            <CardTitle>Najnowsze zamówienia</CardTitle>
            <CardDescription>Sprawy oczekujące na obsługę.</CardDescription>
            <CardAction>
              <Button asChild variant="link" size="sm" className="px-0">
                <Link href={`/${firma}/dashboard/orders`}>
                  Wszystkie <ArrowRight size={14} />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="p-0">
            {data.recentOrders.length ? (
              <ul className="divide-y divide-border">
                {data.recentOrders.map((order: any) => (
                  <li key={String(order._id)}>
                    <Link
                      href={`/${firma}/dashboard/orders/${order._id}`}
                      className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none"
                    >
                      <Avatar className="size-9">
                        <AvatarFallback className="bg-primary/10 text-[11px] font-bold text-primary">
                          {order.customer.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="grid min-w-0 flex-1 leading-tight">
                        <span className="truncate text-sm font-medium">{order.customer.name}</span>
                        <span className="truncate text-xs text-muted-foreground">{order.number}</span>
                      </span>
                      <StatusBadge status={order.status} />
                      <ArrowRight
                        size={15}
                        aria-hidden="true"
                        className="shrink-0 text-muted-foreground"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={<Inbox size={26} />}
                title="Brak nowych zamówień"
                description="Nowe konfiguracje klientów pojawią się tutaj."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
