"use client";

/*
 * Cross-cutting telemetry for the whole backoffice, mounted once in the root
 * layout (not in each page):
 *  - page_viewed            on every route change (plan A.26)
 *  - frontend_error_captured for window.onerror / unhandledrejection (A.24)
 *  - page_load_recorded     Core Web Vitals of the initial page load (A.21)
 * Everything goes through track().
 */
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useReportWebVitals } from "next/web-vitals";
import { track } from "@/services/telemetry";
import { deviceClass, frontendRoute, uiLocale } from "@/services/telemetry-routes";
import { errorFingerprint, sanitizeErrorMessage } from "@/services/telemetry-errors";

const PAGE_VIEW_DEDUPE_MS = 2000;
const ERROR_THROTTLE_MS = 60_000;
const MAX_ERRORS_PER_SESSION = 20;

type VitalsMetric = Parameters<Parameters<typeof useReportWebVitals>[0]>[0];
const vitals: { ttfb?: number; inp?: number; cls?: number; sent: boolean } = { sent: false };

function navigationType(type: string | undefined): "navigate" | "reload" | "back_forward" | "client_route" {
  if (type === "reload") return "reload";
  if (type === "back-forward" || type === "back-forward-cache") return "back_forward";
  if (type === "soft-navigation") return "client_route";
  return "navigate";
}

// Stable reference (Next docs: a new function per render would report duplicates).
function reportWebVitals(metric: VitalsMetric) {
  const value = Math.round(metric.value);
  if (metric.name === "TTFB") vitals.ttfb = value;
  if (metric.name === "INP") vitals.inp = value;
  if (metric.name === "CLS") vitals.cls = Number(metric.value.toFixed(4));
  // LCP is final at the first interaction or when the page is hidden: that is
  // when the initial-load event is emitted (once per page load).
  if (metric.name === "LCP" && !vitals.sent && navigationType(metric.navigationType) !== "client_route") {
    const route = frontendRoute(new URL(metric.navigationURL ?? window.location.href, window.location.origin).pathname);
    if (!route) return;
    vitals.sent = true;
    track("page_load_recorded", {
      route,
      lcp_ms: value,
      inp_ms: vitals.inp,
      ttfb_ms: vitals.ttfb ?? 0,
      cls: vitals.cls ?? 0,
      device_class: deviceClass(),
      navigation_type: navigationType(metric.navigationType),
    });
  }
}

export function TelemetryProvider() {
  // Registered before the page_viewed effect so the web-vitals listeners run
  // before the TelemetryService's hidden-page flush.
  useReportWebVitals(reportWebVitals);

  const pathname = usePathname();
  const previous = useRef<{ route: string; at: number } | null>(null);

  useEffect(() => {
    const route = frontendRoute(pathname);
    if (!route) return;
    const now = Date.now();
    const last = previous.current;
    if (last && last.route === route && now - last.at < PAGE_VIEW_DEDUPE_MS) return; // plan §5.3
    track("page_viewed", {
      route,
      referrer_route: last && last.route !== route ? last.route : undefined,
      app_area: "backoffice",
      ui_locale: uiLocale(),
      device_class: deviceClass(),
    });
    previous.current = { route, at: now };
  }, [pathname]);

  useEffect(() => {
    const lastSent = new Map<string, number>();
    let sentThisSession = 0;

    function capture(source: "window_error" | "unhandled_rejection", error: unknown) {
      const name = error instanceof Error && /^[A-Za-z_]\w{0,60}$/.test(error.name) ? error.name : "Error";
      const message = error instanceof Error ? error.message : String(error ?? "");
      const fingerprint = errorFingerprint(name, error instanceof Error ? error.stack : undefined);
      const now = Date.now();
      if (sentThisSession >= MAX_ERRORS_PER_SESSION || now - (lastSent.get(fingerprint) ?? 0) < ERROR_THROTTLE_MS) return;
      lastSent.set(fingerprint, now);
      sentThisSession += 1;
      track("frontend_error_captured", {
        route: frontendRoute(window.location.pathname) ?? "/",
        error_source: source,
        error_name: name,
        message_sanitized: sanitizeErrorMessage(message),
        error_fingerprint: fingerprint,
        app_area: "backoffice",
      });
    }

    const onError = (event: ErrorEvent) => capture("window_error", event.error ?? event.message);
    const onRejection = (event: PromiseRejectionEvent) => capture("unhandled_rejection", event.reason);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
