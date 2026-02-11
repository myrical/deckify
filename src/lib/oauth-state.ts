import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export type OAuthProvider = "google" | "meta" | "shopify";

interface OAuthStateEnvelope {
  p: OAuthProvider;
  n: string;
  e: number; // unix timestamp seconds
  d?: Record<string, string>;
}

interface OAuthStatePayload {
  state: string;
  cookieName: string;
  cookieValue: string;
  maxAge: number;
}

const OAUTH_STATE_TTL_SECONDS = 10 * 60;

function toBase64Url(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

function fromBase64Url(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

function cookieNameFor(provider: OAuthProvider): string {
  return `oauth_state_${provider}`;
}

function getSigningSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET must be set for OAuth state signing");
  }
  return secret;
}

function sign(dataB64: string): string {
  return createHmac("sha256", getSigningSecret()).update(dataB64).digest("base64url");
}

function secureEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

function parseCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [rawKey, ...rawValueParts] = part.trim().split("=");
    if (rawKey === name) {
      return rawValueParts.join("=") || null;
    }
  }
  return null;
}

export function createOAuthState(
  provider: OAuthProvider,
  payload?: Record<string, string>
): OAuthStatePayload {
  const nonce = randomBytes(24).toString("hex");
  const expiresAt = Math.floor(Date.now() / 1000) + OAUTH_STATE_TTL_SECONDS;

  const envelope: OAuthStateEnvelope = {
    p: provider,
    n: nonce,
    e: expiresAt,
    ...(payload ? { d: payload } : {}),
  };

  const dataB64 = toBase64Url(JSON.stringify(envelope));
  const signature = sign(dataB64);

  return {
    state: `${dataB64}.${signature}`,
    cookieName: cookieNameFor(provider),
    cookieValue: nonce,
    maxAge: OAUTH_STATE_TTL_SECONDS,
  };
}

export function verifyOAuthState<TPayload extends Record<string, string> = Record<string, string>>({
  provider,
  state,
  cookieHeader,
}: {
  provider: OAuthProvider;
  state: string | null;
  cookieHeader: string | null;
}): { valid: true; payload: TPayload | null } | { valid: false } {
  if (!state) return { valid: false };

  const [dataB64, providedSig] = state.split(".");
  if (!dataB64 || !providedSig) return { valid: false };

  const expectedSig = sign(dataB64);
  if (!secureEqual(providedSig, expectedSig)) return { valid: false };

  let parsed: OAuthStateEnvelope;
  try {
    parsed = JSON.parse(fromBase64Url(dataB64)) as OAuthStateEnvelope;
  } catch {
    return { valid: false };
  }

  if (parsed.p !== provider) return { valid: false };
  if (typeof parsed.n !== "string" || !parsed.n) return { valid: false };
  if (typeof parsed.e !== "number") return { valid: false };
  if (Math.floor(Date.now() / 1000) > parsed.e) return { valid: false };

  const cookieNonce = parseCookieValue(cookieHeader, cookieNameFor(provider));
  if (!cookieNonce) return { valid: false };
  if (!secureEqual(cookieNonce, parsed.n)) return { valid: false };

  return { valid: true, payload: (parsed.d as TPayload | undefined) ?? null };
}

export function clearOAuthStateCookie(provider: OAuthProvider) {
  return {
    name: cookieNameFor(provider),
    value: "",
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    },
  };
}
