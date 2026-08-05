import { redirect } from "next/navigation";
import { CalendarDays, CreditCard, ExternalLink, ShieldCheck } from "lucide-react";
import { BillingManager } from "@/components/dashboard/BillingManager";
import { EmptyState, MetricCard, PageHeading, StatusBadge } from "@/components/dashboard/DashboardBits";
import {
  assertCompanyDashboardRole,
  getCompanyPayments,
  getDashboardOverview,
} from "@/server/services/dashboardService";
import type { PackageCode } from "@/types/saas";
import { getAvailablePlans } from "@/server/services/planService";
import { reconcileStripeCheckout } from "@/server/services/stripePaymentService";
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

export default async function BillingPage({
  params,
  searchParams,
}: {
  params: Promise<{ firma: string }>;
  searchParams: Promise<{ session_id?: string; stripe?: string }>;
}) {
  const [{ firma }, query] = await Promise.all([params, searchParams]);
  const access: any = await assertCompanyDashboardRole(firma, ["OWNER"]);
  let reconciliationFailed = false;
  let reconciled = false;
  if (query.session_id && access?.company?._id) {
    try {
      const result: any = await reconcileStripeCheckout(query.session_id, access.company._id);
      reconciled = Boolean(result?.applied);
    } catch {
      reconciliationFailed = true;
    }
  }
  // Layout policzył uprawnienia, zanim rekoncyliacja zapisała płatność, więc
  // bez przeładowania trasy świeżo opłacone konto widziało jeszcze komunikat
  // „płatność nie jest potwierdzona". Przy okazji `session_id` znika z adresu.
  if (reconciled) redirect(`/${firma}/dashboard/billing?stripe=success`);

  const [overview, payments, plans] = await Promise.all([
    getDashboardOverview(firma),
    getCompanyPayments(firma),
    getAvailablePlans(),
  ]);
  if (!overview?.bootstrap) return null;

  const subscription: any = overview.subscription || {};
  const subscriptionActive = Boolean(overview.bootstrap.accessActive);
  const dateFormat = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" });
  const currency = new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" });
  const paymentMethod = subscription.paymentMethodLast4
    ? `${subscription.paymentMethodBrand || "Karta"} •••• ${subscription.paymentMethodLast4}`
    : "Zarządzaj w portalu";

  return (
    <>
      <PageHeading
        eyebrow="Finanse"
        title="Rozliczenia"
        description="Zarządzaj pakietem, okresem dostępu, fakturami i płatnościami Stripe."
      />

      {query.stripe === "success" && subscriptionActive && (
        <Alert className="mb-5">
          <AlertTitle>Płatność potwierdzona</AlertTitle>
          <AlertDescription>
            Dostęp do konfiguratora jest aktywny. Fakturę znajdziesz w historii płatności poniżej.
          </AlertDescription>
        </Alert>
      )}

      {(!subscriptionActive || reconciliationFailed) && (
        <Alert variant="destructive" className="mb-5">
          <AlertTitle>{reconciliationFailed ? "Nie udało się odświeżyć płatności" : "Płatność nie jest potwierdzona"}</AlertTitle>
          <AlertDescription>
            {reconciliationFailed
              ? "Webhook pozostaje źródłem prawdy. Odśwież stronę za chwilę."
              : "Dostęp zostanie aktywowany po bezpiecznym potwierdzeniu płatności przez Stripe."}
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
          value={subscription.currentPeriodEnd ? dateFormat.format(new Date(subscription.currentPeriodEnd)) : "—"}
          hint={`Status: ${subscription.status || "ONBOARDING"}`}
          icon={<CalendarDays size={18} />}
        />
        <MetricCard
          label="Metoda płatności"
          value={paymentMethod}
          hint="Dane płatnicze bezpiecznie przechowuje Stripe"
          icon={<ShieldCheck size={18} />}
        />
      </div>

      <div className="grid gap-4">
        <BillingManager
          slug={firma}
          currentPackage={overview.bootstrap.packageCode as PackageCode}
          subscriptionActive={subscriptionActive}
          allowCurrentCheckout={["ONBOARDING", "CANCELED", "EXPIRED", "PAYMENT_FAILED"].includes(subscription.status)}
          packageChangesDisabled={["PAST_DUE", "SUSPENDED"].includes(subscription.status)}
          plans={plans}
        />

        <Card className="gap-0 overflow-hidden py-0">
          <CardHeader className="border-b py-5">
            <span className="text-[11px] font-semibold tracking-[0.13em] text-primary uppercase">Historia</span>
            <CardTitle>Płatności i faktury</CardTitle>
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
                      <TableHead>Dokument</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment: any) => (
                      <TableRow key={String(payment._id)}>
                        <TableCell className="font-medium">
                          {payment.reference || payment.stripeInvoiceId}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {dateFormat.format(new Date(payment.createdAt))}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {currency.format(Number(payment.amountGross))}
                        </TableCell>
                        <TableCell><StatusBadge status={payment.status} /></TableCell>
                        <TableCell>
                          {payment.invoiceUrl ? (
                            <a className="inline-flex items-center gap-1 text-sm text-primary hover:underline" href={payment.invoiceUrl} target="_blank" rel="noreferrer">
                              Faktura <ExternalLink size={13} />
                            </a>
                          ) : "—"}
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
                description="Potwierdzone transakcje Stripe będą widoczne w tej sekcji."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
