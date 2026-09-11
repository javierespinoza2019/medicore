# Normatividad (UI)

Módulo de pantallas bajo `/app/normatividad/*`. Alineación a prototipo Readdy **sin mocks de trámites** y **sin afirmar cumplimiento** legal/sanitario solo por la UI.

## Inventario

| Ruta | Estado | Notas |
|---|---|---|
| `aviso-privacidad` | UI estática | Plantilla de referencia; white-label del responsable pendiente |
| `documento-seguridad` | UI local | Checklist; estados solo en sesión; no persiste |
| `checklist-nom` | UI local + sucursales | `useUserBranches`; estados solo en sesión |
| `profesionales` | Lectura API | `GET /api/professionals`; alta/edición → Administración → Médicos |
| `consentimientos` | Placeholder | Sin formularios/listados inventados |
| `derechos-arco` | Placeholder | Sin API de solicitudes ARCO |
| `referencias` | Placeholder | `noteType` referencia existe en notas; listado dedicado pendiente |
| `egresos` | Placeholder | Fuera de alcance hospitalario F1–4; `noteType` egreso puntual |
| `retencion` | Placeholder | Motor Fase 3; decisión #61 abierta |
| `vigilancia` | Placeholder | Canal DGIS fijo en producto; UI de casos = Fase 4 / outbox |
| `notas-enfermeria` | Placeholder | `noteType=enfermeria` en encuentro; sin listado global |

## Reglas

- No portar CRUD mock del prototipo (consentimientos, ARCO, SUIVE, egresos, retención).
- No inventar vigencias de cédula/certificación si el modelo no las tiene.
- Textos legales en UI: plantilla / ayuda operativa, no certificación.

## Frontend

- `frontend/src/pages/normatividad/**`
- Placeholder compartido: `ModulePlaceholder` (`designNote`, `ctaHref`, `ctaLabel`)

## Pruebas

Sin suite E2E dedicada en este cambio. Verificación: `npm run type-check` en `frontend/`.
Contrato de profesionales: `docs/operacion/profesionales.md`.
