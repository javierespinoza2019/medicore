# Sujeto e identidad (M3 / WS-D)

Contrato HTTP del módulo de sujeto. Alineado a [`13-plan-fase-1.md`](../analisis/13-plan-fase-1.md) §M3.

## Endpoints entregados

| Verbo | Ruta | Notas |
|---|---|---|
| `POST` | `/api/subjects` | Sólo `branchId` obligatorio → 200; emite etiqueta si no identificado |
| `GET` | `/api/subjects` | `search`, `includeUnidentified` |
| `GET` | `/api/subjects/{id}` | Resuelve cadena de vínculos; señas según rol |
| `PUT` | `/api/subjects/{id}/identity` | Actualiza atributos opcionales |
| `POST` | `/api/subjects/{id}/identity-state` | Transición append-only |
| `POST` | `/api/subjects/{id}/marks` | Señas; AuthZ clínica provisional |
| `POST` | `/api/subjects/{id}/belongings` | Pertenencias |
| `POST` | `/api/subjects/search-by-description` | Coincidencias sin nombres; **admin/SuperAdmin** provisional (pregunta C) |
| `POST` | `/api/subjects/{id}/links` | Vinculación manual (sin fusión automática) |
| `POST` | `/api/subjects/{id}/links/{linkId}/revert` | Reversión append-only (`vinculacion_revertida`); justificación obligatoria; estado `rectificada` en absorbido; alerta `SubjectFlag` tipo `riesgo` en ambos; auditoría `subject.link.revert` |
| `DELETE` | `/api/subjects/{id}` | SoftDelete (`IsDeleted=1`) |
| `GET` | `/api/subjects/{id}/photo` | Bytes de foto (#44); 404 si no hay |
| `PUT` | `/api/subjects/{id}/photo` | Multipart imagen; máx. 2 MB; `.jpg/.jpeg/.png/.gif` |
| `DELETE` | `/api/subjects/{id}/photo` | Quita archivo + null en BD |
| `GET` | `/api/branches/{branchId}/unidentified-label-config` | Config efectiva (cascada) |
| `PUT` | `/api/tenant/unidentified-label-config` | Upsert ámbito tenant |

## Foto de identificación (#44)

- Ratificada 2026-09-02 (doc 06). Dato biométrico/sensible; licitud y aviso = establecimiento.
- Archivo: `files/{TenantCode}/Pacientes/{subjectId}/foto.{ext}` (ruta relativa en `PhotoRelativePath`).
- Operaciones aplican al **sujeto resuelto** por vínculos (igual que `GET` detalle).
- AuthZ: mismo permiso de acceso a pacientes que el resto del módulo.
- UI: detalle de paciente (`Avatar` + subir/quitar).

## Diferidos (plan completo, no bloquean el vertical)

- `PUT /marks/{markId}` (estructurar seña)
- Cola de fusión HTTP completa (`GET/resolve`)
- Registro de `SubjectConsentLapse` vía API
- Offline cola `subject.create` en `SyncService` (turno de contención)

## AuthZ provisional (preguntas abiertas)

| Capacidad | Mientras tanto | Pregunta |
|---|---|---|
| `search-by-description` | SuperAdmin / `admin` (como auditoría) | **C** / #48 |
| Ver/capturar señas | admin + medico + enfermeria + recepcion | **A** / #47 |
| Verificar / rectificar / vincular | SuperAdmin / `admin` | **A** |
| Permisos granulares | roles actuales del JWT | **A** / #19 |

## Etiqueta no identificado

Cascada **sucursal > tenant** vía `UnidentifiedLabelConfig`. Snapshot JSON al emitir.
Seed Dev: esquema **sintético** `fonetico_sintetico_demo` (no es norma). Tokens de color prohibidos.

## Centinelas SINBA

`09/09/9999` y `999` **rechazados** en Subject; viven solo en capa de reporte (Fase 4).

## Pruebas

`tests/e2e/specs/00-smoke/api-subjects.spec.ts` (incluye ciclo foto PUT→GET→DELETE).
