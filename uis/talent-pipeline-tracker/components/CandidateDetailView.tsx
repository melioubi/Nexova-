"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { CandidateForm } from "@/components/CandidateForm";
import {
  addRecordNote,
  deleteRecordNote,
  getRecordById,
  getRecordNotes,
  patchRecord,
  updateRecord,
} from "@/services/tracker-api";
import {
  CandidateFormValues,
  CandidateNote,
  CandidateRecord,
  DEFAULT_STAGES,
  DEFAULT_STATUSES,
} from "@/types/tracker";

interface CandidateDetailViewProps {
  id: string;
}

function titleCase(value: string) {
  return value
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

export function CandidateDetailView({ id }: CandidateDetailViewProps) {
  const [record, setRecord] = useState<CandidateRecord | null>(null);
  const [notes, setNotes] = useState<CandidateNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [savingPatch, setSavingPatch] = useState(false);
  const [patchFeedback, setPatchFeedback] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [notesError, setNotesError] = useState<string | null>(null);
  const [notesSuccess, setNotesSuccess] = useState<string | null>(null);
  const [notesLoading, setNotesLoading] = useState(false);

  useEffect(() => {
    startTransition(() => {
      void (async () => {
        setError(null);
        setLoading(true);
        try {
          const [recordResponse, notesResponse] = await Promise.all([
            getRecordById(id),
            getRecordNotes(id),
          ]);
          setRecord(recordResponse);
          setNotes(notesResponse.data);
        } catch (loadError) {
          const message =
            loadError instanceof Error
              ? loadError.message
              : "No se pudo cargar el detalle.";
          setError(message);
        } finally {
          setLoading(false);
        }
      })();
    });
  }, [id]);

  const editInitialValues = useMemo<CandidateFormValues | undefined>(() => {
    if (!record) {
      return undefined;
    }

    return {
      full_name: record.full_name,
      email: record.email,
      phone: record.phone,
      position: record.position,
      experience_years: Number(record.experience_years),
      linkedin_url: record.linkedin_url ?? "",
      cv_url: record.cv_url ?? "",
    };
  }, [record]);

  const statusOptions = useMemo(() => {
    if (!record?.status) {
      return DEFAULT_STATUSES;
    }
    return Array.from(new Set([record.status, ...DEFAULT_STATUSES]));
  }, [record]);

  const stageOptions = useMemo(() => {
    if (!record?.stage) {
      return DEFAULT_STAGES;
    }
    return Array.from(new Set([record.stage, ...DEFAULT_STAGES]));
  }, [record]);

  async function patchStatusOrStage(payload: { status?: string; stage?: string }) {
    if (!record) {
      return;
    }
    setSavingPatch(true);
    setPatchFeedback(null);
    try {
      const updated = await patchRecord(record.id, payload);
      setRecord(updated);
      setPatchFeedback("Cambio aplicado correctamente.");
    } catch (patchError) {
      const message =
        patchError instanceof Error ? patchError.message : "No se pudo actualizar.";
      setPatchFeedback(message);
    } finally {
      setSavingPatch(false);
    }
  }

  async function handleAddNote() {
    if (!record || !noteDraft.trim()) {
      return;
    }
    setNotesLoading(true);
    setNotesError(null);
    setNotesSuccess(null);
    try {
      await addRecordNote(record.id, { content: noteDraft.trim() });
      const refreshed = await getRecordNotes(record.id);
      setNotes(refreshed.data);
      setNoteDraft("");
      setNotesSuccess("Nota agregada correctamente.");
    } catch (noteError) {
      const message =
        noteError instanceof Error
          ? noteError.message
          : "No se pudo guardar la nota.";
      setNotesError(message);
    } finally {
      setNotesLoading(false);
    }
  }

  async function handleDeleteNote(noteId: string) {
    if (!record) {
      return;
    }
    setNotesLoading(true);
    setNotesError(null);
    setNotesSuccess(null);
    try {
      await deleteRecordNote(record.id, noteId);
      const refreshed = await getRecordNotes(record.id);
      setNotes(refreshed.data);
      setNotesSuccess("Nota eliminada correctamente.");
    } catch (noteError) {
      const message =
        noteError instanceof Error
          ? noteError.message
          : "No se pudo eliminar la nota.";
      setNotesError(message);
    } finally {
      setNotesLoading(false);
    }
  }

  if (loading || isPending) {
    return (
      <main className="shell-bg min-h-screen px-4 py-8 md:px-8">
        <div className="mx-auto max-w-5xl rounded-2xl border border-border bg-surface p-6">
          <p className="text-sm text-muted">Cargando detalle de candidatura...</p>
        </div>
      </main>
    );
  }

  if (error || !record) {
    return (
      <main className="shell-bg min-h-screen px-4 py-8 md:px-8">
        <div className="mx-auto max-w-5xl rounded-2xl border border-border bg-surface p-6">
          <Link href="/" className="text-sm font-medium text-primary hover:underline">
            Volver al listado
          </Link>
          <p className="mt-4 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
            {error ?? "No se encontro la candidatura."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="shell-bg min-h-screen px-4 py-8 md:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-5">
        <section className="rounded-2xl border border-border bg-surface p-5">
          <Link href="/" className="text-sm font-medium text-primary hover:underline">
            Volver al listado
          </Link>
          <h1 className="mt-2 text-2xl font-bold">{record.full_name}</h1>
          <p className="text-sm text-muted">{record.position}</p>

          <div className="mt-4 grid gap-2 text-sm md:grid-cols-2">
            <p>
              <span className="font-semibold">Email:</span> {record.email}
            </p>
            <p>
              <span className="font-semibold">Telefono:</span> {record.phone}
            </p>
            <p>
              <span className="font-semibold">LinkedIn:</span>{" "}
              {record.linkedin_url ? (
                <a
                  href={record.linkedin_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline"
                >
                  Abrir perfil
                </a>
              ) : (
                "No registrado"
              )}
            </p>
            <p>
              <span className="font-semibold">CV:</span>{" "}
              {record.cv_url ? (
                <a
                  href={record.cv_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline"
                >
                  Ver archivo
                </a>
              ) : (
                "No registrado"
              )}
            </p>
            <p>
              <span className="font-semibold">Anos de experiencia:</span>{" "}
              {record.experience_years}
            </p>
            <p>
              <span className="font-semibold">Fecha de aplicacion:</span>{" "}
              {new Date(record.applied_at).toLocaleDateString("es-ES")}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-xl font-semibold">Estado y etapa</h2>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="grid min-w-52 gap-1 text-sm">
              Estado actual
              <select
                value={record.status}
                className="rounded-md border border-border bg-white px-3 py-2"
                onChange={(event) => void patchStatusOrStage({ status: event.target.value })}
                disabled={savingPatch}
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {titleCase(status)}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid min-w-52 gap-1 text-sm">
              Etapa actual
              <select
                value={record.stage}
                className="rounded-md border border-border bg-white px-3 py-2"
                onChange={(event) => void patchStatusOrStage({ stage: event.target.value })}
                disabled={savingPatch}
              >
                {stageOptions.map((stage) => (
                  <option key={stage} value={stage}>
                    {titleCase(stage)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {patchFeedback ? (
            <p className="mt-3 rounded-md bg-warn-soft px-3 py-2 text-sm text-foreground">
              {patchFeedback}
            </p>
          ) : null}
        </section>

        {editInitialValues ? (
          <CandidateForm
            title="Editar datos de la candidatura"
            submitLabel="Actualizar candidatura"
            initialValues={editInitialValues}
            onSubmit={async (payload) => {
              const updated = await updateRecord(record.id, payload);
              setRecord(updated);
            }}
          />
        ) : null}

        <section className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="text-xl font-semibold">Notas internas</h2>

          <div className="mt-3 flex flex-col gap-2 md:flex-row">
            <textarea
              rows={3}
              className="flex-1 rounded-md border border-border bg-white px-3 py-2 text-sm"
              placeholder="Agregar nueva nota"
              value={noteDraft}
              onChange={(event) => setNoteDraft(event.target.value)}
            />
            <button
              disabled={notesLoading || !noteDraft.trim()}
              onClick={() => void handleAddNote()}
              className="h-fit rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-contrast disabled:opacity-60"
            >
              {notesLoading ? "Guardando..." : "Agregar nota"}
            </button>
          </div>

          {notesError ? (
            <p className="mt-3 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
              {notesError}
            </p>
          ) : null}

          {notesSuccess ? (
            <p className="mt-3 rounded-md bg-ok-soft px-3 py-2 text-sm text-ok">
              {notesSuccess}
            </p>
          ) : null}

          <ul className="mt-4 space-y-2">
            {notes.map((note) => (
              <li
                key={note.id}
                className="flex flex-col gap-2 rounded-md border border-border bg-background p-3 md:flex-row md:items-start md:justify-between"
              >
                <div>
                  <p className="text-sm">{note.content}</p>
                  <p className="mt-1 text-xs text-muted">
                    {new Date(note.created_at).toLocaleString("es-ES")}
                  </p>
                </div>
                <button
                  disabled={notesLoading}
                  className="rounded-md border border-danger px-3 py-1 text-xs font-semibold text-danger disabled:opacity-60"
                  onClick={() => void handleDeleteNote(note.id)}
                >
                  Eliminar
                </button>
              </li>
            ))}
            {notes.length === 0 ? (
              <li className="rounded-md border border-border bg-background p-3 text-sm text-muted">
                No hay notas para esta candidatura.
              </li>
            ) : null}
          </ul>
        </section>
      </div>
    </main>
  );
}