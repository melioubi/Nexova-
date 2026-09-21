"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
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
    const handleExpiredSession = () => router.replace("/login");
    window.addEventListener("nexova:session-expired", handleExpiredSession);
    return () => window.removeEventListener("nexova:session-expired", handleExpiredSession);
  }, [router]);

  if (!authenticated) return <main className="loading">Comprobando sesión...</main>;
  return <>{children}</>;
}