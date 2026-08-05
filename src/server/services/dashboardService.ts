import { clerkClient } from "@clerk/nextjs/server";
import { clerkConfigured, requireCompanyMember } from "@/server/auth";
import { connectMongo } from "@/server/db/connection";
import {
  AuditLog,
  CatalogManufacturer,
  CatalogProduct,
  Company,
  CompanyMembership,
  CompanySettings,
  FeatureOverride,
  Order,
  OrderEvent,
  Payment,
  Plan,
  Subscription,
  WebhookEvent,
} from "@/server/db/models";
import { demoBootstrap, findCompanyBySlug, getCompanyAdminSummary } from "@/server/services/companyService";
import {
  DEFAULT_BRAND_ACCENT,
  DEFAULT_BRAND_PRIMARY,
  relativeLuminance,
  safeHexColor,
} from "@/lib/branding";
import { DEMO_PRIVACY_PROFILE } from "@/config/legal";
import { getPresetDefaults, getPresetOpenings, PRESETS } from "@/config/catalog";
import { DEFAULT_FRONT_PROJECTION } from "@/config/frontProjection";
import { DEFAULT_LIGHTING } from "@/config/lighting";
import { DEFAULT_STRUCTURE } from "@/scene/structure/inputs";

function demoConfigurationSnapshot() {
  const preset = "double_garage";
  const defaults = getPresetDefaults(preset);
  return {
    schemaVersion: 12,
    preset,
    dimensions: { ...PRESETS[preset].dimensions, lengthM: 7 },
    viewMode: "full",
    cameraMode: "orbit",
    showDimensions: true,
    roof: { ...defaults.roof, overhangM: { ...defaults.roof.overhangM } },
    cladding: { ...defaults.cladding },
    flashings: { ...defaults.flashings },
    gutters: { ...defaults.gutters },
    frontProjection: { ...DEFAULT_FRONT_PROJECTION, depthM: 0.65 },
    lighting: { ...DEFAULT_LIGHTING, interiorLighting: true, gateLamps: true },
    structure: { ...DEFAULT_STRUCTURE },
    openings: getPresetOpenings(preset),
  };
}

const demoOrders = [
  {
    _id: "demo-order-1",
    number: "DEMO/2026/0003",
    status: "NEW",
    customer: { name: "Jan Kowalski", email: "jan@example.pl", phone: "+48 500 100 200" },
    submittedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    _id: "demo-order-2",
    number: "DEMO/2026/0002",
    status: "QUOTED",
    customer: { name: "Bud-Montaż Sp. z o.o.", email: "biuro@budmontaz.pl", phone: "+48 500 300 400" },
    submittedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    _id: "demo-order-3",
    number: "DEMO/2026/0001",
    status: "ACCEPTED",
    customer: { name: "Anna Nowak", email: "anna@example.pl", phone: "+48 500 555 555" },
    submittedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
  },
];

export async function assertCompanyDashboardAccess(slug: string) {
  const company = await findCompanyBySlug(slug);
  if ((company as any)?.demo) return { demo: true, company, companyRole: "OWNER" as const };
  return requireCompanyMember(slug);
}

export async function assertCompanyDashboardRole(
  slug: string,
  roles: Array<"OWNER" | "ADMIN" | "SALESPERSON">,
) {
  const company = await findCompanyBySlug(slug);
  if ((company as any)?.demo) {
    if (!roles.includes("OWNER")) throw new Error("ROLE_ACCESS_DENIED");
    return { demo: true, company, companyRole: "OWNER" as const };
  }
  return requireCompanyMember(slug, roles);
}

export async function getDashboardOverview(slug: string) {
  const access = await assertCompanyDashboardAccess(slug);
  const summary = await getCompanyAdminSummary(slug);
  if (!summary) return null;
  if ((access as any).demo) {
    return {
      ...summary,
      stats: { total: 37, new: 6, accepted: 12, conversion: 32 },
      recentOrders: demoOrders,
      chart: buildMonthlySeries([3, 5, 4, 8, 6, 9, 11, 7, 12, 10, 14, 16]),
      trend: { deltaPercent: 14, label: "vs poprzedni miesiąc" },
      quotedValue: null,
      role: "OWNER",
    };
  }

  const companyId = (summary.company as any)._id;
  // Anchor the window to the start of the month 11 months back so the chart is
  // always the last 12 months — the previous query took the 12 *oldest* months.
  const windowStart = new Date();
  windowStart.setUTCDate(1);
  windowStart.setUTCHours(0, 0, 0, 0);
  windowStart.setUTCMonth(windowStart.getUTCMonth() - 11);

  const [total, fresh, accepted, recentOrders, monthGroups, quotedValue] = await Promise.all([
    Order.countDocuments({ companyId }),
    Order.countDocuments({ companyId, status: "NEW" }),
    Order.countDocuments({ companyId, status: "ACCEPTED" }),
    Order.find({ companyId }).sort({ submittedAt: -1 }).limit(6).lean(),
    Order.aggregate([
      { $match: { companyId, submittedAt: { $gte: windowStart } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$submittedAt" } },
          count: { $sum: 1 },
        },
      },
    ]),
    // Łączna wartość brutto wycenionych zamówień; null gdy żadne nie ma wyceny.
    Order.aggregate([
      { $match: { companyId, "quote.totalGross": { $gt: 0 } } },
      { $group: { _id: null, sum: { $sum: "$quote.totalGross" }, count: { $sum: 1 } } },
    ]),
  ]);

  const counts = new Map<string, number>(monthGroups.map((item) => [item._id, item.count]));
  const chart = monthKeys(windowStart).map((key) => counts.get(key) ?? 0);

  return {
    ...summary,
    stats: {
      total,
      new: fresh,
      accepted,
      conversion: total ? Math.round((accepted / total) * 100) : 0,
    },
    recentOrders,
    chart: buildMonthlySeries(chart, windowStart),
    trend: monthOverMonthTrend(chart),
    quotedValue: quotedValue[0]
      ? { totalGross: quotedValue[0].sum, orderCount: quotedValue[0].count }
      : null,
    role: (access as any).companyRole,
  };
}

const MONTH_LABELS = ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"];

function monthKeys(windowStart: Date) {
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(windowStart);
    date.setUTCMonth(date.getUTCMonth() + index);
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

/** Pairs each monthly count with a Polish label so the chart can show an axis. */
function buildMonthlySeries(counts: number[], windowStart?: Date) {
  const start = windowStart ?? (() => {
    const date = new Date();
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() - (counts.length - 1));
    return date;
  })();
  return counts.map((value, index) => {
    const date = new Date(start);
    date.setUTCMonth(date.getUTCMonth() + index);
    return { value, label: MONTH_LABELS[date.getUTCMonth()], year: date.getUTCFullYear() };
  });
}

/**
 * Real month-over-month change. The panel used to show a hardcoded
 * "+12% vs poprzedni okres" on every account.
 */
function monthOverMonthTrend(counts: number[]) {
  if (counts.length < 2) return null;
  const current = counts[counts.length - 1];
  const previous = counts[counts.length - 2];
  if (!previous) return current ? { deltaPercent: null, label: "pierwszy miesiąc ze zleceniami" } : null;
  return {
    deltaPercent: Math.round(((current - previous) / previous) * 100),
    label: "vs poprzedni miesiąc",
  };
}

export const ORDERS_PAGE_SIZE = 25;

/**
 * Returns one page of orders plus the total. The previous version silently
 * truncated at 250 rows with no way to reach the rest.
 */
export async function getCompanyOrders(
  slug: string,
  query?: { status?: string; search?: string; page?: number; pageSize?: number; all?: boolean },
) {
  const access = await assertCompanyDashboardAccess(slug);
  // `all` is for the CSV export, which must dump the whole funnel.
  const pageSize = query?.all
    ? 10_000
    : Math.min(Math.max(query?.pageSize ?? ORDERS_PAGE_SIZE, 1), 100);
  const page = query?.all ? 1 : Math.max(query?.page ?? 1, 1);

  if ((access as any).demo) {
    return { rows: demoOrders, total: demoOrders.length, page: 1, pageSize, pageCount: 1 };
  }

  const company = (access as any).company;
  const filter: Record<string, unknown> = { companyId: company._id };
  if (query?.status && query.status !== "ALL") filter.status = query.status;
  if (query?.search) {
    const search = query.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { number: { $regex: search, $options: "i" } },
      { "customer.name": { $regex: search, $options: "i" } },
      { "customer.email": { $regex: search, $options: "i" } },
    ];
  }

  const [rows, total] = await Promise.all([
    Order.find(filter)
      .sort({ submittedAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    Order.countDocuments(filter),
  ]);
  return { rows, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getCompanyOrder(slug: string, orderId: string) {
  const access = await assertCompanyDashboardAccess(slug);
  if ((access as any).demo) {
    const order = demoOrders.find((item) => item._id === orderId) || demoOrders[0];
    return {
      order: {
        ...order,
        notes: "Klient prosi o kontakt po godzinie 16:00.",
        assignedClerkUserId: "demo-sales",
        settingsVersion: 2,
        catalogVersion: 1,
        configurationSnapshot: demoConfigurationSnapshot(),
      },
      events: [
        { _id: "event-1", type: "ORDER_CREATED", createdAt: order.submittedAt },
        { _id: "event-2", type: "NOTE_ADDED", note: "Prośba o wycenę transportu.", createdAt: new Date().toISOString() },
      ],
      readOnly: false,
    };
  }
  const companyId = (access as any).company._id;
  const order = await Order.findOne({ _id: orderId, companyId }).lean();
  if (!order) return null;
  const events = await OrderEvent.find({ companyId, orderId: (order as any)._id }).sort({ createdAt: -1 }).lean();
  return { order, events, readOnly: Boolean((access as any).superadminAccess) };
}

export interface OrderPdfContractor {
  name: string;
  legalName: string;
  address: string | null;
  taxId: string | null;
  email: string | null;
  phone: string | null;
  logoUrl: string | null;
  /** Kolor nagłówków dokumentu — już zwalidowany, PDF go nie sprawdza. */
  documentAccent: string;
  primaryColor: string;
  accentColor: string;
}

/**
 * Dane wykonawcy na stronę tytułową dokumentu ofertowego i do tabelki rysunkowej.
 *
 * Świadomie NIE przez `getConfiguratorBootstrap`: jego wynik serwuje wprost
 * nieuwierzytelniony `/api/public/companies/[firma]/bootstrap`, więc dopisanie
 * tam NIP-u i adresu rejestrowego opublikowałoby dane każdego najemcy.
 *
 * Kolejność scalania źródeł wynika z tego, jak często są wypełnione: `billing`
 * jest w schemacie opcjonalne, a `privacyProfile` obowiązkowe dla opublikowanego
 * najemcy (wymóg informacyjny RODO), więc stanowi solidniejszy fallback.
 */
export async function getOrderPdfContractor(slug: string): Promise<OrderPdfContractor | null> {
  const access = await assertCompanyDashboardAccess(slug);
  const company = (access as any).company;
  if (!company) return null;

  const branding = company.branding ?? {};
  const billing = company.billing ?? {};
  const privacy = (access as any).demo
    ? DEMO_PRIVACY_PROFILE
    : ((await CompanySettings.findOne({ companyId: company._id }).lean()) as any)?.privacyProfile ?? {};

  // Nagłówki dokumentu idą kolorem PODSTAWOWYM marki (domyślnie ta sama zieleń,
  // której PDF używał na sztywno), nie kolorem akcentu — ten bywa pomarańczowy
  // i na białej kartce ginie. Zbyt jasny kolor podstawowy też schodzi na domyślny.
  const primaryColor = safeHexColor(branding.primaryColor, DEFAULT_BRAND_PRIMARY);

  return {
    name: String(branding.name || company.displayName || slug),
    legalName: String(billing.legalName || privacy.controllerName || branding.name || company.displayName || slug),
    address: billing.address || privacy.address || null,
    taxId: billing.taxId || privacy.taxId || null,
    email: billing.email || privacy.privacyEmail || branding.supportEmail || null,
    phone: branding.supportPhone || privacy.privacyPhone || null,
    logoUrl: branding.logoUrl || null,
    documentAccent: relativeLuminance(primaryColor) > 0.6 ? DEFAULT_BRAND_PRIMARY : primaryColor,
    primaryColor,
    accentColor: safeHexColor(branding.accentColor, DEFAULT_BRAND_ACCENT),
  };
}

export async function getCompanyPayments(slug: string) {
  const access = await assertCompanyDashboardAccess(slug);
  if ((access as any).demo) {
    return [{
      _id: "pay-demo",
      reference: "SUB-DEMO-2026-07",
      provider: "STRIPE",
      status: "PAID",
      amountGross: 1400,
      createdAt: new Date().toISOString(),
    }];
  }
  return Payment.find({ companyId: (access as any).company._id }).sort({ createdAt: -1 }).limit(100).lean();
}

export async function getCompanyAudit(slug: string) {
  const access = await assertCompanyDashboardAccess(slug);
  if ((access as any).demo) {
    return [
      { _id: "a1", action: "settings.published", actorType: "USER", createdAt: new Date().toISOString() },
      { _id: "a2", action: "order.status_changed", actorType: "USER", createdAt: new Date(Date.now() - 3600000).toISOString() },
      { _id: "a3", action: "subscription.renewed", actorType: "SYSTEM", createdAt: new Date(Date.now() - 86400000).toISOString() },
    ];
  }
  return AuditLog.find({ companyId: (access as any).company._id }).sort({ createdAt: -1 }).limit(200).lean();
}

export async function getCompanyTeam(slug: string) {
  const access = await assertCompanyDashboardAccess(slug);
  const company = (access as any).company;
  if ((access as any).demo || !clerkConfigured()) {
    return [
      { id: "demo-owner", status: "ACTIVE", publicUserData: { userId: "demo-owner", firstName: "Anna", lastName: "Właściciel", identifier: "anna@example.pl" }, role: "OWNER" },
      { id: "demo-sales", status: "ACTIVE", publicUserData: { userId: "demo-sales", firstName: "Marek", lastName: "Handlowiec", identifier: "marek@example.pl" }, role: "SALESPERSON" },
    ];
  }

  const client = await clerkClient();
  let memberships: any[] = await CompanyMembership.find({
    companyId: company._id,
    status: { $in: ["INVITED", "ACTIVE"] },
  }).sort({ role: 1, createdAt: 1 }).lean();

  if (!memberships.some((item) => item.role === "OWNER")) {
    const owner = await client.users.getUser(company.ownerClerkUserId);
    const ownerEmail = owner.primaryEmailAddress?.emailAddress?.toLowerCase();
    if (ownerEmail) {
      const ownerMembership: any = await CompanyMembership.findOneAndUpdate(
        { companyId: company._id, email: ownerEmail },
        {
          $set: {
            clerkUserId: company.ownerClerkUserId,
            firstName: owner.firstName || undefined,
            lastName: owner.lastName || undefined,
            role: "OWNER",
            status: "ACTIVE",
            joinedAt: new Date(),
          },
        },
        { upsert: true, new: true },
      ).lean();
      memberships = [ownerMembership, ...memberships];
    }
  }

  return Promise.all(memberships.map(async (membership) => {
    let firstName = membership.firstName;
    let lastName = membership.lastName;
    let email = membership.email;
    if (membership.clerkUserId) {
      try {
        const user = await client.users.getUser(membership.clerkUserId);
        firstName = user.firstName || firstName;
        lastName = user.lastName || lastName;
        email = user.primaryEmailAddress?.emailAddress || email;
      } catch {
        // Membership remains visible even if the Clerk profile is temporarily unavailable.
      }
    }
    return {
      id: String(membership._id),
      status: membership.status,
      role: membership.role,
      publicUserData: {
        userId: membership.clerkUserId || null,
        firstName,
        lastName,
        identifier: email,
      },
    };
  }));
}

export async function getSuperadminDataset() {
  await connectMongo();
  const [
    companies,
    subscriptions,
    orderCount,
    paymentCount,
    manufacturers,
    products,
    plans,
    recentPayments,
    recentWebhooks,
    recentAudit,
    featureOverrides,
  ] = await Promise.all([
    Company.find({}).sort({ createdAt: -1 }).lean(),
    Subscription.find({}).lean(),
    Order.countDocuments({}),
    Payment.countDocuments({}),
    CatalogManufacturer.find({}).sort({ kind: 1, name: 1 }).lean(),
    CatalogProduct.find({}).sort({ kind: 1, name: 1 }).lean(),
    Plan.find({}).sort({ monthlyGross: 1 }).lean(),
    Payment.find({}).sort({ createdAt: -1 }).limit(100).lean(),
    WebhookEvent.find({}).sort({ createdAt: -1 }).limit(100).lean(),
    AuditLog.find({}).sort({ createdAt: -1 }).limit(100).lean(),
    FeatureOverride.find({}).lean(),
  ]);
  const subscriptionByCompany = new Map(subscriptions.map((item: any) => [String(item.companyId), item]));
  const overridesByCompany = new Map<string, any[]>();
  for (const override of featureOverrides as any[]) {
    const key = String(override.companyId);
    overridesByCompany.set(key, [...(overridesByCompany.get(key) || []), override]);
  }
  return {
    companies: companies.map((company: any) => ({
      ...company,
      subscription: subscriptionByCompany.get(String(company._id)),
      overrides: overridesByCompany.get(String(company._id)) || [],
    })),
    stats: {
      companies: companies.length,
      active: subscriptions.filter((item: any) => ["ACTIVE", "TRIALING"].includes(item.status)).length,
      failed: subscriptions.filter((item: any) => item.status === "PAYMENT_FAILED").length,
      orders: orderCount,
      payments: paymentCount,
      mrr: subscriptions
        .filter((item: any) => item.status === "ACTIVE" && item.billingMode === "RECURRING_MONTHLY")
        .reduce((sum: number, item: any) => sum + Number(item.amountGross || 0), 0),
    },
    manufacturers,
    products,
    plans,
    recentPayments,
    recentWebhooks,
    failedAttempts: recentPayments.filter((payment: any) => payment.status === "FAILED"),
    recentAudit,
  };
}
