"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ApiError, getMyProfile, Profile, updateMyProfile } from "@/lib/api";

const emptyProfile: Profile = { email: "", name: "", phone: "", address: "" };

export default function ProfilePage() {
  const [profile, setProfile] = useState(emptyProfile);
  const [status, setStatus] = useState("Cargando perfil...");
  const [error, setError] = useState("");

  useEffect(() => {
    getMyProfile()
      .then((data) => { setProfile(data); setStatus(""); })
      .catch((requestError: unknown) => {
        setStatus("");
        setError(requestError instanceof Error ? requestError.message : "No se pudo cargar el perfil.");
      });
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("Guardando...");
    try {
      await updateMyProfile({ name: profile.name, phone: profile.phone, address: profile.address });
      setStatus("Cambios guardados.");
    } catch (requestError) {
      setStatus("");
      setError(requestError instanceof ApiError ? requestError.message : "No se pudieron guardar los cambios.");
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar"><p className="brand">Nexova</p><Link href="/">Volver al panel</Link></header>
      <section className="form-panel">
        <p className="eyebrow">Cuenta</p><h1>Mi perfil</h1><p className="email">{profile.email}</p>
        <form onSubmit={handleSubmit}>
          <label>Nombre<input value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} /></label>
          <label>Teléfono<input value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} /></label>
          <label>Dirección<textarea value={profile.address} onChange={(event) => setProfile({ ...profile, address: event.target.value })} /></label>
          {error && <p className="error" role="alert">{error}</p>}
          {status && <p className="status">{status}</p>}
          <button className="button" type="submit">Guardar cambios</button>
        </form>
        <p className="nav-links">
          <Link href="/account/change-password">Cambiar contraseña</Link>
        </p>
      </section>
    </main>
  );
}