# Clínico (UI)

Módulo de navegación **Clínico**: consultas, recetas, estudios, farmacia. Alineación a Readdy
**sin mocks clínicos**; API real donde existe (M4–M8).

## Inventario

| Ruta | Estado | Notas |
|---|---|---|
| `/app/consultas` | API | Cola `consulta_externa` + consultorio (nota M6, historia M7, receta M8). Sin estudios/certificados del prototipo |
| `/app/recetas` | API | Listado **por sujeto** (`?paciente=`); no hay listado global del tenant. Cancelación/impresión M8 |
| `/app/estudios` | Placeholder | Fase 2; `EstudiosModulePlaceholder` |
| `/app/farmacia` | Placeholder | Fase 2; surtido/inventario; controlados impedidos; libro #60 abierto |

## Contratos

- Encuentros / cola: [`encuentros.md`](encuentros.md)
- Notas: [`notas.md`](notas.md)
- Recetas: [`recetas.md`](recetas.md)
- Medicamentos admin: [`catalogos.md`](catalogos.md)

## Reglas

- No fabricar datos clínicos ni portar mocks de `docs/frontend` (consultas/recetas/estudios/farmacia).
- Estupefacientes/psicotrópicos: **impedir** (doc 06 §64/68).
- Firma piloto = integridad (hash+sello); sin afirmar e.firma/NOM-004 5.10.
- Farmacia/estudios offline = Fase 2.

## Frontend

- `pages/consultas/**`, `pages/recetas/**`
- `EstudiosModulePlaceholder`, `FarmaciaModulePlaceholder`

## Pruebas

- E2E: `04-consulta-receta`, `05-farmacia/farmacia-ui`, expediente tab estudios.
- Type-check frontend al tocar UI.
