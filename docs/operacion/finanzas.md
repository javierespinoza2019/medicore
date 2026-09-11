# Finanzas (UI)

Módulo de navegación **Finanzas** (`caja`, `cortes`, `facturación`). Alineación a prototipo Readdy
**sin mocks de cobros ni CFDI**. Persistencia de caja/CFDI = **Fase 2** (propuesta 12).

## Inventario

| Ruta | Estado | Notas |
|---|---|---|
| `/app/caja` | Placeholder | Sesión, pendientes, cobro manual, recibo, cierre — sin API |
| `/app/caja/cortes` | Placeholder | Historial/arqueo/export — depende de sesiones |
| `/app/facturacion` | Placeholder | CFDI 4.0 = feature flag + PAC + outbox; sin timbrado simulado |

## Decisiones / dependencias

- Cobro offline permitido; recibo provisional **no fiscal**; CFDI diferido (doc 06).
- Corte por dispositivo en contingencia (doc 06).
- IVA en servicios médicos: abierto (§7 / §67) — no inventar tasas en UI.
- Catálogo de tarifas/servicios admin: aún sin SP (`administracion/servicios`).
- Fallos de CFDI no tumban la consulta (outbox; propuesta 12).

## Reglas

- No portar CRUD/listados mock de `docs/frontend` (`mocks/caja`, `mocks/facturacion`).
- No afirmar cumplimiento fiscal ni timbrado real desde la pantalla.
- Deep-links de permisos por rol siguen apuntando a estas rutas (`permisos-por-rol-ui`).

## Frontend

- `frontend/src/pages/caja/page.tsx`
- `frontend/src/pages/caja/cortes/page.tsx`
- `frontend/src/pages/facturacion/page.tsx`
- Placeholder: `ModulePlaceholder` (`designNote`, CTA)

## Pruebas

Sin suite E2E de cobros en este cambio (no hay API). Verificación: `npm run type-check` en `frontend/`.
Smoke de permisos: rutas caja/facturación denegadas según rol.
