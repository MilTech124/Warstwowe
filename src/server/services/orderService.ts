import { z } from "zod";
import { connectMongo } from "@/server/db/connection";
import { Company, Counter, Order, OrderEvent } from "@/server/db/models";
import { isSmtpConfigured, sendTransactionalEmail } from "@/server/email/smtp";
import { getConfiguratorBootstrap } from "@/server/services/companyService";
import { getPublishedPriceList } from "@/server/services/priceListService";
import { quoteFromConfiguration } from "@/domain/pricing/quote";
import type { ConfiguratorBootstrap, OrderCreateInput } from "@/types/saas";
import { createDemoOrder } from "@/server/demoOrders";
import { getDemoPublishedPriceList } from "@/server/demoState";

export const orderCreateSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(2).max(160),
    address: z.string().trim().max(240).optional(),
    phone: z.string().trim().min(5).max(40),
    email: z.string().trim().email().max(160),
  }),
  notes: z.string().trim().max(2000).optional(),
  consent: z.literal(true).optional(),
  privacyNoticeAccepted: z.literal(true, {
    error: "Potwierdź zapoznanie się z informacją o przetwarzaniu danych.",
  }),
  privacyNoticeVersion: z.number().int().positive(),
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
  // Cena liczona jest wyłącznie serwerowo; cokolwiek klient przysłał, odpada.
  delete configuration.quote;
  configuration.schemaVersion = 12;

  if (
    bootstrap.settings.allowedPresetIds.length
    && !bootstrap.settings.allowedPresetIds.includes(configuration.preset)
  ) {
    throw new Error("Wybrany preset nie jest już dostępny w tej firmie.");
  }

  if (
    bootstrap.settings.allowedRoofTypeIds.length
    && !bootstrap.settings.allowedRoofTypeIds.includes(configuration.roof?.type)
  ) {
    throw new Error("Wybrany typ dachu nie jest już dostępny.");
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

  if (!bootstrap.capabilities.flashings) {
    configuration.flashings = { ...(configuration.flashings || {}), enabled: false };
  }
  if (!bootstrap.capabilities.gutters) {
    configuration.gutters = { ...(configuration.gutters || {}), enabled: false };
  }

  const cladding = configuration.cladding || {};
  if (
    bootstrap.settings.allowedWallPanelModelIds.length
    && !bootstrap.settings.allowedWallPanelModelIds.includes(cladding.model)
  ) {
    throw new Error("Wybrany model płyty ściennej nie jest już dostępny.");
  }
  if (
    bootstrap.settings.allowedRoofPanelModelIds.length
    && !bootstrap.settings.allowedRoofPanelModelIds.includes(cladding.roofModel)
  ) {
    throw new Error("Wybrany model płyty dachowej nie jest już dostępny.");
  }
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
      bootstrap.settings.allowedOpeningKinds.length
      && !bootstrap.settings.allowedOpeningKinds.includes(opening.kind)
    ) {
      throw new Error("Wybrany rodzaj otworu nie jest już dostępny.");
    }
    if (opening.kind === "gate") {
      if (bootstrap.settings.allowedGateTypeIds.length && !bootstrap.settings.allowedGateTypeIds.includes(opening.gateType)) {
        throw new Error("Wybrany typ bramy nie jest już dostępny.");
      }
      if (bootstrap.settings.allowedGateModelIds.length && !bootstrap.settings.allowedGateModelIds.includes(opening.model)) {
        throw new Error("Wybrany model bramy nie jest już dostępny.");
      }
    }
    if (opening.kind === "door" && bootstrap.settings.allowedDoorModelIds.length && !bootstrap.settings.allowedDoorModelIds.includes(opening.model)) {
      throw new Error("Wybrany model drzwi nie jest już dostępny.");
    }
    if ((opening.kind === "window" || opening.kind === "roofWindow") && bootstrap.settings.allowedWindowModelIds.length && !bootstrap.settings.allowedWindowModelIds.includes(opening.model)) {
      throw new Error("Wybrany model okna nie jest już dostępny.");
    }
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
  if (!isSmtpConfigured() || !bootstrap.capabilities.emailNotifications) return;
  if (!bootstrap.settings.orderNotificationEmails.length) return;

  const escapeHtml = (value: unknown) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  await sendTransactionalEmail({
    to: bootstrap.settings.orderNotificationEmails,
    replyTo: order.customer.email,
    subject: `Nowe zamówienie ${order.number}`,
    text: [
      `Nowe zamówienie ${order.number}`,
      `Klient: ${order.customer.name}`,
      `E-mail: ${order.customer.email}`,
      `Telefon: ${order.customer.phone}`,
    ].join("\n"),
    html: `<h2>Nowe zamówienie ${escapeHtml(order.number)}</h2><p>Klient: ${escapeHtml(order.customer.name)}</p><p>E-mail: ${escapeHtml(order.customer.email)}</p><p>Telefon: ${escapeHtml(order.customer.phone)}</p>`,
  });
}

export async function createCompanyOrder(slug: string, rawInput: unknown) {
  const input = orderCreateSchema.parse(rawInput) as OrderCreateInput;
  const bootstrap = await getConfiguratorBootstrap(slug);
  if (!bootstrap) throw new Error("Firma nie istnieje.");
  if (!bootstrap.accessActive || !bootstrap.capabilities.orders) {
    throw new Error("Konfigurator firmy nie przyjmuje obecnie zamówień.");
  }
  const privacyProfile = bootstrap.company.privacyProfile;
  if (!privacyProfile) {
    throw new Error("Firma nie opublikowała jeszcze wymaganej informacji o przetwarzaniu danych.");
  }
  const privacyNoticeVersion = input.privacyNoticeVersion;
  if (privacyNoticeVersion !== privacyProfile.noticeVersion) {
    throw new Error("Informacja o przetwarzaniu danych zmieniła się. Odśwież stronę i przeczytaj ją ponownie.");
  }
  if (input.settingsVersion !== bootstrap.settings.version) {
    throw new Error("Oferta firmy zmieniła się. Odśwież konfigurator i sprawdź wybór ponownie.");
  }
  const configurationSnapshot = sanitizeConfiguration(input.configuration, bootstrap);

  if (bootstrap.company.id === "demo-company") {
    const priceList = getDemoPublishedPriceList();
    const quote = bootstrap.capabilities.pricing
      ? quoteFromConfiguration(configurationSnapshot, priceList.rates, {
          currency: priceList.currency,
          priceListVersion: priceList.version,
        })
      : null;
    const order = createDemoOrder({
      customer: input.customer,
      notes: input.notes,
      settingsVersion: input.settingsVersion,
      catalogVersion: bootstrap.catalog.version,
      configurationSnapshot,
      priceListVersion: quote ? priceList.version : null,
      quote,
    });
    return { order: { id: String(order._id), number: order.number, status: order.status } };
  }

  if (!(await connectMongo())) {
    return {
      order: {
        id: `demo-${Date.now()}`,
        number: `DEMO/${new Date().getUTCFullYear()}/${String(Date.now()).slice(-4)}`,
        status: "NEW",
      },
    };
  }

  const company = await Company.findById(bootstrap.company.id);
  if (!company) throw new Error("Firma nie istnieje.");

  // Wycena zawsze po stronie serwera, z oczyszczonej konfiguracji i
  // opublikowanego cennika — cena nigdy nie pochodzi od klienta.
  // Błąd wyceny nie może zablokować zapisania zamówienia.
  let quote: unknown = null;
  let priceListVersion: number | null = null;
  if (bootstrap.capabilities.pricing) {
    try {
      const priceList = await getPublishedPriceList(company._id);
      if (priceList) {
        priceListVersion = priceList.version;
        quote = quoteFromConfiguration(configurationSnapshot, priceList.rates, {
          currency: priceList.currency,
          priceListVersion: priceList.version,
        });
      }
    } catch (error) {
      console.error("[orderService] wycena nie powiodła się", error);
    }
  }

  const number = await nextOrderNumber(company);
  const order = await Order.create({
    companyId: company._id,
    number,
    status: "NEW",
    customer: input.customer,
    consent: input.consent,
    privacyNoticeAccepted: true,
    privacyNoticeAcceptedAt: new Date(),
    privacyNoticeVersion,
    notes: input.notes,
    settingsVersion: input.settingsVersion,
    catalogVersion: bootstrap.catalog.version,
    priceListVersion,
    quote,
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
  };
}
