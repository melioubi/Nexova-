"use client";

import { FormEvent, useMemo, useState } from "react";
import { CandidateCreatePayload, CandidateFormValues } from "@/types/tracker";

interface CandidateFormProps {
  title: string;
  submitLabel: string;
  initialValues?: CandidateFormValues;
  onSubmit: (payload: CandidateCreatePayload) => Promise<void>;
}

const EMPTY_VALUES: CandidateFormValues = {
  full_name: "",
  email: "",
  phone: "",
  position: "",
  experience_years: 0,
  linkedin_url: "",
  cv_url: "",
};

export function CandidateForm({
  title,
  submitLabel,
  initialValues,
  onSubmit,
}: CandidateFormProps) {
  const [values, setValues] = useState<CandidateFormValues>(
    initialValues ?? EMPTY_VALUES,
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const hasRequiredFields = useMemo(
    () =>
      values.full_name.trim().length > 2 &&
      values.email.trim().length > 3 &&
      values.phone.trim().length > 0 &&
      values.position.trim().length > 1,
    [values],
  );

  function validateForm() {
    if (!hasRequiredFields) {
      return "Completa todos los campos obligatorios.";
    }

    if (!values.email.includes("@") || !values.email.includes(".")) {
      return "Ingresa un email valido.";
    }

    if (values.experience_years < 0 || values.experience_years > 50) {
      return "Los anos de experiencia deben estar entre 0 y 50.";
    }

    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        full_name: values.full_name.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        position: values.position.trim(),
        experience_years: Number(values.experience_years),
        linkedin_url: values.linkedin_url.trim() || null,
        cv_url: values.cv_url.trim() || null,
      });
      setSuccess("Guardado con exito.");
    } catch (submissionError) {
      const message =
        submissionError instanceof Error
          ? submissionError.message
          : "No se pudo guardar.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="text-xl font-semibold">{title}</h2>
      <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={handleSubmit}>
        <label className="grid gap-1 text-sm">
          Nombre completo *
          <input
            className="rounded-md border border-border bg-white px-3 py-2"
            value={values.full_name}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, full_name: event.target.value }))
            }
            required
          />
        </label>

        <label className="grid gap-1 text-sm">
          Email *
          <input
            type="email"
            className="rounded-md border border-border bg-white px-3 py-2"
            value={values.email}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, email: event.target.value }))
            }
            required
          />
        </label>

        <label className="grid gap-1 text-sm">
          Telefono *
          <input
            className="rounded-md border border-border bg-white px-3 py-2"
            value={values.phone}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, phone: event.target.value }))
            }
            required
          />
        </label>

        <label className="grid gap-1 text-sm">
          Puesto *
          <input
            className="rounded-md border border-border bg-white px-3 py-2"
            value={values.position}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, position: event.target.value }))
            }
            required
          />
        </label>

        <label className="grid gap-1 text-sm">
          Anos de experiencia *
          <input
            type="number"
            min={0}
            max={50}
            className="rounded-md border border-border bg-white px-3 py-2"
            value={values.experience_years}
            onChange={(event) =>
              setValues((prev) => ({
                ...prev,
                experience_years: Number(event.target.value),
              }))
            }
            required
          />
        </label>

        <label className="grid gap-1 text-sm">
          LinkedIn
          <input
            type="url"
            className="rounded-md border border-border bg-white px-3 py-2"
            value={values.linkedin_url}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, linkedin_url: event.target.value }))
            }
          />
        </label>

        <label className="grid gap-1 text-sm md:col-span-2">
          Enlace al CV
          <input
            type="url"
            className="rounded-md border border-border bg-white px-3 py-2"
            value={values.cv_url}
            onChange={(event) =>
              setValues((prev) => ({ ...prev, cv_url: event.target.value }))
            }
          />
        </label>

        {error ? (
          <p className="md:col-span-2 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}

        {success ? (
          <p className="md:col-span-2 rounded-md bg-ok-soft px-3 py-2 text-sm text-ok">
            {success}
          </p>
        ) : null}

        <button
          disabled={submitting}
          className="w-fit rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-contrast disabled:opacity-60"
        >
          {submitting ? "Guardando..." : submitLabel}
        </button>
      </form>
    </section>
  );
}