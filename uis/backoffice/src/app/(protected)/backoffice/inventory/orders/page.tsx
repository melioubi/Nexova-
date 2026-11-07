"use client";

import { useEffect, useState } from "react";
import { listTalentOrders, TalentOrder } from "@/lib/inventory";

export default function OrdersPage() {
  const [orders, setOrders] = useState<TalentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    listTalentOrders(controller.signal).then((data) => {
      setOrders(data.toSorted((first, second) => Date.parse(second.created_at) - Date.parse(first.created_at)));
      setError("");
    }).catch((issue: unknown) => {
      if (!controller.signal.aborted) setError(issue instanceof Error ? issue.message : "No se pudo cargar el historial.");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attempt]);

  return <section>
    <header className="inventory-heading"><p className="eyebrow">Trazabilidad · Solo lectura</p><h1>Historial de órdenes</h1></header>
    {error && <div className="inventory-error" role="alert"><p>{error}</p><button className="button button-secondary" onClick={() => { setLoading(true); setAttempt(attempt + 1); }}>Reintentar</button></div>}
    <div className="inventory-table-wrap"><table className="inventory-table"><thead><tr><th>Activo de talento</th><th>Orden</th><th>Cantidad</th><th>Fecha de creación</th><th>Usuario creador (user_uuid)</th><th>Notas</th></tr></thead><tbody>
      {loading ? <tr><td colSpan={6}>Cargando órdenes...</td></tr> : !error && orders.length === 0 ? <tr><td colSpan={6}>No hay órdenes registradas.</td></tr> : orders.map((order) => <tr key={`${order.type}-${order.id}`}>
        <td><strong>{order.talent_asset_name}</strong><small>{order.skill_category} · {order.country}</small></td><td><span className={`order-badge ${order.type}`}>{order.type === "inbound" ? "Entrada · TalentEntry" : "Salida · TalentExit"}</span></td><td>{order.quantity}</td><td><time dateTime={order.created_at}>{new Date(order.created_at).toLocaleString("es-ES")}</time></td><td className="user-uuid">{order.user_uuid}</td><td>{order.notes ?? "Sin notas"}</td>
      </tr>)}
    </tbody></table></div>
  </section>;
}