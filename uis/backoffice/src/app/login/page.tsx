"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError, login } from "@/lib/api";
import { saveToken } from "@/lib/auth";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetSuccess = searchParams.get("reset") === "success";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      saveToken(await login({ email, password }));
      router.replace("/");
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "No se pudo iniciar sesión.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="form-panel">
        <p className="brand">Nexova</p>
        <h1>Iniciar sesión</h1>
        {resetSuccess && <p className="status">Contraseña restablecida correctamente. Ahora puedes iniciar sesión.</p>}
        <form onSubmit={handleSubmit}>
          <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <label>
            Contraseña
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>
          <p className="field-link"><Link href="/forgot-password">¿Olvidaste tu contraseña?</Link></p>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="button" disabled={submitting} type="submit">{submitting ? "Accediendo..." : "Acceder"}</button>
        </form>
        <p className="muted">¿No tienes cuenta? <Link href="/register">Regístrate</Link></p>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="auth-page"><section className="form-panel"><p className="brand">Nexova</p></section></main>}>
      <LoginForm />
    </Suspense>
  );
}