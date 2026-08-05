// Mongoose jest pakietem CommonJS — pod czystym ESM Node nie widzi jego
// nazwanych eksportów, więc każdy import tego modułu poza bundlerem Next
// (np. test albo skrypt) wywalał się na `does not provide an export named`.
import mongoose from "mongoose";

const { Schema, model, models } = mongoose;
import {
  BILLING_MODES,
  FEATURE_KEYS,
  ORDER_STATUSES,
  PACKAGE_CODES,
  SUBSCRIPTION_STATUSES,
} from "@/types/saas";

const timestamps = { timestamps: true, minimize: false };

const brandingSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    logoUrl: { type: String, default: null },
    primaryColor: { type: String, default: "#0f766e" },
    accentColor: { type: String, default: "#f59e0b" },
    supportEmail: { type: String, default: null },
    supportPhone: { type: String, default: null },
  },
  { _id: false },
);

const privacyProfileSchema = new Schema(
  {
    controllerName: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    taxId: { type: String, required: true, trim: true },
    privacyEmail: { type: String, required: true, lowercase: true, trim: true },
    privacyPhone: { type: String, default: null, trim: true },
    noticeVersion: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const companySchema = new Schema(
  {
    // Unique: onboarding does a check-then-create without a transaction, so a
    // double submit could otherwise create two companies for one owner and
    // findCompanyForUser would then pick one non-deterministically.
    ownerClerkUserId: { type: String, required: true, unique: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    displayName: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    status: { type: String, enum: ["ACTIVE", "SUSPENDED"], default: "ACTIVE", index: true },
    branding: { type: brandingSchema, required: true },
    billing: {
      legalName: String,
      taxId: String,
      address: String,
      email: String,
    },
  },
  timestamps,
);

const companyMembershipSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, required: true, index: true, ref: "Company" },
    clerkUserId: { type: String, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    firstName: String,
    lastName: String,
    role: { type: String, enum: ["OWNER", "ADMIN", "SALESPERSON"], required: true },
    status: { type: String, enum: ["INVITED", "ACTIVE", "DISABLED"], default: "INVITED", index: true },
    invitedByClerkUserId: String,
    invitedAt: Date,
    joinedAt: Date,
  },
  timestamps,
);
companyMembershipSchema.index({ companyId: 1, email: 1 }, { unique: true });
companyMembershipSchema.index(
  { companyId: 1, clerkUserId: 1 },
  { unique: true, partialFilterExpression: { clerkUserId: { $type: "string" } } },
);

const companySettingsSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, required: true, unique: true, index: true, ref: "Company" },
    version: { type: Number, default: 1 },
    publishedVersion: { type: Number, default: 0 },
    published: { type: Boolean, default: false },
    manuallyEnabled: { type: Boolean, default: true },
    defaultPresetId: { type: String, default: "single_garage" },
    allowedPresetIds: { type: [String], default: ["single_garage", "double_garage"] },
    allowedRoofTypeIds: { type: [String], default: [] },
    allowedOpeningKinds: { type: [String], default: [] },
    allowedWallColorIds: { type: [String], default: [] },
    allowedRoofColorIds: { type: [String], default: [] },
    allowedPanelManufacturerIds: { type: [String], default: ["default_panels", "steelprofil"] },
    allowedGateManufacturerIds: { type: [String], default: ["wisniowski"] },
    allowedWallPanelModelIds: { type: [String], default: [] },
    allowedRoofPanelModelIds: { type: [String], default: [] },
    allowedGateTypeIds: { type: [String], default: [] },
    allowedGateModelIds: { type: [String], default: [] },
    allowedDoorModelIds: { type: [String], default: [] },
    allowedWindowModelIds: { type: [String], default: [] },
    disabledFeatures: { type: [String], enum: FEATURE_KEYS, default: [] },
    orderNotificationEmails: { type: [String], default: [] },
    privacyProfile: { type: privacyProfileSchema, default: null },
    draft: { type: Schema.Types.Mixed, default: {} },
    publishedSnapshot: { type: Schema.Types.Mixed, default: {} },
  },
  timestamps,
);

const planSchema = new Schema(
  {
    code: { type: String, enum: PACKAGE_CODES, required: true, unique: true, index: true },
    name: { type: String, required: true },
    monthlyGross: { type: Number, required: true },
    prepaidSixMonthsGross: { type: Number, required: true },
    seatLimit: { type: Number, required: true },
    features: { type: Schema.Types.Mixed, required: true },
    version: { type: Number, default: 1 },
    active: { type: Boolean, default: true },
    /** Stripe objects are separate in test and live mode. Each published
     *  version points at immutable Price objects. */
    stripeCatalog: { type: Schema.Types.Mixed, default: {} },
  },
  timestamps,
);

const planVersionSchema = new Schema(
  {
    planCode: { type: String, enum: PACKAGE_CODES, required: true, index: true },
    version: { type: Number, required: true },
    monthlyGross: { type: Number, required: true },
    prepaidSixMonthsGross: { type: Number, required: true },
    seatLimit: { type: Number, required: true },
    features: { type: Schema.Types.Mixed, required: true },
    stripeCatalog: { type: Schema.Types.Mixed, default: {} },
    effectiveFrom: { type: Date, default: Date.now, index: true },
    createdBy: String,
  },
  timestamps,
);
planVersionSchema.index({ planCode: 1, version: 1 }, { unique: true });

const subscriptionSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, required: true, unique: true, index: true, ref: "Company" },
    packageCode: { type: String, enum: PACKAGE_CODES, required: true, index: true },
    billingMode: { type: String, enum: BILLING_MODES, required: true },
    status: { type: String, enum: SUBSCRIPTION_STATUSES, default: "ONBOARDING", index: true },
    amountGross: { type: Number, required: true },
    currency: { type: String, default: "PLN" },
    trialEndsAt: Date,
    currentPeriodStart: Date,
    currentPeriodEnd: { type: Date, index: true },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    scheduledPackageCode: { type: String, enum: PACKAGE_CODES },
    provider: { type: String, enum: ["STRIPE"], default: "STRIPE" },
    stripeCustomerId: { type: String, index: true, sparse: true },
    stripeSubscriptionId: { type: String, index: true, sparse: true },
    stripePriceId: String,
    stripeScheduleId: String,
    pendingCheckoutSessionId: String,
    paymentMethodBrand: String,
    paymentMethodLast4: String,
    trialUsedAt: Date,
    scheduledPackageStartsAt: Date,
    lastPaymentAt: Date,
    // Stripe handles retries. Locally we only keep the access grace window.
    graceEndsAt: Date,
    dunningAttempt: { type: Number, default: 0 },
    nextRetryAt: { type: Date, index: true },
  },
  timestamps,
);

/**
 * Cennik firmy. Osobno od CompanySettings, bo tabela stawek jest duża
 * (obciążałaby każdy odczyt bootstrapu konfiguratora), a publikacja cennika to
 * inny akt niż publikacja ustawień — z własnym licznikiem wersji i audytem.
 */
const companyPriceListSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, required: true, unique: true, index: true, ref: "Company" },
    version: { type: Number, default: 1 },
    publishedVersion: { type: Number, default: 0 },
    published: { type: Boolean, default: false },
    /** Czy klient widzi ceny na żywo w konfiguratorze. */
    showToCustomer: { type: Boolean, default: false },
    currency: { type: String, default: "PLN" },
    draft: { type: Schema.Types.Mixed, default: {} },
    publishedRates: { type: Schema.Types.Mixed, default: {} },
  },
  timestamps,
);

/** Historia tylko do dopisywania — stare zamówienie zachowuje swoje stawki. */
const companyPriceListVersionSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, required: true, index: true, ref: "Company" },
    version: { type: Number, required: true },
    rates: { type: Schema.Types.Mixed, required: true },
    currency: { type: String, default: "PLN" },
    publishedBy: String,
  },
  timestamps,
);
companyPriceListVersionSchema.index({ companyId: 1, version: 1 }, { unique: true });

const featureOverrideSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, required: true, index: true, ref: "Company" },
    feature: { type: String, enum: FEATURE_KEYS, required: true },
    mode: { type: String, enum: ["FORCE_ENABLE", "FORCE_DISABLE"], required: true },
    expiresAt: Date,
    reason: String,
    createdBy: String,
  },
  timestamps,
);
featureOverrideSchema.index({ companyId: 1, feature: 1 }, { unique: true });

const orderSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, required: true, index: true, ref: "Company" },
    number: { type: String, required: true },
    status: { type: String, enum: ORDER_STATUSES, default: "NEW", index: true },
    customer: {
      name: { type: String, required: true },
      address: String,
      phone: { type: String, required: true },
      email: { type: String, required: true },
    },
    // Legacy proof used by older clients. New orders use the versioned privacy
    // notice acknowledgement below; processing necessary to handle an order is
    // not based on a forced GDPR consent.
    consent: Boolean,
    privacyNoticeAccepted: { type: Boolean, default: false },
    privacyNoticeAcceptedAt: Date,
    privacyNoticeVersion: Number,
    notes: String,
    assignedClerkUserId: String,
    configurationSnapshot: { type: Schema.Types.Mixed, required: true },
    settingsVersion: { type: Number, required: true },
    catalogVersion: { type: Number, default: 1 },
    /** Wersja cennika użyta do wyceny i sama wycena — snapshot, nie referencja. */
    priceListVersion: { type: Number, default: null },
    quote: { type: Schema.Types.Mixed, default: null },
    pdfBlobPath: String,
    submittedAt: { type: Date, default: Date.now, index: true },
  },
  timestamps,
);
orderSchema.index({ companyId: 1, number: 1 }, { unique: true });
orderSchema.index({ companyId: 1, submittedAt: -1 });

const orderEventSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, required: true, index: true },
    orderId: { type: Schema.Types.ObjectId, required: true, index: true, ref: "Order" },
    type: { type: String, required: true },
    actorClerkUserId: String,
    fromStatus: String,
    toStatus: String,
    note: String,
    metadata: Schema.Types.Mixed,
  },
  timestamps,
);

const paymentSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, required: true, index: true },
    subscriptionId: { type: Schema.Types.ObjectId, index: true },
    provider: { type: String, enum: ["STRIPE"], default: "STRIPE", index: true },
    reference: { type: String, unique: true, sparse: true, index: true },
    stripeCheckoutSessionId: { type: String, index: true, sparse: true },
    stripePaymentIntentId: { type: String, index: true, sparse: true },
    stripeInvoiceId: { type: String, index: true, sparse: true },
    invoiceNumber: String,
    invoiceUrl: String,
    receiptUrl: String,
    status: {
      type: String,
      required: true,
      index: true,
      enum: ["PENDING", "PAID", "FAILED", "CANCELED", "REFUNDED"],
    },
    amountGross: { type: Number, required: true },
    catalogAmountGross: Number,
    testAmountOverride: { type: Boolean, default: false },
    packageCode: { type: String, enum: PACKAGE_CODES },
    currency: { type: String, default: "PLN" },
    billingMode: { type: String, enum: BILLING_MODES },
    periodStart: Date,
    periodEnd: Date,
    rawStatus: Schema.Types.Mixed,
  },
  timestamps,
);

const webhookEventSchema = new Schema(
  {
    provider: { type: String, default: "STRIPE" },
    eventKey: { type: String, required: true, unique: true, index: true },
    signature: String,
    status: String,
    payload: Schema.Types.Mixed,
    processingStartedAt: Date,
    processedAt: Date,
    processingError: String,
  },
  timestamps,
);

const catalogManufacturerSchema = new Schema(
  {
    kind: { type: String, enum: ["PANEL", "GATE"], required: true, index: true },
    key: { type: String, required: true },
    name: { type: String, required: true },
    logoUrl: String,
    websiteUrl: String,
    // Jednolinijkowy opis marki pokazywany klientowi przy wyborze produktu.
    tagline: String,
    description: String,
    status: { type: String, enum: ["DRAFT", "PUBLISHED", "ARCHIVED"], default: "DRAFT", index: true },
    version: { type: Number, default: 1 },
    metadata: Schema.Types.Mixed,
  },
  timestamps,
);
catalogManufacturerSchema.index({ kind: 1, key: 1 }, { unique: true });

const catalogProductSchema = new Schema(
  {
    kind: { type: String, enum: ["WALL_PANEL", "ROOF_PANEL", "GATE"], required: true, index: true },
    manufacturerKey: { type: String, required: true, index: true },
    key: { type: String, required: true },
    name: { type: String, required: true },
    status: { type: String, enum: ["DRAFT", "PUBLISHED", "ARCHIVED"], default: "DRAFT", index: true },
    version: { type: Number, default: 1 },
    thicknessMm: [Number],
    lengthOptionsM: [Number],
    colorIds: [String],
    profile: String,
    renderKind: String,
    modelUrl: String,
    animationProfile: { type: String, enum: ["NONE", "SECTIONAL", "ROLLER", "TILTING"], default: "NONE" },
    // Parametry z karty technicznej producenta. `uValues` to wartości badane —
    // mają pierwszeństwo przed U wyliczonym z lambdy.
    specs: {
      coreType: String,
      lambdaWmK: Number,
      uValues: [{ _id: false, thicknessMm: Number, uWm2K: Number }],
      fireClass: String,
      datasheetUrl: String,
    },
    metadata: Schema.Types.Mixed,
  },
  timestamps,
);
catalogProductSchema.index({ kind: 1, manufacturerKey: 1, key: 1 }, { unique: true });

const materialFinishSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    hex: String,
    roles: [String],
    status: { type: String, enum: ["DRAFT", "PUBLISHED", "ARCHIVED"], default: "DRAFT" },
    maps: Schema.Types.Mixed,
    metadata: Schema.Types.Mixed,
  },
  timestamps,
);

const presetSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    status: { type: String, enum: ["DRAFT", "PUBLISHED", "ARCHIVED"], default: "DRAFT" },
    version: { type: Number, default: 1 },
    dimensions: Schema.Types.Mixed,
    dimensionLimits: Schema.Types.Mixed,
    defaultConfiguration: Schema.Types.Mixed,
  },
  timestamps,
);

const counterSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Number, default: 0 },
  },
  timestamps,
);

const auditLogSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, index: true },
    actorClerkUserId: { type: String, index: true },
    actorType: { type: String, enum: ["USER", "SUPERADMIN", "SYSTEM"], required: true },
    action: { type: String, required: true, index: true },
    entityType: { type: String, required: true },
    entityId: String,
    before: Schema.Types.Mixed,
    after: Schema.Types.Mixed,
    metadata: Schema.Types.Mixed,
  },
  timestamps,
);

const consentEventSchema = new Schema(
  {
    consentId: { type: String, required: true, index: true },
    action: {
      type: String,
      enum: ["ACCEPT_ALL", "REJECT_OPTIONAL", "SAVE_PREFERENCES", "REVOKE"],
      required: true,
    },
    policyVersion: { type: String, required: true },
    analytics: { type: Boolean, required: true },
    marketing: { type: Boolean, required: true },
    decidedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true, minimize: false },
);
consentEventSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Company = models.Company || model("Company", companySchema);
export const CompanyMembership =
  models.CompanyMembership || model("CompanyMembership", companyMembershipSchema);
export const CompanySettings = models.CompanySettings || model("CompanySettings", companySettingsSchema);
export const CompanyPriceList =
  models.CompanyPriceList || model("CompanyPriceList", companyPriceListSchema);
export const CompanyPriceListVersion =
  models.CompanyPriceListVersion || model("CompanyPriceListVersion", companyPriceListVersionSchema);
export const Plan = models.Plan || model("Plan", planSchema);
export const PlanVersion = models.PlanVersion || model("PlanVersion", planVersionSchema);
export const Subscription = models.Subscription || model("Subscription", subscriptionSchema);
export const FeatureOverride = models.FeatureOverride || model("FeatureOverride", featureOverrideSchema);
export const Order = models.Order || model("Order", orderSchema);
export const OrderEvent = models.OrderEvent || model("OrderEvent", orderEventSchema);
export const Payment = models.Payment || model("Payment", paymentSchema);
export const WebhookEvent = models.WebhookEvent || model("WebhookEvent", webhookEventSchema);
export const CatalogManufacturer =
  models.CatalogManufacturer || model("CatalogManufacturer", catalogManufacturerSchema);
export const CatalogProduct = models.CatalogProduct || model("CatalogProduct", catalogProductSchema);
export const MaterialFinish = models.MaterialFinish || model("MaterialFinish", materialFinishSchema);
export const Preset = models.Preset || model("Preset", presetSchema);
export const Counter = models.Counter || model("Counter", counterSchema);
export const AuditLog = models.AuditLog || model("AuditLog", auditLogSchema);
export const ConsentEvent = models.ConsentEvent || model("ConsentEvent", consentEventSchema);
