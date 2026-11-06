"use client";

import { FormEvent, useEffect, useState } from "react";

type Supplier = {
  id: number;
  name: string;
  country: "Spain" | "USA";
  categories: string[];
  monthly_rate: number;
  currency: "EUR" | "USD";
  updated_at: string;
  status: "active" | "suspended";
  contract_renewal_date?: string | null;
  contact_email?: string | null;
  notes?: string | null;
};

const API_URL = "/api";
const CATEGORIES = [
  ["job_boards", "Bolsas de empleo"],
  ["ats_software", "ATS"],
  ["assessment_tools", "Evaluación"],
  ["training_platforms", "Formación"],
  ["payroll_and_hr_software", "Nómina y RR. HH."],
  ["video_interview", "Entrevista en vídeo"],
  ["background_check", "Verificación de antecedentes"],
  ["office_and_facilities", "Oficina e instalaciones"],
  ["it_and_software_licenses", "Software y licencias"],
];

function categoryLabel(value: string) {
  return CATEGORIES.find(([key]) => key === value)?.[1] ?? value;
}

function money(value: number, currency: string) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

function renewalState(value?: string | null) {
  if (!value) return null;
  const days = Math.ceil((new Date(`${value}T00:00:00`).getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000);
  if (days < 0) return { label: "Vencido", urgent: false };
  if (days <= 60) return { label: `Renueva en ${days} días`, urgent: true };
  return null;
}

async function responseError(response: Response) {
  const payload = await response.json().catch(() => null);
  if (Array.isArray(payload?.detail)) return payload.detail.map((issue: { msg: string }) => issue.msg).join(". ");
  return payload?.detail ?? "No se pudo completar la operación.";
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [country, setCountry] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const loadSuppliers = async () => {
      setLoading(true);
      setError("");
      const params = new URLSearchParams();
      if (country) params.set("country", country);
      if (category) params.set("category", category);
      try {
        const response = await fetch(`${API_URL}/suppliers?${params}`, { signal: controller.signal });
        if (!response.ok) throw new Error(await responseError(response));
        setSuppliers(await response.json());
      } catch (issue) {
        if (!controller.signal.aborted) setError(issue instanceof Error ? issue.message : "No se pudo conectar con la API.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    loadSuppliers();
    return () => controller.abort();
  }, [country, category]);

  async function reload() {
    const params = new URLSearchParams();
    if (country) params.set("country", country);
    if (category) params.set("category", category);
    const response = await fetch(`${API_URL}/suppliers?${params}`);
    if (!response.ok) throw new Error(await responseError(response));
    setSuppliers(await response.json());
  }

  async function createSupplier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setSaving(true);
    setError("");
    const formData = new FormData(form);
    const selectedCountry = String(formData.get("country"));
    const payload = {
      name: String(formData.get("name")),
      country: selectedCountry,
      categories: [String(formData.get("categories"))],
      monthly_rate: Number(formData.get("monthly_rate")),
      currency: selectedCountry === "Spain" ? "EUR" : "USD",
      status: "active",
      contract_renewal_date: String(formData.get("contract_renewal_date") || "") || null,
      contact_email: String(formData.get("contact_email") || "") || null,
      notes: String(formData.get("notes") || "") || null,
    };
    try {
      const response = await fetch(`${API_URL}/suppliers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(await responseError(response));
      form.reset();
      setShowForm(false);
      await reload();
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "No se pudo registrar el proveedor.");
    } finally {
      setSaving(false);
    }
  }

  async function updateRate(supplier: Supplier, value: string) {
    const monthly_rate = Number(value);
    if (!Number.isFinite(monthly_rate) || monthly_rate <= 0) {
      setError("La tarifa debe ser un número mayor que cero.");
      return;
    }
    try {
      const response = await fetch(`${API_URL}/suppliers/${supplier.id}/rate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthly_rate }),
      });
      if (!response.ok) throw new Error(await responseError(response));
      await reload();
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "No se pudo actualizar la tarifa.");
    }
  }

  async function toggleStatus(supplier: Supplier) {
    try {
      const response = await fetch(`${API_URL}/suppliers/${supplier.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: supplier.status === "active" ? "suspended" : "active" }),
      });
      if (!response.ok) throw new Error(await responseError(response));
      await reload();
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "No se pudo cambiar el estado.");
    }
  }

  const activeCount = suppliers.filter((supplier) => supplier.status === "active").length;
  const euroSpend = suppliers.filter((supplier) => supplier.currency === "EUR").reduce((sum, supplier) => sum + supplier.monthly_rate, 0);
  const dollarSpend = suppliers.filter((supplier) => supplier.currency === "USD").reduce((sum, supplier) => sum + supplier.monthly_rate, 0);
  const recurringValue = country
    ? money(country === "USA" ? dollarSpend : euroSpend, country === "USA" ? "USD" : "EUR")
    : `${money(euroSpend, "EUR")} + ${money(dollarSpend, "USD")}`;

  return (
    <main className="shell">
      <header className="topbar">
        <a className="wordmark" href="/suppliers" aria-label="Nexova, directorio">
          <span className="mark">N</span><span>NEXOVA</span>
        </a>
        <div className="topbar-meta"><span>OPERACIONES</span><span className="avatar">PS</span></div>
      </header>

      <section className="intro">
        <div className="intro-copy">
          <div className="eyebrow"><span className="eyebrow-line" /> CONTROL DE OPERACIONES</div>
          <h1>Directorio de<br /><em>proveedores</em></h1>
          <p>Un registro único para las relaciones que mantienen en marcha a Nexova.</p>
        </div>
        <div className="intro-art" aria-hidden="true">
          <div className="orbit orbit-one" /><div className="orbit orbit-two" />
          <div className="orbit-center"><span>15</span><small>RELACIONES</small></div>
          <span className="orbit-tag tag-one">ES</span><span className="orbit-tag tag-two">US</span>
        </div>
      </section>

      <section className="metrics" aria-label="Resumen">
        <div className="metric"><span className="metric-label">PROVEEDORES</span><strong>{suppliers.length}</strong><span className="metric-note">en este resultado</span></div>
        <div className="metric"><span className="metric-label">ACTIVOS</span><strong>{activeCount}<span className="metric-unit"> / {suppliers.length}</span></strong><span className="metric-note"><i className="green-dot" /> relaciones vigentes</span></div>
        <div className="metric metric-spend"><span className="metric-label">GASTO MENSUAL VISIBLE</span><strong>{recurringValue}</strong><span className="metric-note">separado por moneda del contrato</span></div>
        <div className="metric metric-action"><button className="add-button" onClick={() => setShowForm(!showForm)} aria-expanded={showForm}><span>{showForm ? "−" : "+"}</span>{showForm ? "Cerrar formulario" : "Añadir proveedor"}</button></div>
      </section>

      {showForm && <section className="form-section">
        <div className="section-heading"><div><span className="eyebrow">NUEVA RELACIÓN</span><h2>Registrar proveedor</h2></div></div>
        <form className="supplier-form" onSubmit={createSupplier}>
          <label>Nombre comercial<input name="name" required maxLength={160} placeholder="Nombre del proveedor" /></label>
          <label>País<select name="country" defaultValue="Spain"><option value="Spain">Spain</option><option value="USA">USA</option></select></label>
          <label>Categoría<select name="categories" required defaultValue="job_boards">{CATEGORIES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <label>Tarifa mensual<input name="monthly_rate" type="number" min="0.01" step="0.01" required placeholder="0.00" /></label>
          <label>Renovación<input name="contract_renewal_date" type="date" /></label>
          <label>Email de contacto<input name="contact_email" type="email" placeholder="cuenta@proveedor.com" /></label>
          <label className="wide-field">Notas<textarea name="notes" rows={2} placeholder="Observaciones internas" /></label>
          <div className="form-footer"><span>La moneda se asigna automáticamente según el país.</span><button className="primary-button" disabled={saving}>{saving ? "Guardando…" : "Guardar proveedor"}</button></div>
        </form>
      </section>}

      <section className="directory">
        <div className="directory-heading">
          <div><span className="eyebrow">REGISTRO ACTUAL</span><h2>Todos los proveedores <span>{suppliers.length.toString().padStart(2, "0")}</span></h2></div>
          <div className="filters">
            <label className="filter-label">PAÍS<select aria-label="Filtrar por país" value={country} onChange={(event) => setCountry(event.target.value)}><option value="">Todos</option><option value="Spain">Spain</option><option value="USA">USA</option></select></label>
            <label className="filter-label">CATEGORÍA<select aria-label="Filtrar por categoría" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Todas</option>{CATEGORIES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
            {(country || category) && <button className="clear-filters" onClick={() => { setCountry(""); setCategory(""); }}>Limpiar</button>}
          </div>
        </div>

        {error && <div className="error-banner" role="alert"><span>{error}</span><button onClick={() => setError("")} aria-label="Cerrar error">×</button></div>}
        <div className="table-wrap">
          <table>
            <thead><tr><th>PROVEEDOR</th><th>PAÍS</th><th>CATEGORÍA</th><th>TARIFA / MES</th><th>ESTADO</th><th>RENOVACIÓN</th><th><span className="sr-only">Acciones</span></th></tr></thead>
            <tbody>
              {loading ? <tr><td className="table-state" colSpan={7}>Cargando directorio…</td></tr> : suppliers.length === 0 ? <tr><td className="table-state" colSpan={7}>No hay proveedores para estos filtros.</td></tr> : suppliers.map((supplier, index) => {
                const renewal = renewalState(supplier.contract_renewal_date);
                return <tr key={supplier.id} style={{ animationDelay: `${index * 35}ms` }}>
                  <td><div className="supplier-name">{supplier.name}</div>{supplier.contact_email && <div className="supplier-email">{supplier.contact_email}</div>}</td>
                  <td><span className={`country-code ${supplier.country === "Spain" ? "spain" : "usa"}`}>{supplier.country === "Spain" ? "ES" : "US"}</span>{supplier.country}</td>
                  <td><span className="category-label">{supplier.categories.map(categoryLabel).join(", ")}</span></td>
                  <td><label className="rate-editor"><span className="sr-only">Tarifa de {supplier.name}</span><input key={`${supplier.id}-${supplier.monthly_rate}`} type="number" min="0.01" step="0.01" defaultValue={supplier.monthly_rate} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); updateRate(supplier, event.currentTarget.value); } }} onBlur={(event) => { if (Number(event.currentTarget.value) !== supplier.monthly_rate) updateRate(supplier, event.currentTarget.value); }} /><span>{supplier.currency}/mes</span></label></td>
                  <td><button className={`status-toggle ${supplier.status}`} onClick={() => toggleStatus(supplier)} aria-label={`${supplier.status === "active" ? "Suspender" : "Activar"} a ${supplier.name}`}><i />{supplier.status === "active" ? "Activo" : "Suspendido"}</button></td>
                  <td>{supplier.contract_renewal_date ? <span className={`renewal ${renewal?.urgent ? "urgent" : ""}`}><time dateTime={supplier.contract_renewal_date}>{new Date(`${supplier.contract_renewal_date}T00:00:00`).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}</time>{renewal && <small>{renewal.label}</small>}</span> : <span className="no-date">Sin fecha</span>}</td>
                  <td><button className="details-button" title={supplier.notes ?? "Sin notas"} aria-label={`Notas de ${supplier.name}`}>···</button></td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
        <div className="table-foot"><span>DIRECTORIO DE NEXOVA <b>·</b> {suppliers.length} RESULTADOS</span><span><i className="green-dot" /> Activo <i className="gray-dot" /> Suspendido</span></div>
      </section>
      <footer className="page-footer"><span>NEXOVA <b>·</b> OPERACIONES</span><span>Datos actualizados desde el registro central</span></footer>
    </main>
  );
}