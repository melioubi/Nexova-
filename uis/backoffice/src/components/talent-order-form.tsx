"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import { setUnsavedForm } from "@/lib/form-state";
import {
  categoryLabels,
  createInboundOrder,
  createOutboundOrder,
  getTalentAsset,
  inventoryDimensions,
  listTalentAssets,
  officeLabels,
  OrderType,
  recipientLabels,
  RecipientType,
  supplierCountryByOffice,
  TalentAsset,
} from "@/lib/inventory";
import { listSuppliers, Supplier } from "@/lib/suppliers";
import { track } from "@/services/telemetry";

const collator = new Intl.Collator("es", { sensitivity: "base", numeric: true });
const money = (value: number, currency: string) => new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(value);
// Order fields of the API → names allowed in order_validation_failed.invalid_fields.
const FIELD_NAMES: Record<string, string> = { talent_asset_id: "product_id", quantity: "quantity", unit_cost: "unit_cost", supplier_id: "supplier_id", recipient_type: "recipient_type", notes: "notes" };
type Step = "product_selected" | "quantity_entered" | "submit_failed";

export function TalentOrderForm({ type }: { type: OrderType }) {
  const outbound = type === "outbound";
  const [assets, setAssets] = useState<TalentAsset[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<TalentAsset | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [recipientType, setRecipientType] = useState<RecipientType | "">("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [quantityError, setQuantityError] = useState("");
  const [status, setStatus] = useState("");
  const [warning, setWarning] = useState("");
  const [revision, setRevision] = useState(0);
  const [attempt, setAttempt] = useState(0);

  // --- order_form_abandoned (plan A.11): progress of the current, unsent order.
  const openedAt = useRef(0);
  const step = useRef<Step | null>(null);
  const stockWarningShown = useRef(false);
  const assetRef = useRef<TalentAsset | null>(null);

  useEffect(() => {
    openedAt.current = performance.now();
    function reportAbandoned() {
      if (!step.current) return;
      const asset = assetRef.current;
      track("order_form_abandoned", {
        order_type: type,
        step_reached: step.current,
        time_on_form_ms: Math.round(performance.now() - openedAt.current),
        had_stock_warning: stockWarningShown.current,
        product_id: asset?.id,
        office: asset?.office,
      });
      step.current = null;
    }
    // capture: runs before the TelemetryService's own pagehide flush, so the
    // event still leaves with the last beacon when the tab is closed.
    window.addEventListener("pagehide", reportAbandoned, { capture: true });
    return () => {
      window.removeEventListener("pagehide", reportAbandoned, { capture: true });
      reportAbandoned(); // navigating to another view without registering
      setUnsavedForm(false);
    };
  }, [type]);

  useEffect(() => {
    const controller = new AbortController();
    listTalentAssets(controller.signal).then((data) => {
      setAssets(data);
      const initialId = new URLSearchParams(window.location.search).get("asset");
      if (initialId && data.some((asset) => asset.id === initialId)) setSelectedId(initialId);
      setError("");
    }).catch((issue: unknown) => {
      if (!controller.signal.aborted) setError(issue instanceof Error ? issue.message : "No se pudieron cargar los productos.");
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

  // Inbound orders come from a supplier of the same office (Spain ↔ Valencia, USA ↔ Miami).
  const office = selectedAsset?.office;
  useEffect(() => {
    if (outbound || !office) return;
    const controller = new AbortController();
    listSuppliers(supplierCountryByOffice[office], "", controller.signal)
      .then((data) => setSuppliers(data.filter((supplier) => supplier.status === "active")))
      .catch(() => { if (!controller.signal.aborted) setSuppliers([]); });
    return () => controller.abort();
  }, [outbound, office]);

  // The form re-renders on every keystroke (controlled inputs). The options are
  // grouped by office and sorted with locale-aware comparison once per fetch:
  // `assets` is the only dependency.
  const assetOptions = useMemo(() => {
    const byOffice = new Map<string, TalentAsset[]>();
    for (const asset of assets) {
      const group = byOffice.get(asset.office) ?? [];
      group.push(asset);
      byOffice.set(asset.office, group);
    }
    return [...byOffice.entries()]
      .sort(([a], [b]) => collator.compare(a, b))
      .map(([groupOffice, group]) => <optgroup key={groupOffice} label={officeLabels[groupOffice as keyof typeof officeLabels] ?? groupOffice}>
        {group.sort((a, b) => collator.compare(a.name, b.name)).map((asset) => <option key={asset.id} value={asset.id}>{asset.name} · {asset.programme_id}</option>)}
      </optgroup>);
  }, [assets]);

  const stockReady = selectedAsset?.id === selectedId;
  const available = stockReady ? selectedAsset!.current_stock : 0;
  const exceedsStock = outbound && stockReady && Number(quantity) > available;

  useEffect(() => {
    assetRef.current = selectedAsset;
  }, [selectedAsset]);

  useEffect(() => {
    if (exceedsStock) stockWarningShown.current = true;
  }, [exceedsStock]);

  useEffect(() => {
    setUnsavedForm(Boolean(quantity || notes || unitCost));
    if (quantity && step.current === "product_selected") step.current = "quantity_entered";
  }, [quantity, notes, unitCost]);

  function changeAsset(id: string) {
    setSelectedId(id);
    setSelectedAsset(null);
    setQuantity("");
    setSupplierId("");
    setQuantityError("");
    setStatus("");
    setWarning("");
    setError("");
    step.current = id ? "product_selected" : null;
  }

  function resetAfterSuccess() {
    setQuantity("");
    setUnitCost("");
    setSupplierId("");
    setRecipientType("");
    setNotes("");
    setSelectedId("");
    setSelectedAsset(null);
    step.current = null;
    stockWarningShown.current = false;
    openedAt.current = performance.now();
  }

  /** order_validation_failed (plan A.7): field names and error types only, never values. */
  function reportValidation(layer: "client" | "server", fields: string[], codes: string[]) {
    const invalidFields = [...new Set(fields.map((field) => FIELD_NAMES[field]).filter(Boolean))];
    const errorCodes = codes.filter((code) => /^[a-z_]{2,40}$/.test(code));
    if (!invalidFields.length || !errorCodes.length) return;
    track("order_validation_failed", {
      validation_layer: layer,
      order_type: type,
      invalid_fields: invalidFields,
      error_codes: errorCodes,
      product_id: selectedAsset?.id,
      office: selectedAsset?.office,
      programme_id: selectedAsset?.programme_id,
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(quantity);
    const cost = Number(unitCost);
    const invalid: [string, string][] = [];
    if (!Number.isInteger(amount) || amount <= 0) invalid.push(["quantity", "greater_than"]);
    else if (exceedsStock) invalid.push(["quantity", "exceeds_stock"]);
    if (!outbound && (unitCost === "" || !Number.isFinite(cost) || cost < 0)) invalid.push(["unit_cost", "greater_than_equal"]);
    if (!outbound && !supplierId) invalid.push(["supplier_id", "missing"]);
    if (outbound && !recipientType) invalid.push(["recipient_type", "missing"]);
    if (invalid.length || !selectedAsset || !stockReady) {
      if (invalid.some(([field]) => field === "quantity")) setQuantityError("La cantidad debe ser un número entero mayor que cero y no superar el stock disponible.");
      else setError("Completa los campos obligatorios de la orden.");
      step.current = "submit_failed";
      reportValidation("client", invalid.map(([field]) => field), invalid.map(([, code]) => code));
      return;
    }

    setSaving(true);
    setError("");
    setQuantityError("");
    setStatus("");
    setWarning("");
    const dimensions = inventoryDimensions(selectedAsset);
    try {
      if (outbound) {
        const order = await createOutboundOrder({ talent_asset_id: selectedId, quantity: amount, recipient_type: recipientType as RecipientType, notes: notes.trim() || null });
        track("outbound_order_created", { ...dimensions, quantity: amount, order_id: order.id, recipient_type: order.recipient_type, stock_after: order.stock_after });
        if (order.threshold_triggered) {
          track("stock_threshold_triggered", {
            ...dimensions,
            quantity: order.stock_after,
            min_stock: order.min_stock,
            stock_before: order.stock_before,
            trigger_source: "outbound_order",
            triggering_order_id: order.id,
          });
          setWarning(`El stock quedó por debajo del mínimo (${order.stock_after} de un mínimo de ${order.min_stock}). Conviene pedir reposición.`);
        }
        setStatus("Salida registrada.");
      } else {
        const order = await createInboundOrder({ talent_asset_id: selectedId, quantity: amount, unit_cost: cost, supplier_id: supplierId, notes: notes.trim() || null });
        track("inbound_order_created", {
          ...dimensions,
          quantity: amount,
          order_id: order.id,
          supplier_id: order.supplier_id,
          unit_cost: order.unit_cost,
          total_cost: Math.round(amount * order.unit_cost * 100) / 100,
          stock_after: order.stock_after,
        });
        if (order.cost_variance) {
          const variance = order.cost_variance;
          track("kit_cost_variance_detected", {
            ...dimensions,
            quantity: amount,
            inbound_order_id: order.id,
            supplier_id: order.supplier_id,
            unit_cost: order.unit_cost,
            baseline_unit_cost: variance.baseline_unit_cost,
            variance_pct: variance.variance_pct,
            direction: variance.direction,
            threshold_pct: variance.threshold_pct,
            baseline_sample_size: variance.baseline_sample_size,
          });
          setWarning(`El costo unitario es ${variance.variance_pct > 0 ? "+" : ""}${variance.variance_pct}% respecto al histórico de este proveedor (${money(variance.baseline_unit_cost, dimensions.currency)}).`);
        }
        setStatus("Entrada registrada.");
      }
      resetAfterSuccess();
    } catch (issue) {
      step.current = "submit_failed";
      const message = issue instanceof Error ? issue.message : "No se pudo registrar la orden.";
      if (issue instanceof ApiError && outbound && issue.status === 400) {
        track("outbound_order_rejected", {
          ...dimensions,
          quantity: amount,
          stock_available: available,
          rejection_reason: "insufficient_stock",
          recipient_type: recipientType,
        });
        setQuantityError(message);
        setSelectedAsset(null);
        setRevision((value) => value + 1);
      } else if (issue instanceof ApiError && issue.status === 422) {
        reportValidation("server", Object.keys(issue.fieldErrorTypes), Object.values(issue.fieldErrorTypes));
        if (issue.fieldErrors.quantity) setQuantityError(issue.fieldErrors.quantity);
        else setError(message);
      } else setError(message);
    } finally { setSaving(false); }
  }

  const currency = selectedAsset?.currency ?? "EUR";
  return <section>
    <header className="inventory-heading"><p className="eyebrow">{outbound ? "OutboundOrder · Orden de salida" : "InboundOrder · Orden de entrada"}</p><h1>{outbound ? "Registrar entrega de material" : "Registrar llegada de material"}</h1></header>
    <form className="inventory-form" onSubmit={handleSubmit} noValidate>
      <label>Material<select required value={selectedId} disabled={loading || saving} onChange={(event) => changeAsset(event.target.value)}><option value="">{loading ? "Cargando materiales..." : "Seleccionar material"}</option>{assetOptions}</select></label>
      {selectedId && <div className="stock-readout" role="status" aria-live="polite"><span>Stock disponible actual</span><strong>{stockReady ? `${available} unidades` : "Consultando stock..."}</strong>{stockReady && <small>{categoryLabels[selectedAsset!.product_category]} · {selectedAsset!.programme_id} · {officeLabels[selectedAsset!.office]} · mínimo {selectedAsset!.min_stock}</small>}</div>}
      <label>Cantidad<input type="number" min={1} step={1} required disabled={saving || !selectedId || (outbound && !stockReady)} value={quantity} aria-invalid={Boolean(quantityError || exceedsStock)} aria-describedby="quantity-feedback" onChange={(event) => { setQuantity(event.target.value); setQuantityError(""); }} /></label>
      <div id="quantity-feedback" aria-live="polite">{quantityError && <p className="error" role="alert">{quantityError}</p>}{exceedsStock && <p className="error">La cantidad supera las {available} unidades disponibles. Reduce la cantidad antes de registrar la salida.</p>}</div>
      {!outbound && <>
        <label>Costo unitario ({currency})<input type="number" min={0} step="0.01" required disabled={saving || !stockReady} value={unitCost} onChange={(event) => setUnitCost(event.target.value)} /></label>
        <label>Proveedor<select required value={supplierId} disabled={saving || !stockReady} onChange={(event) => setSupplierId(event.target.value)}><option value="">{stockReady ? "Seleccionar proveedor" : "Elige primero el material"}</option>{suppliers.map((supplier) => <option key={supplier.id} value={String(supplier.id)}>{supplier.name}</option>)}</select></label>
      </>}
      {outbound && <label>Destinatario<select required value={recipientType} disabled={saving || !selectedId} onChange={(event) => setRecipientType(event.target.value as RecipientType | "")}><option value="">Seleccionar tipo de destinatario</option>{(Object.keys(recipientLabels) as RecipientType[]).map((key) => <option key={key} value={key}>{recipientLabels[key]}</option>)}</select></label>}
      <label>Notas<textarea maxLength={500} disabled={saving} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
      {error && <div className="inventory-error" role="alert"><p>{error}</p>{!saving && <button type="button" className="button button-secondary" onClick={() => { setLoading(true); setAttempt((value) => value + 1); setSelectedAsset(null); setRevision((value) => value + 1); }}>Reintentar consulta</button>}</div>}
      {!loading && !error && assets.length === 0 && <p>No hay materiales registrados.</p>}
      {status && <p className="inventory-success" role="status">{status}</p>}
      {warning && <p className="inventory-error" role="status">⚠️ {warning}</p>}
      <button className="button" type="submit" disabled={loading || saving || !selectedId || (outbound && !stockReady)}>{saving ? "Registrando..." : outbound ? "Registrar salida" : "Registrar entrada"}</button>
    </form>
  </section>;
}
