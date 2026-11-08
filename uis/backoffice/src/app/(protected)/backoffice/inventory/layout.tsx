import Link from "next/link";
import { InventoryNav } from "@/components/inventory-nav";

export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  return <main className="inventory-shell">
    <header className="topbar"><Link className="brand" href="/">Nexova</Link><Link href="/account/profile">Mi cuenta</Link></header>
    <InventoryNav />
    {children}
  </main>;
}