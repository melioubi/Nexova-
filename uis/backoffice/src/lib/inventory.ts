import { request } from "./api";

const INVENTORY_URL = process.env.NEXT_PUBLIC_INVENTORY_API_URL ?? "/api/backend";

// Vocabulary of nexova-BRIEFING.es.md §2: training/certification material and
// onboarding kits, per office (valencia | miami) and programme.
export type Office = "valencia" | "miami";
export type ProductCategory = "training_kit" | "certification" | "onboarding_equipment";
export type RecipientType = "client" | "candidate" | "consultant" | "support_agent";
export type Currency = "EUR" | "USD";

export const officeLabels: Record<Office, string> = { valencia: "Valencia", miami: "Miami" };
export const categoryLabels: Record<ProductCategory, string> = {
  training_kit: "Kit de formación",
  certification: "Certificación",
  onboarding_equipment: "Equipo de incorporación",
};
export const recipientLabels: Record<RecipientType, string> = {
  client: "Cliente",
  candidate: "Candidato",
  consultant: "Consultor",
  support_agent: "Agente de soporte",
};
/** Supplier directory country of each office (Spain → EUR, USA → USD). */
export const supplierCountryByOffice: Record<Office, "Spain" | "USA"> = { valencia: "Spain", miami: "USA" };

export type TalentAsset = {
  id: string;
  name: string;
  office: Office;
  product_category: ProductCategory;
  programme_id: string;
  currency: Currency;
  min_stock: number;
  description: string | null;
  current_stock: number;
};
export type OrderType = "inbound" | "outbound";
export type TalentOrder = {
  id: string;
  type: OrderType;
  talent_asset_id: string;
  talent_asset_name: string;
  office: string;
  programme_id: string;
  product_category: string;
  quantity: number;
  notes: string | null;
  created_at: string;
  user_uuid: string;
};
export type InboundInput = { talent_asset_id: string; quantity: number; unit_cost: number; supplier_id: string; notes: string | null };
export type OutboundInput = { talent_asset_id: string; quantity: number; recipient_type: RecipientType; notes: string | null };
export type CostVariance = {
  baseline_unit_cost: number;
  variance_pct: number;
  direction: "increase" | "decrease";
  threshold_pct: number;
  baseline_sample_size: number;
};
export type CreatedInbound = { id: string; quantity: number; unit_cost: number; supplier_id: string; stock_after: number; cost_variance: CostVariance | null };
export type CreatedOutbound = { id: string; quantity: number; recipient_type: RecipientType; stock_before: number; stock_after: number; min_stock: number; threshold_triggered: boolean };

export function listTalentAssets(signal?: AbortSignal) {
  return request<TalentAsset[]>("/inventory/products", { signal }, true, INVENTORY_URL);
}

export function getTalentAsset(id: string, signal?: AbortSignal) {
  return request<TalentAsset>(`/inventory/products/${encodeURIComponent(id)}`, { signal }, true, INVENTORY_URL);
}

export function listTalentOrders(signal?: AbortSignal) {
  return request<TalentOrder[]>("/inventory/orders", { signal }, true, INVENTORY_URL);
}

const jsonPost = (input: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(input),
});

export function createInboundOrder(input: InboundInput) {
  return request<CreatedInbound>("/inventory/orders/inbound", jsonPost(input), true, INVENTORY_URL);
}

export function createOutboundOrder(input: OutboundInput) {
  return request<CreatedOutbound>("/inventory/orders/outbound", jsonPost(input), true, INVENTORY_URL);
}

/**
 * Attempt to set the stock directly. The API always rejects it (405): stock
 * only changes through orders (BRIEFING §6). Kept as an explicit action so the
 * attempt is visible to the user and measurable (direct_stock_edit_rejected).
 */
export function requestDirectStockEdit(id: string, stock: number) {
  return request<never>(`/inventory/products/${encodeURIComponent(id)}/stock`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ current_stock: stock }),
  }, true, INVENTORY_URL);
}

/** The six mandatory inventory dimensions of the BRIEFING (minus quantity). */
export function inventoryDimensions(asset: TalentAsset) {
  return {
    office: asset.office,
    product_id: asset.id,
    product_category: asset.product_category,
    programme_id: asset.programme_id,
    currency: asset.currency,
  };
}

/** Stock level relative to the product's configured minimum. */
export function stockLevel(stock: number, minStock: number) {
  if (stock === 0) return { label: "Sin disponibilidad", className: "stock-empty" };
  if (stock < minStock) return { label: "Bajo el mínimo", className: "stock-low" };
  return { label: "Disponible", className: "stock-healthy" };
}
