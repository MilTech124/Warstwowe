import { createHash, randomBytes } from "node:crypto";
import { Resend } from "resend";
import { z } from "zod";
import { PACKAGE_DEFINITIONS } from "@/domain/plans";
import { connectMongo } from "@/server/db/connection";
import { Company, Counter, Order, OrderEvent } from "@/server/db/models";
import { getConfiguratorBootstrap } from "@/server/services/companyService";
import type { ConfiguratorBootstrap, OrderCreateInput } from "@/types/saas";

export const orderCreateSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(2).max(160),
    address: z.string().trim().max(240).optional(),
    phone: z.string().trim().min(5).max(40),
    email: z.string().trim().email().max(160),
  }),
  notes: z.string().trim().max(2000).optional(),
  consent: z.literal(true),
  settingsVersion: z.number().int().positive(),
  configuration: z.record(z.string(), z.unknown()).and(
    z.object({ schemaVersion: z.number().int().min(12) }),
  ),
});

export function sanitizeConfiguration(
  input: Record<string, any>,
  bootstrap: ConfiguratorBootstrap,
) {
  const configuration = structuredClone(input);
  delete configuration.order;
  configuration.schemaVersion = 12;

  if (
    bootstrap.settings.allowedPresetIds.length
    && !bootstrap.settings.allowedPresetIds.includes(configuration.preset)
  ) {
    throw new Error("Wybrany preset nie jest już dostępny w tej firmie.");
  }

  if (!bootstrap.capabilities.frontProjection) {
    configuration.frontProjection = { ...(configuration.frontProjection || {}), depthM: 0 };
  }
  if (!bootstrap.capabilities.lighting) {
    configuration.lighting = {
      interiorLighting: false,
      roofPerimeterLed: false,
      gateLamps: false,
      exteriorSconces: false,
      frontProjectionLed: false,
    };
  }
  if (!bootstrap.capabilities.structureView) {
    configuration.viewMode = "full";
    if (configuration.cameraMode === "structure") configuration.cameraMode = "orbit";
  }
  if (!bootstrap.capabilities.gateAnimations && Array.isArray(configuration.openings)) {
    configuration.openings = configuration.openings.map((opening: any) =>
      opening.kind === "gate" ? { ...opening, open: false } : opening,
    );
  }

  const cladding = configuration.cladding || {};
  if (
    bootstrap.settings.allowedPanelManufacturerIds.length
    && !bootstrap.settings.allowedPanelManufacturerIds.includes(cladding.manufacturer)
  ) {
    throw new Error("Wybrany producent płyt nie jest już dostępny.");
  }
  if (
    bootstrap.settings.allowedWallColorIds.length
    && !bootstrap.settings.allowedWallColorIds.includes(cladding.color)
  ) {
    throw new Error("Wybrany kolor ściany nie jest już dostępny.");
  }
  if (
    bootstrap.settings.allowedRoofColorIds.length
    && !bootstrap.settings.allowedRoofColorIds.includes(cladding.roofColor)
  ) {
    throw new Error("Wybrany kolor dachu nie jest już dostępny.");
  }
  for (const opening of configuration.openings || []) {
    if (
      opening.kind === "gate"
      && bootstrap.settings.allowedGateManufacturerIds.length
      && !bootstrap.settings.allowedGateManufacturerIds.includes(opening.manufacturer)
    ) {
      throw new Error("Wybrany producent bramy nie jest już dostępny.");
    }
  }
  return configuration;
}

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function nextOrderNumber(company: any) {
  const year = new Date().getUTCFullYear();
  const key = `order:${company._id}:${year}`;
  const counter = await Counter.findOneAndUpdate(
    { key },
    { $inc: { value: 1 } },
    { upsert: true, new: true },
  );
  return `${company.code}/${year}/${String(counter.value).padStart(4, "0")}`;
}

async function sendOrderNotification(bootstrap: ConfiguratorBootstrap, order: any) {
  if (!process.env.RESEND_API_KEY || !bootstrap.capabilities.emailNotifications) return;
  if (!bootstrap.settings.orderNotificationEmails.length) return;
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: process.env.MAIL_FROM || "Konfigurator <noreply@example.pl>",
    to: bootstrap.settings.orderNotificationEmails,
    subject: `Nowe zamówienie ${order.number}`,
    html: `<h2>Nowe zamówienie ${order.number}</h2><p>Klient: ${order.customer.name}</p><p>E-mail: ${order.customer.email}</p><p>Telefon: ${order.customer.phone}</p>`,
  });
}

export async function createCompanyOrder(slug: string, rawInput: unknown) {
  const input = orderCreateSchema.parse(rawInput) as OrderCreateInput;
  const bootstrap = await getConfiguratorBootstrap(slug);
  if (!bootstrap) throw new Error("Firma nie istnieje.");
  if (!bootstrap.accessActive || !bootstrap.capabilities.orders) {
    throw new Error("Konfigurator firmy nie przyjmuje obecnie zamówień.");
  }
  if (input.settingsVersion !== bootstrap.settings.version) {
    throw new Error("Oferta firmy zmieniła się. Odśwież konfigurator i sprawdź wybór ponownie.");
  }
  const configurationSnapshot = sanitizeConfiguration(input.configuration, bootstrap);
  const receiptToken = randomBytes(32).toString("base64url");

  if (bootstrap.company.id === "demo-company" || !(await connectMongo())) {
    return {
      order: {
        id: `demo-${Date.now()}`,
        number: `DEMO/${new Date().getUTCFullYear()}/${String(Date.now()).slice(-4)}`,
        status: "NEW",
      },
      receiptToken,
    };
  }

  const company = await Company.findById(bootstrap.company.id);
  if (!company) throw new Error("Firma nie istnieje.");
  const number = await nextOrderNumber(company);
  const order = await Order.create({
    companyId: company._id,
    number,
    publicTokenHash: tokenHash(receiptToken),
    status: "NEW",
    customer: input.customer,
    consent: input.consent,
    notes: input.notes,
    settingsVersion: input.settingsVersion,
    catalogVersion: bootstrap.catalog.version,
    configurationSnapshot,
    submittedAt: new Date(),
  });
  await OrderEvent.create({
    companyId: company._id,
    orderId: order._id,
    type: "CREATED",
    toStatus: "NEW",
    metadata: { source: "PUBLIC_CONFIGURATOR" },
  });
  await sendOrderNotification(bootstrap, order).catch(() => undefined);
  return {
    order: { id: String(order._id), number: order.number, status: order.status },
    receiptToken,
  };
}

export function verifyOrderReceiptToken(rawToken: string, storedHash: string) {
  return tokenHash(rawToken) === storedHash;
}
