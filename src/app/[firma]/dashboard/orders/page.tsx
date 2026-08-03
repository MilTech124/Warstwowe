import Link from "next/link";
import { Download, Eye, FileSearch, Plus } from "lucide-react";
import {
  EmptyState,
  PageHeading,
  StatusBadge,
  orderStatusLabels,
} from "@/components/dashboard/DashboardBits";
import { OrdersFilters } from "@/components/dashboard/OrdersFilters";
import { Pagination } from "@/components/dashboard/Pagination";
import { formatPln } from "@/components/dashboard/QuoteTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getCompanyOrders } from "@/server/services/dashboardService";
import { getConfiguratorBootstrap } from "@/server/services/companyService";

export default async function OrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ firma: string }>;
  searchParams: Promise<{ status?: string; search?: string; page?: string }>;
}) {
  const { firma } = await params;
  const query = await searchParams;
  const page = Number.parseInt(query.page ?? "1", 10) || 1;

  const [orders, bootstrap] = await Promise.all([
    getCompanyOrders(firma, { status: query.status, search: query.search, page }),
    getConfiguratorBootstrap(firma),
  ]);

  const dateFormat = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" });
  const showPrices = Boolean(bootstrap?.capabilities.pricing);

  return (
    <>
      <PageHeading
        eyebrow="Lejek sprzedaży"
        title="Zamówienia"
        description="Konfiguracje przesłane przez klientów, kontakt i historia obsługi."
        actions={
          <>
            {bootstrap?.capabilities.csvExport && (
              <Button asChild variant="outline">
                <a href={`/api/companies/${firma}/orders/export`}>
                  <Download size={15} /> Eksport CSV
                </a>
              </Button>
            )}
            <Button asChild>
              <Link href={`/${firma}`}>
                <Plus size={15} /> Nowa konfiguracja
              </Link>
            </Button>
          </>
        }
      />

      <Card className="gap-0 overflow-hidden py-0">
        <CardContent className="border-b p-4">
          <OrdersFilters
            defaultSearch={query.search}
            defaultStatus={query.status ?? "ALL"}
            statuses={orderStatusLabels}
          />
        </CardContent>

        {orders.rows.length ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Numer</TableHead>
                  <TableHead>Klient</TableHead>
                  <TableHead className="hidden md:table-cell">Kontakt</TableHead>
                  <TableHead className="hidden sm:table-cell">Data</TableHead>
                  {showPrices && <TableHead className="text-right">Wartość</TableHead>}
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12 text-right">
                    <span className="sr-only">Akcje</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.rows.map((order: any) => (
                  <TableRow key={String(order._id)}>
                    <TableCell className="font-semibold whitespace-nowrap">{order.number}</TableCell>
                    <TableCell className="max-w-48 truncate">{order.customer.name}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="grid leading-tight">
                        <span className="truncate text-xs">{order.customer.email}</span>
                        <span className="text-xs text-muted-foreground">{order.customer.phone}</span>
                      </span>
                    </TableCell>
                    <TableCell className="hidden whitespace-nowrap text-muted-foreground sm:table-cell">
                      {dateFormat.format(new Date(order.submittedAt))}
                    </TableCell>
                    {showPrices && (
                      <TableCell className="text-right tabular-nums whitespace-nowrap">
                        {order.quote ? (
                          formatPln(order.quote.totalGross)
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell>
                      <StatusBadge status={order.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="icon">
                        <Link
                          href={`/${firma}/dashboard/orders/${order._id}`}
                          aria-label={`Podgląd zamówienia ${order.number}`}
                        >
                          <Eye size={16} />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <EmptyState
            icon={<FileSearch size={28} />}
            title="Nie znaleziono zamówień"
            description="Zmień kryteria wyszukiwania lub utwórz nową konfigurację."
            action={
              <Button asChild variant="outline" size="sm">
                <Link href={`/${firma}`}>Otwórz konfigurator</Link>
              </Button>
            }
          />
        )}

        {orders.pageCount > 1 && (
          <CardFooter className="justify-between border-t py-4">
            <span className="text-xs text-muted-foreground">
              {orders.total} zamówień · strona {orders.page} z {orders.pageCount}
            </span>
            <Pagination page={orders.page} pageCount={orders.pageCount} />
          </CardFooter>
        )}
      </Card>
    </>
  );
}
