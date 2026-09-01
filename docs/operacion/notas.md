# Notas clínicas / consulta (M6 / WS-H)

Contrato HTTP del módulo de notas. Alineado a [`13-plan-fase-1.md`](../analisis/13-plan-fase-1.md) §M6.

## Endpoints entregados

| Verbo | Ruta | Notas |
|---|---|---|
| `POST` | `/api/encounters/{id}/notes` | Crea borrador; autoría desde claims (SC-12) |
| `GET` | `/api/encounters/{id}/notes` | Lista por episodio |
| `GET` | `/api/notes/{noteId}` | Detalle + addenda + co-autores |
| `POST` | `/api/notes/{noteId}/sign` | Hash canónico + snapshot cédula/establecimiento; **403** sin profesional o sin cédula; **409** si ya firmada |
| `POST` | `/api/notes/{noteId}/addenda` | Append-only (NOM-004 5.11); sólo nota firmada |
| `POST` | `/api/notes/{noteId}/co-authors` | Co-autoría; exige cédula del co-autor |
| `GET` | `/api/notes/pending-evolution?branchId=` | Evoluciones vencidas en observación (umbral horas, default 8) |
| `PUT` / `PATCH` | `/api/notes/{noteId}` | **405 siempre** (SC-06) |

## Firma local + sello (decisión 9/69 — opción A, 2026-08-30)

- Se calcula `ContentHash` SHA-256 del contenido canónico (`noteType` + `prognosis` + `body` con claves ordenadas).
- Al firmar se congela `AuthorLicenseSnapshot` (cédula y especialidad del profesional ligado) y `FacilitySnapshotJson` (campos M11 de la sucursal; **null** si no capturados — no se inventa domicilio).
- Escritura **online** por API: tras firmar el servidor aplica sello de inmediato.
- Offline Full: `note.create`, `note.sign`, `note.addendum`; `note.sign` aplica firma + sello en la misma TX de sync.
- Alcance ratificado: **firma simple de integridad** para piloto/Fase 1. Sin e.firma/FIEL; sin NOM-151 en piloto; médicos del piloto sin e.firma vigente. La UI/DTO **no** afirman validez jurídica plena ni NOM-004 5.10 (ver [`06-decisiones-abiertas.md`](../analisis/06-decisiones-abiertas.md)).

## Fail closed al firmar

| Condición | Código |
|---|---|
| Usuario sin `healthcare_professional_id` en sesión | 403 |
| Profesional sin `ProfessionalLicense` capturada | 403 |
| Nota ya firmada | 409 |

## Reloj de retención (pregunta H)

Tras firmar se invoca `sp_ClinicalRecord_TouchMedicalAct` con `ActType = clinical_note_{noteType}` **si** existe expediente. **No se afirma** que esos actos cuenten para NOM-004 numeral 5.4 (decisión 61 abierta; motor de retención = Fase 3).

## AuthZ provisional

| Capacidad | Mientras tanto | Pregunta |
|---|---|---|
| Leer / escribir / firmar notas | admin, medico, enfermeria, SuperAdmin | **A** / #19 |
| Caja / recepción / farmacia | 403 | **A** |

## Esquema

Migración `0010_consulta_notas.sql`. SPs en `backend/database/procedures/consult/sp_ClinicalNote.sql`.

**Pendiente operativo:** agregar una línea en `tools/apply-database.ps1` para aplicar `procedures\consult\sp_ClinicalNote.sql` (archivo de alta contención; otro agente). Mientras tanto, aplicar a mano en Dev:

```powershell
sqlcmd -S localhost -d MediCore_Dev -E -b -I -f 65001 -i backend\database\migrations\0010_consulta_notas.sql -v DbName=MediCore_Dev
sqlcmd -S localhost -d MediCore_Dev -E -b -I -f 65001 -i backend\database\procedures\consult\sp_ClinicalNote.sql -v DbName=MediCore_Dev
```

## Frontend

- `frontend/src/api/notes.ts` — cliente sin mocks.
- `ClinicalNotesPanel` + listado/detalle en `consultas/page.tsx` con `?encuentro={encounterId}`.
- Receta del episodio: `RecetaInlineCreator` (captura alérgica explícita + API prescriptions).
- Impresos: leyenda de integridad **sin** reclamar validez jurídica plena.
- E2E UI: `tests/e2e/specs/04-consulta-receta/flujo-consulta-ui.spec.ts`.
