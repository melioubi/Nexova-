import {
  CandidateCreatePayload,
  CandidateListResponse,
  CandidateNote,
  CandidateNoteCreatePayload,
  CandidateNotesResponse,
  CandidatePatchPayload,
  CandidateRecord,
  normalizeStage,
  normalizeStatus,
} from "@/types/tracker";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function normalizeRecord(record: CandidateRecord): CandidateRecord {
  return {
    ...record,
    status: normalizeStatus(record.status),
    stage: normalizeStage(record.stage),
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (!API_BASE) {
    throw new Error("Falta NEXT_PUBLIC_API_URL en el entorno.");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    let details = "No se pudo completar la operacion.";
    try {
      const errorBody = (await response.json()) as { detail?: string };
      if (errorBody.detail) {
        details = errorBody.detail;
      }
    } catch {
      // Keep default fallback message.
    }
    throw new ApiError(details, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function getRecords(): Promise<CandidateListResponse> {
  const response = await request<CandidateListResponse>("/records?limit=200");
  return {
    ...response,
    data: response.data.map(normalizeRecord),
  };
}

export async function getRecordById(id: string): Promise<CandidateRecord> {
  const record = await request<CandidateRecord>(`/records/${id}`);
  return normalizeRecord(record);
}

export async function createRecord(
  payload: CandidateCreatePayload,
): Promise<CandidateRecord> {
  const record = await request<CandidateRecord>("/records", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return normalizeRecord(record);
}

export async function updateRecord(
  id: string,
  payload: CandidateCreatePayload,
): Promise<CandidateRecord> {
  const record = await request<CandidateRecord>(`/records/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return normalizeRecord(record);
}

export async function patchRecord(
  id: string,
  payload: CandidatePatchPayload,
): Promise<CandidateRecord> {
  const record = await request<CandidateRecord>(`/records/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return normalizeRecord(record);
}

export async function getRecordNotes(id: string): Promise<CandidateNotesResponse> {
  return request<CandidateNotesResponse>(`/records/${id}/notes`);
}

export async function addRecordNote(
  id: string,
  payload: CandidateNoteCreatePayload,
): Promise<CandidateNote> {
  return request<CandidateNote>(`/records/${id}/notes`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteRecordNote(id: string, noteId: string): Promise<void> {
  return request<void>(`/records/${id}/notes/${noteId}`, {
    method: "DELETE",
  });
}