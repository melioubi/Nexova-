"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ApiError, forgotPassword } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await forgotPassword(email);
      setSubmitted(true);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "No se pudo procesar la solicitud.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="form-panel">
        <p className="brand">Nexova</p>
        <h1>Olvidaste tu contraseña</h1>
        {submitted ? (
          <>
            <p className="success-message">
              Si esa dirección está registrada, recibirás un enlace en breve.
            </p>
            <p className="muted">
              <Link href="/login">Volver a iniciar sesión</Link>
            </p>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            {error && <p className="error" role="alert">{error}</p>}
            <button className="button" disabled={submitting} type="submit">
              {submitting ? "Enviando..." : "Enviar enlace de restablecimiento"}
            </button>
          </form>
        )}
        <p className="muted">
          <Link href="/login">Volver a iniciar sesión</Link>
        </p>
      </section>
    </main>
  );
}