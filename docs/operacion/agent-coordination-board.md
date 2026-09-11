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
| — | PWA producto + dispositivos + caché clínica | **done** | 2026-09-08; instalable demo Site4Now; ver `pwa-dispositivos.md` |
| — | Cola offline F1 (triage/agenda/notas/receta) | **done** | 2026-09-08; `runClinicalOutboxCommand` |
| — | Usuarios UI alineada a Readdy + DTO enriquecido | **done** | 2026-09-08; `usuarios.md` |
| — | Admin UI Readdy: especialidades/sucursales/servicios/catálogos | **done** | 2026-09-09; servicios/CIE/estudios siguen honestos |
| — | Seguridad UI Readdy: roles + auditoría | **done** | 2026-09-09; `roles-permisos.md` / `auditoria.md` |
| — | Normatividad UI Readdy (11 submenús) | **done** | 2026-09-09; `normatividad.md`; placeholders honestos |
| — | Finanzas UI Readdy (caja/cortes/CFDI) | **done** | 2026-09-09; `finanzas.md`; sin mocks Fase 2 |
| — | Clínico UI Readdy (consultas/recetas/estudios/farmacia) | **done** | 2026-09-09; `clinico.md`; estudios/farmacia honestos |
| — | Plan ciclo calidad por módulos | **done** | 2026-09-10; O1–O5; chromium 40 passed; SC-23 AuthZ; seeds demo/bravo |
| — | Enrich monitor/sala + suite E2E estable | **done** | 2026-09-11; `monitor-turnos-ui`/`sala-espera-ui`; chromium tras contrato-api; BG efímero |
| — | QA guiado overlay (piloto Smoke) | **done** | 2026-09-11; `run-guided-qa.ps1` · CP-MC-SMOKE 1/6 |
| — | QA guiado SC-RX | **done** | 2026-09-11; `CP-MC-SC-RX` 1/6 alergias/Rx/SC-04 |
| — | QA guiado URG | **done** | 2026-09-11; `CP-MC-URG` 1/6 ingreso/triage/monitor/sala |
| — | QA guiado OFF | **done** | 2026-09-11; `CP-MC-OFF` 1/6 SC-19 cola local + sync |
| — | QA guiado AUTHZ | **done** | 2026-09-11; `CP-MC-AUTHZ` 1/6 matriz API + UI + IDOR |

## Memoria reciente (no reabrir sin cliente)

- Roles B; controlados fuera de alcance; establecimiento L; triage 5 niveles demo; monitor solo número; #75 política.
- Hospedaje Prod/QA: **aplazado**.
- Foto paciente (#44): sí — entregada.
- Skills actualizados: `medicore-maintain`, `medicore-clinical-safety`, `medicore-architecture`.
- Placeholders honestos: FHIR, reportes, servicios, portal-paciente.
- **Ciclo calidad** (`plan-pruebas-ciclo-calidad.md`): **done** 2026-09-10. Chromium 40 passed;
  contrato O1–O4 verdes; fix SC-23 (médico ≠ búsqueda por descripción); M13 seguridad API;
  seeds `demo`/`bravo` en BD Dev; passwords `admin`/`Demo123!` vs roles/`Admin123!`.
- **E2E 2026-09-11:** monitor (#21) + sala honestidad; `chromium` depende de `contrato-api`
  (evita revoke/logout tumbar UI); break-glass/`revoke-all` con usuario efímero; recepción
  sin deep-link a caja en `roleRoutes`.
- **QA guiado:** `./tools/run-guided-qa.ps1` — overlay inyectado por test; ciclos
  Smoke / SC-RX / URG / OFF / AUTHZ verdes (headed); no sustituye `run-all-tests.ps1`.
- **Finanzas**: caja/cortes/CFDI = placeholders con nota de diseño (`finanzas.md`); sin cobros ni timbrado inventados.
- **Clínico**: consultas/recetas API; estudios/farmacia placeholders con nota Readdy (`clinico.md`).
- **Normatividad**: aviso/doc-seguridad/checklist con banners de honestidad; profesionales
  lee API; resto placeholders con nota de diseño (`normatividad.md`).
- **Usuarios tenant**: CRUD API/UI entregado (`usuarios.md`).
- **Catálogos**: medicamentos admin API/UI (`catalogos.md`); CIE/estudios = aviso.
- **PWA**: manifest+SW; registro/aprobación de estaciones; caché de cola con antigüedad solo si aprobado; escrituras F1 (ingreso, triage, agenda, notas, receta) vía cola local.
- Agenda: estados intermedios API; sin overlay `en_triage`/`llamando`; **reglas de bloqueo API**.
- #75 (change-password + revoke-all) y matriz permisos tenant: **entregados** (API + UI).
- `frontend/src/mocks/` eliminado; sesión en `types/session.ts`; UI residual de placeholders borrada.

## Backlog (cuando se reanude)

- Más pantallas F1 a cola (alergias, historia, estados de encuentro)
- SC-11 E2E PWA/offline contra stack real
- `en_triage`/`llamando` reales (triage/monitor) o limpiar tipos UI
- CIE-10 (versión doc 06), estudios F2, caja/CFDI/FHIR, servicios/tarifas
- Fase 2: IVA (#7), libro farmacia (#60) — suelen requerir asesor/Reglamento
- Hospedaje cuando el cliente lo desbloquee
