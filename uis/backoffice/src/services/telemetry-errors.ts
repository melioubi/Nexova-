/*
 * Error sanitisation for frontend_error_captured (telemetry-plan.md §4.5):
 * the message is truncated to 200 chars and emails, UUIDs and numbers are
 * replaced BEFORE leaving the browser; the stack is never sent — only a
 * fingerprint of the error name + first app frame.
 */

export function sanitizeErrorMessage(message: string): string {
  return message
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, "<email>")
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "<uuid>")
    .replace(/\d+(\.\d+)?/g, "<n>")
    .slice(0, 200);
}

/** 64-bit FNV-1a → 16 hex chars. A grouping key, not a security hash. */
function fnv1a64(input: string): string {
  let hash = BigInt("0xcbf29ce484222325");
  const prime = BigInt("0x100000001b3");
  const mask = BigInt("0xffffffffffffffff");
  for (const byte of new TextEncoder().encode(input)) {
    hash = ((hash ^ BigInt(byte)) * prime) & mask;
  }
  return hash.toString(16).padStart(16, "0");
}

export function errorFingerprint(name: string, stack: string | undefined): string {
  const firstAppFrame = (stack ?? "")
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.startsWith("at ") || line.includes("@")) ?? "";
  // Drop query strings and line:col offsets so the same bug groups across builds.
  return fnv1a64(`${name}|${firstAppFrame.replace(/\?[^:)]*/g, "").replace(/:\d+:\d+/g, "")}`);
}
