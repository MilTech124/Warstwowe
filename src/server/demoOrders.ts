import { getPresetDefaults, getPresetOpenings, PRESETS } from "@/config/catalog";
import { DEFAULT_FRONT_PROJECTION } from "@/config/frontProjection";
import { DEFAULT_LIGHTING } from "@/config/lighting";
import { quoteFromConfiguration } from "@/domain/pricing/quote";
import { DEFAULT_STRUCTURE } from "@/scene/structure/inputs";
import { getDemoPublishedPriceList } from "@/server/demoState";

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

type DemoOrderState = { orders: any[]; events: Record<string, any[]>; nextNumber: number };

const demoGlobal = globalThis as typeof globalThis & {
  __warstwoweDemoOrders?: DemoOrderState;
};

function initialState(): DemoOrderState {
  const configurationSnapshot = demoConfigurationSnapshot();
  const priceList = getDemoPublishedPriceList();
  const quote = quoteFromConfiguration(configurationSnapshot, priceList.rates, {
    currency: priceList.currency,
    priceListVersion: priceList.version,
  });
  const now = Date.now();
  const rows = [
    ["demo-order-1", "DEMO/2026/0003", "NEW", "Jan Kowalski", "jan@example.pl", "+48 500 100 200", now - 2 * 3600000],
    ["demo-order-2", "DEMO/2026/0002", "QUOTED", "Bud-Montaż Sp. z o.o.", "biuro@budmontaz.pl", "+48 500 300 400", now - 86400000],
    ["demo-order-3", "DEMO/2026/0001", "ACCEPTED", "Anna Nowak", "anna@example.pl", "+48 500 555 555", now - 4 * 86400000],
  ];
  const orders = rows.map(([id, number, status, name, email, phone, submittedAt]) => ({
    _id: id,
    number,
    status,
    customer: { name, email, phone },
    submittedAt: new Date(submittedAt as number).toISOString(),
    notes: "Klient prosi o kontakt po godzinie 16:00.",
    assignedClerkUserId: "demo-sales",
    settingsVersion: 2,
    catalogVersion: 1,
    priceListVersion: priceList.version,
    quote: structuredClone(quote),
    manualPrice: null,
    configurationSnapshot: structuredClone(configurationSnapshot),
  }));
  return {
    orders,
    nextNumber: 4,
    events: Object.fromEntries(orders.map((order) => [String(order._id), [
      { _id: `${order._id}-created`, type: "ORDER_CREATED", createdAt: order.submittedAt },
      { _id: `${order._id}-note`, type: "NOTE_ADDED", note: "Prośba o wycenę transportu.", createdAt: new Date().toISOString() },
    ]])),
  };
}

function state() {
  demoGlobal.__warstwoweDemoOrders ??= initialState();
  return demoGlobal.__warstwoweDemoOrders;
}

export function getDemoOrders() {
  return structuredClone(state().orders);
}

export function getDemoOrder(orderId: string) {
  const current = state();
  const order = current.orders.find((item) => String(item._id) === orderId) ?? current.orders[0];
  if (!order) return null;
  return {
    order: structuredClone(order),
    events: structuredClone(current.events[String(order._id)] ?? []),
  };
}

export function createDemoOrder(input: {
  customer: Record<string, unknown>;
  notes?: string;
  settingsVersion: number;
  catalogVersion: number;
  configurationSnapshot: Record<string, unknown>;
  priceListVersion: number | null;
  quote: unknown;
}) {
  const current = state();
  const id = `demo-order-${Date.now()}`;
  const number = `DEMO/${new Date().getUTCFullYear()}/${String(current.nextNumber).padStart(4, "0")}`;
  current.nextNumber += 1;
  const order = {
    _id: id,
    number,
    status: "NEW",
    customer: input.customer,
    notes: input.notes || "",
    assignedClerkUserId: null,
    settingsVersion: input.settingsVersion,
    catalogVersion: input.catalogVersion,
    priceListVersion: input.priceListVersion,
    quote: input.quote,
    manualPrice: null,
    configurationSnapshot: input.configurationSnapshot,
    submittedAt: new Date().toISOString(),
  };
  current.orders.unshift(order);
  current.events[id] = [{
    _id: `${id}-created`,
    type: "ORDER_CREATED",
    createdAt: order.submittedAt,
  }];
  return structuredClone(order);
}

export function updateDemoOrder(orderId: string, input: {
  status?: string;
  assignedClerkUserId?: string | null;
  note?: string;
  manualPrice?: { totalGross: number; reason?: string | null } | null;
}) {
  const current = state();
  const order = current.orders.find((item) => String(item._id) === orderId);
  if (!order) return null;
  const createdAt = new Date().toISOString();
  const events = current.events[orderId] ?? (current.events[orderId] = []);
  if (input.status && input.status !== order.status) {
    events.unshift({ _id: `event-${Date.now()}-status`, type: "STATUS_CHANGED", fromStatus: order.status, toStatus: input.status, createdAt });
    order.status = input.status;
  }
  if (input.assignedClerkUserId !== undefined) {
    order.assignedClerkUserId = input.assignedClerkUserId;
    events.unshift({ _id: `event-${Date.now()}-assignee`, type: "ASSIGNEE_CHANGED", createdAt });
  }
  if (input.note) {
    order.notes = [order.notes, input.note].filter(Boolean).join("\n\n");
    events.unshift({ _id: `event-${Date.now()}-note`, type: "NOTE_ADDED", note: input.note, createdAt });
  }
  if (input.manualPrice !== undefined) {
    order.manualPrice = input.manualPrice ? {
      totalGross: input.manualPrice.totalGross,
      reason: input.manualPrice.reason || null,
      updatedAt: createdAt,
      updatedBy: "demo-owner",
    } : null;
    events.unshift({
      _id: `event-${Date.now()}-price`,
      type: input.manualPrice ? "PRICE_ADJUSTED" : "PRICE_RESTORED",
      note: input.manualPrice?.reason || undefined,
      metadata: { totalGross: input.manualPrice?.totalGross ?? null },
      createdAt,
    });
  }
  return structuredClone(order);
}
