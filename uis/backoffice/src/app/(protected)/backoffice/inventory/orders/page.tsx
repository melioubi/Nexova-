"use client";

import { useEffect, useRef, useState } from "react";
import { listTalentOrders, TalentOrder } from "@/lib/inventory";

// Lazy rendering (CACHING_REPORT.md, frontend decision 2): with ~48k orders,
// mounting every <tr> at once kept the page blank for 11–16 s. Rows are
// rendered in batches as the user scrolls towards the end of the table.
const BATCH_SIZE = 100;
const dateFormat = new Intl.DateTimeFormat("es-ES", { dateStyle: "short", timeStyle: "medium" });

function newestFirst(orders: TalentOrder[]) {
  // Parse each date once (not twice per comparison inside the comparator).
  return orders
    .map((order) => ({ order, time: Date.parse(order.created_at) }))
    .sort((first, second) => second.time - first.time)
    .map(({ order }) => order);
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<TalentOrder[]>([]);
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const sentinel = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    listTalentOrders(controller.signal).then((data) => {
      setOrders(newestFirst(data));
      setVisibleCount(BATCH_SIZE);
      setError("");
    }).catch((issue: unknown) => {
      if (!controller.signal.aborted) setError(issue instanceof Error ? issue.message : "No se pudo cargar el historial.");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attempt]);

  const hasMore = visibleCount < orders.length;

  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setVisibleCount((count) => count + BATCH_SIZE);
      }
    }, { rootMargin: "800px 0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, visibleCount]);

  return <section>
    <header className="inventory-heading"><p className="eyebrow">Trazabilidad · Solo lectura</p><h1>Historial de órdenes</h1>{!loading && orders.length > 0 && <p className="muted" role="status">Mostrando {Math.min(visibleCount, orders.length)} de {orders.length} órdenes (más recientes primero)</p>}</header>
    {error && <div className="inventory-error" role="alert"><p>{error}</p><button className="button button-secondary" onClick={() => { setLoading(true); setAttempt(attempt + 1); }}>Reintentar</button></div>}
    <div className="inventory-table-wrap"><table className="inventory-table"><thead><tr><th>Activo de talento</th><th>Orden</th><th>Cantidad</th><th>Fecha de creación</th><th>Usuario creador (user_uuid)</th><th>Notas</th></tr></thead><tbody>
      {loading ? <tr><td colSpan={6}>Cargando órdenes...</td></tr> : !error && orders.length === 0 ? <tr><td colSpan={6}>No hay órdenes registradas.</td></tr> : orders.slice(0, visibleCount).map((order) => <tr key={`${order.type}-${order.id}`}>
        <td><strong>{order.talent_asset_name}</strong><small>{order.skill_category} · {order.country}</small></td><td><span className={`order-badge ${order.type}`}>{order.type === "inbound" ? "Entrada · TalentEntry" : "Salida · TalentExit"}</span></td><td>{order.quantity}</td><td><time dateTime={order.created_at}>{dateFormat.format(new Date(order.created_at))}</time></td><td className="user-uuid">{order.user_uuid}</td><td>{order.notes ?? "Sin notas"}</td>
      </tr>)}
      {hasMore && <tr ref={sentinel} aria-hidden="true"><td colSpan={6} className="muted">Cargando más órdenes…</td></tr>}
    </tbody></table></div>
  </section>;
}
