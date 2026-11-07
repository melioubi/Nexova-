import { request } from "./api";

export const supplierCategories = [
  ["job_boards", "Bolsas de empleo"], ["ats_software", "ATS"],
  ["assessment_tools", "Evaluación"], ["training_platforms", "Formación"],
  ["payroll_and_hr_software", "Nómina y RR. HH."], ["video_interview", "Entrevistas en vídeo"],
  ["background_check", "Antecedentes"], ["office_and_facilities", "Oficinas"],
  ["it_and_software_licenses", "Software y licencias"],
] as const;

export type Supplier = {
  id: number;
  name: string;
  country: "Spain" | "USA";
  categories: string[];
  monthly_rate: number;
  currency: "EUR" | "USD";
  status: "active" | "suspended";
  updated_at: string;
  contract_renewal_date: string | null;
  contact_email: string | null;
  notes: string | null;
};
export type SupplierInput = Omit<Supplier, "id" | "updated_at">;

export function listSuppliers(country = "", category = "", signal?: AbortSignal) {
  const params = new URLSearchParams();
  if (country) params.set("country", country);
  if (category) params.set("category", category);
  return request<Supplier[]>(`/suppliers?${params}`, { signal }, true);
}

export function createSupplier(input: SupplierInput) {
  return request<Supplier>("/suppliers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }, true);
}

export function updateSupplier(id: number, field: "rate" | "status", value: number | Supplier["status"]) {
  const payload = field === "rate" ? { monthly_rate: value } : { status: value };
  return request<Supplier>(`/suppliers/${id}/${field}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }, true);
}