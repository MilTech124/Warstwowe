import type Stripe from "stripe";
import { addBillingPeriod } from "@/domain/plans";
import { mapStripeSubscriptionStatus, verifyStripeAmount } from "@/domain/stripeStatus";
import { writeAudit } from "@/server/audit";
import { Company, Payment, Subscription } from "@/server/db/models";
import { getStripe } from "@/server/stripe/client";
import type { BillingMode, PackageCode } from "@/types/saas";

const DAY_MS = 86_400_000;

function objectId(value: unknown): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : String((value as any).id || "") || null;
}

function dateFromUnix(value: unknown) {
  return typeof value === "number" ? new Date(value * 1000) : undefined;
}

function subscriptionPeriod(stripeSubscription: any) {
  const item = stripeSubscription?.items?.data?.[0];
  return {
    start: dateFromUnix(item?.current_period_start || stripeSubscription?.current_period_start),
    end: dateFromUnix(item?.current_period_end || stripeSubscription?.current_period_end),
  };
}

async function findLocalSubscription(metadata: any, stripeSubscriptionId?: string | null) {
  if (metadata?.subscriptionId) {
    const byId = await Subscription.findById(metadata.subscriptionId);
    if (byId && (!metadata.companyId || String(byId.companyId) === metadata.companyId)) return byId;
  }
  if (stripeSubscriptionId) return Subscription.findOne({ stripeSubscriptionId });
  return null;
}

async function auditPaymentMismatch(subscription: any, reason: string, details: unknown) {
  await writeAudit({
    companyId: subscription.companyId,
    actorType: "SYSTEM",
    action: "payment.amount_mismatch",
    entityType: "Subscription",
    entityId: String(subscription._id),
    after: { provider: "STRIPE", reason, details },
  });
}

async function syncBillingDetails(session: any, companyId: unknown) {
  const details = session.customer_details;
  if (!details) return;
  const address = details.address
    ? [details.address.line1, details.address.line2, details.address.postal_code, details.address.city, details.address.country]
      .filter(Boolean).join(", ")
    : undefined;
  const taxId = details.tax_ids?.[0]?.value;
  await Company.updateOne(
    { _id: companyId },
    {
      $set: {
        ...(details.name ? { "billing.legalName": details.name } : {}),
        ...(details.email ? { "billing.email": details.email } : {}),
        ...(address ? { "billing.address": address } : {}),
        ...(taxId ? { "billing.taxId": taxId } : {}),
      },
    },
  );
}

async function upsertCheckoutPayment(session: any, subscription: any, status: string) {
  const metadata = session.metadata || {};
  const reference = metadata.reference || `CHK-${session.id}`;
  const paymentIntentId = objectId(session.payment_intent);
  const invoiceId = objectId(session.invoice);
  let invoice: any = null;
  if (invoiceId) {
    try {
      invoice = await getStripe().invoices.retrieve(invoiceId);
    } catch {
      // The webhook can still attach invoice details when Stripe finishes it.
    }
  }
  const amountGross = Number(session.amount_total || 0) / 100;
  const now = new Date();
  const billingMode = (metadata.billingMode || subscription.billingMode) as BillingMode;

  // Ta sama sesja Checkout dociera dwiema drogami: webhookiem i rekoncyliacją
  // ze strony powrotnej Stripe. Okres jest więc przypinany do wiersza płatności
  // — powtórka odtwarza te same daty zamiast doliczać kolejny miesiąc.
  const existing: any = await Payment.findOne({ reference }).lean();
  const settled = existing?.status === "PAID" && existing.periodStart && existing.periodEnd;
  const currentEnd = subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : null;
  const periodStart = settled
    ? new Date(existing.periodStart)
    : currentEnd && currentEnd > now ? currentEnd : now;
  const periodEnd = settled ? new Date(existing.periodEnd) : addBillingPeriod(periodStart, billingMode);
  await Payment.findOneAndUpdate(
    { reference },
    {
      $set: {
        provider: "STRIPE",
        companyId: subscription.companyId,
        subscriptionId: subscription._id,
        reference,
        stripeCheckoutSessionId: session.id,
        ...(paymentIntentId ? { stripePaymentIntentId: paymentIntentId } : {}),
        ...(invoiceId ? { stripeInvoiceId: invoiceId } : {}),
        ...(invoice?.number ? { invoiceNumber: invoice.number } : {}),
        ...(invoice?.hosted_invoice_url ? { invoiceUrl: invoice.hosted_invoice_url } : {}),
        status,
        amountGross,
        catalogAmountGross: subscription.amountGross,
        packageCode: metadata.packageCode || subscription.packageCode,
        currency: String(session.currency || "pln").toUpperCase(),
        billingMode,
        periodStart,
        periodEnd,
        rawStatus: session,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return { periodStart, periodEnd, billingMode };
}

async function applyCheckoutSession(session: any, forcedStatus?: "PAID" | "FAILED" | "CANCELED") {
  const metadata = session.metadata || {};
  const stripeSubscriptionId = objectId(session.subscription);
  const subscription: any = await findLocalSubscription(metadata, stripeSubscriptionId);
  if (!subscription) return { applied: false, reason: "SUBSCRIPTION_NOT_FOUND" };

  if (session.id !== subscription.pendingCheckoutSessionId && session.status !== "complete") {
    return { applied: false, reason: "STALE_CHECKOUT_SESSION" };
  }
  await syncBillingDetails(session, subscription.companyId);

  if (session.mode === "subscription" && stripeSubscriptionId && session.status === "complete") {
    const stripeSubscription = await getStripe().subscriptions.retrieve(stripeSubscriptionId, {
      expand: ["default_payment_method", "items.data.price"],
    });
    subscription.stripeSubscriptionId = stripeSubscriptionId;
    subscription.pendingCheckoutSessionId = undefined;
    subscription.trialUsedAt = subscription.trialUsedAt || new Date();
    await subscription.save();
    return applyStripeSubscription(stripeSubscription as any);
  }

  const status = forcedStatus || (session.payment_status === "paid" ? "PAID" : "PENDING");
  const expected = Number(subscription.amountGross);
  if (status === "PAID") {
    const amount = verifyStripeAmount({
      expectedGross: expected,
      receivedMinor: session.amount_total,
      currency: session.currency,
    });
    if (!amount.ok) {
      await auditPaymentMismatch(subscription, amount.reason, amount);
      return { applied: false, reason: amount.reason };
    }
  }
  const paymentPeriod = await upsertCheckoutPayment(session, subscription, status);
  if (status === "PAID") {
    const packageCode = metadata.packageCode as PackageCode;
    const startsLater = paymentPeriod.periodStart.getTime() > Date.now() + 60_000;
    if (startsLater && packageCode !== subscription.packageCode) {
      subscription.scheduledPackageCode = packageCode;
      subscription.scheduledPackageStartsAt = paymentPeriod.periodStart;
    } else if (packageCode) {
      subscription.packageCode = packageCode;
      subscription.scheduledPackageCode = undefined;
      subscription.scheduledPackageStartsAt = undefined;
    }
    subscription.status = "ACTIVE";
    subscription.currentPeriodStart = subscription.currentPeriodStart || paymentPeriod.periodStart;
    subscription.currentPeriodEnd = paymentPeriod.periodEnd;
    subscription.lastPaymentAt = new Date();
    subscription.pendingCheckoutSessionId = undefined;
  } else if (status === "CANCELED" && session.id === subscription.pendingCheckoutSessionId) {
    subscription.pendingCheckoutSessionId = undefined;
  }
  await subscription.save();
  return { applied: true, status };
}

export async function applyStripeSubscription(stripeSubscription: any) {
  const subscription: any = await findLocalSubscription(
    stripeSubscription.metadata || {},
    stripeSubscription.id,
  );
  if (!subscription) return { applied: false, reason: "SUBSCRIPTION_NOT_FOUND" };
  const previousStatus = subscription.status;
  const period = subscriptionPeriod(stripeSubscription);
  const item = stripeSubscription.items?.data?.[0];
  const price = item?.price;
  const packageCode = price?.metadata?.packageCode as PackageCode | undefined;
  const paymentMethod = stripeSubscription.default_payment_method;

  subscription.provider = "STRIPE";
  subscription.stripeSubscriptionId = stripeSubscription.id;
  subscription.stripeCustomerId = objectId(stripeSubscription.customer) || subscription.stripeCustomerId;
  subscription.stripePriceId = price?.id || subscription.stripePriceId;
  subscription.stripeScheduleId = objectId(stripeSubscription.schedule) || undefined;
  subscription.status = mapStripeSubscriptionStatus(stripeSubscription.status);
  subscription.cancelAtPeriodEnd = Boolean(stripeSubscription.cancel_at_period_end);
  if (period.start) subscription.currentPeriodStart = period.start;
  if (period.end) subscription.currentPeriodEnd = period.end;
  if (stripeSubscription.trial_end) subscription.trialEndsAt = dateFromUnix(stripeSubscription.trial_end);
  if (stripeSubscription.status !== "trialing") subscription.trialEndsAt = undefined;
  if (packageCode) subscription.packageCode = packageCode;
  if (price?.unit_amount != null) subscription.amountGross = Number(price.unit_amount) / 100;
  if (paymentMethod && typeof paymentMethod !== "string" && paymentMethod.card) {
    subscription.paymentMethodBrand = paymentMethod.card.brand;
    subscription.paymentMethodLast4 = paymentMethod.card.last4;
  }
  if (subscription.status === "ACTIVE") {
    subscription.graceEndsAt = undefined;
    subscription.dunningAttempt = 0;
    subscription.nextRetryAt = undefined;
  } else if (subscription.status === "PAST_DUE" && !subscription.graceEndsAt) {
    subscription.graceEndsAt = new Date(Date.now() + 7 * DAY_MS);
  }
  await subscription.save();
  if (previousStatus !== subscription.status) {
    await writeAudit({
      companyId: subscription.companyId,
      actorType: "SYSTEM",
      action: `subscription.${String(subscription.status).toLowerCase()}`,
      entityType: "Subscription",
      entityId: String(subscription._id),
      before: { status: previousStatus },
      after: { status: subscription.status, currentPeriodEnd: subscription.currentPeriodEnd },
    });
  }
  return { applied: true, status: subscription.status };
}

function invoiceSubscriptionId(invoice: any) {
  return objectId(invoice.parent?.subscription_details?.subscription || invoice.subscription);
}

async function applyInvoice(invoice: any, paid: boolean) {
  const stripeSubscriptionId = invoiceSubscriptionId(invoice);
  const metadata = invoice.parent?.subscription_details?.metadata || invoice.metadata || {};
  let subscription: any = await findLocalSubscription(metadata, stripeSubscriptionId);
  if (!subscription) return { applied: false, reason: "SUBSCRIPTION_NOT_FOUND" };
  const billingMode = (metadata.billingMode || subscription.billingMode) as BillingMode;
  if (billingMode !== "RECURRING_MONTHLY") {
    // Checkout is the sole entitlement trigger for one-time access. Invoice
    // events only enrich the same payment row and must never extend it twice.
    await Payment.updateOne(
      { reference: metadata.reference },
      {
        $set: {
          stripeInvoiceId: invoice.id,
          invoiceNumber: invoice.number || undefined,
          invoiceUrl: invoice.hosted_invoice_url || undefined,
          rawStatus: invoice,
        },
      },
    );
    return { applied: true, status: "INVOICE_ATTACHED" };
  }
  let syncedFromStripe = false;
  if (stripeSubscriptionId) {
    const providerSubscription = await getStripe().subscriptions.retrieve(stripeSubscriptionId, {
      expand: ["default_payment_method", "items.data.price"],
    });
    await applyStripeSubscription(providerSubscription as any);
    subscription = await Subscription.findById(subscription._id);
    syncedFromStripe = true;
  }
  // O tym, czy faktura wymaga sprawdzenia kwoty, decyduje sama faktura, a nie
  // lokalny status. Stripe potrafi dostarczyć `invoice.paid` za zerową fakturę
  // trialową ZANIM dojdzie `customer.subscription.created`; przy wcześniejszej
  // wersji (status musiał już być TRIALING) kończyło się to fałszywym
  // AMOUNT_MISMATCH — wpisem w audycie wyglądającym jak próba manipulacji —
  // i brakiem wiersza płatności za trial.
  const zeroAmountInvoice = Number(invoice.amount_paid || 0) === 0 && Number(invoice.total ?? invoice.amount_due ?? 0) === 0;
  const isTrialInvoice = zeroAmountInvoice || (
    Number(invoice.amount_paid || 0) === 0 && subscription.status === "TRIALING"
  );
  if (paid && !isTrialInvoice) {
    const amount = verifyStripeAmount({
      expectedGross: Number(subscription.amountGross),
      receivedMinor: invoice.amount_paid,
      currency: invoice.currency,
    });
    if (!amount.ok) {
      await auditPaymentMismatch(subscription, amount.reason, amount);
      return { applied: false, reason: amount.reason };
    }
  }
  const line = invoice.lines?.data?.find((entry: any) => entry.parent?.subscription_item_details)
    || invoice.lines?.data?.[0];
  const periodStart = dateFromUnix(line?.period?.start);
  const periodEnd = dateFromUnix(line?.period?.end);
  const invoicePayments = await getStripe().invoicePayments.list({ invoice: invoice.id, limit: 1 });
  const stripePaymentIntentId = objectId(invoicePayments.data[0]?.payment?.payment_intent);
  await Payment.findOneAndUpdate(
    { stripeInvoiceId: invoice.id },
    {
      $set: {
        provider: "STRIPE",
        companyId: subscription.companyId,
        subscriptionId: subscription._id,
        reference: `INV-${invoice.id}`,
        stripeInvoiceId: invoice.id,
        ...(stripePaymentIntentId ? { stripePaymentIntentId } : {}),
        invoiceNumber: invoice.number || undefined,
        invoiceUrl: invoice.hosted_invoice_url || undefined,
        status: paid ? "PAID" : "FAILED",
        amountGross: Number(paid ? invoice.amount_paid : invoice.amount_due || 0) / 100,
        catalogAmountGross: subscription.amountGross,
        packageCode: subscription.packageCode,
        currency: String(invoice.currency || "pln").toUpperCase(),
        billingMode,
        periodStart,
        periodEnd,
        rawStatus: invoice,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  if (paid) {
    // Po odświeżeniu z Stripe to on jest źródłem prawdy o statusie. Nadpisanie
    // go tutaj potrafiło oznaczyć jako ACTIVE subskrypcję, którą Stripe uważa
    // za past_due (opłacona jedna faktura z kilku).
    if (!syncedFromStripe) subscription.status = isTrialInvoice ? "TRIALING" : "ACTIVE";
    subscription.lastPaymentAt = new Date();
    if (periodStart) subscription.currentPeriodStart = periodStart;
    if (periodEnd) subscription.currentPeriodEnd = periodEnd;
    subscription.graceEndsAt = undefined;
  } else {
    subscription.status = "PAST_DUE";
    subscription.graceEndsAt = subscription.graceEndsAt || new Date(Date.now() + 7 * DAY_MS);
  }
  await subscription.save();
  return { applied: true, status: subscription.status };
}

async function applyRefund(charge: any) {
  const paymentIntentId = objectId(charge.payment_intent);
  if (!paymentIntentId) return { applied: false, reason: "PAYMENT_INTENT_MISSING" };
  let payment: any = await Payment.findOne({ stripePaymentIntentId: paymentIntentId });
  if (!payment) {
    const invoicePayments = await getStripe().invoicePayments.list({
      payment: { type: "payment_intent", payment_intent: paymentIntentId },
      limit: 1,
    });
    const invoiceId = objectId(invoicePayments.data[0]?.invoice);
    if (invoiceId) payment = await Payment.findOne({ stripeInvoiceId: invoiceId });
  }
  if (!payment) return { applied: false, reason: "PAYMENT_NOT_FOUND" };
  const fullyRefunded = Number(charge.amount_refunded || 0) >= Number(charge.amount || 0);
  if (!fullyRefunded) {
    payment.rawStatus = charge;
    await payment.save();
    return { applied: true, status: payment.status };
  }
  payment.status = "REFUNDED";
  payment.rawStatus = charge;
  await payment.save();
  if (payment.billingMode !== "RECURRING_MONTHLY") {
    const subscription: any = await Subscription.findById(payment.subscriptionId);
    if (subscription) {
      const rollbackEnd = payment.periodStart && new Date(payment.periodStart) > new Date()
        ? new Date(payment.periodStart)
        : new Date();
      subscription.currentPeriodEnd = rollbackEnd;
      subscription.status = rollbackEnd <= new Date() ? "CANCELED" : subscription.status;
      if (
        subscription.scheduledPackageStartsAt
        && payment.periodStart
        && new Date(subscription.scheduledPackageStartsAt).getTime() === new Date(payment.periodStart).getTime()
      ) {
        subscription.scheduledPackageCode = undefined;
        subscription.scheduledPackageStartsAt = undefined;
      }
      await subscription.save();
    }
  }
  return { applied: true, status: "REFUNDED" };
}

/**
 * Stripe nie gwarantuje kolejności webhooków, a ładunek zdarzenia to migawka z
 * momentu jego powstania. `customer.subscription.created` potrafi dotrzeć po
 * innych zdarzeniach i nieść jeszcze status `incomplete` — zapisanie go cofało
 * subskrypcję do ONBOARDING i, przy dostępie fail-closed, odcinało dostęp
 * firmie, która realnie zapłaciła. Dlatego stan bierzemy z aktualnego obiektu.
 */
async function currentStripeSubscription(object: any) {
  if (!object?.id) return object;
  try {
    return await getStripe().subscriptions.retrieve(object.id, {
      expand: ["default_payment_method", "items.data.price"],
    });
  } catch {
    // Gdy Stripe jest chwilowo niedostępny, migawka ze zdarzenia jest wciąż
    // lepsza niż pominięcie zmiany.
    return object;
  }
}

export async function processStripeEvent(event: Stripe.Event) {
  const object: any = event.data.object;
  switch (event.type) {
    case "checkout.session.completed": return applyCheckoutSession(object);
    case "checkout.session.async_payment_succeeded": return applyCheckoutSession(object, "PAID");
    case "checkout.session.async_payment_failed": return applyCheckoutSession(object, "FAILED");
    case "checkout.session.expired": return applyCheckoutSession(object, "CANCELED");
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": return applyStripeSubscription(await currentStripeSubscription(object));
    case "invoice.paid": return applyInvoice(object, true);
    case "invoice.payment_failed":
    case "invoice.payment_action_required": return applyInvoice(object, false);
    case "charge.refunded": return applyRefund(object);
    default: return { applied: false, reason: "IGNORED_EVENT" };
  }
}

export async function reconcileStripeCheckout(sessionId: string, companyId: unknown) {
  const session = await getStripe().checkout.sessions.retrieve(sessionId, {
    expand: ["subscription", "payment_intent"],
  });
  if (session.metadata?.companyId !== String(companyId)) {
    return { applied: false, reason: "CHECKOUT_COMPANY_MISMATCH" };
  }
  return applyCheckoutSession(session);
}
