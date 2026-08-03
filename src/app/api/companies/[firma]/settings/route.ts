import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { FEATURE_KEYS } from "@/types/saas";
import {
  AuthError,
  getRequestIdentity,
  requireCompanyMember,
  requireCompanyWriteIntent,
} from "@/server/auth";
import { Company, CompanySettings } from "@/server/db/models";
import { demoModeEnabled, getConfiguratorBootstrap } from "@/server/services/companyService";
import { writeAudit } from "@/server/audit";
import { saveDemoState } from "@/server/demoState";
import { apiError } from "@/server/apiError";

const settingsSchema = z.object({
  branding: z.object({
    name: z.string().trim().min(2).max(120),
    logoUrl: z.string().url().or(z.literal("")).nullable().optional(),
    primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    supportEmail: z.string().email().or(z.literal("")).nullable().optional(),
    supportPhone: z.string().trim().max(40).nullable().optional(),
  }).optional(),
  settings: z.object({
    version: z.number().int().positive(),
    manuallyEnabled: z.boolean(),
    defaultPresetId: z.string().min(1),
    allowedPresetIds: z.array(z.string()).min(1),
    allowedRoofTypeIds: z.array(z.string()).min(1),
    allowedOpeningKinds: z.array(z.enum(["gate", "door", "window", "roofWindow"])).min(1),
    allowedWallColorIds: z.array(z.string()),
    allowedRoofColorIds: z.array(z.string()),
    allowedPanelManufacturerIds: z.array(z.string()).min(1),
    allowedGateManufacturerIds: z.array(z.string()).min(1),
    allowedWallPanelModelIds: z.array(z.string()).min(1),
    allowedRoofPanelModelIds: z.array(z.string()).min(1),
    allowedGateTypeIds: z.array(z.string()).min(1),
    allowedGateModelIds: z.array(z.string()).min(1),
    allowedDoorModelIds: z.array(z.string()).min(1),
    allowedWindowModelIds: z.array(z.string()).min(1),
    disabledFeatures: z.array(z.enum(FEATURE_KEYS)),
    orderNotificationEmails: z.array(z.string().email()),
    published: z.boolean().optional(),
  }),
  publish: z.boolean(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ firma: string }> },
) {
  try {
    const { firma } = await params;
    const input = settingsSchema.parse(await request.json());
    const bootstrap = await getConfiguratorBootstrap(firma);
    if (!bootstrap) throw new Error("Firma nie istnieje.");

    const globalPresets = new Set((bootstrap.catalog.presets as any[]).map((item) => item.key));
    if (input.settings.allowedPresetIds.some((key) => !globalPresets.has(key))) {
      throw new Error("Wybrano nieopublikowany preset.");
    }
    if (!input.settings.allowedPresetIds.includes(input.settings.defaultPresetId)) {
      throw new Error("Preset domyślny musi być włączony.");
    }
    const validateCatalogSelection = (
      selected: string[],
      entries: Array<Record<string, unknown>>,
      label: string,
    ) => {
      const allowed = new Set(entries.map((item) => String(item.key)));
      if (selected.some((key) => !allowed.has(key))) {
        throw new Error(`Wybrano niedostępną opcję: ${label}.`);
      }
    };
    validateCatalogSelection(input.settings.allowedRoofTypeIds, bootstrap.catalog.roofTypes, "typ dachu");
    validateCatalogSelection(input.settings.allowedOpeningKinds, bootstrap.catalog.openingKinds, "rodzaj otworu");
    validateCatalogSelection(input.settings.allowedPanelManufacturerIds, bootstrap.catalog.panelManufacturers, "producent płyt");
    validateCatalogSelection(input.settings.allowedGateManufacturerIds, bootstrap.catalog.gateManufacturers, "producent bram");
    validateCatalogSelection(input.settings.allowedWallPanelModelIds, bootstrap.catalog.wallPanelModels, "model płyty ściennej");
    validateCatalogSelection(input.settings.allowedRoofPanelModelIds, bootstrap.catalog.roofPanelModels, "model płyty dachowej");
    validateCatalogSelection(input.settings.allowedGateTypeIds, bootstrap.catalog.gateTypes, "typ bramy");
    validateCatalogSelection(input.settings.allowedGateModelIds, bootstrap.catalog.gateModels, "model bramy");
    validateCatalogSelection(input.settings.allowedDoorModelIds, bootstrap.catalog.doorModels, "model drzwi");
    validateCatalogSelection(input.settings.allowedWindowModelIds, bootstrap.catalog.windowModels, "model okna");
    if (input.settings.allowedOpeningKinds.includes("gate")) {
      const gateModels = bootstrap.catalog.gateModels as Array<Record<string, unknown>>;
      const missingType = input.settings.allowedGateTypeIds.find((typeKey) =>
        !gateModels.some((model) => String(model.typeKey) === typeKey && input.settings.allowedGateModelIds.includes(String(model.key))),
      );
      if (missingType) throw new Error("Każdy typ bramy musi mieć co najmniej jeden dostępny model.");
    }
    // The demo tenant has no membership records, so it cannot go through
    // requireCompanyMember — but it must still not accept anonymous writes.
    // `demoModeEnabled()` already rules production out.
    if (bootstrap.company.id === "demo-company" && demoModeEnabled()) {
      const identity = await getRequestIdentity();
      if (!identity.userId) {
        throw new AuthError("AUTH_REQUIRED", 401, "Zaloguj się, aby zmienić ustawienia demo.");
      }
      const demoState = saveDemoState(input);
      return NextResponse.json({
        settings: demoState.settings,
      });
    }

    const access = await requireCompanyMember(firma, ["OWNER", "ADMIN"]);
    requireCompanyWriteIntent(request, access);

    const companyId = (access as any).company._id;
    const before = await CompanySettings.findOne({ companyId }).lean();
    if (input.publish && input.branding) {
      await Company.updateOne(
        { _id: companyId },
        {
          $set: {
            displayName: input.branding.name,
            branding: {
              ...input.branding,
              logoUrl: input.branding.logoUrl || null,
              supportEmail: input.branding.supportEmail || null,
              supportPhone: input.branding.supportPhone || null,
            },
          },
        },
      );
    }
    const nextVersion = Number((before as any)?.version || 0) + 1;
    const patch: Record<string, unknown> = {
      version: nextVersion,
      draft: { settings: input.settings, branding: input.branding },
    };
    if (input.publish) {
      Object.assign(patch, input.settings);
      patch.published = true;
      patch.publishedVersion = nextVersion;
      patch.publishedSnapshot = { settings: input.settings, branding: input.branding };
    }
    const updated = await CompanySettings.findOneAndUpdate(
      { companyId },
      { $set: patch },
      { new: true, upsert: true },
    ).lean();
    await writeAudit({
      companyId,
      actorClerkUserId: access.userId,
      actorType: (access as any).isSuperadmin ? "SUPERADMIN" : "USER",
      action: input.publish ? "settings.published" : "settings.draft_saved",
      entityType: "CompanySettings",
      entityId: String((updated as any)._id),
      before,
      after: updated,
    });
    return NextResponse.json({
      settings: {
        ...input.settings,
        version: nextVersion,
        published: input.publish || Boolean((updated as any).published),
      },
    });
  } catch (error) {
    return apiError(error, "Nie udało się zapisać ustawień.");
  }
}
