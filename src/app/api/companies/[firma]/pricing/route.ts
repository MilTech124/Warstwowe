import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireCompanyMember, requireCompanyWriteIntent } from "@/server/auth";
import { apiError } from "@/server/apiError";
import { demoModeEnabled, getConfiguratorBootstrap } from "@/server/services/companyService";
import { savePriceList } from "@/server/services/priceListService";
import { saveDemoPriceList } from "@/server/demoState";

const rate = z.number().finite().min(0);
/** Drzwi i okna — cena za sztukę. */
const unitOpening = z.object({ pricePerUnit: rate });
const openingRate = z.object({
  default: unitOpening,
  byModelId: z.record(z.string(), unitOpening).optional(),
});

/** Bramy — cena za sztukę plus dopłata za każde rozpoczęte 50 cm szerokości. */
const sizedOpening = z.object({
  pricePerUnit: rate,
  baseWidthM: z.number().finite().min(0.5).max(20),
  widthStepPrice: rate,
});
const gateRate = z.object({
  default: sizedOpening,
  byModelId: z.record(z.string(), sizedOpening).optional(),
});

const panelRate = z.object({
  defaultPerM2: rate,
  byThicknessMm: z.record(z.string(), rate).optional(),
  byModelId: z.record(z.string(), rate).optional(),
  wastePercent: z.number().finite().min(0).max(50),
});

const pricingSchema = z.object({
  showToCustomer: z.boolean(),
  publish: z.boolean(),
  rates: z.object({
    vatRatePercent: z.number().finite().min(0).max(100),
    panels: z.object({ wall: panelRate, roof: panelRate }),
    frontProjection: z.object({ liningPerM2: rate }),
    steel: z.object({
      profilePerKg: rate,
      platePerKg: rate,
      anchorPerUnit: rate,
      fixingsPerKg: rate,
    }),
    flashings: z.object({
      defaultPerMeter: rate,
      byItemLabel: z.record(z.string(), rate).optional(),
    }),
    gutters: z.object({
      gutterPerMeter: rate,
      downspoutPerMeter: rate,
      bracketPerUnit: rate,
      clampPerUnit: rate,
      leafGuardPerMeter: rate,
    }),
    openings: z.object({
      gate: gateRate,
      door: openingRate,
      window: openingRate,
      roofWindow: openingRate,
    }),
    lighting: z.object({
      interiorLighting: rate,
      roofPerimeterLed: rate,
      gateLamps: rate,
      exteriorSconces: rate,
      frontProjectionLed: rate,
    }),
    labour: z.object({ perM2BuildingArea: rate, percentOfMaterials: rate }),
    extras: z.array(
      z.object({
        id: z.string().min(1),
        label: z.string().trim().min(1).max(120),
        kind: z.enum(["FIXED", "PER_M2_BUILDING", "PERCENT_OF_MATERIALS"]),
        value: rate,
      }),
    ),
    marginPercent: z.number().finite().min(-50).max(200),
    delivery: z.object({ flat: rate, perKm: rate }),
    rounding: z.enum(["NONE", "TO_1", "TO_10"]),
  }),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ firma: string }> },
) {
  try {
    const { firma } = await params;
    const input = pricingSchema.parse(await request.json());

    const bootstrap = await getConfiguratorBootstrap(firma);
    if (!bootstrap?.capabilities.pricing) {
      return NextResponse.json(
        { error: "Cennik nie jest dostępny w tym pakiecie." },
        { status: 403 },
      );
    }

    if (bootstrap.company.id === "demo-company" && demoModeEnabled()) {
      return NextResponse.json({
        priceList: saveDemoPriceList({
          rates: input.rates,
          showToCustomer: input.showToCustomer,
          publish: input.publish,
        }),
      });
    }

    const access = await requireCompanyMember(firma, ["OWNER", "ADMIN"]);
    requireCompanyWriteIntent(request, access);

    const result = await savePriceList({
      companyId: (access as any).company._id,
      rates: input.rates,
      showToCustomer: input.showToCustomer,
      publish: input.publish,
      actorClerkUserId: access.userId,
      actorType: (access as any).isSuperadmin ? "SUPERADMIN" : "USER",
    });

    return NextResponse.json({ priceList: result });
  } catch (error) {
    return apiError(error, "Nie udało się zapisać cennika.");
  }
}
