"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ApiError, getMyProfile } from "@/lib/api";
import {
  categoryLabels,
  inventoryDimensions,
  listTalentAssets,
  officeLabels,
  requestDirectStockEdit,
  stockLevel,
  TalentAsset,
} from "@/lib/inventory";
import { track } from "@/services/telemetry";

const ROLES = new Set(["admin", "manager", "recruiter", "client", "candidate", "user"]);

export default function ProductsPage() {
  const [assets, setAssets] = useState<TalentAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [editing, setEditing] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ assetId: string; text: string } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    listTalentAssets(controller.signal).then((data) => {
      setAssets(data);
      setError("");
    }).catch((issue: unknown) => {
      if (!controller.signal.aborted) setError(issue instanceof Error ? issue.message : "No se pudo cargar el material.");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attempt]);

  /**
   * "Corregir stock": the user tries to set the stock directly. The API always
   * answers 405 (stock only changes through orders, BRIEFING §6); the attempt is
   * captured as direct_stock_edit_rejected (mandatory metric) and the user is
   * shown the right way to do it.
   */
  async function attemptDirectEdit(event: FormEvent<HTMLFormElement>, asset: TalentAsset) {
    event.preventDefault();
    const value = Number(new FormData(event.currentTarget).get("stock"));
    try {
      await requestDirectStockEdit(asset.id, value);
    } catch (issue) {
      if (issue instanceof ApiError && issue.status === 405) {
        const role = (await getMyProfile().catch(() => null))?.role;
        track("direct_stock_edit_rejected", {
          ...inventoryDimensions(asset),
          quantity: Number.isInteger(value) && value >= 0 ? value : 0,
          attempt_channel: "stock_endpoint_write",
          endpoint: "/inventory/products/{product_id}/stock",
          http_method: "PATCH",
          http_status: 405,
          user_role: role && ROLES.has(role) ? role : "user",
        });
        setNotice({ assetId: asset.id, text: issue.message });
      } else {
        setNotice({ assetId: asset.id, text: issue instanceof Error ? issue.message : "No se pudo procesar la corrección." });
      }
      setEditing(null);
    }
  }

  return <section>
    <header className="inventory-heading"><p className="eyebrow">Material de formación y kits</p><h1>Inventario de material</h1><p className="muted">Disponibilidad por programa y oficina. El stock sólo cambia con órdenes de entrada y salida.</p></header>
    {error && <div className="inventory-error" role="alert"><p>{error}</p><button className="button button-secondary" onClick={() => { setLoading(true); setAttempt(attempt + 1); }}>Reintentar</button></div>}
    <div className="inventory-table-wrap"><table className="inventory-table">
      <thead><tr><th>Material</th><th>Categoría</th><th>Programa</th><th>Oficina</th><th>Stock actual</th><th>Mínimo</th><th>Disponibilidad</th><th>Órdenes</th></tr></thead>
      <tbody>{loading ? <tr><td colSpan={8}>Cargando material...</td></tr> : !error && assets.length === 0 ? <tr><td colSpan={8}>No hay material registrado.</td></tr> : assets.map((asset) => {
        const level = stockLevel(asset.current_stock, asset.min_stock);
        return <tr key={asset.id}>
          <td><strong>{asset.name}</strong>{asset.description && <small>{asset.description}</small>}</td>
          <td>{categoryLabels[asset.product_category]}</td><td>{asset.programme_id}</td><td>{officeLabels[asset.office]} · {asset.currency}</td>
          <td className="stock-number">
            {asset.current_stock}
            {editing === asset.id
              ? <form className="supplier-rate" onSubmit={(event) => void attemptDirectEdit(event, asset)}><input aria-label={`Nuevo stock de ${asset.name}`} name="stock" type="number" min={0} step={1} required defaultValue={asset.current_stock} /><button className="button button-secondary">Guardar</button><button type="button" className="button button-secondary" onClick={() => setEditing(null)}>Cancelar</button></form>
              : <button type="button" className="link-button" onClick={() => { setNotice(null); setEditing(asset.id); }}>Corregir stock</button>}
            {notice?.assetId === asset.id && <small className="error" role="alert">{notice.text}</small>}
          </td>
          <td>{asset.min_stock}</td>
          <td><span className={`stock-badge ${level.className}`}>{level.label}</span></td>
          <td><div className="row-actions"><Link href={`/backoffice/inventory/orders/inbound?asset=${encodeURIComponent(asset.id)}`}>Registrar entrada</Link><Link href={`/backoffice/inventory/orders/outbound?asset=${encodeURIComponent(asset.id)}`}>Registrar salida</Link></div></td>
        </tr>;
      })}</tbody>
    </table></div>
  </section>;
}
