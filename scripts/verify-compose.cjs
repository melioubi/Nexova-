const { chromium } = require("playwright");
const { execFileSync } = require("node:child_process");
const { readFileSync, mkdirSync, writeFileSync } = require("node:fs");
const { parseEnv } = require("node:util");
const path = require("node:path");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");
const env = parseEnv(readFileSync(path.join(root, ".env"), "utf8"));
const website = `http://127.0.0.1:${env.WEBSITE_HOST_PORT}`;
const backoffice = `http://127.0.0.1:${env.BACKOFFICE_HOST_PORT}`;
const api = `http://127.0.0.1:${env.API_HOST_PORT}`;
const evidence = path.join(root, "docs/evidence/containerization");

async function main() {
  assert.equal(new URL(env.BACKEND_API_URL).hostname, "backend");
  const containers = execFileSync("docker", ["compose", "ps", "--format", "json"], { cwd: root, encoding: "utf8" }).trim().split("\n").map((line) => JSON.parse(line));
  assert.equal(containers.length, 2);
  assert.ok(containers.every((container) => container.State === "running" && container.Health === "healthy"));
  mkdirSync(evidence, { recursive: true });
  const output = execFileSync("docker", ["compose", "ps"], { cwd: root, encoding: "utf8" });
  writeFileSync(path.join(evidence, "compose-ps.txt"), output);
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  try {
    const terminal = await browser.newPage({ viewport: { width: 1600, height: 460 } });
    await terminal.setContent('<html><body style="margin:0;padding:24px;background:#101410"><div id="terminal"></div></body></html>');
    const xtermRoot = path.dirname(require.resolve("@xterm/xterm/package.json"));
    await terminal.addStyleTag({ path: path.join(xtermRoot, "css/xterm.css") });
    await terminal.addScriptTag({ path: path.join(xtermRoot, "lib/xterm.js") });
    await terminal.evaluate(async (text) => {
      const screen = new Terminal({ cols: 170, rows: 17, fontSize: 14, theme: { background: "#101410", foreground: "#e5f4e5" } });
      screen.open(document.getElementById("terminal"));
      await new Promise((resolve) => screen.write(text.replaceAll("\n", "\r\n"), resolve));
    }, `$ docker compose ps\n${output}`);
    await terminal.screenshot({ path: path.join(evidence, "compose-ps.png") });

    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.goto(website);
    const access = page.getByRole("link", { name: "Acceso equipo", exact: true });
    await access.waitFor();
    assert.equal(await access.getAttribute("href"), env.NEXT_PUBLIC_BACKOFFICE_URL);
    await page.screenshot({ path: path.join(evidence, "website.png"), fullPage: true });
    await page.goto(`${backoffice}/login`);
    await page.getByLabel("Email", { exact: true }).fill(env.DEMO_EMAIL);
    await page.getByLabel("Contraseña").fill(env.DEMO_PASSWORD);
    await page.getByRole("button", { name: "Acceder", exact: true }).click();
    await page.getByRole("heading", { name: "Panel de operaciones" }).waitFor();
    await page.screenshot({ path: path.join(evidence, "dashboard.png"), fullPage: true });
    console.log("PASS: website, login demo real y panel integrado");

    const token = await page.evaluate(() => localStorage.getItem("nexova.auth.token"));
    assert.ok(token);
    const headers = { Authorization: `Bearer ${token}` };
    assert.equal((await fetch(`${api}/suppliers`)).status, 401);
    const response = await fetch(`${api}/suppliers`, { headers });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).length, 15);
    await page.getByRole("link", { name: "Ver mi perfil", exact: true }).click();
    await page.getByLabel("Nombre", { exact: true }).waitFor();
    await page.waitForFunction(() => document.querySelector("input")?.value === "Equipo demo Nexova");
    console.log("PASS: perfil demo y proveedores protegidos 401/200");

    await page.goto(`${backoffice}/backoffice/inventory/products`);
    await page.getByText("Full-Stack Developer", { exact: true }).waitFor();
    assert.equal(await page.locator("tbody tr").count(), 4);
    await page.screenshot({ path: path.join(evidence, "inventory.png"), fullPage: true });
    await page.getByRole("link", { name: "Proveedores", exact: true }).click();
    await page.getByText("LinkedIn Talent Solutions", { exact: true }).waitFor();
    assert.equal(await page.locator("tbody tr").count(), 15);
    await page.locator(".supplier-toolbar select").nth(0).selectOption("Spain");
    await page.locator(".supplier-toolbar select").nth(1).selectOption("job_boards");
    await page.waitForFunction(() => document.querySelectorAll("tbody tr").length === 2 && document.querySelector("tbody").textContent.includes("InfoJobs Premium"));
    await page.screenshot({ path: path.join(evidence, "suppliers-filter.png"), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: path.join(evidence, "suppliers-mobile.png"), fullPage: true });
    assert.deepEqual(pageErrors, []);
    console.log("PASS: inventario y proveedores en la misma sesión, filtros y móvil");
    console.log("Compose integrado verificado; no se imprimieron tokens ni contraseñas.");
  } finally { await browser.close(); }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });