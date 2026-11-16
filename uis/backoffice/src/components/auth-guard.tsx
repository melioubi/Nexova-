"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken, type SessionExpiryTrigger } from "@/lib/auth";
import { hasUnsavedForm } from "@/lib/form-state";
import { track } from "@/services/telemetry";
import { frontendRoute } from "@/services/telemetry-routes";
import { sessionAgeMinutes } from "@/services/telemetry-session";
import { getMyProfile } from "@/lib/api";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }

    getMyProfile()
      .then(() => setAuthenticated(true))
      .catch(() => router.replace("/login"));
  }, [router]);

  useEffect(() => {
    // session_expired (plan A.16) is captured here, in the auth component,
    // not in each page: every expiry in the backoffice goes through this event.
    const handleExpiredSession = (event: Event) => {
      const trigger = (event as CustomEvent<SessionExpiryTrigger>).detail ?? "api_401";
      const route = frontendRoute(window.location.pathname);
      if (route) {
        track("session_expired", {
          route,
          trigger,
          session_age_minutes: sessionAgeMinutes(),
          had_unsaved_form: hasUnsavedForm(),
        });
      }
      router.replace("/login");
    };
    window.addEventListener("nexova:session-expired", handleExpiredSession);
    return () => window.removeEventListener("nexova:session-expired", handleExpiredSession);
  }, [router]);

  if (!authenticated) return <main className="loading">Comprobando sesión...</main>;
  return <>{children}</>;
}