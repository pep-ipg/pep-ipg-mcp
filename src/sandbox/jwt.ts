// Minimal HS256 JWT for the sandbox (node:crypto only).
import { createHmac, timingSafeEqual } from "node:crypto";

const b64 = (b: Buffer | string) => Buffer.from(b).toString("base64url");

export function signJwt(payload: Record<string, unknown>, secret: string): string {
  const head = b64(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64(JSON.stringify(payload));
  const sig = b64(createHmac("sha256", secret).update(`${head}.${body}`).digest());
  return `${head}.${body}.${sig}`;
}

export type JwtResult = { ok: true; payload: Record<string, any> } | { ok: false; reason: "malformed" | "invalid" };

export function verifyJwt(token: string, secret: string): JwtResult {
  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false, reason: "malformed" };
  const expected = createHmac("sha256", secret).update(`${parts[0]}.${parts[1]}`).digest();
  const got = Buffer.from(parts[2], "base64url");
  if (got.length !== expected.length || !timingSafeEqual(got, expected)) return { ok: false, reason: "invalid" };
  try {
    return { ok: true, payload: JSON.parse(Buffer.from(parts[1], "base64url").toString()) };
  } catch {
    return { ok: false, reason: "malformed" };
  }
}
