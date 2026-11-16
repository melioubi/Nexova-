"use client"; // Error boundaries must be Client Components

/*
 * Route-segment error boundary: render errors inside the backoffice pages are
 * captured as frontend_error_captured (error_source = error_boundary).
 */
import { useEffect } from "react";
import { track } from "@/services/telemetry";
import { frontendRoute } from "@/services/telemetry-routes";
import { errorFingerprint, sanitizeErrorMessage } from "@/services/telemetry-errors";

export default function ErrorBoundary({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    const name = error instanceof Error && /^[A-Za-z_]\w{0,60}$/.test(error.name) ? error.name : "Error";
    track("frontend_error_captured", {
      route: frontendRoute(window.location.pathname) ?? "/",
      error_source: "error_boundary",
      error_name: name,
      message_sanitized: sanitizeErrorMessage(error instanceof Error ? error.message : String(error ?? "")),
      error_fingerprint: errorFingerprint(name, error instanceof Error ? error.stack : undefined),
      app_area: "backoffice",
    });
  }, [error]);

  return (
    <main className="app-shell">
      <section className="form-panel">
        <p className="eyebrow">Error</p>
        <h1>Algo salió mal</h1>
        <p className="muted">El equipo técnico ya fue notificado. Puedes intentarlo de nuevo.</p>
        <button className="button" type="button" onClick={() => retry()}>Reintentar</button>
      </section>
    </main>
  );
}
