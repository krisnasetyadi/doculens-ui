/**
 * Decode a JWT payload without verifying its signature — a cheap client-side
 * read for UX purposes (route gating, "am I logged in") only. The backend
 * verifies signatures on every real API call; this never substitutes for that.
 *
 * Runtime-agnostic (only uses `atob`, available in both the browser and the
 * Next.js Edge middleware runtime) so it can be shared by both — avoids the
 * two runtimes' expiry checks silently drifting apart.
 */

/** atob() expects standard base64, but JWTs are base64url-encoded (`-`/`_`
 * instead of `+`/`/`, no padding) — decoding a payload that happens to
 * contain either character with plain atob() throws, which looks
 * indistinguishable from "invalid token" even though the token is fine. */
function base64UrlDecode(segment: string): string {
  const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  return atob(padded);
}

export function decodeJwtPayload<T = Record<string, unknown>>(token: string): T | null {
  try {
    return JSON.parse(base64UrlDecode(token.split(".")[1]));
  } catch {
    return null;
  }
}

export function isJwtExpired(token: string): boolean {
  const payload = decodeJwtPayload<{ exp?: number }>(token);
  if (!payload?.exp) return true;
  return Date.now() >= payload.exp * 1000;
}
