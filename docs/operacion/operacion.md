# Operación (UI)

Módulo de navegación **Operación**: agenda, sala de espera, monitor, triage, urgencias.
Alineación a Readdy **con API real** (M4/M5/M9/M10); sin overlays ni PHI inventados.

## Inventario

| Ruta | Estado | Notas |
|---|---|---|
| `/app/agenda` | API (M9) | Calendario/consultorios/bloqueos; sin `en_triage`/`llamando` simulados |
| `/app/sala-espera` | API (M4/M10) | Cola urgencias en vivo; no mezcla citas ambulatorias mock |
| `/app/monitor-turnos` | API | Solo número de turno (#21); sin promo inventada |
| `/app/triage` | API (M5) | Escala configurable; signos opcionales |
| `/app/urgencias` | API (M4) | Ingreso sin bloqueo admin; atención + receta SC-04 |

## Contratos

- [`encuentros.md`](encuentros.md) · [`triage.md`](triage.md) · [`agenda.md`](agenda.md)

## Diseño Readdy (no portado)

- Sala: citas ambulatorias «en espera» + llamar turno mock.
- Monitor: promociones clínicas inventadas; nombres en pantalla.
- Agenda: overlays `en_triage` / `llamando`.
- Triage: escala fija de 4 colores de producto.

## Reglas

- Monitor: **solo número** (doc 06 #21).
- Triage: escala configurable (doc 06 §63); sin nivel por omisión.
- Urgencias: la atención no se detiene por CURP/nombre/pago/consentimiento.

## Pruebas

E2E: agenda-ui, triage-print-ui, urgencias-receta-ui, dashboard-ui,
`monitor-turnos-ui` (#21 sin PHI), `sala-espera-ui` (honestidad urgencias). Ver `pruebas.md`.
