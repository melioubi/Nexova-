/*
 * Correlation between API calls and telemetry (telemetry-plan.md §3.2).
 *
 * lib/api.ts generates one X-Request-Id per API call and records it here when
 * the response arrives; an event captured right after that response (e.g.
 * inbound_order_created after the 201) carries the same requestId, so the
 * event, the backend log line (api.timing … req=<id>) and the API response
 * can be joined.
 */
import { newUuid } from "./telemetry-session";

const CORRELATION_WINDOW_MS = 2000;
let recent: { id: string; at: number } | null = null;

export function newRequestId(): string {
  return newUuid();
}

export function rememberRequestId(id: string): void {
  recent = { id, at: Date.now() };
}

/** requestId for an event: the API call that just completed, or a new id. */
export function correlationId(): string {
  return recent && Date.now() - recent.at <= CORRELATION_WINDOW_MS ? recent.id : newUuid();
}
