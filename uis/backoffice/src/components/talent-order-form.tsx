"use client";

import { FormEvent, useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { createTalentOrder, getTalentAsset, listTalentAssets, OrderType, TalentAsset } from "@/lib/inventory";

export function TalentOrderForm({ type }: { type: OrderType }) {
  const outbound = type === "outbound";
  const [assets, setAssets] = useState<TalentAsset[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<TalentAsset | null>(null);
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [quantityError, setQuantityError] = useState("");
  const [status, setStatus] = useState("");
  const [revision, setRevision] = useState(0);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    listTalentAssets(controller.signal).then((data) => {
      setAssets(data);
      const initialId = new URLSearchParams(window.location.search).get("asset");
      if (initialId && data.some((asset) => asset.id === initialId)) setSelectedId(initialId);
      setError("");
    }).catch((issue: unknown) => {
      if (!controller.signal.aborted) setError(issue instanceof Error ? issue.message : "No se pudieron cargar los activos.");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attempt]);

  useEffect(() => {
    if (!selectedId) return;
    const controller = new AbortController();
    getTalentAsset(selectedId, controller.signal).then(setSelectedAsset).catch((issue: unknown) => {
      if (!controller.signal.aborted) setError(issue instanceof Error ? issue.message : "No se pudo consultar el stock actual.");
    });
    return () => controller.abort();
  }, [selectedId, revision]);

  const stockReady = selectedAsset?.id === selectedId;
  const available = stockReady ? selectedAsset!.current_stock : 0;
  const exceedsStock = outbound && stockReady && Number(quantity) > available;

  function changeAsset(id: string) {
    setSelectedId(id);
    setSelectedAsset(null);
    setQuantity("");
    setQuantityError("");
    setStatus("");
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(quantity);
    if (!Number.isInteger(amount) || amount <= 0) {
      setQuantityError("La cantidad debe ser un número entero mayor que cero.");
      return;
    }
    if (outbound && (!stockReady || exceedsStock)) return;
    setSaving(true);
    setError("");
    setQuantityError("");
    setStatus("");
    try {
      await createTalentOrder(type, { talent_asset_id: selectedId, quantity: amount, notes: notes.trim() || null });
      setQuantity("");
      setNotes("");
      setSelectedId("");
      setSelectedAsset(null);
      setStatus(outbound ? "Salida de talento registrada." : "Entrada de talento registrada.");
    } catch (issue) {
      const message = issue instanceof Error ? issue.message : "No se pudo registrar la orden.";
      if (issue instanceof ApiError && outbound && issue.status === 400) {
        setQuantityError(message);
        setSelectedAsset(null);
        setRevision((value) => value + 1);
      } else if (issue instanceof ApiError && issue.fieldErrors.quantity) {
        setQuantityError(issue.fieldErrors.quantity);
      } else setError(message);
    } finally { setSaving(false); }
  }

  return <section>
    <header className="inventory-heading"><p className="eyebrow">{outbound ? "TalentExit · Orden de salida" : "TalentEntry · Orden de entrada"}</p><h1>{outbound ? "Registrar salida de talento" : "Registrar entrada de talento"}</h1></header>
    <form className="inventory-form" onSubmit={handleSubmit}>
      <label>Activo de talento<select required value={selectedId} disabled={loading || saving} onChange={(event) => changeAsset(event.target.value)}><option value="">{loading ? "Cargando activos..." : "Seleccionar activo"}</option>{assets.map((asset) => <option key={asset.id} value={asset.id}>{asset.name} · {asset.country}</option>)}</select></label>
      {selectedId && <div className="stock-readout" role="status" aria-live="polite"><span>Stock disponible actual</span><strong>{stockReady ? `${available} perfiles` : "Consultando stock..."}</strong>{stockReady && <small>{selectedAsset!.skill_category} · {selectedAsset!.country}</small>}</div>}
      <label>Cantidad<input type="number" min={1} step={1} required disabled={saving || !selectedId || (outbound && !stockReady)} value={quantity} aria-invalid={Boolean(quantityError || exceedsStock)} aria-describedby="quantity-feedback" onChange={(event) => { setQuantity(event.target.value); setQuantityError(""); }} /></label>
      <div id="quantity-feedback" aria-live="polite">{quantityError && <p className="error" role="alert">{quantityError}</p>}{exceedsStock && <p className="error">La cantidad supera los {available} perfiles disponibles. Reduce la cantidad antes de registrar la salida.</p>}</div>
      <label>Notas<textarea maxLength={500} disabled={saving} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
      {error && <div className="inventory-error" role="alert"><p>{error}</p>{!saving && <button type="button" className="button button-secondary" onClick={() => { setLoading(true); setAttempt((value) => value + 1); setSelectedAsset(null); setRevision((value) => value + 1); }}>Reintentar consulta</button>}</div>}
      {!loading && !error && assets.length === 0 && <p>No hay activos de talento registrados.</p>}
      {status && <p className="inventory-success" role="status">{status}</p>}
      <button className="button" type="submit" disabled={loading || saving || !selectedId || exceedsStock || (outbound && !stockReady)}>{saving ? "Registrando..." : outbound ? "Registrar salida" : "Registrar entrada"}</button>
    </form>
  </section>;
}