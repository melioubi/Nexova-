"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { logout } from "@/lib/auth";

export default function Home() {
  const router = useRouter();

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <AuthGuard>
      <main className="app-shell">
        <header className="topbar">
          <p className="brand">Nexova</p>
          <button className="button button-secondary" onClick={handleLogout} type="button">Cerrar sesión</button>
        </header>
        <section className="welcome">
          <p className="eyebrow">Backoffice</p>
          <h1>Tu sesión está activa.</h1>
          <p>Accede a los datos de tu cuenta desde el panel interno.</p>
          <Link className="button" href="/account/profile">Ver mi perfil</Link>
        </section>
      </main>
    </AuthGuard>
  );
}
