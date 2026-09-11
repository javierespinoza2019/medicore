# Pacientes (UI)

Módulo de navegación **Pacientes**: padrón, alta y detalle. Alineación a Readdy **con API M3**
(identidad progresiva); sin fabricar clínico ni filtros inventados.

## Inventario

| Ruta | Estado | Notas |
|---|---|---|
| `/app/pacientes` | API | Layout Readdy: ribbon + toolbar + filas grid; filtros honestos |

| `/app/pacientes/nuevo` | API | Wizard; sólo `branchId` obligatorio; no identificado opcional |
| `/app/pacientes/:id` | API | Tabs resumen/identidad/expediente/consultas/recetas; estudios placeholder; foto #44 |

## Contratos

- Sujeto / foto / vínculos: [`sujeto.md`](sujeto.md)
- Expediente clínico: [`expediente.md`](expediente.md)
- Encuentros: [`encuentros.md`](encuentros.md)

## UI listado (Readdy)

- Ribbon de stats (total / identificados / no ident. / CURP).
- Toolbar compacta; estado activo, última visita, médico y alergias = **disabled** (sin campo en DTO).
- Filas `grid-cols-12`: paciente, exp., edad (si `birthDate`), contacto = «No capturado», alta, sucursal, acciones (expediente / agenda / detalle).
- Sin modales mock de quick-view / edit / deactivate.

## Reglas

- Identidad progresiva (doc 08); urgencias no se bloquean por CURP/nombre.
- Sexo: ausente / no determinado permitido; Opción B (sexo biológico vs género).
- Vinculación manual + revert append-only (SC-22); sin merge automático.

## Frontend

- `pages/pacientes/**`

## Pruebas

E2E: `02-pacientes/*` (registro-ui, expediente-ui, no-identificado). Ver `pruebas.md`.
