# Board de coordinación de agentes

Dueño claims/estados: **Supervisor**. Suite completa: **solo Supervisor**.
Modo de trabajo (2026-08-30): **uno a uno** (sin enjambre multi-Dev).

| Agente | Claim | Estado | Notas |
|---|---|---|---|
| — | Oleada decisiones producto (firma→#75) | **done** | Ver doc 06 oleadas 2026-08-30 |
| — | Autónomo: placeholders + agenda sin overlays | **done** | 2026-09-03 |
| — | Autónomo: poda `@/mocks` + components huérfanos | **done** | 2026-09-03 |
| — | Reglas de bloqueo agenda (ScheduleBlock) | **done** | 2026-09-04; API+UI+E2E |
| — | Catálogos: medicamentos admin | **done** | 2026-09-04; CIE/estudios placeholder |

## Memoria reciente (no reabrir sin cliente)

- Roles B; controlados fuera de alcance; establecimiento L; triage 5 niveles demo; monitor solo número; #75 política.
- Hospedaje Prod/QA: **aplazado**.
- Foto paciente (#44): sí — entregada.
- Skills actualizados: `medicore-maintain`, `medicore-clinical-safety`, `medicore-architecture`.
- Placeholders honestos: caja, facturación, FHIR, reportes, servicios, portal-paciente,
  normatividad operativa pendiente de API.
- **Usuarios tenant**: CRUD API/UI entregado (`usuarios.md`).
- **Catálogos**: medicamentos admin API/UI (`catalogos.md`); CIE/estudios = aviso.
- Agenda: estados intermedios API; sin overlay `en_triage`/`llamando`; **reglas de bloqueo API**.
- #75 (change-password + revoke-all) y matriz permisos tenant: **entregados** (API + UI).
- `frontend/src/mocks/` eliminado; sesión en `types/session.ts`; UI residual de placeholders borrada.

## Backlog (cuando se reanude)

- `en_triage`/`llamando` reales (triage/monitor) o limpiar tipos UI
- CIE-10 (versión doc 06), estudios F2, caja/CFDI/FHIR, servicios/tarifas
- Fase 2: IVA (#7), libro farmacia (#60) — suelen requerir asesor/Reglamento
- Hospedaje cuando el cliente lo desbloquee
