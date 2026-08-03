import { normalizePriceList } from "@/domain/pricing/priceList";
import { writeAudit } from "@/server/audit";
import { connectMongo } from "@/server/db/connection";
import { CompanyPriceList, CompanyPriceListVersion } from "@/server/db/models";

/**
 * connectMongo() rzuca przy problemie z połączeniem (DNS, chwilowa
 * niedostępność Atlasu). Cennik jest dodatkiem do panelu, więc awaria bazy ma
 * degradować widok, a nie wywalać całą stronę — tak samo jak findCompanyBySlug.
 */
async function mongoReady() {
  try {
    return Boolean(await connectMongo());
  } catch {
    return false;
  }
}

export const EMPTY_PRICE_LIST_EDITOR_STATE = {
  version: 0,
  publishedVersion: 0,
  published: false,
  showToCustomer: false,
  currency: "PLN",
  draft: normalizePriceList({}),
};

export interface PublishedPriceList {
  version: number;
  rates: Record<string, unknown>;
  currency: string;
  showToCustomer: boolean;
}

/**
 * Opublikowany cennik firmy albo null, gdy firma jeszcze nic nie opublikowała.
 * Zamówienia wyceniamy wyłącznie po opublikowanych stawkach — szkic jest prywatny.
 */
export async function getPublishedPriceList(companyId: unknown): Promise<PublishedPriceList | null> {
  if (!(await mongoReady())) return null;
  const document: any = await CompanyPriceList.findOne({ companyId }).lean();
  if (!document?.published || !document.publishedVersion) return null;
  return {
    version: document.publishedVersion,
    rates: normalizePriceList(document.publishedRates) as unknown as Record<string, unknown>,
    currency: document.currency || "PLN",
    showToCustomer: Boolean(document.showToCustomer),
  };
}

/** Stawki konkretnej wersji — do przeliczeń historycznych zamówień. */
export async function getPriceListVersion(companyId: unknown, version: number) {
  if (!(await mongoReady())) return null;
  const document: any = await CompanyPriceListVersion.findOne({ companyId, version }).lean();
  if (!document) return null;
  return { version: document.version, rates: normalizePriceList(document.rates) };
}

/** Szkic + wersja opublikowana, na potrzeby edytora cennika w panelu. */
export async function getPriceListEditorBootstrap(companyId: unknown) {
  if (!(await mongoReady())) return EMPTY_PRICE_LIST_EDITOR_STATE;
  const document: any = await CompanyPriceList.findOne({ companyId }).lean().catch(() => null);
  if (!document) return EMPTY_PRICE_LIST_EDITOR_STATE;
  return {
    version: document.version || 0,
    publishedVersion: document.publishedVersion || 0,
    published: Boolean(document.published),
    showToCustomer: Boolean(document.showToCustomer),
    currency: document.currency || "PLN",
    // Szkic ma pierwszeństwo; gdy go nie ma, edytujemy ostatnią publikację.
    draft: normalizePriceList(
      Object.keys(document.draft || {}).length ? document.draft : document.publishedRates,
    ),
  };
}

export async function savePriceList({
  companyId,
  rates,
  showToCustomer,
  publish,
  actorClerkUserId,
  actorType = "USER",
}: {
  companyId: unknown;
  rates: unknown;
  showToCustomer: boolean;
  publish: boolean;
  actorClerkUserId?: string | null;
  actorType?: "USER" | "SUPERADMIN";
}) {
  if (!(await connectMongo())) throw new Error("MongoDB nie jest skonfigurowane.");

  const normalized = normalizePriceList(rates);
  const before: any = await CompanyPriceList.findOne({ companyId }).lean();
  const nextVersion = Number(before?.version || 0) + 1;

  const patch: Record<string, unknown> = {
    version: nextVersion,
    draft: normalized,
    showToCustomer,
  };
  if (publish) {
    patch.published = true;
    patch.publishedVersion = nextVersion;
    patch.publishedRates = normalized;
  }

  const updated: any = await CompanyPriceList.findOneAndUpdate(
    { companyId },
    { $set: patch },
    { new: true, upsert: true },
  ).lean();

  if (publish) {
    // Historia jest tylko do dopisywania, więc zamówienia wycenione starą
    // wersją zawsze mogą odtworzyć swoje stawki.
    await CompanyPriceListVersion.updateOne(
      { companyId, version: nextVersion },
      { $set: { rates: normalized, currency: updated.currency || "PLN", publishedBy: actorClerkUserId } },
      { upsert: true },
    );
  }

  await writeAudit({
    companyId,
    actorClerkUserId: actorClerkUserId || undefined,
    actorType,
    action: publish ? "pricelist.published" : "pricelist.draft_saved",
    entityType: "CompanyPriceList",
    entityId: String(updated._id),
    before,
    after: { version: nextVersion, published: Boolean(patch.published), showToCustomer },
  });

  return {
    version: nextVersion,
    publishedVersion: updated.publishedVersion || 0,
    published: Boolean(updated.published),
    showToCustomer: Boolean(updated.showToCustomer),
    currency: updated.currency || "PLN",
    draft: normalized,
  };
}
