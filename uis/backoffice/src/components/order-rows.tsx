"use client";

import { useEffect, useRef, useState } from "react";
import type { TalentOrder } from "@/lib/inventory";

/*
 * Rows of the orders history with incremental rendering (CACHING_REPORT.md,
 * frontend decision 1). Loaded with React.lazy from the orders page: it is only
 * needed once the order list has arrived, so its chunk is fetched in parallel
 * with the API request instead of being part of the page's initial bundle.
 *
 * With ~48k orders, mounting every <tr> at once kept the page blank for
 * 11–16 s. Rows are rendered in batches as the user scrolls towards the end.
 */
const BATCH_SIZE = 100;
const dateFormat = new Intl.DateTimeFormat("es-ES", { dateStyle: "short", timeStyle: "medium" });

export default function OrderRows({ orders }: { orders: TalentOrder[] }) {
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const sentinel = useRef<HTMLTableRowElement>(null);
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

  return <>
    {orders.slice(0, visibleCount).map((order) => <tr key={`${order.type}-${order.id}`}>
      <td><strong>{order.talent_asset_name}</strong><small>{order.skill_category} · {order.country}</small></td><td><span className={`order-badge ${order.type}`}>{order.type === "inbound" ? "Entrada · TalentEntry" : "Salida · TalentExit"}</span></td><td>{order.quantity}</td><td><time dateTime={order.created_at}>{dateFormat.format(new Date(order.created_at))}</time></td><td className="user-uuid">{order.user_uuid}</td><td>{order.notes ?? "Sin notas"}</td>
    </tr>)}
    {hasMore && <tr ref={sentinel} aria-hidden="true"><td colSpan={6} className="muted">Cargando más órdenes…</td></tr>}
  </>;
}
