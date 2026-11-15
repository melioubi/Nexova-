"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const views = [
  ["/backoffice/inventory/products", "Activos de talento"],
  ["/backoffice/inventory/orders/inbound", "Registrar entrada"],
  ["/backoffice/inventory/orders/outbound", "Registrar salida"],
  ["/backoffice/inventory/orders", "Historial de órdenes"],
  ["/backoffice/suppliers", "Proveedores"],
];

export function InventoryNav() {
  const pathname = usePathname();
  return <nav className="inventory-nav" aria-label="Inventario de talento">
    {views.map(([href, label]) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}>{label}</Link>)}
  </nav>;
}