import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Optional bearer-token check for the HTTP transport.
 * When `expected` is empty, auth is disabled and every request passes.
 * Comparison is constant-time on SHA-256 digests (length-independent).
 */
export function isAuthorized(authorizationHeader: string | undefined, expected: string | undefined): boolean {
  if (!expected) return true;
  const m = /^Bearer\s+(.+)$/i.exec(authorizationHeader ?? "");
  if (!m) return false;
  const a = createHash("sha256").update(m[1].trim()).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}
