import { request } from "./api";

const INVENTORY_URL = process.env.NEXT_PUBLIC_INVENTORY_API_URL ?? "/api/backend";

export type TalentAsset = {
  id: string;
  name: string;
  skill_category: string;
  country: string;
  description: string | null;
  current_stock: number;
};
export type OrderType = "inbound" | "outbound";
export type TalentOrder = {
  id: string;
  type: OrderType;
  talent_asset_id: string;
  talent_asset_name: string;
  skill_category: string;
  country: string;
  quantity: number;
  notes: string | null;
  created_at: string;
  user_uuid: string;
};
export type OrderInput = { talent_asset_id: string; quantity: number; notes: string | null };
type CreatedOrder = Omit<TalentOrder, "type" | "talent_asset_name" | "skill_category" | "country">;

export function listTalentAssets(signal?: AbortSignal) {
  return request<TalentAsset[]>("/inventory/products", { signal }, true, INVENTORY_URL);
}

export function getTalentAsset(id: string, signal?: AbortSignal) {
  return request<TalentAsset>(`/inventory/products/${encodeURIComponent(id)}`, { signal }, true, INVENTORY_URL);
}

export function listTalentOrders(signal?: AbortSignal) {
  return request<TalentOrder[]>("/inventory/orders", { signal }, true, INVENTORY_URL);
}

export function createTalentOrder(type: OrderType, input: OrderInput) {
  return request<CreatedOrder>(`/inventory/orders/${type}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }, true, INVENTORY_URL);
}

// Bajo: 1-5 perfiles; saludable: 6 o más; cero: sin disponibilidad.
export function stockLevel(stock: number) {
  if (stock === 0) return { label: "Sin disponibilidad", className: "stock-empty" };
  if (stock <= 5) return { label: "Stock bajo", className: "stock-low" };
  return { label: "Disponible", className: "stock-healthy" };
}