const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { mkdirSync } = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const frontend = process.env.INVENTORY_TEST_FRONTEND_URL ?? "http://127.0.0.1:3001";
const api = process.env.INVENTORY_TEST_API_URL ?? "http://127.0.0.1:8001";
const screenshots = path.join(os.tmpdir(), "nexova-inventory-evidence");

async function main() {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    for (const route of ["products", "orders/inbound", "orders/outbound", "orders"]) {
      await page.goto(`${frontend}/backoffice/inventory/${route}`);
      await page.waitForURL("**/login");
    }
    console.log("PASS: cuatro rutas protegidas sin sesión");
    const credentials = { email: `inventory-${Date.now()}@example.com`, password: crypto.randomBytes(18).toString("hex") };
    const registered = await fetch(`${api}/users`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(credentials) });
    assert.equal(registered.status, 201);
    await page.getByLabel("Email", { exact: true }).fill(credentials.email);
    await page.getByLabel("Contraseña").fill(credentials.password);
    await page.getByRole("button", { name: "Acceder", exact: true }).click();
    await page.getByRole("link", { name: "Inventario de talento" }).waitFor();
    const token = await page.evaluate(() => localStorage.getItem("nexova.auth.token"));
    assert.ok(token);
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
    async function get(endpoint) {
      const response = await fetch(`${api}${endpoint}`, { headers });
      assert.equal(response.status, 200);
      return response.json();
    }
    async function post(endpoint, body) {
      const response = await fetch(`${api}${endpoint}`, { method: "POST", headers, body: JSON.stringify(body) });
      assert.equal(response.status, 201);
      return response.json();
    }
    const asset = await post("/inventory/products", { name: `QA Talent ${Date.now()}`, skill_category: "Engineering", country: "Chile", description: "Prueba local del backoffice" });
    const authorizedCalls = [];
    page.on("request", (request) => {
      const pathname = new URL(request.url()).pathname;
      if (pathname.startsWith("/api/backend/inventory") || pathname.startsWith("/inventory/")) authorizedCalls.push(request.headers().authorization === `Bearer ${token}`);
    });
    await page.getByRole("link", { name: "Inventario de talento" }).click();
    await page.getByText(asset.name, { exact: true }).waitFor();
    const row = page.locator("tbody tr").filter({ hasText: asset.name });
    await row.locator(".stock-empty").waitFor();
    assert.ok(await page.locator(".stock-healthy").count());
    assert.ok(await page.locator(".stock-low").count());
    mkdirSync(screenshots, { recursive: true });
    await page.screenshot({ path: path.join(screenshots, "products-desktop.png"), fullPage: true });
    console.log("PASS: productos reales y tres niveles de stock");
    await row.getByRole("link", { name: "Registrar entrada" }).click();
    await page.waitForFunction((id) => document.querySelector("select")?.value === id, asset.id);
    await page.getByLabel("Cantidad", { exact: true }).fill("7");
    await page.getByLabel("Notas", { exact: true }).fill("Entrada de prueba local");
    await page.getByRole("button", { name: "Registrar entrada", exact: true }).click();
    await page.getByText("Entrada de talento registrada.", { exact: true }).waitFor();
    assert.equal(await page.locator("select").inputValue(), "");
    assert.equal(await page.getByLabel("Cantidad", { exact: true }).inputValue(), "");
    assert.equal(await page.getByLabel("Notas", { exact: true }).inputValue(), "");
    assert.equal((await get(`/inventory/products/${asset.id}`)).current_stock, 7);
    console.log("PASS: entrada real, formulario limpio y confirmación");
    await page.goto(`${frontend}/backoffice/inventory/orders/outbound`);
    await page.locator("select").selectOption(asset.id);
    await page.getByText("7 perfiles", { exact: true }).waitFor();
    const another = (await get("/inventory/products")).find((item) => item.name === "Data Scientist");
    assert.ok(another, "Ejecuta el seeder antes de la prueba");
    await page.locator("select").selectOption(another.id);
    await page.getByText(`${another.current_stock} perfiles`, { exact: true }).waitFor();
    await page.locator("select").selectOption(asset.id);
    await page.getByText("7 perfiles", { exact: true }).waitFor();
    await page.getByLabel("Cantidad", { exact: true }).fill("8");
    await page.getByText("La cantidad supera los 7 perfiles disponibles.", { exact: false }).waitFor();
    assert.ok(await page.getByRole("button", { name: "Registrar salida", exact: true }).isDisabled());
    await page.getByLabel("Cantidad", { exact: true }).fill("2");
    await post("/inventory/orders/outbound", { talent_asset_id: asset.id, quantity: 6, notes: "Consumo concurrente de prueba" });
    await page.getByRole("button", { name: "Registrar salida", exact: true }).click();
    await page.locator("#quantity-feedback [role=alert]").filter({ hasText: "Insufficient stock" }).waitFor();
    await page.getByText("1 perfiles", { exact: true }).waitFor();
    await page.screenshot({ path: path.join(screenshots, "outbound-error-desktop.png"), fullPage: true });
    await page.getByLabel("Cantidad", { exact: true }).fill("1");
    await page.getByRole("button", { name: "Registrar salida", exact: true }).click();
    await page.getByText("Salida de talento registrada.", { exact: true }).waitFor();
    assert.equal((await get(`/inventory/products/${asset.id}`)).current_stock, 0);
    console.log("PASS: stock reactivo, advertencia, 400 real inline y salida");
    await page.goto(`${frontend}/backoffice/inventory/orders/inbound`);
    await page.locator("select").selectOption(asset.id);
    await page.getByLabel("Cantidad", { exact: true }).fill("3");
    await page.route("**/inventory/orders/inbound", (route) => route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ detail: "Servicio de inventario temporalmente no disponible." }) }));
    await page.getByRole("button", { name: "Registrar entrada", exact: true }).click();
    await page.locator(".inventory-error").filter({ hasText: "Servicio de inventario temporalmente no disponible." }).waitFor();
    assert.equal(await page.getByLabel("Cantidad", { exact: true }).inputValue(), "3");
    await page.unroute("**/inventory/orders/inbound");
    console.log("PASS: 500 visible y datos preservados");
    await page.goto(`${frontend}/backoffice/inventory/orders`);
    await page.getByText(asset.name, { exact: true }).first().waitFor();
    assert.ok(await page.locator(".order-badge.inbound").count());
    assert.ok(await page.locator(".order-badge.outbound").count());
    assert.equal(await page.locator("tbody button, tbody a").count(), 0);
    const orders = (await get("/inventory/orders")).filter((order) => order.talent_asset_id === asset.id);
    assert.equal(orders.length, 3);
    assert.ok(orders.every((order) => order.user_uuid && order.created_at && order.talent_asset_name === asset.name));
    assert.ok(authorizedCalls.length > 0 && authorizedCalls.every(Boolean));
    await page.screenshot({ path: path.join(screenshots, "history-desktop.png"), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: path.join(screenshots, "history-mobile.png"), fullPage: true });
    await page.evaluate(() => localStorage.setItem("nexova.auth.token", "invalid-test-token"));
    await page.goto(`${frontend}/backoffice/inventory/products`);
    await page.waitForURL("**/login");
    console.log("PASS: historial, Bearer, móvil y token inválido");
  } finally { await browser.close(); }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });