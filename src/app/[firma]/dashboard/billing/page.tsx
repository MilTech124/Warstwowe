import { CalendarDays, CreditCard, ShieldCheck } from "lucide-react";
import { BillingManager } from "@/components/dashboard/BillingManager";
import { EmptyState, MetricCard, PageHeading, StatusBadge } from "@/components/dashboard/DashboardBits";
import {
  assertCompanyDashboardRole,
  getCompanyPayments,
  getDashboardOverview,
} from "@/server/services/dashboardService";
import type { PackageCode } from "@/types/saas";
import { getAvailablePlans } from "@/server/services/planService";
import { reconcileLatestCompanyPayment } from "@/server/services/paymentStatusService";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function BillingPage({ params }: { params: Promise<{ firma: string }> }) {
  const { firma } = await params;
  const access: any = await assertCompanyDashboardRole(firma, ["OWNER"]);

  let reconciliationFailed = false;
  if (access?.company?._id) {
    try {
      await reconcileLatestCompanyPayment(access.company._id);
    } catch {
      reconciliationFailed = true;
    }
  }

  const [overview, payments, plans] = await Promise.all([
    getDashboardOverview(firma),
    getCompanyPayments(firma),
    getAvailablePlans(),
  ]);
  if (!overview?.bootstrap) return null;

  const subscription: any = overview.subscription || {};
  const subscriptionActive = ["ACTIVE", "TRIALING"].includes(subscription.status);
  const dateFormat = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" });
  const currency = new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" });

  return (
    <>
      <PageHeading
        eyebrow="Finanse"
        title="Rozliczenia"
        description="Zarządzaj pakietem, okresem dostępu oraz płatnościami obsługiwanymi przez PayU."
      />

      {!subscriptionActive && (
        <Alert variant="destructive" className="mb-5">
          <AlertTitle>Płatność nie jest potwierdzona</AlertTitle>
          <AlertDescription>
            {reconciliationFailed
              ? "Nie udało się teraz sprawdzić płatności w PayU. Spróbuj ponownie za chwilę."
              : "Pakiet jest wybrany, ale płatność nie ma jeszcze potwierdzonego statusu COMPLETED."}
          </AlertDescription>
        </Alert>
      )}

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label={subscriptionActive ? "Aktywny pakiet" : "Wybrany pakiet"}
          value={overview.bootstrap.packageCode}
          hint={subscription.billingMode || "RECURRING_MONTHLY"}
          icon={<CreditCard size={18} />}
        />
        <MetricCard
          label="Dostęp ważny do"
          value={
            subscription.currentPeriodEnd
              ? dateFormat.format(new Date(subscription.currentPeriodEnd))
              : "—"
          }
          hint={`Status: ${subscription.status || "ACTIVE"}`}
          icon={<CalendarDays size={18} />}
        />
        <MetricCard
          label="Karta PayU"
          value={subscription.cardMask || "Brak maski"}
          hint="Dane karty bezpiecznie przechowuje PayU"
          icon={<ShieldCheck size={18} />}
        />
      </div>

      <div className="grid gap-4">
        <BillingManager
          slug={firma}
          currentPackage={overview.bootstrap.packageCode as PackageCode}
          subscriptionActive={subscriptionActive}
          plans={plans}
          cancelAtPeriodEnd={Boolean(subscription.cancelAtPeriodEnd)}
        />

        <Card className="gap-0 overflow-hidden py-0">
          <CardHeader className="border-b py-5">
            <span className="text-[11px] font-semibold tracking-[0.13em] text-primary uppercase">
              Historia
            </span>
            <CardTitle>Płatności</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {payments.length ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Identyfikator</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Kwota brutto</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment: any) => (
                      <TableRow key={String(payment._id)}>
                        <TableCell className="font-medium">{payment.extOrderId}</TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {dateFormat.format(new Date(payment.createdAt))}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {currency.format(Number(payment.amountGross))}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={payment.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <EmptyState
                icon={<CreditCard size={27} />}
                title="Brak historii płatności"
                description="Potwierdzone transakcje PayU będą widoczne w tej sekcji."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
