# MediCore — PWA, dispositivos y cola offline

Alineado a `docs/analisis/12-propuesta-final.md` §3 y plan F1 §3.4.

## Qué es la prueba real (no cosmética)

| Capacidad | Comportamiento |
|---|---|
| Instalación PWA | Chrome/Edge: «Instalar» → ventana `standalone` |
| Service worker | Precache del shell; **`/api/*` = NetworkOnly** (no cachear PHI) |
| Registro de dispositivo | Al login, la estación llama `POST /api/devices/register` |
| Aprobación admin | `Administración → Dispositivos` → `POST /api/devices/{id}/approve` |
| Cola local (IndexedDB) | Escrituras con `IdempotencyKey`; logout **no** la borra |
| Caché de lectura | Solo si `IsApproved && AllowsOfflineQueue`; logout **sí** la purga |
| Sin aprobación | Estación **solo en línea**; no captura offline |

## API

| Método | Ruta | AuthZ |
|---|---|---|
| POST | `/api/devices/register` | autenticado |
| GET | `/api/devices/{devicePublicId}` | autenticado |
| GET | `/api/devices?onlyPending=` | `canAdminUsers` |
| POST | `/api/devices/{devicePublicId}/approve` | `canAdminUsers` |

SPs: `sp_Device_UpsertPending`, `GetByPublicId`, `List`, `Approve`.

## Build / publish frontend

```powershell
cd frontend
npm run build   # sale a frontend/out/ con manifest + SW
```

Variables: `VITE_API_BASE_URL`, `VITE_TENANT_CODE` (provisional por build).

## Guion de prueba en medi-core.app

1. Login admin → Administración → Dispositivos → **Aprobar** esta estación (cola offline = Sí).
2. Chrome → Instalar MediCore.
3. Con red: ingreso a urgencias, triage, cita, nota o receta → deben pasar por cola + sync inmediato.
4. Sin red (DevTools Offline): mismas escrituras → quedan en IndexedDB; sin dispositivo aprobado → mensaje de bloqueo (excepto lectura).
5. Volver online → drenado automático; sin duplicar (idempotencia).
6. Logout → caché de lecturas vacía; comandos pending de outbox permanecen.

## Escrituras F1 cableadas a cola

| UI | `commandType` |
|---|---|
| Ingreso urgencias | `subject.create`, `encounter.open` |
| Triage | `triage.save` |
| Agenda (crear / estado) | `appointment.create`, `appointment.state` |
| Notas (crear / firmar / addendum) | `note.create`, `note.sign`, `note.addendum` |
| Receta (crear / firmar) | `prescription.create`, `prescription.sign` |

Sin enlace: create de receta/nota queda en cola; la firma de una entidad aún no sincronizada requiere enlace (el id lo asigna el servidor al sync).

## Fuera de este tramo

- Cobro/farmacia offline → Fase 2.
- Más pantallas F1 (alergias, historia, estados de encuentro) a la misma cola.
- SC-11 E2E de PWA/offline contra stack real.
- Pacientes reales: no en shared Site4Now (dedicado).
