# Recetas / medicamentos (M8 / WS-I)

Contrato HTTP de emisión de recetas. Estupefacientes y psicotrópicos **fuera de alcance**
(doc 06 §64/68 opción A): el sistema los **impide** (422 + exclusión de catálogo). La captura
**explícita** del estado alérgico es obligatoria antes de prescritir (puede ser `no_interrogado`
o `paciente_no_puede_responder`); no se bloquea «hasta conocer» las alergias.

## Endpoints

| Verbo | Ruta | Códigos |
|---|---|---|
| `GET` | `/api/medications?query=&includeControlled=` | 200, 403 |
| `POST` | `/api/medications` | 200, 400, 403 (admin) |
| `POST` | `/api/encounters/{id}/prescriptions` | 200, 400, **409** (falta captura alérgica / SC-02 sin justificación), **422** (controlado) |
| `GET` | `/api/prescriptions/{id}` | 200, 404 |
| `GET` | `/api/subjects/{id}/prescriptions` | 200 |
| `POST` | `/api/prescriptions/{id}/sign` | 200, 403 (sin cédula), 409 |
| `POST` | `/api/prescriptions/{id}/cancel` | 200, 400, 404 |
| `PUT` | `/api/subjects/{id}/allergy-status` | (reuso M7) captura con rastro |

## Reglas clínicas

- Catálogo: denominación **genérica** obligatoria; distintiva opcional (LGS 225/226).
- Frecuencia y dosis **estructuradas** (no texto libre).
- Firma/emisión **fail closed** sin profesional o sin cédula (LGS art. 83).
- Controlados: **fuera de alcance**; mensaje explícito (LGS 240–241); sin recetarios de controlados.
- SC-01: alertas/alergias visibles en UI antes de emitir.
- SC-02: overlap sustancia↔genérico exige `allergyOverrideJustification`.

## Offline / SyncService

`commandType`s Full: `allergyStatus.set`, `prescription.create`, `prescription.sign` (firma + sello en la misma TX). Fail closed de alergias/controlados/cédula igual que API online.

## Esquema

Migración `0011_receta.sql`; SPs en `procedures/prescription/`; seed Dev `007_dev_medications.sql`
(10 no controlados + Morfina/Alprazolam controlados sintéticos). Seed `007` corre en
`tools/apply-database.ps1` (Dev/QA).

## Frontend

- `frontend/src/api/prescriptions.ts`
- `pages/recetas/**`, `RecetaInlineCreator`, `UrgenciaRecetaCreator` (captura alérgica + API)
- Opción B: no usa `GenderIdentity` en recetas.
