/*
 * TelemetryService — the ONLY way the backoffice emits telemetry.
 *
 *   track(eventType, properties)   ← single public function
 *
 * What it does (docs/telemetry/telemetry-plan.md §4–§5):
 * - Envelope: adds eventId, timestamp (ISO 8601 UTC, at capture time),
 *   sessionId, userId, schemaVersion (shared constant per event_type),
 *   requestId and context. Callers never pass them.
 * - Allowlist, fail-closed: an event with an unknown type, a property outside
 *   its allowlist or a missing required property is NOT sent (warning in dev).
 * - Local queue + batch: events wait in memory and are sent together, every
 *   10 s (counted from the first pending event) or as soon as 20 are queued.
 * - Reliable flush: when the tab is hidden or closed, pending events go out
 *   with navigator.sendBeacon.
 * - Retries: a failed batch (network error, 5xx, 429) is retried up to 3 times
 *   with exponential backoff (1 s, 2 s, 4 s) and then dropped — telemetry must
 *   never block or break the app.
 * - Endpoint: NEXT_PUBLIC_TELEMETRY_ENDPOINT (never hardcoded). Bodies are
 *   JSON sent as text/plain (CORS-safelisted → no preflight, works with
 *   sendBeacon); the API parses JSON whatever the content type.
 */
import {
  ALLOWED_PROPERTIES,
  ALLOWED_SOURCES,
  REQUIRED_PROPERTIES,
  REQUIRES_AUTHENTICATED_USER,
  SCHEMA_VERSIONS,
  type TelemetryEventType,
} from "./telemetry-contract";
import { correlationId } from "./request-context";
import { currentIdentity, newUuid } from "./telemetry-session";

const ENDPOINT = process.env.NEXT_PUBLIC_TELEMETRY_ENDPOINT;
const SOURCE = "frontend_backoffice";
const ENVIRONMENT = (["development", "staging", "production"] as const).find((e) => e === process.env.NEXT_PUBLIC_APP_ENV) ?? "development";
const APP_VERSION = /^[0-9a-f]{7,12}$/.test(process.env.NEXT_PUBLIC_APP_VERSION ?? "") ? process.env.NEXT_PUBLIC_APP_VERSION! : "0000000";

const BATCH_SIZE = 20;
const FLUSH_DELAY_MS = 10_000;
const MAX_RETRIES = 3;
const BACKOFF_BASE_MS = 1_000;
const MAX_QUEUE = 200; // bounded memory while offline; oldest events are dropped first
const IS_DEV = process.env.NODE_ENV !== "production";

/** Events captured when the session has just ended (token already removed). */
const MAY_USE_ENDED_SESSION = new Set<string>(["session_expired", "user_logged_out"]);

type TelemetryEnvelope = {
  eventId: string;
  timestamp: string;
  sessionId: string | null;
  userId: string | null;
  event_type: TelemetryEventType;
  schemaVersion: string;
  requestId: string;
  context: { source: typeof SOURCE; environment: string; appVersion: string };
  properties: Record<string, unknown>;
};

let queue: TelemetryEnvelope[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let sending = false;
let installed = false;
let warnedMissingEndpoint = false;

function warn(message: string, detail?: unknown): void {
  if (IS_DEV) console.warn(`[telemetry] ${message}`, detail ?? "");
}

function isKnownType(eventType: string): eventType is TelemetryEventType {
  return Object.prototype.hasOwnProperty.call(SCHEMA_VERSIONS, eventType);
}

/** Fail-closed allowlist check (plan §4.3). Returns the clean properties or null. */
function validate(eventType: string, properties: Record<string, unknown>, identity: { sessionId: string | null; userId: string | null }) {
  if (!isKnownType(eventType)) return warn(`unknown event_type "${eventType}" — dropped`), null;
  if (!ALLOWED_SOURCES[eventType].includes(SOURCE)) return warn(`${eventType} is not emitted by the backoffice — dropped`), null;
  const clean = Object.fromEntries(Object.entries(properties).filter(([, value]) => value !== undefined && value !== null));
  const extra = Object.keys(clean).filter((key) => !ALLOWED_PROPERTIES[eventType].includes(key));
  if (extra.length) return warn(`${eventType}: properties outside the allowlist ${JSON.stringify(extra)} — dropped`), null;
  const missing = REQUIRED_PROPERTIES[eventType].filter((key) => !(key in clean));
  if (missing.length) return warn(`${eventType}: missing required properties ${JSON.stringify(missing)} — dropped`), null;
  if (REQUIRES_AUTHENTICATED_USER.includes(eventType) && (!identity.sessionId || !identity.userId)) {
    return warn(`${eventType} requires an authenticated session — dropped`), null;
  }
  return { eventType, clean };
}

function body(events: TelemetryEnvelope[]): string {
  return JSON.stringify({ events });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function send(batch: TelemetryEnvelope[]): Promise<void> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(ENDPOINT!, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: body(batch),
        keepalive: true,
      });
      if (response.ok) {
        const result = await response.json().catch(() => null);
        if (result?.rejected) warn(`${result.rejected} event(s) rejected by the API`, result);
        return;
      }
      if (response.status < 500 && response.status !== 429) {
        warn(`batch dropped: HTTP ${response.status} (not retried)`);
        return;
      }
    } catch {
      /* network error → retry */
    }
    if (attempt < MAX_RETRIES) await sleep(BACKOFF_BASE_MS * 2 ** attempt);
  }
  warn(`batch of ${batch.length} event(s) dropped after ${MAX_RETRIES} retries`);
}

async function flush(): Promise<void> {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (sending || queue.length === 0 || !ENDPOINT) return;
  sending = true;
  try {
    while (queue.length) {
      await send(queue.splice(0, BATCH_SIZE));
    }
  } finally {
    sending = false;
  }
}

/** Page hidden / closing: hand everything to the browser with sendBeacon. */
function flushWithBeacon(): void {
  if (!ENDPOINT || queue.length === 0) return;
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  while (queue.length) {
    const batch = queue.splice(0, BATCH_SIZE);
    const payload = new Blob([body(batch)], { type: "text/plain;charset=UTF-8" });
    const accepted = typeof navigator.sendBeacon === "function" && navigator.sendBeacon(ENDPOINT, payload);
    if (!accepted) {
      // Beacon queue full or unsupported: last attempt with a keepalive fetch.
      void fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "text/plain;charset=UTF-8" }, body: body(batch), keepalive: true }).catch(() => undefined);
    }
  }
}

function install(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushWithBeacon();
  });
  window.addEventListener("pagehide", flushWithBeacon);
}

function schedule(): void {
  if (queue.length >= BATCH_SIZE) {
    void flush();
  } else if (!flushTimer) {
    flushTimer = setTimeout(() => void flush(), FLUSH_DELAY_MS);
  }
}

/**
 * Capture one telemetry event. Never throws, never blocks: the event is
 * validated against its allowlist, wrapped in the envelope and queued.
 */
export function track(eventType: string, properties: Record<string, unknown>): void {
  try {
    if (typeof window === "undefined") return;
    if (!ENDPOINT) {
      if (!warnedMissingEndpoint) warn("NEXT_PUBLIC_TELEMETRY_ENDPOINT is not set — telemetry disabled");
      warnedMissingEndpoint = true;
      return;
    }
    install();
    const identity = currentIdentity(MAY_USE_ENDED_SESSION.has(eventType));
    const valid = validate(eventType, properties, identity);
    if (!valid) return;
    queue.push({
      eventId: newUuid(),
      timestamp: new Date().toISOString(),
      sessionId: identity.sessionId,
      userId: identity.userId,
      event_type: valid.eventType,
      schemaVersion: SCHEMA_VERSIONS[valid.eventType],
      requestId: correlationId(),
      context: { source: SOURCE, environment: ENVIRONMENT, appVersion: APP_VERSION },
      properties: valid.clean,
    });
    if (queue.length > MAX_QUEUE) queue = queue.slice(-MAX_QUEUE);
    schedule();
  } catch (error) {
    warn("track() failed", error);
  }
}
