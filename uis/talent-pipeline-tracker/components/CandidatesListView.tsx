"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CandidateForm } from "@/components/CandidateForm";
import { createRecord, getRecords } from "@/services/tracker-api";
import {
  CandidateRecord,
  DEFAULT_STAGES,
  DEFAULT_STATUSES,
  normalizeStage,
  normalizeStatus,
  stageLabel,
  statusLabel,
} from "@/types/tracker";

export function CandidatesListView() {
  const [records, setRecords] = useState<CandidateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const statusParamRaw = searchParams.get("status") ?? "";
  const stageParamRaw = searchParams.get("stage") ?? "";
  const queryParam = searchParams.get("q") ?? "";

  const statusParam = (DEFAULT_STATUSES as readonly string[]).includes(statusParamRaw)
    ? statusParamRaw
    : "";

  const stageParam = (DEFAULT_STAGES as readonly string[]).includes(stageParamRaw)
    ? stageParamRaw
    : "";

  useEffect(() => {
    const loadRecords = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getRecords();
        setRecords(response.data);
      } catch (loadError) {
        const message =
          loadError instanceof Error
            ? loadError.message
            : "No fue posible cargar candidaturas.";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void loadRecords();
  }, []);

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const normalizedStatus = normalizeStatus(record.status);
      const normalizedStage = normalizeStage(record.stage);
      const matchStatus = !statusParam || normalizedStatus === statusParam;
      const matchStage = !stageParam || normalizedStage === stageParam;
      const normalizedSearch = queryParam.trim().toLowerCase();

      const matchSearch =
        normalizedSearch.length === 0 ||
        record.full_name.toLowerCase().includes(normalizedSearch) ||
        record.email.toLowerCase().includes(normalizedSearch);

      return matchStatus && matchStage && matchSearch;
    });
  }, [records, stageParam, statusParam, queryParam]);

  function updateQueryParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname);
  }

  async function handleCreate(payload: Parameters<typeof createRecord>[0]) {
    const created = await createRecord(payload);
    setRecords((prev) => [created, ...prev]);
  }

  return (
    <main className="shell-bg min-h-screen px-4 py-8 md:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <header className="rounded-2xl border border-border bg-surface px-5 py-6">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">Nexova</p>
          <h1 className="mt-2 text-2xl font-bold">Talent Pipeline Tracker</h1>
          <p className="mt-2 text-sm text-muted">
            Gestion de candidaturas para el equipo de People & Talent.
          </p>
        </header>

        <section className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex flex-wrap items-end gap-3">
            <label className="grid min-w-44 gap-1 text-sm">
              Estado
              <select
                className="rounded-md border border-border bg-white px-3 py-2"
                value={statusParam}
                onChange={(event) => updateQueryParam("status", event.target.value)}
              >
                <option value="">Todos</option>
                {DEFAULT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {statusLabel(status)}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid min-w-44 gap-1 text-sm">
              Etapa
              <select
                className="rounded-md border border-border bg-white px-3 py-2"
                value={stageParam}
                onChange={(event) => updateQueryParam("stage", event.target.value)}
              >
                <option value="">Todas</option>
                {DEFAULT_STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {stageLabel(stage)}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid min-w-72 flex-1 gap-1 text-sm">
              Buscar por nombre o email
              <input
                className="rounded-md border border-border bg-white px-3 py-2"
                placeholder="Ej: ana.garcia@correo.com"
                value={queryParam}
                onChange={(event) => updateQueryParam("q", event.target.value)}
              />
            </label>

            <button
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-contrast"
              onClick={() => setShowCreateForm((prev) => !prev)}
            >
              {showCreateForm ? "Cerrar formulario" : "Nueva candidatura"}
            </button>
          </div>
        </section>

        {showCreateForm ? (
          <CandidateForm
            title="Registrar nueva candidatura"
            submitLabel="Crear candidatura"
            onSubmit={handleCreate}
          />
        ) : null}

        <section className="rounded-2xl border border-border bg-surface p-5">
          {loading ? <p className="text-sm text-muted">Cargando candidaturas...</p> : null}
          {error ? (
            <p className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
              {error}
            </p>
          ) : null}
          {!loading && !error ? (
            <p className="mb-3 rounded-md bg-ok-soft px-3 py-2 text-sm text-ok">
              Candidaturas cargadas correctamente.
            </p>
          ) : null}

          {!loading && !error ? (
            <>
              <p className="mb-3 text-sm text-muted">
                Mostrando {filteredRecords.length} de {records.length} candidaturas.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="p-2">Nombre</th>
                      <th className="p-2">Puesto</th>
                      <th className="p-2">Estado</th>
                      <th className="p-2">Etapa</th>
                      <th className="p-2">Detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((record) => (
                      <tr key={record.id} className="border-b border-border/80">
                        <td className="p-2 font-medium">{record.full_name}</td>
                        <td className="p-2">{record.position}</td>
                        <td className="p-2">{statusLabel(record.status)}</td>
                        <td className="p-2">{stageLabel(record.stage)}</td>
                        <td className="p-2">
                          <Link
                            href={`/candidates/${record.id}`}
                            className="rounded-md border border-border px-3 py-1 font-medium hover:bg-background"
                          >
                            Ver candidato
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </section>
      </div>
    </main>
  );
}