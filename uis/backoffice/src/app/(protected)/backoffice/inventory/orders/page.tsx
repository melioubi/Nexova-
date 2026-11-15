"use client";

import { lazy, Suspense, useEffect, useState } from "react";
import { listTalentOrders, TalentOrder } from "@/lib/inventory";

// Lazy loading (CACHING_REPORT.md, frontend decision 1): the rows component
// (incremental rendering for ~48k orders) is only needed once the data arrives.
// React.lazy (part of React, no extra runtime) keeps it out of the initial
// bundle; the import is started on mount so the chunk downloads in parallel
// with the API request instead of after it.
const loadOrderRows = () => import("@/components/order-rows");
const OrderRows = lazy(loadOrderRows);

function newestFirst(orders: TalentOrder[]) {
  // Parse each date once (not twice per comparison inside the comparator).
  return orders
    .map((order) => ({ order, time: Date.parse(order.created_at) }))
    .sort((first, second) => second.time - first.time)
    .map(({ order }) => order);
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<TalentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    void loadOrderRows(); // preload the chunk while the order list is being fetched
    const controller = new AbortController();
    listTalentOrders(controller.signal).then((data) => {
      setOrders(newestFirst(data));
      setError("");
    }).catch((issue: unknown) => {
      if (!controller.signal.aborted) setError(issue instanceof Error ? issue.message : "No se pudo cargar el historial.");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attempt]);

  const loadingRow = <tr><td colSpan={6}>Cargando órdenes...</td></tr>;

  return <section>
    <header className="inventory-heading"><p className="eyebrow">Trazabilidad · Solo lectura</p><h1>Historial de órdenes</h1>{!loading && orders.length > 0 && <p className="muted">{orders.length} órdenes · más recientes primero · se cargan más al desplazarse</p>}</header>
    {error && <div className="inventory-error" role="alert"><p>{error}</p><button className="button button-secondary" onClick={() => { setLoading(true); setAttempt(attempt + 1); }}>Reintentar</button></div>}
    <div className="inventory-table-wrap"><table className="inventory-table"><thead><tr><th>Activo de talento</th><th>Orden</th><th>Cantidad</th><th>Fecha de creación</th><th>Usuario creador (user_uuid)</th><th>Notas</th></tr></thead><tbody>
      {loading ? loadingRow : !error && orders.length === 0 ? <tr><td colSpan={6}>No hay órdenes registradas.</td></tr> : <Suspense fallback={loadingRow}><OrderRows orders={orders} /></Suspense>}
    </tbody></table></div>
  </section>;
}
