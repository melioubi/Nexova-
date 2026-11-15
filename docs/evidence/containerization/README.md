# Evidencia local de contenedorización

- [Contenedores saludables](compose-ps.png) y [salida de Compose](compose-ps.txt).
- [Sitio público](website.png).
- [Panel con sesión demo](dashboard.png).
- [Inventario](inventory.png).
- [Proveedores con filtros](suppliers-filter.png) y [vista móvil](suppliers-mobile.png).

Estas capturas provienen del stack Docker local, no del VPS. `scripts/verify-compose.cjs` las regenera y comprueba login real y navegación con la misma sesión. No incluyen la contraseña demo ni tokens.

Se verificó recarga de Next y FastAPI con cambios temporales de host, y persistencia de usuario y datos después de reiniciar el backend.

## Producción (VPS)

- [`docker compose ps` en el VPS](vps-compose-ps.txt): ambos contenedores `healthy`.
- Acceso SSH autorizado mediante clave pública dedicada (sin contraseñas compartidas).
- Verificación funcional vía API: login, inventario (4 activos) y proveedores (15 registros) responden correctamente con el overlay `docker-compose.prod.yml`.