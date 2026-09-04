# Board de coordinación de agentes

Dueño claims/estados: **Supervisor**. Suite completa: **solo Supervisor**.
Modo de trabajo (2026-08-30): **uno a uno** (sin enjambre multi-Dev).

| Agente | Claim | Estado | Notas |
|---|---|---|---|
| — | Oleada decisiones producto (firma→#75) | **done** | Ver doc 06 oleadas 2026-08-30 |
| — | Autónomo: placeholders + agenda sin overlays | **done** | 2026-09-03 |
| — | Autónomo: poda `@/mocks` + components huérfanos | **done** | 2026-09-03 |

## Memoria reciente (no reabrir sin cliente)

- Roles B; controlados fuera de alcance; establecimiento L; triage 5 niveles demo; monitor solo número; #75 política.
- Hospedaje Prod/QA: **aplazado**.
- Foto paciente (#44): sí — entregada.
- Skills actualizados: `medicore-maintain`, `medicore-clinical-safety`, `medicore-architecture`.
- Placeholders honestos (sin mocks de persistencia): caja, facturación, FHIR, reportes, usuarios,
  catálogos, servicios, portal-paciente, normatividad operativa pendiente de API.
- Agenda: estados intermedios API; sin overlay `en_triage`/`llamando`; reglas de bloqueo = aviso.
- #75 (change-password + revoke-all) y matriz permisos tenant: **entregados** (API + UI).
- `frontend/src/mocks/` eliminado; sesión en `types/session.ts`; UI residual de placeholders borrada.

## Backlog (cuando se reanude)

- API reglas de bloqueo agenda; `en_triage`/`llamando` reales (triage/monitor) o limpiar tipos UI
- Users API, catálogos, caja/CFDI/FHIR reales (hoy placeholder)
- Fase 2: IVA (#7), libro farmacia (#60) — suelen requerir asesor/Reglamento
- Hospedaje cuando el cliente lo desbloquee
