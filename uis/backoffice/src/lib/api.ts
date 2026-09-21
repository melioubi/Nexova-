import { expireSession, getToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api/backend";

type ApiErrorPayload = {
  detail?: string | Array<{ loc?: string[]; msg?: string }>;
};

export class ApiError extends Error {
  constructor(message: string, public readonly fieldErrors: Record<string, string> = {}) {
    super(message);
  }
}

function errorFromResponse(payload: ApiErrorPayload) {
  if (Array.isArray(payload.detail)) {
    const fieldErrors: Record<string, string> = {};
    for (const error of payload.detail) {
      const field = error.loc?.at(-1);
      if (field && error.msg) fieldErrors[field] = error.msg;
    }
    return new ApiError("Revisa los campos indicados.", fieldErrors);
  }
  return new ApiError(payload.detail ?? "No se pudo completar la solicitud.");
}

async function request<T>(path: string, init: RequestInit = {}, protectedRequest = false): Promise<T> {
  const token = protectedRequest ? getToken() : null;
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers },
  });
  if (response.status === 401) {
    expireSession();
    throw new ApiError("Tu sesión ha expirado.");
  }
  if (!response.ok) {
    let payload: ApiErrorPayload = {};
    try { payload = await response.json(); } catch { }
    throw errorFromResponse(payload);
  }
  return response.json() as Promise<T>;
}

export type Credentials = { email: string; password: string };
export type RegisterInput = Credentials & { name?: string; phone?: string; address?: string };
export type Profile = { email: string; name: string; phone: string; address: string };

export async function login({ email, password }: Credentials) {
  const response = await request<{ access_token: string }>("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username: email, password }),
  });
  if (!response.access_token) throw new ApiError("La respuesta de acceso no incluyó un token.");
  return response.access_token;
}

export function register(input: RegisterInput) {
  return request("/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: input.email, username: input.email, password: input.password }),
  });
}

export async function getMyProfile(): Promise<Profile> {
  const response = await request<{
    email: string;
    profile?: { name?: string | null; phone?: string | null; address?: string | null } | null;
  }>("/auth/me", {}, true);
  return {
    email: response.email,
    name: response.profile?.name ?? "",
    phone: response.profile?.phone ?? "",
    address: response.profile?.address ?? "",
  };
}

export function updateMyProfile(profile: Omit<Profile, "email">) {
  return request("/profiles/me", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  }, true);
}