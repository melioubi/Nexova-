/*
 * Frontend measurements for CACHING_REPORT.md (lazy loading + useMemo).
 *
 * Needs, already running (production builds: `next build && next start`):
 *   - API with the load seed (services/api/seed_load.py)   → MEASURE_API_URL
 *   - backoffice (BACKEND_API_URL pointing to that API)   → MEASURE_BACKOFFICE_URL
 *   - website                                             → MEASURE_WEBSITE_URL
 *
 *   node scripts/measure-caching.cjs
 *
 * Reports:
 *   1. Website: JS bytes on initial load vs. after scrolling to #contacto.
 *   2. Orders history: time until rows are visible and <tr> count in the DOM.
 *   3. Time React spends handling keystrokes in the order form (Notas field),
 *      with 4x CPU throttling to approximate a mid-range laptop.
 */
const { chromium } = require("playwright");
const crypto = require("node:crypto");

const api = process.env.MEASURE_API_URL ?? "http://127.0.0.1:8765";
const backoffice = process.env.MEASURE_BACKOFFICE_URL ?? "http://127.0.0.1:3101";
const website = process.env.MEASURE_WEBSITE_URL ?? "http://127.0.0.1:3100";
const KEYSTROKES = 200;

function trackJs(page) {
  const state = { bytes: 0, files: new Set() };
  page.on("response", async (response) => {
    if (response.request().resourceType() !== "script") return;
    try {
      const body = await response.body();
      state.bytes += body.length;
      state.files.add(new URL(response.url()).pathname);
    } catch { /* redirected / aborted */ }
  });
  return state;
}

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

async function settle(page) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(300);
}

async function token() {
  const email = `measure-${Date.now()}@example.com`;
  const password = crypto.randomBytes(12).toString("hex");
  await fetch(`${api}/users`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
  const res = await fetch(`${api}/auth/login`, { method: "POST", body: new URLSearchParams({ username: email, password }) });
  return (await res.json()).access_token;
}

async function measureWebsite(browser) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const js = trackJs(page);
  await page.goto(website);
  await settle(page);
  const initial = js.bytes;
  const contactFormInitially = await page.locator("#contacto form").count();
  await page.locator("#contacto").scrollIntoViewIfNeeded();
  await page.locator("#contacto form").waitFor({ timeout: 10000 });
  await settle(page);
  console.log(`website /            initial JS ${kb(initial)} | +${kb(js.bytes - initial)} after scrolling to #contacto | form in initial DOM: ${contactFormInitially > 0}`);
  await page.close();
}

async function measureOrdersHistory(browser, authToken) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.addInitScript((t) => localStorage.setItem("nexova.auth.token", t), authToken);
  const js = trackJs(page);
  await page.goto(`${backoffice}/backoffice/inventory/orders`, { waitUntil: "load" });
  const shellJs = js.bytes;
  await page.locator(".order-badge").first().waitFor({ timeout: 120000 });
  const result = await page.evaluate(() => ({
    firstRowsMs: performance.now(),
    rows: document.querySelectorAll(".inventory-table tbody tr").length,
  }));
  await page.mouse.wheel(0, 20000);
  await page.waitForTimeout(500);
  const afterScroll = await page.locator(".inventory-table tbody tr").count();
  console.log(`backoffice orders    JS for the page shell ${kb(shellJs)} | total ${kb(js.bytes)}`);
  console.log(`backoffice orders    rows visible after ${result.firstRowsMs.toFixed(0)} ms since navigation | <tr> in DOM: ${result.rows} → ${afterScroll} after one scroll`);
  await page.close();
}

async function measureOrderForm(browser, authToken) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.addInitScript((t) => localStorage.setItem("nexova.auth.token", t), authToken);
  await page.goto(`${backoffice}/backoffice/inventory/orders/inbound`);
  const select = page.getByLabel("Activo de talento");
  await page.waitForFunction(() => document.querySelectorAll("select option").length > 10);
  const options = await select.locator("option").count();
  const firstValue = await select.locator("option").nth(1).getAttribute("value");
  await select.selectOption(firstValue);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

  const timings = await page.evaluate(async (count) => {
    const textarea = document.querySelector("textarea");
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set;
    const tick = () => new Promise((resolve) => { const c = new MessageChannel(); c.port1.onmessage = resolve; c.port2.postMessage(0); });
    const samples = [];
    for (let i = 0; i < count; i++) {
      const start = performance.now();
      setter.call(textarea, textarea.value + "a");
      textarea.dispatchEvent(new Event("input", { bubbles: true }));
      await tick(); // React commits the controlled-input update before this resolves
      samples.push(performance.now() - start);
    }
    samples.sort((a, b) => a - b);
    return { median: samples[Math.floor(count / 2)], p95: samples[Math.floor(count * 0.95)], total: samples.reduce((a, b) => a + b, 0) };
  }, KEYSTROKES);
  console.log(`order form (${options} <option>s, CPU x4) ${KEYSTROKES} keystrokes: median ${timings.median.toFixed(2)} ms | p95 ${timings.p95.toFixed(2)} ms | total ${timings.total.toFixed(0)} ms`);
  await page.close();
}

(async () => {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  try {
    const authToken = await token();
    await measureWebsite(browser);
    for (let run = 0; run < 3; run++) await measureOrdersHistory(browser, authToken);
    for (let run = 0; run < 3; run++) await measureOrderForm(browser, authToken);
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exit(1); });
