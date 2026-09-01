# Expediente / historia clínica (M7 / WS-G)

Contrato HTTP del módulo de expediente. Alineado a [`13-plan-fase-1.md`](../analisis/13-plan-fase-1.md) §M7.

## Endpoints entregados

| Verbo | Ruta | Notas |
|---|---|---|
| `GET` | `/api/subjects/{id}/record` | Asegura expediente; **registra `record.read`** en la misma transacción; 200 / 403 / 404 |
| `POST` | `/api/subjects/{id}/history` | Append de versión (nunca `UPDATE` destructivo del cuerpo previo) |
| `POST` | `/api/subjects/{id}/history/amendments` | Addendum append-only (NOM-004 5.11) |
| `PUT` | `/api/subjects/{id}/allergy-status` | `no_interrogado \| niega \| refiere \| se_desconoce \| paciente_no_puede_responder` |
| `POST` | `/api/subjects/{id}/allergies` | Alta tipada; pasa estado a `refiere` si hacía falta |
| `DELETE` | `/api/subjects/{id}/allergies/{allergyId}` | Baja lógica (`IsDeleted=1`) |
| `PUT` | `/api/subjects/{id}/flags` | Alertas (alergia_grave / riesgo / embarazo tipado / otro) |

## Salvaguardas

- Historia nueva: **todas** las secciones en `no_interrogado`. Prohibido equivalente a `createEmptyHistoriaClinica` con `negado` / `normal`.
- `alergias: []` **no** significa «sin alergias» si el estado es `no_interrogado` (BM-PAC-01, SC-01).
- `LastMedicalActAtUtc` es **nullable**. Pregunta **H** / decisión 61 abierta: qué actos cuentan para el reloj de retención (NOM-004 5.4) **pendiente**; no se afirma lista.
- Opción B (2026-08-28): el género no alimenta este módulo clínico.
- Offline `commandType` Full: `history.save`, `history.amend`, `allergyStatus.set`, `allergy.add` (SP en la misma TX de idempotencia).

## AuthZ provisional

| Capacidad | Mientras tanto | Pregunta |
|---|---|---|
| Leer / escribir expediente | admin, medico, enfermeria, SuperAdmin | **A** / #19 |
| Caja / recepción | 403 | **A** |

## Esquema

Migración `0009_expediente.sql`. SPs en `backend/database/procedures/record/sp_ClinicalRecord.sql`.

**Pendiente operativo:** agregar una línea en `tools/apply-database.ps1` para aplicar `procedures\record\sp_ClinicalRecord.sql` (archivo de alta contención; otro agente).
