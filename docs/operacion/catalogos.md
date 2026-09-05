# Catálogos administrativos

## Medicamentos (M8)

Escritura: permiso efectivo `canAdminCatalogos` (plantillas `admin` / `directivo` + SuperAdmin).
Lectura de prescritir: `canCreateReceta` (u otros de acceso a recetas). Listado con
`includeControlled` o `onlyActive=false` exige `canAdminCatalogos`.

| Verbo | Ruta | Notas |
|---|---|---|
| `GET` | `/api/medications?query=&includeControlled=&onlyActive=&maxRows=` | Por omisión: activos, sin controlados, max 40 |
| `POST` | `/api/medications?medicationId=` | Upsert; sin `medicationId` = alta |

DTO: genérico obligatorio; `saleClassification` I–VI (LGS 226); fracción I exige
`isControlledSubstance`. Controlados **no** se prescriben (422 en receta). Baja = `isActive=false`
(sin `DELETE` SQL).

SPs: `sp_Medication_Search` / `Upsert` / `GetById` (`THROW 5051x`).
Seed Dev: `007_dev_medications.sql`.

### Frontend

- `frontend/src/api/prescriptions.ts` — `listMedicationsAdmin`, `upsertMedication`
- `frontend/src/pages/administracion/catalogos/page.tsx` — tab Medicamentos (API);
  CIE-10 / Estudios = aviso honesto (sin mocks)

## CIE-10 / Estudios

Pendientes: versión CIE (doc 06); estudios en Fase 2 (doc 13). No se inventa catálogo.

## Pruebas

- Contrato: `tests/e2e/specs/00-smoke/api-medications-admin.spec.ts`
- Relacionado prescritir: `api-prescriptions.spec.ts`
