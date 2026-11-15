export const TOKEN_KEY = "nexova.auth.token";

export function getToken() {
  return typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY);
}

export function saveToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
}

export type SessionExpiryTrigger = "api_401" | "token_missing";

/** Ends the session and notifies the AuthGuard, which captures session_expired. */
export function expireSession(trigger: SessionExpiryTrigger = "api_401") {
  logout();
  window.dispatchEvent(new CustomEvent<SessionExpiryTrigger>("nexova:session-expired", { detail: trigger }));
}