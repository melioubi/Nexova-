/*
 * Pure helpers to turn real URLs into the allowlisted templates of the
 * telemetry contract (no ids, no query strings — telemetry-plan.md §4.5).
 */
import { API_ROUTES, FRONTEND_ROUTES, type ApiRoute, type FrontendRoute } from "./telemetry-contract";

const UUID_SEGMENT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NUMERIC_SEGMENT = /^\d+$/;

/** "/backoffice/inventory/products?x=1" → "/backoffice/inventory/products" (or null if not allowlisted). */
export function frontendRoute(pathname: string): FrontendRoute | null {
  const path = pathname.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  return (FRONTEND_ROUTES as readonly string[]).includes(path) ? (path as FrontendRoute) : null;
}

/** "/inventory/products/4f6c…/stock" → "/inventory/products/{product_id}/stock". */
export function apiRoute(path: string): ApiRoute | null {
  const parts = path.split(/[?#]/)[0].split("/").filter(Boolean);
  const templated = parts.map((part, index) => {
    if (!UUID_SEGMENT.test(part) && !NUMERIC_SEGMENT.test(part)) return part;
    const collection = parts[index - 1];
    if (collection === "products") return "{product_id}";
    if (collection === "suppliers") return "{supplier_id}";
    if (collection === "users") return "{user_id}";
    return part;
  });
  const route = "/" + templated.join("/");
  return (API_ROUTES as readonly string[]).includes(route) ? (route as ApiRoute) : null;
}

export function deviceClass(): "mobile" | "tablet" | "desktop" {
  const width = typeof window === "undefined" ? 1280 : window.innerWidth;
  return width < 768 ? "mobile" : width < 1024 ? "tablet" : "desktop";
}

/** UI language — independent of the office (nexova-BRIEFING §6). */
export function uiLocale(): "es" | "en" {
  const lang = typeof document === "undefined" ? "es" : document.documentElement.lang;
  return lang.startsWith("en") ? "en" : "es";
}
