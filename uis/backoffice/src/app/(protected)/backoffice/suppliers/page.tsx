"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { InventoryNav } from "@/components/inventory-nav";
import { createSupplier, listSuppliers, Supplier, supplierCategories, updateSupplier } from "@/lib/suppliers";

function renewalSoon(value: string | null) {
  if (!value) return false;
  const days = (new Date(`${value}T00:00:00`).getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000;
  return days >= 0 && days <= 60;
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [country, setCountry] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    listSuppliers(country, category, controller.signal).then((data) => {
      setSuppliers(data);
      setError("");
    }).catch((issue: unknown) => {
      if (!controller.signal.aborted) setError(issue instanceof Error ? issue.message : "No se pudo cargar el directorio.");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [country, category, revision]);

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const selectedCountry = values.get("country") === "USA" ? "USA" : "Spain";
    setSaving(true);
    setError("");
    try {
      await createSupplier({
        name: String(values.get("name")).trim(), country: selectedCountry,
        categories: [String(values.get("category"))], monthly_rate: Number(values.get("monthly_rate")),
        currency: selectedCountry === "Spain" ? "EUR" : "USD", status: "active",
        contact_email: String(values.get("contact_email") || "") || null,
        contract_renewal_date: String(values.get("contract_renewal_date") || "") || null,
        notes: String(values.get("notes") || "") || null,
      });
      form.reset();
      setShowForm(false);
      setRevision((value) => value + 1);
    } catch (issue) { setError(issue instanceof Error ? issue.message : "No se pudo registrar el proveedor."); }
    finally { setSaving(false); }
  }

  async function update(supplier: Supplier, field: "rate" | "status", value: number | Supplier["status"]) {
    setError("");
    try {
      await updateSupplier(supplier.id, field, value);
      setRevision((previous) => previous + 1);
    } catch (issue) { setError(issue instanceof Error ? issue.message : "No se pudo actualizar el proveedor."); }
  }

  return <main className="inventory-shell">
    <header className="topbar"><Link className="brand" href="/">Nexova</Link><Link href="/account/profile">Mi cuenta</Link></header>
    <InventoryNav />
    <section>
      <header className="inventory-heading"><p className="eyebrow">Operaciones</p><h1>Directorio de proveedores</h1></header>
      <div className="supplier-toolbar">
        <label>País<select value={country} onChange={(event) => { setLoading(true); setCountry(event.target.value); }}><option value="">Todos</option><option>Spain</option><option>USA</option></select></label>
        <label>Categoría<select value={category} onChange={(event) => { setLoading(true); setCategory(event.target.value); }}><option value="">Todas</option>{supplierCategories.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <button className="button" onClick={() => setShowForm(!showForm)}>{showForm ? "Cerrar formulario" : "Registrar proveedor"}</button>
      </div>
      {error && <p className="inventory-error" role="alert">{error}</p>}
      {showForm && <form className="inventory-form supplier-form" onSubmit={register}>
        <label>Nombre comercial<input name="name" required maxLength={160} /></label>
        <label>País del contrato<select name="country"><option>Spain</option><option>USA</option></select></label>
        <label>Categoría del servicio<select name="category">{supplierCategories.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label>Tarifa mensual<input type="number" name="monthly_rate" min="0.01" step="0.01" required /></label>
        <label>Email de contacto<input type="email" name="contact_email" /></label>
        <label>Renovación del contrato<input type="date" name="contract_renewal_date" /></label>
        <label>Notas<textarea name="notes" /></label>
        <button className="button" disabled={saving}>{saving ? "Registrando..." : "Guardar proveedor"}</button>
      </form>}
      <div className="inventory-table-wrap"><table className="inventory-table">
        <thead><tr><th>Proveedor</th><th>País</th><th>Categorías</th><th>Tarifa mensual</th><th>Estado</th><th>Renovación</th></tr></thead>
        <tbody>{loading ? <tr><td colSpan={6}>Cargando directorio...</td></tr> : suppliers.length === 0 ? <tr><td colSpan={6}>No hay proveedores para estos filtros.</td></tr> : suppliers.map((supplier) => <tr key={supplier.id}>
          <td><strong>{supplier.name}</strong><small>{supplier.contact_email}</small></td><td>{supplier.country}</td>
          <td>{supplier.categories.map((key) => supplierCategories.find(([value]) => value === key)?.[1] ?? key).join(", ")}</td>
          <td><form className="supplier-rate" onSubmit={(event) => { event.preventDefault(); const value = Number(new FormData(event.currentTarget).get("rate")); void update(supplier, "rate", value); }}><input key={`${supplier.id}-${supplier.monthly_rate}`} aria-label={`Tarifa de ${supplier.name}`} name="rate" type="number" min="0.01" step="0.01" required defaultValue={supplier.monthly_rate} /><span>{supplier.currency}</span><button className="button button-secondary">Actualizar tarifa</button></form><small>Actualizada: {new Date(supplier.updated_at).toLocaleString("es-ES")}</small></td>
          <td><button className={`stock-badge supplier-status ${supplier.status === "active" ? "stock-healthy" : "stock-empty"}`} aria-label={`${supplier.status === "active" ? "Suspender" : "Activar"} a ${supplier.name}`} onClick={() => void update(supplier, "status", supplier.status === "active" ? "suspended" : "active")}>{supplier.status === "active" ? "Activo" : "Suspendido"}</button></td>
          <td className={renewalSoon(supplier.contract_renewal_date) ? "renewal-soon" : undefined}>{supplier.contract_renewal_date ?? "Sin fecha"}{renewalSoon(supplier.contract_renewal_date) && <small>Renovación próxima</small>}</td>
        </tr>)}</tbody>
      </table></div>
    </section>
  </main>;
}