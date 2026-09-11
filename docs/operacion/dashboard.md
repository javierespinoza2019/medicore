# Dashboard (UI)

Panel operativo en `/app/dashboard`. KPIs desde cola clínica (M4/M10) y agenda del día (M9).
**Sin** tendencias ni ingresos inventados del prototipo Readdy.

## Estado

| Capacidad | Fuente |
|---|---|
| Sala / urgencias activas / espera | `useEncounterQueue` + escala efectiva |
| Consultas en curso | Cola `consulta_externa` |
| Próximas citas / ocupación día | `GET /api/appointments` (rango hoy) |
| BI / ingresos | Placeholder honesto — Fase 3 / `features/bi` |

## Diseño Readdy (no portado)

- «Ingresos del día» y flechas «vs ayer» con mocks.
- Gráficas financieras / tendencias sintéticas.

## Relacionado

- Reportes en menú: `hiddenInNav` (BI futuro, doc 12).
- Finanzas/caja: [`finanzas.md`](finanzas.md) (Fase 2).

## Frontend

- `pages/dashboard/page.tsx` (`data-testid="page-dashboard"`)

## Pruebas

E2E: `00-smoke/dashboard-ui`. Ver `pruebas.md`.
