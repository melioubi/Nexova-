export type AsyncState = "idle" | "loading" | "success" | "error";

export interface CandidateNote {
  id: string;
  record_id: string;
  content: string;
  created_at: string;
}

export interface CandidateRecord {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  position: string;
  linkedin_url: string | null;
  cv_url: string | null;
  status: string;
  stage: string;
  experience_years: number;
  notes_count: number;
  applied_at: string;
  updated_at: string;
}

export interface CandidateListResponse {
  total: number;
  page: number;
  limit: number;
  data: CandidateRecord[];
}

export interface CandidateNotesResponse {
  data: CandidateNote[];
  meta: {
    total: number;
  };
}

export interface CandidateCreatePayload {
  full_name: string;
  email: string;
  phone: string;
  position: string;
  experience_years: number;
  linkedin_url?: string | null;
  cv_url?: string | null;
}

export interface CandidatePatchPayload {
  status?: string | null;
  stage?: string | null;
}

export interface CandidateNoteCreatePayload {
  content: string;
}

export interface CandidateFormValues {
  full_name: string;
  email: string;
  phone: string;
  position: string;
  experience_years: number;
  linkedin_url: string;
  cv_url: string;
}

export const DEFAULT_STATUSES = [
  "received",
  "in_progress",
  "hired",
  "rejected",
];

export const DEFAULT_STAGES = [
  "pending",
  "review",
  "interview",
  "offer",
  "closed",
];

export const NEXOVA_POSITION_OPTIONS = [
  "Consultor/a de Seleccion",
  "Especialista en Talent Acquisition",
  "Headhunter Ejecutivo/a",
  "Recruiter IT",
  "Agente de Atencion al Cliente",
  "Supervisor/a de Soporte al Cliente",
  "Formador/a Corporativo/a",
  "Coordinador/a de Formacion",
  "Ejecutivo/a de Cuentas",
  "SDR (Sales Development Representative)",
  "Generalista de RR. HH.",
];