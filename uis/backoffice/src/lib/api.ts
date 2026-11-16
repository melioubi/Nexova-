import { expireSession, getToken } from "./auth";
import { newRequestId, rememberRequestId } from "@/services/request-context";
import { track } from "@/services/telemetry";
import { apiRoute, frontendRoute } from "@/services/telemetry-routes";
import { currentIdentity } from "@/services/telemetry-session";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api/backend";

type ApiErrorPayload = {
  detail?: string | Array<{ loc?: string[]; msg?: string; type?: string }>;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly fieldErrors: Record<string, string> = {},
    public readonly status = 0,
    /** Validation error type per field (e.g. "greater_than", "missing"). */
    public readonly fieldErrorTypes: Record<string, string> = {},
  ) {
    super(message);
  }
}

function errorFromResponse(payload: ApiErrorPayload, status: number) {
  if (Array.isArray(payload.detail)) {
    const fieldErrors: Record<string, string> = {};
    const fieldErrorTypes: Record<string, string> = {};
    for (const error of payload.detail) {
      const field = error.loc?.at(-1);
      if (field && error.msg) fieldErrors[field] = error.msg;
      if (field && error.type) fieldErrorTypes[field] = error.type;
    }
    return new ApiError("Revisa los campos indicados.", fieldErrors, status, fieldErrorTypes);
  }
  return new ApiError(typeof payload.detail === "string" ? payload.detail : "No se pudo completar la solicitud.", {}, status);
}

export async function request<T>(path: string, init: RequestInit = {}, protectedRequest = false, baseUrl = API_URL): Promise<T> {
  const token = protectedRequest ? getToken() : null;
  if (protectedRequest && !token) {
    expireSession("token_missing");
    throw new ApiError("Inicia sesión para continuar.", {}, 401);
  }
  // Correlation ids (telemetry-plan.md §3.2): the backend logs X-Request-Id
  // and the telemetry event captured after this response reuses it.
  const requestId = newRequestId();
  const { sessionId } = currentIdentity();
  const startedAt = performance.now();
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "X-Request-Id": requestId,
        ...(sessionId ? { "X-Session-Id": sessionId } : {}),
        ...init.headers,
      },
    });
  } catch (error) {
    if (!(error instanceof DOMException && error.name === "AbortError")) {
      reportFailure(path, init.method, "network_error", startedAt);
    }
    throw error;
  }
  rememberRequestId(requestId);
  if (response.status >= 500) reportFailure(path, init.method, "http_5xx", startedAt, response.status);
  // A 401 only means "session expired" when a token was sent. On public
  // requests (e.g. login) it means wrong credentials and is handled below.
  if (response.status === 401 && protectedRequest) {
    expireSession();
    throw new ApiError("Tu sesión ha expirado.", {}, 401);
  }
  if (!response.ok) {
    let payload: ApiErrorPayload = {};
    try { payload = await response.json(); } catch { }
    throw errorFromResponse(payload, response.status);
  }
  return response.json() as Promise<T>;
}

/** api_request_failed (plan A.25): what the user saw fail, which the backend may never log. */
function reportFailure(path: string, method: string | undefined, failureKind: "network_error" | "http_5xx", startedAt: number, status?: number) {
  track("api_request_failed", {
    endpoint: apiRoute(path),
    http_method: (method ?? "GET").toUpperCase(),
    failure_kind: failureKind,
    http_status: status,
    duration_ms: Math.round(performance.now() - startedAt),
    page_route: frontendRoute(window.location.pathname),
  });
}

export type Credentials = { email: string; password: string };
export type RegisterInput = Credentials & { name?: string; phone?: string; address?: string };
export type Profile = { email: string; name: string; phone: string; address: string; role?: string };

export async function login({ email, password }: Credentials) {
  let response: { access_token: string };
  try {
    response = await request<{ access_token: string }>("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ username: email, password }),
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) throw new ApiError("Email o contraseña incorrectos.", {}, 401);
    if (error instanceof ApiError && error.status === 403) throw new ApiError("Tu cuenta está desactivada. Contacta con RR. HH.", {}, 403);
    throw error;
  }
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
    role?: string;
    profile?: { name?: string | null; phone?: string | null; address?: string | null } | null;
  }>("/auth/me", {}, true);
  return {
    email: response.email,
    role: response.role,
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