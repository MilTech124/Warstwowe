/**
 * Test end-to-end ścieżki płatności: wysyła podpisane, syntetyczne zdarzenia
 * Stripe na prawdziwy `/api/stripe/webhook` działającego serwera dev i sprawdza
 * stan bazy. Nie wchodzi do `npm test`, bo wymaga Atlasu i `npm run dev`.
 *
 *   npm run dev            # w osobnym oknie
 *   node scripts/stripe-flow-check.mjs
 *
 * Skrypt zakłada własne dokumenty (slug `flowcheck-*`) i kasuje je w `finally`.
 * Nie dotyka firm ani płatności, których sam nie utworzył.
 */
import fs from "node:fs";
import crypto from "node:crypto";
import dnsModule from "node:dns";
import { createRequire } from "node:module";

const env = fs.readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const line of env.split(/\r?\n/)) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m) process.env[m[1]] = m[2];
}
dnsModule.setServers((process.env.MONGODB_DNS_SERVERS || "1.1.1.1,8.8.8.8").split(",").map((s) => s.trim()));

const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const mongoose = createRequire(import.meta.url)("mongoose");
await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB });
const db = mongoose.connection.db;
const { ObjectId } = mongoose.mongo;

const companies = db.collection("companies");
const subscriptions = db.collection("subscriptions");
const payments = db.collection("payments");
const webhooks = db.collection("webhookevents");

const MARK = "flowcheck";
let nonce = 0;
const created = { companies: [], subscriptions: [] };

async function send(type, object) {
  const event = {
    id: `evt_${MARK}_${crypto.randomUUID()}`,
    object: "event",
    api_version: "2025-01-01",
    created: Math.floor(Date.now() / 1000),
    type,
    livemode: false,
    data: { object },
  };
  const payload = JSON.stringify(event);
  const t = Math.floor(Date.now() / 1000);
  const sig = crypto.createHmac("sha256", process.env.STRIPE_WEBHOOK_SECRET).update(`${t}.${payload}`).digest("hex");
  const response = await fetch(`${appUrl}/api/stripe/webhook`, {
    method: "POST",
    headers: { "content-type": "application/json", "stripe-signature": `t=${t},v1=${sig}` },
    body: payload,
  });
  if (response.status !== 200) throw new Error(`webhook ${type} -> HTTP ${response.status} ${await response.text()}`);
  const stored = await webhooks.findOne({ eventKey: event.id });
  return { eventId: event.id, error: stored?.processingError || null };
}

async function seed({ packageCode = "GOLD", amountGross = 800, billingMode = "PREPAID_MONTHLY" } = {}) {
  const n = ++nonce;
  const companyId = new ObjectId();
  const subscriptionId = new ObjectId();
  const slug = `flowcheck-${crypto.randomUUID().slice(0, 8)}`;
  await companies.insertOne({
    _id: companyId,
    ownerClerkUserId: `user_flowcheck_${crypto.randomUUID()}`,
    slug,
    displayName: "Flowcheck",
    code: "FLOW",
    status: "ACTIVE",
    branding: { name: "Flowcheck", primaryColor: "#0f766e", accentColor: "#f59e0b" },
    billing: { legalName: "Flowcheck", email: "flowcheck@example.pl" },
    createdAt: new Date(), updatedAt: new Date(),
  });
  await subscriptions.insertOne({
    _id: subscriptionId, companyId, packageCode, billingMode, status: "ONBOARDING",
    amountGross, currency: "PLN", provider: "STRIPE", pendingCheckoutSessionId: `cs_${MARK}_${n}_pending`,
    createdAt: new Date(), updatedAt: new Date(),
  });
  created.companies.push(companyId);
  created.subscriptions.push(subscriptionId);
  return { companyId, subscriptionId, slug, packageCode, billingMode, amountGross, n };
}

function session(ctx, overrides = {}) {
  return {
    id: `cs_${MARK}_${ctx.n}_pending`, object: "checkout.session", mode: "payment",
    status: "complete", payment_status: "paid",
    amount_total: Math.round(ctx.amountGross * 100), currency: "pln",
    invoice: null, payment_intent: `pi_${MARK}_${ctx.n}_1`, subscription: null,
    customer_details: {
      name: "Flowcheck Sp. z o.o.", email: "faktury@example.pl",
      address: { line1: "Polna 1", postal_code: "00-001", city: "Warszawa", country: "PL" },
      tax_ids: [{ type: "eu_vat", value: "PL1234567890" }],
    },
    metadata: {
      companyId: String(ctx.companyId), companySlug: ctx.slug,
      subscriptionId: String(ctx.subscriptionId), packageCode: ctx.packageCode,
      billingMode: ctx.billingMode, reference: `CHK-${ctx.subscriptionId}-1`,
    },
    ...overrides,
  };
}

const results = [];
async function scenario(name, run) {
  try { await run(); results.push(["OK  ", name]); }
  catch (error) { results.push(["FAIL", `${name}\n       ${error.message}`]); process.exitCode = 1; }
}
function assert(condition, message) { if (!condition) throw new Error(message); }

try {
  await scenario("prepaid checkout aktywuje dostep, pakiet i miesieczny okres", async () => {
    const ctx = await seed();
    const { error } = await send("checkout.session.completed", session(ctx));
    assert(!error, `webhook zwrocil blad: ${error}`);
    const sub = await subscriptions.findOne({ _id: ctx.subscriptionId });
    assert(sub.status === "ACTIVE", `status=${sub.status}`);
    assert(sub.packageCode === "GOLD", `pakiet=${sub.packageCode}`);
    assert(!sub.pendingCheckoutSessionId, "pendingCheckoutSessionId powinien zniknac");
    const days = (sub.currentPeriodEnd - sub.currentPeriodStart) / 86400000;
    assert(days > 27 && days < 32, `okres ${days} dni`);
    const payment = await payments.findOne({ subscriptionId: ctx.subscriptionId });
    assert(payment?.status === "PAID" && payment.amountGross === 800, `payment=${JSON.stringify(payment && { s: payment.status, a: payment.amountGross })}`);
    const company = await companies.findOne({ _id: ctx.companyId });
    assert(company.billing.taxId === "PL1234567890", "NIP ze Stripe nie trafil do firmy");
    assert(company.billing.address?.includes("Warszawa"), "adres ze Stripe nie trafil do firmy");
  });

  await scenario("zanizona kwota nie aktywuje dostepu", async () => {
    const ctx = await seed();
    const { error } = await send("checkout.session.completed", session(ctx, { amount_total: 100 }));
    assert(error === "AMOUNT_MISMATCH", `oczekiwano AMOUNT_MISMATCH, jest ${error}`);
    const sub = await subscriptions.findOne({ _id: ctx.subscriptionId });
    assert(sub.status === "ONBOARDING", `status=${sub.status}`);
  });

  await scenario("obca waluta nie aktywuje dostepu", async () => {
    const ctx = await seed();
    const { error } = await send("checkout.session.completed", session(ctx, { currency: "eur" }));
    assert(error === "CURRENCY_MISMATCH", `oczekiwano CURRENCY_MISMATCH, jest ${error}`);
  });

  await scenario("powtorzony webhook nie przedluza okresu dwa razy", async () => {
    const ctx = await seed();
    await send("checkout.session.completed", session(ctx));
    const first = await subscriptions.findOne({ _id: ctx.subscriptionId });
    await send("checkout.session.completed", session(ctx));
    const second = await subscriptions.findOne({ _id: ctx.subscriptionId });
    assert(first.currentPeriodEnd.getTime() === second.currentPeriodEnd.getTime(), "drugi identyczny webhook dolozyl kolejny okres");
    assert(await payments.countDocuments({ subscriptionId: ctx.subscriptionId }) === 1, "powstala druga platnosc");
  });

  await scenario("przedawniona sesja Checkout nie rusza subskrypcji", async () => {
    const ctx = await seed();
    const { error } = await send("checkout.session.expired", session(ctx, { id: `cs_${MARK}_${ctx.n}_old`, status: "expired" }));
    assert(error === "STALE_CHECKOUT_SESSION", `oczekiwano STALE_CHECKOUT_SESSION, jest ${error}`);
    const sub = await subscriptions.findOne({ _id: ctx.subscriptionId });
    assert(sub.pendingCheckoutSessionId === `cs_${MARK}_${ctx.n}_pending`, "aktualna sesja zostala skasowana");
  });

  await scenario("wygasniecie aktualnej sesji zwalnia oczekujaca platnosc", async () => {
    const ctx = await seed();
    const { error } = await send("checkout.session.expired", session(ctx, { status: "expired", payment_status: "unpaid" }));
    assert(!error, `blad: ${error}`);
    const sub = await subscriptions.findOne({ _id: ctx.subscriptionId });
    assert(sub.status === "ONBOARDING" && !sub.pendingCheckoutSessionId, `status=${sub.status} pending=${sub.pendingCheckoutSessionId}`);
  });

  await scenario("zwrot calej platnosci cofa dostep", async () => {
    const ctx = await seed();
    await send("checkout.session.completed", session(ctx));
    const { error } = await send("charge.refunded", {
      id: `ch_${MARK}_${ctx.n}`, object: "charge", payment_intent: `pi_${MARK}_${ctx.n}_1`,
      amount: 80000, amount_refunded: 80000,
    });
    assert(!error, `blad: ${error}`);
    const payment = await payments.findOne({ subscriptionId: ctx.subscriptionId });
    assert(payment.status === "REFUNDED", `platnosc=${payment.status}`);
    const sub = await subscriptions.findOne({ _id: ctx.subscriptionId });
    assert(sub.status === "CANCELED", `subskrypcja=${sub.status}`);
    assert(sub.currentPeriodEnd <= new Date(), "dostep nie zostal odebrany");
  });

  await scenario("zakup 6-miesieczny daje polroczny okres na pakiecie DIAMOND", async () => {
    const ctx = await seed({ packageCode: "DIAMOND", amountGross: 7560, billingMode: "PREPAID_SIX_MONTHS" });
    const { error } = await send("checkout.session.completed", session(ctx));
    assert(!error, `blad: ${error}`);
    const sub = await subscriptions.findOne({ _id: ctx.subscriptionId });
    assert(sub.status === "ACTIVE" && sub.packageCode === "DIAMOND", `${sub.status}/${sub.packageCode}`);
    const days = (sub.currentPeriodEnd - sub.currentPeriodStart) / 86400000;
    assert(days > 170 && days < 190, `okres ${days} dni`);
  });

  await scenario("odnowienie przed koncem okresu doklada miesiac", async () => {
    const ctx = await seed();
    await send("checkout.session.completed", session(ctx));
    const first = await subscriptions.findOne({ _id: ctx.subscriptionId });
    await subscriptions.updateOne({ _id: ctx.subscriptionId }, { $set: { pendingCheckoutSessionId: `cs_${MARK}_${ctx.n}_renew` } });
    const renewal = session(ctx, { id: `cs_${MARK}_${ctx.n}_renew`, payment_intent: `pi_${MARK}_${ctx.n}_2` });
    renewal.metadata = { ...renewal.metadata, reference: `CHK-${ctx.subscriptionId}-renew` };
    const { error } = await send("checkout.session.completed", renewal);
    assert(!error, `blad: ${error}`);
    const second = await subscriptions.findOne({ _id: ctx.subscriptionId });
    const added = (second.currentPeriodEnd - first.currentPeriodEnd) / 86400000;
    assert(added > 27 && added < 32, `odnowienie dolozylo ${added} dni`);
    assert(await payments.countDocuments({ subscriptionId: ctx.subscriptionId }) === 2, "brak drugiej platnosci");
  });

  await scenario("zmiana pakietu z wyprzedzeniem laduje w scheduledPackageCode", async () => {
    const ctx = await seed();
    await send("checkout.session.completed", session(ctx));
    await subscriptions.updateOne({ _id: ctx.subscriptionId }, { $set: { pendingCheckoutSessionId: `cs_${MARK}_${ctx.n}_up` } });
    const upgrade = session(ctx, { id: `cs_${MARK}_${ctx.n}_up`, payment_intent: `pi_${MARK}_${ctx.n}_3`, amount_total: 140000 });
    upgrade.metadata = { ...upgrade.metadata, packageCode: "DIAMOND", reference: `CHK-${ctx.subscriptionId}-up` };
    await subscriptions.updateOne({ _id: ctx.subscriptionId }, { $set: { amountGross: 1400 } });
    const { error } = await send("checkout.session.completed", upgrade);
    assert(!error, `blad: ${error}`);
    const sub = await subscriptions.findOne({ _id: ctx.subscriptionId });
    assert(sub.scheduledPackageCode === "DIAMOND", `scheduled=${sub.scheduledPackageCode}`);
    assert(sub.packageCode === "GOLD", `biezacy pakiet nie powinien sie zmienic od razu, jest ${sub.packageCode}`);
  });
} finally {
  await payments.deleteMany({ companyId: { $in: created.companies } });
  await subscriptions.deleteMany({ _id: { $in: created.subscriptions } });
  await companies.deleteMany({ _id: { $in: created.companies } });
  await webhooks.deleteMany({ eventKey: { $regex: `^evt_${MARK}_` } });
  await db.collection("auditlogs").deleteMany({ companyId: { $in: created.companies } });
  for (const [status, name] of results) console.log(`  ${status} ${name}`);
  console.log(process.exitCode ? "\nZNALEZIONO BLEDY" : "\nWszystkie scenariusze przeszly");
  await mongoose.disconnect();
}
