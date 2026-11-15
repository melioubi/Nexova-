import { randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const filename = fileURLToPath(new URL("../.env", import.meta.url));
const domain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN ?? "app.github.dev";
const codespaceHosts = process.env.CODESPACE_NAME ? [3000, 3001].map((port) => `${process.env.CODESPACE_NAME}-${port}.${domain}`) : [];
if (existsSync(filename)) {
  console.log(".env existente conservado; no se sobrescribieron credenciales.");
} else {
  const values = {
    APP_MODE: "development",
    WEBSITE_PORT: "3000",
    BACKOFFICE_PORT: "3001",
    API_PORT: "8000",
    WEBSITE_HOST_PORT: "3000",
    BACKOFFICE_HOST_PORT: "3001",
    API_HOST_PORT: "8000",
    HOST_BIND: "127.0.0.1",
    BACKEND_API_URL: "http://backend:8000",
    NEXT_PUBLIC_API_URL: "/api/backend",
    NEXT_PUBLIC_INVENTORY_API_URL: "/api/backend",
    NEXT_PUBLIC_BACKOFFICE_URL: codespaceHosts.length ? `https://${codespaceHosts[1]}` : "http://localhost:3001",
    NEXT_ALLOWED_DEV_ORIGINS: ["127.0.0.1", ...codespaceHosts].join(","),
    SECRET_KEY: randomBytes(32).toString("hex"),
    ACCESS_TOKEN_EXPIRE_MINUTES: "120",
    TINYDB_PATH: "/data/auth",
    DATABASE_URL: "sqlite:////data/inventory.db",
    SUPPLIERS_DB_PATH: "/data/suppliers.json",
    SEED_ON_START: "true",
    ENABLE_DEMO: "true",
    DEMO_EMAIL: "demo@example.com",
    DEMO_PASSWORD: randomBytes(18).toString("base64url"),
    NEXT_TELEMETRY_DISABLED: "1",
    WATCHPACK_POLLING: "true",
  };
  writeFileSync(filename, Object.entries(values).map(([key, value]) => `${key}=${value}`).join("\n") + "\n", { mode: 0o600 });
  console.log(".env creado con clave y contraseña locales aleatorias; no se imprimieron secretos.");
}