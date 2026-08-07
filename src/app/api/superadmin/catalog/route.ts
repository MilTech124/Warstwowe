import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperadmin } from "@/server/auth";
import { writeAudit } from "@/server/audit";
import { CatalogManufacturer, CatalogProduct } from "@/server/db/models";
import { connectMongo } from "@/server/db/connection";
import { apiError } from "@/server/apiError";
import { isBlobImageUrl } from "@/lib/blobImage";

const logoUrlSchema = z.string().refine(
  (value) => value === "" || isBlobImageUrl(value) || z.string().url().safeParse(value).success,
  "Podaj prawidłowy adres logo.",
);

const catalogSchema = z.discriminatedUnion("entity", [
  z.object({
    entity: z.literal("manufacturer"),
    id: z.string().optional(),
    kind: z.enum(["PANEL", "GATE"]),
    key: z.string().trim().min(2).max(80).regex(/^[a-z0-9_-]+$/),
    name: z.string().trim().min(2).max(120),
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
    logoUrl: logoUrlSchema.optional(),
    websiteUrl: z.string().url().or(z.literal("")).optional(),
    tagline: z.string().trim().max(120).optional(),
    description: z.string().trim().max(600).optional(),
  }),
  z.object({
    entity: z.literal("product"),
    id: z.string().optional(),
    kind: z.enum(["WALL_PANEL", "ROOF_PANEL", "GATE"]),
    manufacturerKey: z.string().trim().min(2).max(80),
    key: z.string().trim().min(2).max(80).regex(/^[a-z0-9_-]+$/),
    name: z.string().trim().min(2).max(160),
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
    thicknessMm: z.array(z.number().positive()).optional(),
    lengthOptionsM: z.array(z.number().positive()).optional(),
    colorIds: z.array(z.string()).optional(),
    profile: z.string().max(120).optional(),
    renderKind: z.string().max(120).optional(),
    modelUrl: z.string().url().or(z.literal("")).optional(),
    animationProfile: z.enum(["NONE", "SECTIONAL", "ROLLER", "TILTING"]).optional(),
    specs: z
      .object({
        coreType: z.string().trim().max(40).optional(),
        lambdaWmK: z.number().positive().max(1).optional(),
        uValues: z
          .array(z.object({ thicknessMm: z.number().positive(), uWm2K: z.number().positive() }))
          .optional(),
        fireClass: z.string().trim().max(40).optional(),
        datasheetUrl: z.string().url().or(z.literal("")).optional(),
      })
      .optional(),
  }),
]);

export async function POST(request: NextRequest) {
  try {
    const identity = await requireSuperadmin();
    if (!(await connectMongo())) {
      return NextResponse.json({ error: "Baza danych jest niedostępna." }, { status: 503 });
    }
    const input = catalogSchema.parse(await request.json());
    const Model = input.entity === "manufacturer" ? CatalogManufacturer : CatalogProduct;
    // Bez `id` szukamy po kluczu naturalnym: pozycja z katalogu statycznego nie
    // ma jeszcze dokumentu, a pierwszy zapis ma ją założyć, nie odbić się o 409.
    const naturalKey = input.entity === "manufacturer"
      ? { kind: input.kind, key: input.key }
      : { kind: input.kind, manufacturerKey: input.manufacturerKey, key: input.key };
    const before = input.id
      ? await Model.findById(input.id).lean()
      : await Model.findOne(naturalKey).lean();
    const version = Number((before as any)?.version || 0) + 1;
    const values = { ...input, version };
    delete (values as any).entity;
    delete (values as any).id;
    const targetId = input.id || (before as any)?._id;
    const document = targetId
      ? await Model.findByIdAndUpdate(targetId, { $set: values }, { new: true }).lean()
      : await Model.create(values);
    await writeAudit({
      actorClerkUserId: identity.userId,
      actorType: "SUPERADMIN",
      action: input.status === "PUBLISHED" ? "catalog.published" : "catalog.saved",
      entityType: input.entity === "manufacturer" ? "CatalogManufacturer" : "CatalogProduct",
      entityId: String((document as any)._id),
      before,
      after: document,
    });
    return NextResponse.json({ document });
  } catch (error: any) {
    if (error?.code === 11000) {
      return NextResponse.json({ error: "Taki klucz katalogowy już istnieje." }, { status: 409 });
    }
    return apiError(error, "Nie udało się zapisać katalogu.");
  }
}
