# Backoffice Nexova

## Inventario de Talento

Las cuatro rutas protegidas son `/backoffice/inventory/products`, `/backoffice/inventory/orders/inbound`, `/backoffice/inventory/orders/outbound` y `/backoffice/inventory/orders`. Reutilizan el login JWT y el `AuthGuard` existente. El cliente `src/lib/inventory.ts` centraliza las llamadas y usa el transporte de `src/lib/api.ts` con Bearer.

El dominio coincide con CONTEXT.md: TalentAsset, TalentEntry y TalentExit, con especialidad y país. Los umbrales son cero = sin disponibilidad, 1-5 = stock bajo, 6 o más = disponible; también están comentados en `stockLevel`.

### Entorno Local

Inicia la API con SECRET_KEY, TINYDB_PATH y DATABASE_URL configurados y ejecuta `uv run --no-dev python -m api.inventory.seed` desde services/api. SQLite local está soportado por el backend; Supabase sigue siendo el destino de producción.

Crea `.env.local` en esta carpeta (ignorado por Git):

```dotenv
NEXT_PUBLIC_INVENTORY_API_URL=/api/backend
BACKEND_API_URL=http://127.0.0.1:8001
```

El proxy de Next evita CORS y problemas de localhost en Codespaces. Si usas una URL absoluta, configura CORS en la API. Ejecuta `npm ci` y `npm run dev -- --port 3001`, abre http://localhost:3001 y registra tu cuenta.

### Verificación de Inventario

Lint, build y auditoría de runtime: `npm run lint`, `npm run build`, `npm audit --omit=dev`.

La prueba de navegador crea un usuario y un activo QA con tres órdenes reales. Ejecútala solo sobre servicios locales con base aislada y datos semilla, nunca en producción:

```bash
npm install --prefix /tmp/nexova-capture playwright
/tmp/nexova-capture/node_modules/.bin/playwright install chromium
NODE_PATH=/tmp/nexova-capture/node_modules node scripts/verify-inventory.cjs
```

Puedes ajustar INVENTORY_TEST_FRONTEND_URL e INVENTORY_TEST_API_URL (por defecto puertos 3001/8001). Las capturas quedan en `/tmp/nexova-inventory-evidence`. Se prueba login real, Bearer, cuatro redirecciones, stock reactivo, entrada/salida, 400 concurrente real, 500 simulado y móvil.

Next y eslint-config-next se actualizaron a 16.4.5. Runtime: cero vulnerabilidades. Quedan ocho avisos moderados en herramientas de desarrollo de ESLint; no se usó `audit fix --force`, que propone una versión incompatible.

La rama feature/inventory-backoffice parte de la API en milestone-5-inventory-orm e incorpora el backoffice existente de feature/auth-frontend. Su PR se dirige a milestone-5-inventory-orm, no a main sin integrar.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
