import { Schema, model, models } from "mongoose";
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

const companySchema = new Schema(
  {
    clerkOrgId: { type: String, required: true, unique: true, index: true },
    ownerClerkUserId: { type: String, required: true, index: true },
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

const companySettingsSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, required: true, unique: true, index: true, ref: "Company" },
    version: { type: Number, default: 1 },
    publishedVersion: { type: Number, default: 0 },
    published: { type: Boolean, default: false },
    manuallyEnabled: { type: Boolean, default: true },
    defaultPresetId: { type: String, default: "single_garage" },
    allowedPresetIds: { type: [String], default: ["single_garage", "double_garage"] },
    allowedWallColorIds: { type: [String], default: [] },
    allowedRoofColorIds: { type: [String], default: [] },
    allowedPanelManufacturerIds: { type: [String], default: ["default_panels", "steelprofil"] },
    allowedGateManufacturerIds: { type: [String], default: ["wisniowski"] },
    disabledFeatures: { type: [String], enum: FEATURE_KEYS, default: [] },
    orderNotificationEmails: { type: [String], default: [] },
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
    payuExtCustomerId: String,
    cardMask: String,
    cardBrand: String,
    lastPaymentAt: Date,
  },
  timestamps,
);

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
    publicTokenHash: { type: String, required: true, select: false },
    status: { type: String, enum: ORDER_STATUSES, default: "NEW", index: true },
    customer: {
      name: { type: String, required: true },
      address: String,
      phone: { type: String, required: true },
      email: { type: String, required: true },
    },
    consent: { type: Boolean, required: true },
    notes: String,
    assignedClerkUserId: String,
    configurationSnapshot: { type: Schema.Types.Mixed, required: true },
    settingsVersion: { type: Number, required: true },
    catalogVersion: { type: Number, default: 1 },
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
    extOrderId: { type: String, required: true, unique: true, index: true },
    payuOrderId: { type: String, index: true },
    status: { type: String, required: true, index: true },
    amountGross: { type: Number, required: true },
    packageCode: { type: String, enum: PACKAGE_CODES },
    currency: { type: String, default: "PLN" },
    billingMode: { type: String, enum: BILLING_MODES },
    periodStart: Date,
    periodEnd: Date,
    rawStatus: Schema.Types.Mixed,
  },
  timestamps,
);

const billingAttemptSchema = new Schema(
  {
    companyId: { type: Schema.Types.ObjectId, required: true, index: true },
    subscriptionId: { type: Schema.Types.ObjectId, required: true, index: true },
    attemptKey: { type: String, required: true, unique: true, index: true },
    status: { type: String, required: true },
    errorCode: String,
    errorMessage: String,
    attemptedAt: { type: Date, default: Date.now },
  },
  timestamps,
);

const webhookEventSchema = new Schema(
  {
    provider: { type: String, default: "PAYU" },
    eventKey: { type: String, required: true, unique: true, index: true },
    signature: String,
    status: String,
    payload: Schema.Types.Mixed,
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

export const Company = models.Company || model("Company", companySchema);
export const CompanySettings = models.CompanySettings || model("CompanySettings", companySettingsSchema);
export const Plan = models.Plan || model("Plan", planSchema);
export const PlanVersion = models.PlanVersion || model("PlanVersion", planVersionSchema);
export const Subscription = models.Subscription || model("Subscription", subscriptionSchema);
export const FeatureOverride = models.FeatureOverride || model("FeatureOverride", featureOverrideSchema);
export const Order = models.Order || model("Order", orderSchema);
export const OrderEvent = models.OrderEvent || model("OrderEvent", orderEventSchema);
export const Payment = models.Payment || model("Payment", paymentSchema);
export const BillingAttempt = models.BillingAttempt || model("BillingAttempt", billingAttemptSchema);
export const WebhookEvent = models.WebhookEvent || model("WebhookEvent", webhookEventSchema);
export const CatalogManufacturer =
  models.CatalogManufacturer || model("CatalogManufacturer", catalogManufacturerSchema);
export const CatalogProduct = models.CatalogProduct || model("CatalogProduct", catalogProductSchema);
export const MaterialFinish = models.MaterialFinish || model("MaterialFinish", materialFinishSchema);
export const Preset = models.Preset || model("Preset", presetSchema);
export const Counter = models.Counter || model("Counter", counterSchema);
export const AuditLog = models.AuditLog || model("AuditLog", auditLogSchema);
