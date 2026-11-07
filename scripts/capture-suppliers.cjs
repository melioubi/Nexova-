const { chromium } = require("playwright");
const { execFileSync } = require("node:child_process");
const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");
const evidence = path.join(root, "docs/evidence");
const temporary = mkdtempSync(path.join(os.tmpdir(), "nexova-seed-"));
mkdirSync(evidence, { recursive: true });

async function main() {
  const seedOptions = {
    cwd: path.join(root, "services/api"),
    env: { ...process.env, SUPPLIERS_DB_PATH: path.join(temporary, "suppliers.json") },
    encoding: "utf8",
  };
  const first = execFileSync("script", ["-q", "-c", "uv run seed", "/dev/null"], seedOptions);
  const second = execFileSync("script", ["-q", "-c", "uv run seed", "/dev/null"], seedOptions);
  assert.match(first, /15 proveedores insertados/);
  assert.match(second, /0 proveedores insertados/);
  const output = `$ cd services/api\r\n$ uv run seed\r\n${first}$ uv run seed\r\n${second}`;
  writeFileSync(path.join(evidence, "seed-output.txt"), output.replaceAll("\r\n", "\n"));

  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  try {
    const terminal = await browser.newPage({ viewport: { width: 1100, height: 420 } });
    await terminal.setContent('<html><head><title>Terminal - uv run seed</title></head><body style="margin:0;padding:24px;background:#101410"><div id="terminal"></div></body></html>');
    const xtermRoot = path.dirname(require.resolve("@xterm/xterm/package.json"));
    await terminal.addStyleTag({ path: path.join(xtermRoot, "css/xterm.css") });
    await terminal.addScriptTag({ path: path.join(xtermRoot, "lib/xterm.js") });
    await terminal.evaluate(async (text) => {
      const screen = new Terminal({ cols: 100, rows: 15, fontSize: 17, theme: { background: "#101410", foreground: "#e5f4e5" } });
      screen.open(document.getElementById("terminal"));
      await new Promise((resolve) => screen.write(text, resolve));
    }, output);
    await terminal.screenshot({ path: path.join(evidence, "seed-terminal.png") });

    const swagger = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    await swagger.goto("http://127.0.0.1:8000/docs");
    const operation = swagger.locator("#operations-suppliers-list_suppliers_suppliers_get");
    await operation.locator(".opblock-summary-control").click();
    await operation.getByRole("button", { name: "Try it out" }).click();
    await operation.locator("select").nth(0).selectOption("Spain");
    await operation.locator("select").nth(1).selectOption("job_boards");
    await operation.getByRole("button", { name: "Execute", exact: true }).click();
    await operation.locator(".responses-inner .response-col_status").filter({ hasText: "200" }).first().waitFor();
    await operation.locator(".response-col_description").filter({ hasText: "LinkedIn Talent Solutions" }).first().waitFor();
    await operation.screenshot({ path: path.join(evidence, "swagger-filter.png") });

    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.goto("http://127.0.0.1:3000/suppliers");
    await page.getByRole("navigation", { name: "Navegación principal" }).getByRole("link", { name: "Proveedores" }).waitFor();
    await page.getByText("LinkedIn Talent Solutions", { exact: true }).waitFor();
    await page.getByLabel("Filtrar por país").selectOption("Spain");
    await page.getByLabel("Filtrar por categoría").selectOption("job_boards");
    await page.waitForFunction(() => document.querySelectorAll("tbody tr").length === 2 && document.querySelector("tbody").textContent.includes("InfoJobs Premium"));
    assert.equal(await page.locator("tbody tr").count(), 2);
    await page.screenshot({ path: path.join(evidence, "suppliers-filter-desktop.png"), fullPage: true, animations: "disabled" });
    await page.setViewportSize({ width: 390, height: 844 });
    const nav = await page.getByRole("navigation").boundingBox();
    const avatar = await page.locator(".avatar").boundingBox();
    assert.ok(nav.x + nav.width <= avatar.x, "El menú no debe solaparse con el avatar");
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "El documento móvil no debe desbordar horizontalmente");
    await page.screenshot({ path: path.join(evidence, "suppliers-filter-mobile.png"), fullPage: true, animations: "disabled" });
    console.log("Capturas generadas: terminal real (15/0), Swagger 200, UI filtrada (2 filas), escritorio y móvil.");
  } finally {
    await browser.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => rmSync(temporary, { recursive: true, force: true }));