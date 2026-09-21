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

export function expireSession() {
  logout();
  window.dispatchEvent(new Event("nexova:session-expired"));
}