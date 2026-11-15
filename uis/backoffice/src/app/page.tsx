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
          <h1>Panel de operaciones</h1>
          <Link className="button" href="/account/profile">Ver mi perfil</Link>
          <Link className="button button-secondary" href="/backoffice/inventory/products">Inventario de talento</Link>
          <Link className="button button-secondary" href="/backoffice/suppliers">Proveedores</Link>
        </section>
      </main>
    </AuthGuard>
  );
}
