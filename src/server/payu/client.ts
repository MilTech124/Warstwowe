import { createHash, timingSafeEqual } from "node:crypto";

export interface PayUOrderRequest {
  extOrderId: string;
  description: string;
  totalAmountGrosz: number;
  customerIp: string;
  buyer: {
    email: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    extCustomerId: string;
  };
  continueUrl: string;
  notifyUrl: string;
  token?: string;
  recurring?: "FIRST" | "STANDARD";
}

function payuBaseUrl() {
  return process.env.PAYU_ENV === "production"
    ? "https://secure.payu.com"
    : "https://secure.snd.payu.com";
}

export function payuConfigured() {
  return Boolean(
    process.env.PAYU_CLIENT_ID
    && process.env.PAYU_CLIENT_SECRET
    && process.env.PAYU_POS_ID
    && process.env.PAYU_SECOND_KEY,
  );
}

async function parsePayUResponse(response: Response) {
  const text = await response.text();
  let payload: any = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { raw: text };
  }
  if (!response.ok && response.status !== 302) {
    const message = payload?.status?.statusDesc || payload?.error_description || `PayU HTTP ${response.status}`;
    throw new Error(message);
  }
  return payload;
}

export async function getPayUOAuthToken(options?: { email?: string; extCustomerId?: string }) {
  if (!payuConfigured()) throw new Error("PAYU_NOT_CONFIGURED");
  const body = new URLSearchParams({
    grant_type: options?.email && options?.extCustomerId ? "trusted_merchant" : "client_credentials",
    client_id: process.env.PAYU_CLIENT_ID!,
    client_secret: process.env.PAYU_CLIENT_SECRET!,
  });
  if (options?.email && options.extCustomerId) {
    body.set("email", options.email);
    body.set("ext_customer_id", options.extCustomerId);
  }
  const response = await fetch(`${payuBaseUrl()}/pl/standard/user/oauth/authorize`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  const payload = await parsePayUResponse(response);
  if (!payload.access_token) throw new Error("PAYU_OAUTH_TOKEN_MISSING");
  return payload.access_token as string;
}

export async function createPayUOrder(input: PayUOrderRequest) {
  const accessToken = await getPayUOAuthToken();
  const payload: Record<string, unknown> = {
    notifyUrl: input.notifyUrl,
    continueUrl: input.continueUrl,
    customerIp: input.customerIp,
    merchantPosId: process.env.PAYU_POS_ID,
    description: input.description,
    currencyCode: "PLN",
    totalAmount: String(input.totalAmountGrosz),
    extOrderId: input.extOrderId,
    buyer: {
      email: input.buyer.email,
      phone: input.buyer.phone,
      firstName: input.buyer.firstName,
      lastName: input.buyer.lastName,
      language: "pl",
      extCustomerId: input.buyer.extCustomerId,
    },
  };

  if (input.totalAmountGrosz > 0) {
    payload.products = [{
      name: input.description,
      unitPrice: String(input.totalAmountGrosz),
      quantity: "1",
    }];
  }

  if (input.token) {
    payload.payMethods = {
      payMethod: {
        type: "CARD_TOKEN",
        value: input.token,
      },
    };
  }
  if (input.recurring) payload.recurring = input.recurring;

  const response = await fetch(`${payuBaseUrl()}/api/v2_1/orders`, {
    method: "POST",
    redirect: "manual",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  return parsePayUResponse(response);
}

export async function retrievePayUOrder(orderId: string) {
  const accessToken = await getPayUOAuthToken();
  const response = await fetch(`${payuBaseUrl()}/api/v2_1/orders/${encodeURIComponent(orderId)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
    },
    cache: "no-store",
  });
  const payload = await parsePayUResponse(response);
  return {
    order: Array.isArray(payload.orders) ? payload.orders[0] : null,
    payload,
  };
}

export async function retrievePayUTokens(email: string, extCustomerId: string) {
  const accessToken = await getPayUOAuthToken({ email, extCustomerId });
  const response = await fetch(`${payuBaseUrl()}/api/v2_1/paymethods`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Cache-Control": "no-cache",
    },
    cache: "no-store",
  });
  const payload = await parsePayUResponse(response);
  return (payload.cardTokens || []) as Array<{
    value: string;
    status: string;
    mask?: string;
    brandImageUrl?: string;
  }>;
}

export function verifyPayUSignature(rawBody: string, signatureHeader: string | null) {
  const secondKey = process.env.PAYU_SECOND_KEY;
  if (!secondKey || !signatureHeader) return false;
  const signature = signatureHeader
    .split(";")
    .map((part) => part.trim().split("="))
    .find(([key]) => key.toLowerCase() === "signature")?.[1];
  if (!signature) return false;
  const expected = createHash("md5").update(rawBody + secondKey).digest("hex");
  const expectedBuffer = Buffer.from(expected, "utf8");
  const signatureBuffer = Buffer.from(signature.toLowerCase(), "utf8");
  return expectedBuffer.length === signatureBuffer.length
    && timingSafeEqual(expectedBuffer, signatureBuffer);
}

export function applicationUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const configuredIsLocal = configured
    ? /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(configured)
    : false;
  const isVercelProduction = process.env.VERCEL_ENV === "production";

  if (configured && !(isVercelProduction && configuredIsLocal)) return configured;

  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercelHost) return `https://${vercelHost.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
  return configured || "http://127.0.0.1:3000";
}
