import { clerkClient } from "@clerk/nextjs/server";
import { clerkConfigured, requireCompanyMember } from "@/server/auth";
import { connectMongo } from "@/server/db/connection";
import {
  AuditLog,
  BillingAttempt,
  CatalogManufacturer,
  CatalogProduct,
  Company,
  CompanyMembership,
  FeatureOverride,
  Order,
  OrderEvent,
  Payment,
  Plan,
  Subscription,
  WebhookEvent,
} from "@/server/db/models";
import { demoBootstrap, findCompanyBySlug, getCompanyAdminSummary } from "@/server/services/companyService";

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
      chart: [3, 5, 4, 8, 6, 9, 11, 7, 12, 10, 14, 16],
      role: "OWNER",
    };
  }

  const companyId = (summary.company as any)._id;
  const [total, fresh, accepted, recentOrders, monthGroups] = await Promise.all([
    Order.countDocuments({ companyId }),
    Order.countDocuments({ companyId, status: "NEW" }),
    Order.countDocuments({ companyId, status: "ACCEPTED" }),
    Order.find({ companyId }).sort({ submittedAt: -1 }).limit(6).lean(),
    Order.aggregate([
      { $match: { companyId } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$submittedAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 12 },
    ]),
  ]);
  return {
    ...summary,
    stats: {
      total,
      new: fresh,
      accepted,
      conversion: total ? Math.round((accepted / total) * 100) : 0,
    },
    recentOrders,
    chart: monthGroups.map((item) => item.count),
    role: (access as any).companyRole,
  };
}

export async function getCompanyOrders(slug: string, query?: { status?: string; search?: string }) {
  const access = await assertCompanyDashboardAccess(slug);
  if ((access as any).demo) return demoOrders;
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
  return Order.find(filter).sort({ submittedAt: -1 }).limit(250).lean();
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
        configurationSnapshot: {
          schemaVersion: 12,
          presetId: "single_garage",
          dimensions: { widthM: 6, lengthM: 7, wallHeightM: 2.5 },
          roof: { type: "gable", pitchPercent: 12 },
          cladding: { manufacturerId: "steelprofil", wallColor: "ral7016" },
        },
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

export async function getCompanyPayments(slug: string) {
  const access = await assertCompanyDashboardAccess(slug);
  if ((access as any).demo) {
    return [{
      _id: "pay-demo",
      extOrderId: "SUB-DEMO-2026-07",
      status: "COMPLETED",
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
    failedAttempts,
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
    BillingAttempt.find({ status: "FAILED" }).sort({ attemptedAt: -1 }).limit(100).lean(),
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
    failedAttempts,
    recentAudit,
  };
}
