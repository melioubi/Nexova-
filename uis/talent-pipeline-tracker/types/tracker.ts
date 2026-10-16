export type AsyncState = "idle" | "loading" | "success" | "error";

export const DEFAULT_STATUSES = [
  "received",
  "in_progress",
  "selected",
  "discarded",
] as const;

export const DEFAULT_STAGES = [
  "pending",
  "review",
  "personal_interview",
  "technical_interview",
  "offer_presented",
] as const;

export type CandidateStatus = (typeof DEFAULT_STATUSES)[number];
export type CandidateStage = (typeof DEFAULT_STAGES)[number];

export const STATUS_LABELS: Record<CandidateStatus, string> = {
  received: "Recibida",
  in_progress: "En proceso",
  selected: "Seleccionada",
  discarded: "Descartada",
};

export const STAGE_LABELS: Record<CandidateStage, string> = {
  pending: "Pendiente",
  review: "Revision",
  personal_interview: "Entrevista personal",
  technical_interview: "Entrevista tecnica",
  offer_presented: "Oferta presentada",
};

const LEGACY_STATUS_MAP: Record<string, CandidateStatus> = {
  hired: "selected",
  rejected: "discarded",
};

const LEGACY_STAGE_MAP: Record<string, CandidateStage> = {
  interview: "personal_interview",
  offer: "offer_presented",
  closed: "review",
};

function normalizeKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

export function normalizeStatus(value: string): CandidateStatus {
  const normalized = normalizeKey(value);
  if ((DEFAULT_STATUSES as readonly string[]).includes(normalized)) {
    return normalized as CandidateStatus;
  }
  return LEGACY_STATUS_MAP[normalized] ?? "received";
}

export function normalizeStage(value: string): CandidateStage {
  const normalized = normalizeKey(value);
  if ((DEFAULT_STAGES as readonly string[]).includes(normalized)) {
    return normalized as CandidateStage;
  }
  return LEGACY_STAGE_MAP[normalized] ?? "pending";
}

export function statusLabel(value: string): string {
  return STATUS_LABELS[normalizeStatus(value)];
}

export function stageLabel(value: string): string {
  return STAGE_LABELS[normalizeStage(value)];
}

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
  status: CandidateStatus;
  stage: CandidateStage;
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
  status?: CandidateStatus | null;
  stage?: CandidateStage | null;
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