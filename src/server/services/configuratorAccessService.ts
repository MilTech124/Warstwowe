import {
  createHash,
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import type { NextRequest } from "next/server";
import { connectMongo } from "@/server/db/connection";
import { Company, CompanySettings, ConfiguratorUsage } from "@/server/db/models";

const USAGE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const UNLOCK_DURATION_SECONDS = 30 * 24 * 60 * 60;
const CODE_LOCK_SECONDS = 15 * 60;
const MAX_FAILED_CODE_ATTEMPTS = 5;

type AccessContext = {
  available: boolean;
  enabled: boolean;
  companyId?: unknown;
  limitMinutes: number;
  accessCodeHash?: string;
};

export type PublicConfiguratorAccessState = {
  enabled: boolean;
  unlocked: boolean;
  started: boolean;
  blocked: boolean;
  remainingSeconds: number;
  expiresAt: string | null;
};

function normalizeCode(code: string) {
  return code.trim();
}

export function hashConfiguratorAccessCode(code: string) {
  const salt = randomBytes(16);
  const digest = scryptSync(normalizeCode(code), salt, 32);
  return `scrypt:${salt.toString("hex")}:${digest.toString("hex")}`;
}

export function verifyConfiguratorAccessCode(code: string, encodedHash: string) {
  const [algorithm, saltHex, digestHex] = encodedHash.split(":");
  if (algorithm !== "scrypt" || !saltHex || !digestHex) return false;
  try {
    const expected = Buffer.from(digestHex, "hex");
    const actual = scryptSync(normalizeCode(code), Buffer.from(saltHex, "hex"), expected.length);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export function requestPublicIp(headers: Headers) {
  // Vercel supplies its own copy even when another proxy can replace the
  // conventional header. Locally, fall back to the standard proxy headers.
  const forwarded = (
    headers.get("x-vercel-forwarded-for")
    || headers.get("x-forwarded-for")
  )?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "local";
}

export function configuratorIpHash(companyId: unknown, ip: string) {
  return createHash("sha256").update(`${String(companyId)}:${ip}`).digest("hex");
}

function accessCookieName(companyId: unknown) {
  return `cfg_access_${String(companyId)}`;
}

function accessCookieSignature(companyId: unknown, expiresAt: number, accessCodeHash: string) {
  return createHmac("sha256", accessCodeHash)
    .update(`${String(companyId)}:${expiresAt}`)
    .digest("hex");
}

function createAccessCookie(companyId: unknown, accessCodeHash: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + UNLOCK_DURATION_SECONDS;
  return {
    name: accessCookieName(companyId),
    value: `${expiresAt}.${accessCookieSignature(companyId, expiresAt, accessCodeHash)}`,
    maxAge: UNLOCK_DURATION_SECONDS,
  };
}

function hasValidAccessCookie(
  request: NextRequest,
  companyId: unknown,
  accessCodeHash: string,
) {
  const value = request.cookies.get(accessCookieName(companyId))?.value;
  if (!value) return false;
  const [expiresRaw, signature] = value.split(".");
  const expiresAt = Number(expiresRaw);
  if (!Number.isFinite(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000) || !signature) {
    return false;
  }
  const expected = accessCookieSignature(companyId, expiresAt, accessCodeHash);
  const expectedBuffer = Buffer.from(expected, "hex");
  const actualBuffer = Buffer.from(signature, "hex");
  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}

async function accessContext(slug: string): Promise<AccessContext> {
  if (slug === "demo") return { available: true, enabled: false, limitMinutes: 60 };
  if (!(await connectMongo())) return { available: false, enabled: false, limitMinutes: 60 };

  const company: any = await Company.findOne({ slug: slug.toLowerCase() }).select("_id").lean();
  if (!company) throw new Error("Firma nie istnieje.");
  const settings: any = await CompanySettings.findOne({ companyId: company._id })
    .select("publicAccessLimitEnabled publicAccessLimitMinutes +publicAccessCodeHash")
    .lean();
  const limitMinutes = Math.min(240, Math.max(15, Number(settings?.publicAccessLimitMinutes || 60)));
  const accessCodeHash = settings?.publicAccessCodeHash ? String(settings.publicAccessCodeHash) : undefined;
  return {
    available: true,
    enabled: settings?.publicAccessLimitEnabled === true && Boolean(accessCodeHash),
    companyId: company._id,
    limitMinutes,
    accessCodeHash,
  };
}

function unrestrictedState(): PublicConfiguratorAccessState {
  return {
    enabled: false,
    unlocked: true,
    started: false,
    blocked: false,
    remainingSeconds: 0,
    expiresAt: null,
  };
}

async function usageForRequest(request: NextRequest, companyId: unknown) {
  const ipHash = configuratorIpHash(companyId, requestPublicIp(request.headers));
  const usage: any = await ConfiguratorUsage.findOne({ companyId, ipHash }).lean();
  return { ipHash, usage };
}

export async function readPublicConfiguratorAccess(
  request: NextRequest,
  slug: string,
): Promise<PublicConfiguratorAccessState> {
  const context = await accessContext(slug);
  if (!context.available || !context.enabled || !context.companyId || !context.accessCodeHash) {
    return unrestrictedState();
  }
  if (hasValidAccessCookie(request, context.companyId, context.accessCodeHash)) {
    return { ...unrestrictedState(), enabled: true };
  }

  const { usage } = await usageForRequest(request, context.companyId);
  if (!usage?.startedAt) {
    return {
      enabled: true,
      unlocked: false,
      started: false,
      blocked: false,
      remainingSeconds: context.limitMinutes * 60,
      expiresAt: null,
    };
  }

  const expiresAt = new Date(usage.startedAt).getTime() + context.limitMinutes * 60 * 1000;
  const remainingSeconds = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
  return {
    enabled: true,
    unlocked: false,
    started: true,
    blocked: remainingSeconds === 0,
    remainingSeconds,
    expiresAt: new Date(expiresAt).toISOString(),
  };
}

async function startUsage(request: NextRequest, context: AccessContext) {
  const now = new Date();
  const ipHash = configuratorIpHash(context.companyId, requestPublicIp(request.headers));
  return ConfiguratorUsage.findOneAndUpdate(
    { companyId: context.companyId, ipHash },
    {
      $setOnInsert: {
        companyId: context.companyId,
        ipHash,
        startedAt: now,
        expiresAt: new Date(now.getTime() + USAGE_RETENTION_MS),
      },
    },
    { upsert: true, new: true },
  ).lean();
}

export async function startPublicConfiguratorAccess(request: NextRequest, slug: string) {
  const context = await accessContext(slug);
  if (!context.available || !context.enabled || !context.companyId || !context.accessCodeHash) {
    return unrestrictedState();
  }
  if (hasValidAccessCookie(request, context.companyId, context.accessCodeHash)) {
    return { ...unrestrictedState(), enabled: true };
  }
  await startUsage(request, context);
  return readPublicConfiguratorAccess(request, slug);
}

export async function unlockPublicConfiguratorAccess(
  request: NextRequest,
  slug: string,
  code: string,
) {
  const context = await accessContext(slug);
  if (!context.available || !context.enabled || !context.companyId || !context.accessCodeHash) {
    return { state: unrestrictedState(), cookie: null };
  }

  const usage: any = await startUsage(request, context);
  const now = new Date();
  if (usage?.codeLockedUntil && new Date(usage.codeLockedUntil) > now) {
    throw new Error("Zbyt wiele błędnych prób. Spróbuj ponownie za 15 minut.");
  }

  if (!verifyConfiguratorAccessCode(code, context.accessCodeHash)) {
    const failed: any = await ConfiguratorUsage.findByIdAndUpdate(
      usage._id,
      { $inc: { failedCodeAttempts: 1 } },
      { new: true },
    ).lean();
    if (Number(failed?.failedCodeAttempts || 0) >= MAX_FAILED_CODE_ATTEMPTS) {
      await ConfiguratorUsage.updateOne(
        { _id: usage._id },
        { $set: { failedCodeAttempts: 0, codeLockedUntil: new Date(Date.now() + CODE_LOCK_SECONDS * 1000) } },
      );
    }
    throw new Error("Nieprawidłowy kod dostępu.");
  }

  await ConfiguratorUsage.updateOne(
    { _id: usage._id },
    { $set: { failedCodeAttempts: 0 }, $unset: { codeLockedUntil: 1 } },
  );
  return {
    state: {
      ...unrestrictedState(),
      enabled: true,
    },
    cookie: createAccessCookie(context.companyId, context.accessCodeHash),
  };
}

export async function assertPublicConfiguratorAccess(request: NextRequest, slug: string) {
  const state = await readPublicConfiguratorAccess(request, slug);
  if (state.enabled && !state.unlocked && state.blocked) {
    throw new Error("Czas bezpłatnego korzystania minął. Podaj kod dostępu od producenta.");
  }
}
