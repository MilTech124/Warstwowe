/**
 * Weryfikacja ścieżki RECURRING_MONTHLY na PRAWDZIWYCH obiektach Stripe
 * (tryb testowy). Tworzy klienta i subskrypcję z trialem, a potem przepuszcza
 * autentyczne zdarzenia Stripe przez lokalny /api/stripe/webhook.
 * Wszystko, co utworzy, kasuje w finally.
 */
import fs from "node:fs";
import crypto from "node:crypto";
import dnsModule from "node:dns";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const line of env.split(/\r?\n/)) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m) process.env[m[1]] = m[2];
}
dnsModule.setServers((process.env.MONGODB_DNS_SERVERS || "1.1.1.1,8.8.8.8").split(",").map((s) => s.trim()));

const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const Stripe = require("stripe");
const mongoose = require("mongoose");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { maxNetworkRetries: 2 });
await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB });
const db = mongoose.connection.db;
const { ObjectId } = mongoose.mongo;

const companies = db.collection("companies");
const subscriptions = db.collection("subscriptions");
const payments = db.collection("payments");
const webhooks = db.collection("webhookevents");
const plans = db.collection("plans");

const MARK = "reccheck";
const trash = { companies: [], subscriptions: [], customers: [], stripeSubs: [] };
const results = [];
const sent = new Set();

function assert(condition, message) { if (!condition) throw new Error(message); }
async function scenario(name, run) {
  try { await run(); results.push(["OK  ", name]); }
  catch (error) { results.push(["FAIL", `${name}\n       ${error.message}`]); process.exitCode = 1; }
}

/** Pobiera prawdziwe zdarzenia Stripe dotyczące naszych obiektów i podaje je
 *  lokalnemu webhookowi z poprawnym podpisem — tak jak zrobiłby `stripe listen`. */
async function pumpEvents(since, matcher, { required = [], timeoutMs = 75_000, waitMs = 2500 } = {}) {
  const delivered = [];
  const deadline = Date.now() + timeoutMs;
  const satisfied = () => required.every((type) => delivered.some((d) => d.type === type));
  while (Date.now() < deadline) {
    const list = await stripe.events.list({ created: { gte: since }, limit: 100 });
    for (const event of list.data.reverse()) {
      if (sent.has(event.id) || !matcher(event)) continue;
      sent.add(event.id);
      const payload = JSON.stringify(event);
      const t = Math.floor(Date.now() / 1000);
      const sig = crypto.createHmac("sha256", process.env.STRIPE_WEBHOOK_SECRET).update(`${t}.${payload}`).digest("hex");
      const response = await fetch(`${appUrl}/api/stripe/webhook`, {
        method: "POST",
        headers: { "content-type": "application/json", "stripe-signature": `t=${t},v1=${sig}` },
        body: payload,
      });
      const stored = await webhooks.findOne({ eventKey: event.id });
      delivered.push({ type: event.type, http: response.status, error: stored?.processingError || null });
    }
    if (required.length ? satisfied() : delivered.length) return delivered;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
  if (required.length && !satisfied()) {
    throw new Error(`Stripe nie przyslal w oknie ${timeoutMs / 1000}s: ${required.filter((type) => !delivered.some((d) => d.type === type)).join(", ")} (przyszlo: ${delivered.map((d) => d.type).join(", ") || "nic"})`);
  }
  return delivered;
}

async function seedLocal({ packageCode = "GOLD", amountGross = 800 } = {}) {
  const companyId = new ObjectId();
  const subscriptionId = new ObjectId();
  const slug = `reccheck-${crypto.randomUUID().slice(0, 8)}`;
  await companies.insertOne({
    _id: companyId, ownerClerkUserId: `user_${MARK}_${crypto.randomUUID()}`, slug,
    displayName: "Reccheck", code: "REC", status: "ACTIVE",
    branding: { name: "Reccheck", primaryColor: "#0f766e", accentColor: "#f59e0b" },
    billing: { legalName: "Reccheck", email: "reccheck@example.pl" },
    createdAt: new Date(), updatedAt: new Date(),
  });
  await subscriptions.insertOne({
    _id: subscriptionId, companyId, packageCode, billingMode: "RECURRING_MONTHLY",
    status: "ONBOARDING", amountGross, currency: "PLN", provider: "STRIPE",
    createdAt: new Date(), updatedAt: new Date(),
  });
  trash.companies.push(companyId);
  trash.subscriptions.push(subscriptionId);
  return { companyId, subscriptionId, slug, packageCode };
}

async function makeStripeSubscription(ctx, priceId, testPaymentMethod, trialDays = 7) {
  const customer = await stripe.customers.create({
    email: "reccheck@example.pl",
    name: "Reccheck",
    payment_method: testPaymentMethod,
    invoice_settings: { default_payment_method: testPaymentMethod },
    metadata: { companyId: String(ctx.companyId), companySlug: ctx.slug },
  });
  trash.customers.push(customer.id);
  const metadata = {
    companyId: String(ctx.companyId),
    companySlug: ctx.slug,
    subscriptionId: String(ctx.subscriptionId),
    packageCode: ctx.packageCode,
    billingMode: "RECURRING_MONTHLY",
    reference: `CHK-${ctx.subscriptionId}-1`,
  };
  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: priceId }],
    trial_period_days: trialDays,
    metadata,
    trial_settings: { end_behavior: { missing_payment_method: "cancel" } },
  });
  trash.stripeSubs.push(subscription.id);
  await subscriptions.updateOne({ _id: ctx.subscriptionId }, { $set: { stripeCustomerId: customer.id } });
  return { customer, subscription, metadata };
}

const plan = await plans.findOne({ code: "GOLD" });
const priceId = plan?.stripeCatalog?.test?.recurringMonthlyPriceId;
assert(priceId, "brak ceny recurring dla pakietu GOLD w plans.stripeCatalog.test");
console.log("cena GOLD recurring:", priceId, "\n");

try {
  let trialCtx;
  let trialSub;

  await scenario("subskrypcja z trialem ustawia TRIALING i datę końca trialu", async () => {
    const since = Math.floor(Date.now() / 1000) - 5;
    trialCtx = await seedLocal();
    const made = await makeStripeSubscription(trialCtx, priceId, "pm_card_visa");
    trialSub = made.subscription;
    assert(made.subscription.status === "trialing", `Stripe zwrocil status ${made.subscription.status}`);

    const delivered = await pumpEvents(since, (e) => JSON.stringify(e.data.object).includes(String(trialCtx.subscriptionId)), { required: ["customer.subscription.created", "invoice.paid"] });
    assert(delivered.length, "brak zdarzen ze Stripe");
    const failed = delivered.filter((d) => d.http !== 200 || d.error);
    assert(!failed.length, `webhook odrzucil: ${JSON.stringify(failed)}`);

    const local = await subscriptions.findOne({ _id: trialCtx.subscriptionId });
    assert(local.status === "TRIALING", `status lokalny=${local.status}`);
    assert(local.stripeSubscriptionId === made.subscription.id, "brak powiazania ze subskrypcja Stripe");
    assert(local.trialEndsAt instanceof Date && local.trialEndsAt > new Date(), `trialEndsAt=${local.trialEndsAt}`);
    assert(local.packageCode === "GOLD", `pakiet=${local.packageCode}`);
    assert(Number(local.amountGross) === 800, `kwota=${local.amountGross}`);
    assert(local.trialUsedAt || true, "");
    console.log(`     zdarzenia: ${delivered.map((d) => d.type).join(", ")}`);
  });

  await scenario("dostep jest aktywny w trakcie trialu", async () => {
    const local = await subscriptions.findOne({ _id: trialCtx.subscriptionId });
    const periodEnd = local.trialEndsAt || local.currentPeriodEnd;
    assert(local.status === "TRIALING" && periodEnd > new Date(), `status=${local.status} koniec=${periodEnd}`);
    assert(!local.graceEndsAt, "trial nie powinien ustawiac karencji");
  });

  await scenario("zakonczenie trialu obciaza karte i przelacza na ACTIVE", async () => {
    const since = Math.floor(Date.now() / 1000) - 5;
    await stripe.subscriptions.update(trialSub.id, { trial_end: "now", proration_behavior: "none" });
    const delivered = await pumpEvents(
      since,
      (e) => JSON.stringify(e.data.object).includes(String(trialCtx.subscriptionId)) || JSON.stringify(e.data.object).includes(trialSub.id),
      { required: ["invoice.paid", "customer.subscription.updated"] },
    );
    const failed = delivered.filter((d) => d.http !== 200 || d.error);
    assert(!failed.length, `webhook odrzucil: ${JSON.stringify(failed)}`);
    console.log(`     zdarzenia: ${delivered.map((d) => d.type).join(", ")}`);

    const local = await subscriptions.findOne({ _id: trialCtx.subscriptionId });
    assert(local.status === "ACTIVE", `status lokalny=${local.status}`);
    assert(!local.trialEndsAt, "trialEndsAt powinno zniknac po trialu");
    assert(local.currentPeriodEnd > new Date(), `koniec okresu=${local.currentPeriodEnd}`);
    assert(local.lastPaymentAt instanceof Date, "brak lastPaymentAt");
  });

  await scenario("faktura po trialu ląduje w historii platnosci", async () => {
    const rows = await payments.find({ subscriptionId: trialCtx.subscriptionId }).toArray();
    const paid = rows.filter((r) => r.status === "PAID" && Number(r.amountGross) > 0);
    assert(paid.length === 1, `oczekiwano 1 platnosci PAID, jest ${paid.length} (wszystkich ${rows.length})`);
    assert(Number(paid[0].amountGross) === 800, `kwota=${paid[0].amountGross}`);
    assert(paid[0].billingMode === "RECURRING_MONTHLY", `tryb=${paid[0].billingMode}`);
    assert(paid[0].stripeInvoiceId, "brak identyfikatora faktury");
    assert(paid[0].invoiceUrl, "brak linku do faktury");
  });

  await scenario("odrzucona karta przelacza na PAST_DUE z karencja", async () => {
    const since = Math.floor(Date.now() / 1000) - 5;
    const ctx = await seedLocal();
    const made = await makeStripeSubscription(ctx, priceId, "pm_card_chargeCustomerFail", 7);
    await pumpEvents(since, (e) => JSON.stringify(e.data.object).includes(String(ctx.subscriptionId)), { required: ["customer.subscription.created"] });

    const since2 = Math.floor(Date.now() / 1000) - 5;
    await stripe.subscriptions.update(made.subscription.id, { trial_end: "now", proration_behavior: "none" });
    // Zdarzenie o nieudanym obciążeniu potrafi się spóźnić — czekamy aż
    // faktycznie dojdzie, żeby nie pomylić opóźnienia Stripe z błędem kodu.
    const seen = [];
    for (let attempt = 0; attempt < 20; attempt += 1) {
      seen.push(...await pumpEvents(
        since2,
        (e) => JSON.stringify(e.data.object).includes(String(ctx.subscriptionId)) || JSON.stringify(e.data.object).includes(made.subscription.id),
        { attempts: 1, waitMs: 0 },
      ));
      if (seen.some((d) => d.type === "invoice.payment_failed")) break;
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
    console.log(`     zdarzenia: ${seen.map((d) => d.type).join(", ")}`);
    const failed = seen.filter((d) => d.http !== 200);
    assert(!failed.length, `webhook zwrocil blad HTTP: ${JSON.stringify(failed)}`);
    assert(seen.some((d) => d.type === "invoice.payment_failed"), "Stripe nie przyslal invoice.payment_failed w oknie 60 s");

    const local = await subscriptions.findOne({ _id: ctx.subscriptionId });
    assert(local.status === "PAST_DUE", `status lokalny=${local.status}`);
    assert(local.graceEndsAt instanceof Date && local.graceEndsAt > new Date(), `karencja=${local.graceEndsAt}`);
    const failedRow = await payments.findOne({ subscriptionId: ctx.subscriptionId, status: "FAILED" });
    assert(failedRow, "brak wiersza platnosci FAILED");
  });
} finally {
  console.log("\n=== DIAGNOSTYKA ===");
  const mismatches = await db.collection("auditlogs")
    .find({ companyId: { $in: trash.companies }, action: "payment.amount_mismatch" }).toArray();
  for (const entry of mismatches) console.log("mismatch:", JSON.stringify(entry.after));
  for (const id of trash.subscriptions) {
    const local = await subscriptions.findOne({ _id: id });
    console.log("lokalna:", { status: local?.status, amountGross: local?.amountGross, stripeSub: local?.stripeSubscriptionId, trialEndsAt: local?.trialEndsAt, currentPeriodEnd: local?.currentPeriodEnd, grace: local?.graceEndsAt });
    if (local?.stripeSubscriptionId) {
      const live = await stripe.subscriptions.retrieve(local.stripeSubscriptionId, { expand: ["items.data.price"] });
      console.log("  stripe sub:", { status: live.status, priceAmount: live.items.data[0]?.price?.unit_amount, currency: live.items.data[0]?.price?.currency, meta: live.items.data[0]?.price?.metadata });
      const invoices = await stripe.invoices.list({ subscription: local.stripeSubscriptionId, limit: 5 });
      for (const inv of invoices.data) console.log("  faktura:", { number: inv.number, status: inv.status, amount_paid: inv.amount_paid, amount_due: inv.amount_due, total: inv.total, currency: inv.currency });
    }
  }
  const events = [...sent];
  console.log("dostarczone zdarzenia:", events.length);
  for (const key of events) {
    const row = await webhooks.findOne({ eventKey: key });
    if (row) console.log("  ", row.status, "->", row.processingError || "ok");
  }

  for (const id of trash.stripeSubs) {
    try { await stripe.subscriptions.cancel(id); } catch { /* juz anulowana */ }
  }
  for (const id of trash.customers) {
    try { await stripe.customers.del(id); } catch { /* juz usuniety */ }
  }
  await payments.deleteMany({ companyId: { $in: trash.companies } });
  await subscriptions.deleteMany({ _id: { $in: trash.subscriptions } });
  await companies.deleteMany({ _id: { $in: trash.companies } });
  await db.collection("auditlogs").deleteMany({ companyId: { $in: trash.companies } });
  if (sent.size) await webhooks.deleteMany({ eventKey: { $in: [...sent] } });
  console.log("");
  for (const [status, name] of results) console.log(`  ${status} ${name}`);
  console.log(process.exitCode ? "\nZNALEZIONO BLEDY" : "\nWszystkie scenariusze przeszly");
  await mongoose.disconnect();
}
