"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ApiError, changePassword } from "@/lib/api";

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("");

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      setStatus("Contraseña cambiada correctamente.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "No se pudo cambiar la contraseña.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <p className="brand">Nexova</p>
        <Link href="/">Volver al panel</Link>
      </header>
      <section className="form-panel">
        <p className="eyebrow">Cuenta</p>
        <h1>Cambiar contraseña</h1>
        <form onSubmit={handleSubmit}>
          <label>
            Contraseña actual
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
            />
          </label>
          <label>
            Nueva contraseña
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
              minLength={8}
            />
          </label>
          <label>
            Confirmar nueva contraseña
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              minLength={8}
            />
          </label>
          {error && <p className="error" role="alert">{error}</p>}
          {status && <p className="status">{status}</p>}
          <button className="button" disabled={submitting} type="submit">
            {submitting ? "Cambiando..." : "Cambiar contraseña"}
          </button>
        </form>
        <p className="muted">
          <Link href="/account/profile">Volver a mi perfil</Link>
        </p>
      </section>
    </main>
  );
}