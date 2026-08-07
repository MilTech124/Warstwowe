import Stripe from "stripe";
import type { BillingMode, PackageCode } from "@/types/saas";
import { applicationUrl } from "@/lib/siteUrl";

let stripeClient: Stripe | null = null;

export type StripeEnvironment = "test" | "live";

export type StripePlanCatalog = {
  version: number;
  productId: string;
  recurringMonthlyPriceId: string;
  prepaidMonthlyPriceId: string;
  prepaidSixMonthsPriceId: string;
};

export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
}

export function stripeEnvironment(): StripeEnvironment {
  return process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ? "live" : "test";
}

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_NOT_CONFIGURED");
  if (!stripeClient) {
    stripeClient = new Stripe(key, { maxNetworkRetries: 2, timeout: 20_000 });
  }
  return stripeClient;
}

// Definicja mieszka w lib/siteUrl, żeby metadane i sitemap mogły jej użyć bez
// ładowania SDK Stripe. Re-eksport zachowuje dotychczasową ścieżkę importu,
// a import lokalny — wywołania niżej w tym pliku.
export { applicationUrl };

function priceId(catalog: StripePlanCatalog, billingMode: BillingMode) {
  if (billingMode === "RECURRING_MONTHLY") return catalog.recurringMonthlyPriceId;
  if (billingMode === "PREPAID_SIX_MONTHS") return catalog.prepaidSixMonthsPriceId;
  return catalog.prepaidMonthlyPriceId;
}

export async function provisionStripePlanCatalog(plan: {
  code: PackageCode;
  name: string;
  version: number;
  monthlyGross: number;
  prepaidSixMonthsGross: number;
  stripeCatalog?: Partial<Record<StripeEnvironment, StripePlanCatalog>>;
}) {
  const stripe = getStripe();
  const environment = stripeEnvironment();
  const existing = plan.stripeCatalog?.[environment];
  if (
    existing?.version === plan.version
    && existing.productId
    && existing.recurringMonthlyPriceId
    && existing.prepaidMonthlyPriceId
    && existing.prepaidSixMonthsPriceId
  ) {
    return existing;
  }

  const productId = existing?.productId || (
    await stripe.products.create(
      {
        name: `Konfigurator Warstwowe — ${plan.name}`,
        metadata: { packageCode: plan.code },
      },
      { idempotencyKey: `product:${environment}:${plan.code}` },
    )
  ).id;
  const metadata = {
    packageCode: plan.code,
    planVersion: String(plan.version),
  };
  const amount = (value: number) => Math.round(Number(value) * 100);
  const [recurring, prepaidMonthly, prepaidSixMonths] = await Promise.all([
    stripe.prices.create(
      {
        product: productId,
        currency: "pln",
        unit_amount: amount(plan.monthlyGross),
        tax_behavior: "inclusive",
        recurring: { interval: "month" },
        metadata: { ...metadata, billingMode: "RECURRING_MONTHLY" },
      },
      { idempotencyKey: `price:${environment}:${plan.code}:${plan.version}:recurring-monthly` },
    ),
    stripe.prices.create(
      {
        product: productId,
        currency: "pln",
        unit_amount: amount(plan.monthlyGross),
        tax_behavior: "inclusive",
        metadata: { ...metadata, billingMode: "PREPAID_MONTHLY" },
      },
      { idempotencyKey: `price:${environment}:${plan.code}:${plan.version}:prepaid-monthly` },
    ),
    stripe.prices.create(
      {
        product: productId,
        currency: "pln",
        unit_amount: amount(plan.prepaidSixMonthsGross),
        tax_behavior: "inclusive",
        metadata: { ...metadata, billingMode: "PREPAID_SIX_MONTHS" },
      },
      { idempotencyKey: `price:${environment}:${plan.code}:${plan.version}:prepaid-six-months` },
    ),
  ]);

  return {
    version: plan.version,
    productId,
    recurringMonthlyPriceId: recurring.id,
    prepaidMonthlyPriceId: prepaidMonthly.id,
    prepaidSixMonthsPriceId: prepaidSixMonths.id,
  } satisfies StripePlanCatalog;
}

export async function ensureStripePrice(packageCode: PackageCode, billingMode: BillingMode) {
  const { Plan } = await import("@/server/db/models");
  const plan: any = await Plan.findOne({ code: packageCode, active: true });
  if (!plan) throw new Error("PLAN_NOT_FOUND");
  const environment = stripeEnvironment();
  const catalog = await provisionStripePlanCatalog({
    code: plan.code,
    name: plan.name,
    version: plan.version,
    monthlyGross: plan.monthlyGross,
    prepaidSixMonthsGross: plan.prepaidSixMonthsGross,
    stripeCatalog: plan.stripeCatalog,
  });
  if (plan.stripeCatalog?.[environment]?.version !== catalog.version) {
    plan.stripeCatalog = { ...(plan.stripeCatalog || {}), [environment]: catalog };
    plan.markModified("stripeCatalog");
    await plan.save();
  }
  return { plan, catalog, priceId: priceId(catalog, billingMode) };
}

async function ensureStripeCustomer(company: any, subscription: any, email: string) {
  if (subscription.stripeCustomerId) return subscription.stripeCustomerId as string;
  const customer = await getStripe().customers.create(
    {
      email,
      name: company.billing?.legalName || company.displayName,
      metadata: { companyId: String(company._id), companySlug: company.slug },
    },
    { idempotencyKey: `customer:${stripeEnvironment()}:${company._id}` },
  );
  subscription.stripeCustomerId = customer.id;
  await subscription.save();
  return customer.id;
}

export async function createStripeCheckout(input: {
  company: any;
  subscription: any;
  email: string;
  packageCode: PackageCode;
  billingMode: BillingMode;
}) {
  const stripe = getStripe();
  const { plan, priceId: selectedPriceId } = await ensureStripePrice(input.packageCode, input.billingMode);
  const customer = await ensureStripeCustomer(input.company, input.subscription, input.email);

  if (input.subscription.pendingCheckoutSessionId) {
    try {
      const pending = await stripe.checkout.sessions.retrieve(input.subscription.pendingCheckoutSessionId);
      if (
        pending.status === "open"
        && pending.url
        && pending.metadata?.packageCode === input.packageCode
        && pending.metadata?.billingMode === input.billingMode
        // Adres firmy jest wbudowany w `success_url`. Po zmianie sluga w
        // trakcie onboardingu stara sesja odesłałaby klienta na nieistniejący
        // panel, więc musi zostać wygaszona razem ze zmianą pakietu.
        && pending.metadata?.companySlug === input.company.slug
      ) return pending;
      if (pending.status === "open") await stripe.checkout.sessions.expire(pending.id);
    } catch {
      // A missing/expired Stripe session is replaced below.
    }
  }

  const revision = new Date(input.subscription.updatedAt || input.subscription.createdAt || Date.now()).getTime();
  const reference = `CHK-${input.subscription._id}-${revision}`;
  const baseMetadata = {
    companyId: String(input.company._id),
    companySlug: String(input.company.slug),
    subscriptionId: String(input.subscription._id),
    packageCode: input.packageCode,
    billingMode: input.billingMode,
    reference,
  };
  const appUrl = applicationUrl();
  const common: Stripe.Checkout.SessionCreateParams = {
    customer,
    client_reference_id: String(input.subscription._id),
    line_items: [{ price: selectedPriceId, quantity: 1 }],
    billing_address_collection: "required",
    tax_id_collection: { enabled: true },
    customer_update: { address: "auto", name: "auto" },
    metadata: baseMetadata,
    success_url: `${appUrl}/${input.company.slug}/dashboard/billing?stripe=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/onboarding?stripe=cancelled`,
    locale: "pl",
  };

  let params: Stripe.Checkout.SessionCreateParams;
  if (input.billingMode === "RECURRING_MONTHLY") {
    params = {
      ...common,
      mode: "subscription",
      payment_method_collection: "always",
      subscription_data: {
        metadata: baseMetadata,
        ...(!input.subscription.trialUsedAt ? { trial_period_days: 7 } : {}),
      },
    };
  } else {
    params = {
      ...common,
      mode: "payment",
      invoice_creation: { enabled: true, invoice_data: { metadata: baseMetadata } },
      payment_intent_data: { metadata: baseMetadata },
    };
  }

  const session = await stripe.checkout.sessions.create(
    params,
    {
      // Slug wchodzi do klucza razem z rewizją: te same parametry muszą dać tę
      // samą sesję, ale zmiana adresu firmy zmienia `success_url`, a powtórzenie
      // klucza z innymi parametrami kończy się błędem idempotencji Stripe.
      idempotencyKey:
        `checkout:${stripeEnvironment()}:${input.subscription._id}:${revision}:${input.company.slug}`,
    },
  );
  if (!session.url) throw new Error("STRIPE_CHECKOUT_URL_MISSING");
  input.subscription.pendingCheckoutSessionId = session.id;
  input.subscription.packageCode = input.packageCode;
  input.subscription.billingMode = input.billingMode;
  input.subscription.amountGross = input.billingMode === "PREPAID_SIX_MONTHS"
    ? Number(plan.prepaidSixMonthsGross)
    : Number(plan.monthlyGross);
  input.subscription.stripePriceId = selectedPriceId;
  await input.subscription.save();
  return session;
}

export async function createStripePortalSession(customerId: string, companySlug: string) {
  return getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${applicationUrl()}/${companySlug}/dashboard/billing`,
  });
}

export function constructStripeEvent(rawBody: string | Buffer, signature: string) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET_MISSING");
  return getStripe().webhooks.constructEvent(rawBody, signature, secret);
}
