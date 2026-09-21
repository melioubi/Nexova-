"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError, resetPassword } from "@/lib/api";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [tokenError, setTokenError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setTokenError(false);

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (!token) {
      setError("El enlace de restablecimiento es inválido. Solicita uno nuevo.");
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword(token, password);
      router.push("/login?reset=success");
    } catch (requestError) {
      const message = requestError instanceof ApiError
        ? requestError.message
        : "No se pudo restablecer la contraseña.";
      setError(message);
      setTokenError(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <>
        <h1>Enlace inválido</h1>
        <p className="error-message">
          El enlace de restablecimiento es inválido o ha expirado.
        </p>
        <p className="muted">
          <Link href="/forgot-password">Solicitar un nuevo enlace</Link>
        </p>
      </>
    );
  }

  return (
    <>
      <h1>Nueva contraseña</h1>
      {tokenError ? (
        <>
          <p className="error" role="alert">{error}</p>
          <p className="muted">
            <Link href="/forgot-password">Solicitar un nuevo enlace</Link>
          </p>
        </>
      ) : (
        <>
          <form onSubmit={handleSubmit}>
            <label>
              Nueva contraseña
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
              />
            </label>
            <label>
              Confirmar contraseña
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                minLength={8}
              />
            </label>
            {error && <p className="error" role="alert">{error}</p>}
            <button className="button" disabled={submitting} type="submit">
              {submitting ? "Restableciendo..." : "Restablecer contraseña"}
            </button>
          </form>
          <p className="muted">
            <Link href="/login">Volver a iniciar sesión</Link>
          </p>
        </>
      )}
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="auth-page">
      <section className="form-panel">
        <p className="brand">Nexova</p>
        <Suspense fallback={<p className="status">Cargando...</p>}>
          <ResetPasswordForm />
        </Suspense>
      </section>
    </main>
  );
}