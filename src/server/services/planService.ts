import { PACKAGE_DEFINITIONS, type PackageDefinition } from "@/domain/plans";
import { connectMongo } from "@/server/db/connection";
import { Plan } from "@/server/db/models";
import type { PackageCode } from "@/types/saas";

export async function getAvailablePlans(): Promise<PackageDefinition[]> {
  try {
    if (!(await connectMongo())) return Object.values(PACKAGE_DEFINITIONS);
    const documents: any[] = await Plan.find({ active: true }).sort({ monthlyGross: 1 }).lean();
    if (!documents.length) return Object.values(PACKAGE_DEFINITIONS);
    return documents.map((document) => ({
      ...PACKAGE_DEFINITIONS[document.code as PackageCode],
      code: document.code,
      name: document.name,
      monthlyGross: Number(document.monthlyGross),
      prepaidSixMonthsGross: Number(document.prepaidSixMonthsGross),
      seatLimit: Number(document.seatLimit),
      features: document.features,
    }));
  } catch {
    // Public pricing must remain renderable during builds and temporary Atlas outages.
    return Object.values(PACKAGE_DEFINITIONS);
  }
}

export async function getPlanDefinition(code: PackageCode): Promise<PackageDefinition> {
  const plans = await getAvailablePlans();
  return plans.find((plan) => plan.code === code) || PACKAGE_DEFINITIONS[code];
}
