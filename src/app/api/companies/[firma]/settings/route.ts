import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { FEATURE_KEYS } from "@/types/saas";
import {
  requireCompanyMember,
  requireCompanyWriteIntent,
} from "@/server/auth";
import { Company, CompanySettings } from "@/server/db/models";
import { demoModeEnabled, getConfiguratorBootstrap } from "@/server/services/companyService";
import { writeAudit } from "@/server/audit";
import { saveDemoState } from "@/server/demoState";
import { apiError } from "@/server/apiError";
import { emptyPrivacyProfile, isCompletePrivacyProfile } from "@/config/legal";
import { isBlobImageUrl } from "@/lib/blobImage";
import { hashConfiguratorAccessCode } from "@/server/services/configuratorAccessService";

const logoUrlSchema = z.string().refine(
  (value) => value === "" || isBlobImageUrl(value) || z.string().url().safeParse(value).success,
  "Podaj prawidłowy adres logo.",
);

const privacyProfileSchema = z.object({
  controllerName: z.string().trim().max(180),
  address: z.string().trim().max(300),
  taxId: z.string().trim().max(32),
  privacyEmail: z.string().trim().email().or(z.literal("")),
  privacyPhone: z.string().trim().max(40).nullable().optional(),
  noticeVersion: z.number().int().positive().optional(),
});

const settingsSchema = z.object({
  branding: z.object({
    name: z.string().trim().min(2).max(120),
    logoUrl: logoUrlSchema.nullable().optional(),
    primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    supportEmail: z.string().email().or(z.literal("")).nullable().optional(),
    supportPhone: z.string().trim().max(40).nullable().optional(),
  }).optional(),
  privacyProfile: privacyProfileSchema.optional(),
  settings: z.object({
    version: z.number().int().positive(),
    manuallyEnabled: z.boolean(),
    publicAccessLimitEnabled: z.boolean(),
    publicAccessLimitMinutes: z.number().int().min(15).max(240),
    orderActionLabel: z.enum(["order", "inquiry"]),
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
  accessCode: z.string().trim().min(6).max(64).optional(),
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
    const ordersAvailable = Boolean(
      bootstrap.availableCapabilities?.orders ?? bootstrap.capabilities.orders,
    ) && !input.settings.disabledFeatures.includes("orders");
    if (input.publish && ordersAvailable && !isCompletePrivacyProfile(input.privacyProfile)) {
      throw new Error(
        "Uzupełnij nazwę administratora, adres, NIP i e-mail w sekcji prywatności przed publikacją zamówień.",
      );
    }

    // The public demo is a disposable sandbox. Its in-memory changes do not
    // touch a real company or MongoDB and may be reset by a deployment.
    if (bootstrap.company.id === "demo-company" && demoModeEnabled()) {
      const demoState = saveDemoState({
        ...input,
        privacyProfile: input.privacyProfile
          ? emptyPrivacyProfile(input.privacyProfile)
          : undefined,
      });
      return NextResponse.json({
        settings: demoState.settings,
        privacyProfile: demoState.privacyProfile,
      });
    }

    const access = await requireCompanyMember(firma, ["OWNER", "ADMIN"]);
    requireCompanyWriteIntent(request, access);

    const companyId = (access as any).company._id;
    const beforeWithSecret: any = await CompanySettings.findOne({ companyId })
      .select("+publicAccessCodeHash")
      .lean();
    const accessCodeConfigured = Boolean(
      beforeWithSecret?.publicAccessCodeHash || (input.publish && input.accessCode),
    );
    if (input.publish && input.settings.publicAccessLimitEnabled && !accessCodeConfigured) {
      throw new Error("Ustaw kod dostępu przed włączeniem limitu publicznego konfiguratora.");
    }
    const { publicAccessCodeHash: _secret, ...before } = beforeWithSecret || {};
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
    const draftPrivacyProfile = input.privacyProfile
      ? { ...emptyPrivacyProfile(input.privacyProfile), noticeVersion: nextVersion }
      : null;
    const versionedPrivacyProfile = isCompletePrivacyProfile(draftPrivacyProfile)
      ? draftPrivacyProfile
      : null;
    const patch: Record<string, unknown> = {
      version: nextVersion,
      draft: {
        settings: input.settings,
        branding: input.branding,
        privacyProfile: draftPrivacyProfile,
      },
    };
    if (input.publish) {
      Object.assign(patch, input.settings);
      if (input.accessCode) patch.publicAccessCodeHash = hashConfiguratorAccessCode(input.accessCode);
      patch.privacyProfile = versionedPrivacyProfile;
      patch.published = true;
      patch.publishedVersion = nextVersion;
      patch.publishedSnapshot = {
        settings: input.settings,
        branding: input.branding,
        privacyProfile: versionedPrivacyProfile,
      };
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
        publicAccessCodeConfigured: accessCodeConfigured,
      },
      privacyProfile: draftPrivacyProfile,
    });
  } catch (error) {
    return apiError(error, "Nie udało się zapisać ustawień.");
  }
}
