# MediCore — Estrategia de pruebas

Actualizado: **2026-08-29** · Alineado a [`docs/analisis/12-propuesta-final.md`](../analisis/12-propuesta-final.md)
y a la regla `.cursor/rules/medicore-cierre-de-tarea.mdc`.

Principio: **cada módulo que se implementa deja sus pruebas en el mismo cambio.** No hay una fase
final de «escribir las pruebas»; lo que existe al final es la suma de lo que cada módulo dejó, y
esa suma se corre de una sola vez con `tools/run-all-tests.ps1`.

**Ciclo de calidad (plan por módulos, enrich + seguridad automatizable):**  
[`plan-pruebas-ciclo-calidad.md`](plan-pruebas-ciclo-calidad.md) (2026-09-10).

**QA guiado (overlay en vivo, perfil aparte):** `tools/run-guided-qa.ps1` — ciclo Smoke
`CP-MC-SMOKE` 1/6 con barra inyectada por Playwright (no en el bundle del producto).
No sustituye la suite de regresión; veredicto = mismos expects. Ver §QA guiado abajo.

## Niveles

| Nivel | Dónde vive | Para qué sirve | Necesita BD |
|---|---|---|---|
| Unitarias de dominio/negocio (.NET, xUnit) | `backend/Tests/*` | Lógica pura: validaciones, cálculos, máquinas de estado, perfiles de ambiente. Rápidas y deterministas. | No |
| Integración contra BD real con SPs | `backend/Tests/*.Integration` (pendiente) | Que el SP exista, reciba `@TenantId`, filtre por él, sea idempotente y no haga borrado físico. | Sí (Dev) |
| Contrato de API | `tests/e2e` (specs de API) | Que ruta, DTO, códigos de estado y autorización sean los publicados. Detecta rupturas para el frontend. | Sí |
| E2E Playwright contra stack real | `tests/e2e/specs` | Aceptación de flujos clínicos, offline de dos estaciones y casos `SC-xx`. | Sí |
| Tipos y lint del frontend | `frontend` (`type-check`, `lint`) | Que el bundle compile en modo estricto y no entre código con reglas rotas. | No |

Lo que hoy existe (medido el **2026-08-29**, puerta **M12 parcial**):

- `backend/Tests/MediCore.Common.Tests`: pruebas unitarias del perfil `Platform` y **grupos SignalR
  de cola (M10)**.
- `backend/Tests/MediCore.Business.Tests`: unitarias de logout (decisión 73), sesión con/sin
  profesional sanitario, validaciones de sucursal (M11), **CRUD profesional/especialidad (M1)**,
  **tipos base + acceso a auditoría (M2)**
  y **sujeto/identidad (M3)**: CURP estructural, máquina de estados, emisor de etiqueta (cascada /
  fonético sintético), foto identificación (#44) en `api-subjects`,
  sin colores), AuthZ provisional de búsqueda por descripción; **episodio/urgencias (M4)**: orden
  de cola, máquina de estados, care-without-consent, sugerencia MP; **agenda (M9)**: traslape de
  intervalos, fail closed `mine` sin profesional, cancelar exige motivo, flujo `llego`/`en_espera`/`en_consulta`; **triage/signos (M5)**:
  normalización «no tomado», cascada de nivel, orden de cola con prioridad de escala;
  **expediente/historia (M7)**: fábrica `no_interrogado`, etiqueta alérgica sin colapsar lista
  vacía, AuthZ clínica provisional; **notas clínicas (M6)**: hash canónico estable, AuthZ
  provisional, fail closed de firma; **recetas (M8)**: frecuencia estructurada, vigencia 30d,
  mensaje de controlados, AuthZ clínica; handlers Sync Full (subject/encounter/triage/notes/…).
- `tests/e2e`, proyecto `contrato-api` (1 worker; BD Dev compartida) contra stack real: auth,
  dispositivos, sync/idempotencia (`subject.create` + `encounter.open`), sucursales, auditoría,
  subjects, encounters, appointments, triage, clinical-record, notes, prescriptions, professionals,
  hub live, más el **mapa SC** y flujos M12 activados (abajo).
- **M12 — SC accionables** (`specs/06-seguridad-clinica/sc-mapa.spec.ts` + `sc-ui` + offline):
  activos en mapa/API: SC-01, SC-02, SC-03, SC-04 (alta con Rx pendientes: 409 sin override;
  override + auditoría), SC-06, SC-07, SC-08 (persistencia valor extremo),
  SC-10 (escala label+icon), SC-12, SC-13, SC-14, SC-15, SC-16, SC-17, SC-18 (sin fusión auto),
  SC-19, SC-20, SC-21 (identidad posterior no altera nota), SC-22 (revert de vínculo append-only),
  SC-23, SC-24 (MP null + hoja API/sync).
  Activos fuera del mapa (chromium + Vite): SC-05 pleno (IdentityHeader en detalle, triage,
  urgencias y consultas con Subject API), SC-08 UI, SC-09 (QueueLiveBanner), SC-10 UI, SC-11
  (`09-offline/sc-11-indexeddb.spec.ts`), **SC-19 estación** (`03-triage-urgencias/sc-19-estacion-offline.spec.ts`:
  Core caído + modal de ingreso → cola IndexedDB `subject.create`/`encounter.open` con ids de
  estación + sync API; indicador pasivo, sin modal bloqueante).
  Siguen en `test.skip` con motivo:
  SC-05/SC-09/SC-11 en el mapa (cubiertos en UI/offline); SC-19 UI en `triage-sin-bloqueo`
  (contrato-api sin browser — activo en chromium arriba). Lectura cruzada
  multi-tenant: activa con seed `008_dev_tenant_bravo.sql` y `MEDICORE_TENANT_B=bravo`; `skip` si
  `TENANT_B` vacío. Bloqueo por intentos fallidos: `skip` (cuenta sintética compartida).
- Specs de carpeta: `01-auth-seguridad/permisos-por-rol` (API: caja/médico/enfermería; caja Fase 2
  en skip) + **`permisos-por-rol-ui`** (chromium: PermissionGate/menú por rol — recepción/admin/
  médico/enfermería/caja; ítems filtrados + deep-links denegados → dashboard; sin mocks de sesión),
  `02-pacientes/no-identificado` (API),
  `02-pacientes/registro-ui` (chromium: CURP válida/inválida + vinculación UI SC-22),
  `02-pacientes/expediente-ui` (chromium: tab expediente API, tabs consultas/recetas API,
  estudios placeholder),
  `03-triage-urgencias/triage-sin-bloqueo`, `03-triage-urgencias/sc-19-estacion-offline` (SC-19
  chromium), `03-triage-urgencias/urgencias-receta-ui` (chromium: receta M8 en panel urgencias +
  SC-04 override UI), `03-triage-urgencias/triage-print-ui` (chromium: hoja triage API + escala
  configurable, sin mocks), `04-consulta-receta` (SC-01/02 API + **UI SOAP/receta/firma/cancelación**
  en `flujo-consulta-ui.spec.ts` chromium/Vite+API: borrador SOAP, receta con captura alérgica,
  firma de nota M6, SC-02 justificación overlap, cancelación M8; `consultas/` sin mocks),
  `05-agenda/agenda-ui` (calendario rico + wizard nueva cita + upsert consultorios con especialidad/médicos API; sin carpeta `src/mocks`; sin overlay `en_triage`/`llamando`; reglas de bloqueo API),
  `00-smoke/api-schedule-blocks` (contrato: upsert/list/409/baja lógica),
  `05-farmacia/farmacia-ui` (chromium: placeholder honesto sin mocks de surtido/inventario),
  rutas FHIR/reportes vía `ModulePlaceholder`; finanzas = placeholders honestos
  (`finanzas.md`; caja/cortes/CFDI Fase 2); clínico = consultas/recetas API +
  estudios/farmacia placeholders (`clinico.md`); pacientes/operación/dashboard =
  API + honestidad (`pacientes.md`, `operacion.md`, `dashboard.md`); normatividad = plantillas
  honestas + placeholders (`normatividad.md`; profesionales lee API),
  (deep-links de `permisos-por-rol-ui` OK; no inventan datos; usuarios + catálogo medicamentos = API),
  `00-smoke/api-medications-admin` (upsert/list admin/desactivar),
  `10-admin/profesionales-especialidades-ui` (chromium: listar/alta/edición/baja lógica
  médicos y especialidades contra API; sin mocks),
  `10-admin/white-label-ui` (logo tenant/API + `primaryColorToken` → CSS),
  `08-multi-tenant` (bravo), `09-offline` (ULID + sync + SC-11 IndexedDB), `07-accesibilidad`
  (teclado login + axe login WCAG AA), `00-smoke/dashboard-ui` (panel operativo API, sin KPIs mock).
  Caja offline: skip Fase 2.
- `tests/e2e`, proyecto `chromium` (corre **después** de `contrato-api` para no cruzar
  logout/revoke con UI): login, dos estaciones, SC-19 estación offline, `sc-ui`,
  SC-11 IndexedDB, teclado login, **dashboard-ui**, **flujo-consulta-ui**, **registro-ui**, **expediente-ui**,
  **farmacia-ui** (placeholder), **urgencias-receta-ui** (receta M8 + SC-04), **triage-print-ui**,
  **monitor-turnos-ui** (#21 sin PHI), **sala-espera-ui** (honestidad urgencias),
  **agenda-ui**,
  **permisos-por-rol-ui**, **admin profesionales/especialidades**, **white-label**
  (`10-admin/white-label-ui`) cuando hay Vite.
- Integración con SPs: pendiente como proyecto aparte; el aislamiento de sucursales se cubre en
  contrato (404 cruzado cuando hay segundo tenant).
- Frontend: `type-check` y `lint` pueden seguir con deuda del prototipo; ver pendiente 76 en
  [`06-decisiones-abiertas.md`](../analisis/06-decisiones-abiertas.md).
- Contratos HTTP: [`auth-sesiones.md`](auth-sesiones.md), [`establecimiento.md`](establecimiento.md), [`encuentros.md`](encuentros.md),
  [`agenda.md`](agenda.md), [`triage.md`](triage.md), [`expediente.md`](expediente.md),
  [`notas.md`](notas.md), [`recetas.md`](recetas.md), [`catalogos.md`](catalogos.md), [`profesionales.md`](profesionales.md),
  [`pwa-dispositivos.md`](pwa-dispositivos.md),
  [`live-cola.md`](live-cola.md).
- Pantallas clínicas (`pacientes`, `urgencias`, `triage`, `agenda`, `dashboard` operativo API,
  `consultas`/notas/receta con listado y cancelación en episodio, `recetas` con cancelación en detalle,
  expediente unificado en detalle paciente, `estudios` y `farmacia` placeholder honesto, auditoría)
  consumen API real en los flujos cableados. Admin `medicos`/
  `especialidades` cableados a API (M1). Agenda: calendario rico + API (M9); sin carpeta
  `frontend/src/mocks` (catálogo `/api/professionals`).

## Reglas duras

**La aceptación cuenta solo contra stack real (API + BD).** Un smoke que corre contra el prototipo
mock de `docs/frontend` es andamiaje para no romper la UI mientras se construye; **no** cuenta como
integración hecha y no autoriza cerrar un módulo.

**Sin `DELETE` ni `TRUNCATE` para limpiar.** La base de Dev es compartida por todo el equipo y no
lleva PHI ([`ambientes.md`](ambientes.md)). El aislamiento entre corridas y entre personas se logra
con datos propios, no borrando filas:

- tenant o sucursal propios del escenario;
- identificadores con prefijo o sufijo único por corrida (por ejemplo folio con marca de tiempo);
- baja lógica y reverso/addendum cuando la prueba necesita «deshacer» algo, igual que en producción.

Si un escenario parece exigir base limpia, se restaura respaldo o se crea una base nueva: no se
borran filas. Consecuencia deliberada: las pruebas deben tolerar datos preexistentes de otros
integrantes; una prueba que solo pasa en base vacía está mal escrita.

**Production no se prueba con E2E.** La suite está bloqueada por configuración contra Production, y
`tools/run-all-tests.ps1` se niega a ejecutarse con ambiente `prod`. Además, si el perfil expuesto
tiene `allowRealPatientData = true`, la suite **aborta**: no se corren pruebas automatizadas contra
un ambiente autorizado para datos reales.

**Los IDs `SC-01…` no se borran.** El mapa de seguridad clínica se conserva en títulos y `test.skip`
hasta que el caso esté implementado. Poner verde la suite quitando casos es fabricar cumplimiento.

**Nada de datos clínicos fabricados en fixtures.** Los datos de prueba son sintéticos y evidentes
como tales; no se inventan sexo, alergias, antecedentes ni signos vitales por omisión para que un
formulario avance.

## Requisitos previos

| Requisito | Cómo se cumple |
|---|---|
| Esquema y SPs aplicados | `./tools/apply-database.ps1 -Environment dev` |
| Credencial de BD en user-secrets | `./tools/set-dev-secrets.ps1` (nunca en el repo ni en texto plano) |
| API arriba para integración/contrato/E2E | `dotnet run --project backend/Api --launch-profile http` |
| Frontend con dependencias | `cd frontend; npm install` |
| Playwright con navegadores | `cd tests/e2e; npm install; npx playwright install` |
| Base URL de E2E | `tests/e2e/.env.development` a partir del `.example` |

Las unitarias y el `type-check`/`lint` no requieren nada de lo anterior salvo el SDK y `npm install`.

## QA guiado (overlay)

Perfil **aparte** de la regresión: muestra en vivo `k/N`, ID `CP-MC-*`, título, escenario y ✓/✗
sobre la SPA. El overlay lo **inyecta Playwright** (`tests/e2e/fixtures/guided-overlay.ts`); no
existe en `frontend/` ni en demo/prod.

| | |
|---|---|
| Comando | `./tools/run-guided-qa.ps1` (`-Cycle smoke` \| `sc-rx` \| `urg` \| `off` \| `authz`; `-Headless`; `-SlowMo`) |
| Ciclos | **Smoke** · **SC-RX** · **URG** · **OFF** · **AUTHZ** (`CP-MC-AUTHZ` matriz + UI + IDOR) |
| Proyecto PW | `guided-qa` (solo si `MEDICORE_E2E_GUIDED=1`) |
| Catálogos | `tests/e2e/guided/ciclos/*.ts` |
| Specs | `tests/e2e/specs/guided/*.spec.ts` |

`run-all-tests.ps1` **no** ejecuta este perfil (chromium ignora `specs/guided/`).

## Cómo se corre todo junto

```powershell
# Suite completa en Dev
./tools/run-all-tests.ps1

# QA guiado (headed, overlay) — requiere API + Vite
./tools/run-guided-qa.ps1
./tools/run-guided-qa.ps1 -Cycle sc-rx
./tools/run-guided-qa.ps1 -Cycle urg
./tools/run-guided-qa.ps1 -Cycle off
./tools/run-guided-qa.ps1 -Cycle authz

# Sin E2E (API no levantada, o en uso por alguien más)
./tools/run-all-tests.ps1 -Skip e2e

# Solo backend
./tools/run-all-tests.ps1 -Skip frontend,e2e

# QA ambiente
./tools/run-all-tests.ps1 -Environment qa
```

El script corre en orden: `dotnet build` → `dotnet test` → `type-check` y `lint` del frontend →
suite E2E/contrato. Imprime un resumen con el estado de cada etapa y devuelve código distinto de
cero si alguna falló. Si aún no hay proyectos de prueba .NET lo informa explícitamente en vez de
reportar verde en falso. Rechaza `-Environment prod`.

## Al cerrar un módulo

- [ ] Unitarias de la lógica pura nueva.
- [ ] Integración de cada SP nuevo o modificado (tenant, idempotencia, sin borrado físico).
- [ ] Contrato de API si se agregó o cambió un endpoint.
- [ ] E2E del flujo si el módulo es visible para el usuario; si toca un `SC-xx`, quitar el `skip`.
- [ ] `type-check` y `lint` en verde si se tocó el frontend.
- [ ] Esta página actualizada si cambió la estrategia o apareció un nivel nuevo.
