"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, login, RegisterInput, register, updateMyProfile } from "@/lib/api";
import { saveToken } from "@/lib/auth";

const initialForm: RegisterInput = { email: "", password: "", name: "", phone: "", address: "" };

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  function change(field: keyof RegisterInput, value: string) {
    setForm({ ...form, [field]: value });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setSubmitting(true);
    try {
      await register(form);
      saveToken(await login({ email: form.email, password: form.password }));
      if (form.name || form.phone || form.address) {
        await updateMyProfile({ name: form.name ?? "", phone: form.phone ?? "", address: form.address ?? "" });
      }
      router.replace("/");
    } catch (requestError) {
      const error = requestError instanceof ApiError ? requestError : new ApiError("No se pudo crear la cuenta.");
      setErrors({ ...error.fieldErrors, form: error.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="form-panel">
        <p className="brand">Nexova</p>
        <h1>Crear cuenta</h1>
        <form onSubmit={handleSubmit}>
          {(["email", "password", "name", "phone", "address"] as const).map((field) => (
            <label key={field}>
              {field === "email" ? "Email" : field === "password" ? "Contraseña" : field === "name" ? "Nombre" : field === "phone" ? "Teléfono" : "Dirección"}
              <input type={field === "password" ? "password" : field === "email" ? "email" : "text"} value={form[field] ?? ""} onChange={(event) => change(field, event.target.value)} required={field === "email" || field === "password"} />
              {errors[field] && <span className="error">{errors[field]}</span>}
            </label>
          ))}
          {errors.form && <p className="error" role="alert">{errors.form}</p>}
          <button className="button" disabled={submitting} type="submit">{submitting ? "Creando..." : "Crear cuenta"}</button>
        </form>
        <p className="muted">¿Ya tienes cuenta? <Link href="/login">Inicia sesión</Link></p>
      </section>
    </main>
  );
}