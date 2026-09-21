"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";

function subscribe() {
  return () => {};
}

function getServerSnapshot() {
  return false;
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const authenticated = useSyncExternalStore(subscribe, () => Boolean(getToken()), getServerSnapshot);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
    }
  }, [router]);

  useEffect(() => {
    const handleExpiredSession = () => router.replace("/login");
    window.addEventListener("nexova:session-expired", handleExpiredSession);
    return () => window.removeEventListener("nexova:session-expired", handleExpiredSession);
  }, [router]);

  if (!authenticated) return <main className="loading">Comprobando sesión...</main>;
  return <>{children}</>;
}