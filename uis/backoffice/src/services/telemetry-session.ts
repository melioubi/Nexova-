/*
 * Telemetry identity: sessionId + userId for the event envelope.
 *
 * - sessionId is generated at login: the first time a NEW access token is seen
 *   (a new login always issues a new token), and rotated after 30 minutes of
 *   inactivity (telemetry-plan.md §4.1). It lives in sessionStorage, so it is
 *   per tab and disappears when the tab is closed.
 * - userId is the `sub` claim of the JWT (users.id, a UUID). Never an email.
 *
 * Read-only helpers used by the TelemetryService (and by auth components to
 * compute session ages). Tracking itself only happens through track().
 */
import { getToken } from "@/lib/auth";

const SESSION_KEY = "nexova.telemetry.session";
const IDLE_ROTATION_MS = 30 * 60 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

type SessionRecord = {
  sessionId: string;
  userId: string;
  tokenSignature: string;
  startedAt: number;
  lastActivityAt: number;
};

export type TelemetryIdentity = { sessionId: string | null; userId: string | null };

export function newUuid(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  // RFC 4122 v4 fallback for old browsers.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function userIdFromToken(token: string): string | null {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(payload.length / 4) * 4, "="));
    const sub = JSON.parse(json).sub;
    return typeof sub === "string" && UUID.test(sub) ? sub : null;
  } catch {
    return null;
  }
}

function read(): SessionRecord | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as SessionRecord) : null;
  } catch {
    return null;
  }
}

function write(record: SessionRecord): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(record));
  } catch {
    /* storage unavailable (private mode): ids stay valid for this page only */
  }
}

/**
 * Identity for an event captured now.
 * `allowEndedSession`: session_expired / user_logged_out are captured right
 * when the token disappears, so they may use the session that just ended.
 */
export function currentIdentity(allowEndedSession = false): TelemetryIdentity {
  if (typeof window === "undefined") return { sessionId: null, userId: null };
  const token = getToken();
  const stored = read();
  if (!token) {
    return allowEndedSession && stored ? { sessionId: stored.sessionId, userId: stored.userId } : { sessionId: null, userId: null };
  }
  const userId = userIdFromToken(token);
  if (!userId) return { sessionId: null, userId: null };
  const now = Date.now();
  const signature = token.slice(-24);
  let record = stored;
  if (!record || record.tokenSignature !== signature || record.userId !== userId) {
    record = { sessionId: newUuid(), userId, tokenSignature: signature, startedAt: now, lastActivityAt: now };
  } else if (now - record.lastActivityAt > IDLE_ROTATION_MS) {
    record = { ...record, sessionId: newUuid(), startedAt: now };
  }
  record.lastActivityAt = now;
  write(record);
  return { sessionId: record.sessionId, userId: record.userId };
}

/** Minutes since the current (or just-ended) session started. */
export function sessionAgeMinutes(): number {
  const record = read();
  return record ? Math.max(0, Math.floor((Date.now() - record.startedAt) / 60000)) : 0;
}
