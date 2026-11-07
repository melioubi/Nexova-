"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { listTalentAssets, stockLevel, TalentAsset } from "@/lib/inventory";

export default function ProductsPage() {
  const [assets, setAssets] = useState<TalentAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    listTalentAssets(controller.signal).then((data) => {
      setAssets(data);
      setError("");
    }).catch((issue: unknown) => {
      if (!controller.signal.aborted) setError(issue instanceof Error ? issue.message : "No se pudieron cargar los activos de talento.");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attempt]);

  return <section>
    <header className="inventory-heading"><p className="eyebrow">Pipeline de talento</p><h1>Activos de talento</h1><p className="muted">Disponibilidad por especialidad y país.</p></header>
    {error && <div className="inventory-error" role="alert"><p>{error}</p><button className="button button-secondary" onClick={() => { setLoading(true); setAttempt(attempt + 1); }}>Reintentar</button></div>}
    <div className="inventory-table-wrap"><table className="inventory-table">
      <thead><tr><th>Activo de talento</th><th>Especialidad</th><th>País</th><th>Stock actual</th><th>Disponibilidad</th><th>Órdenes</th></tr></thead>
      <tbody>{loading ? <tr><td colSpan={6}>Cargando activos...</td></tr> : !error && assets.length === 0 ? <tr><td colSpan={6}>No hay activos de talento registrados.</td></tr> : assets.map((asset) => {
        const level = stockLevel(asset.current_stock);
        return <tr key={asset.id}>
          <td><strong>{asset.name}</strong>{asset.description && <small>{asset.description}</small>}</td><td>{asset.skill_category}</td><td>{asset.country}</td><td className="stock-number">{asset.current_stock}</td>
          <td><span className={`stock-badge ${level.className}`}>{level.label}</span></td>
          <td><div className="row-actions"><Link href={`/backoffice/inventory/orders/inbound?asset=${encodeURIComponent(asset.id)}`}>Registrar entrada</Link><Link href={`/backoffice/inventory/orders/outbound?asset=${encodeURIComponent(asset.id)}`}>Registrar salida</Link></div></td>
        </tr>;
      })}</tbody>
    </table></div>
  </section>;
}