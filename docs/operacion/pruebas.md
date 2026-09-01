# MediCore — Estrategia de pruebas

Actualizado: **2026-08-29** · Alineado a [`docs/analisis/12-propuesta-final.md`](../analisis/12-propuesta-final.md)
y a la regla `.cursor/rules/medicore-cierre-de-tarea.mdc`.

Principio: **cada módulo que se implementa deja sus pruebas en el mismo cambio.** No hay una fase
final de «escribir las pruebas»; lo que existe al final es la suma de lo que cada módulo dejó, y
esa suma se corre de una sola vez con `tools/run-all-tests.ps1`.

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
- `backend/Tests/MediCore.Business.Tests`: unitarias de logout (decisión 73), revocación global (#75),
  break-glass (#23), plantillas de permisos por rol (§19), **AuthZ API por permisos efectivos**
  (`EffectivePermissionAccessTests`), sesión con/sin
  profesional sanitario, validaciones de sucursal (M11), **CRUD profesional/especialidad (M1)**,
  **tipos base + acceso a auditoría (M2)**
  y **sujeto/identidad (M3)**: CURP estructural, máquina de estados, emisor de etiqueta (cascada /
  sin colores), AuthZ provisional de búsqueda por descripción; **episodio/urgencias (M4)**: orden
  de cola, máquina de estados, care-without-consent, sugerencia MP; **agenda (M9)**: traslape de
  intervalos, fail closed `mine` sin profesional, cancelar exige motivo; **triage/signos (M5)**:
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
  en skip) + **`api-break-glass`** (login/`me` con `permissions`, break-glass 403→200 en expediente,
  rechazo `canAdminUsers`; usuario recepción para no contaminar UI enfermería) + **`permisos-por-rol-ui`** (chromium: PermissionGate/menú por rol — recepción/admin/
  médico/enfermería/caja; ítems filtrados + deep-links denegados → dashboard; enfermería UI usa
  `rocio.bautista@medicore.mx` / sucursal NORTE para aislar break-glass API de `carmen.vargas`) +
  `02-pacientes/no-identificado` (API),
  `02-pacientes/registro-ui` (chromium: CURP válida/inválida + vinculación UI SC-22),
  `03-triage-urgencias/triage-sin-bloqueo`, `03-triage-urgencias/sc-19-estacion-offline` (SC-19
  chromium), `04-consulta-receta` (SC-01/02 API + **UI SOAP/receta**
  en `flujo-consulta-ui.spec.ts` chromium/Vite+API; `consultas/` sin mocks),
  `05-agenda/agenda-ui` (profesionales desde API; sin `@/mocks/doctors`),
  `10-admin/profesionales-especialidades-ui` (chromium: listar/alta/edición/baja lógica
  médicos y especialidades contra API; sin mocks),
  `08-multi-tenant` (bravo), `09-offline` (ULID + sync + SC-11 IndexedDB), `07-accesibilidad`
  (teclado login + axe login WCAG AA). Caja offline: skip Fase 2.
- `tests/e2e`, proyecto `chromium`: login, dos estaciones, SC-19 estación offline, `sc-ui`,
  SC-11 IndexedDB, teclado login, **flujo-consulta-ui**, **registro-ui**, **agenda-ui**,
  **permisos-por-rol-ui**, **admin profesionales/especialidades**
  (`10-admin/profesionales-especialidades-ui`) cuando hay Vite.
- Integración con SPs: pendiente como proyecto aparte; el aislamiento de sucursales se cubre en
  contrato (404 cruzado cuando hay segundo tenant).
- Frontend: `type-check` y `lint` pueden seguir con deuda del prototipo; ver pendiente 76 en
  [`06-decisiones-abiertas.md`](../analisis/06-decisiones-abiertas.md).
- Contratos HTTP: [`auth-sesiones.md`](auth-sesiones.md), [`roles-permisos.md`](roles-permisos.md), [`establecimiento.md`](establecimiento.md), [`encuentros.md`](encuentros.md),
  [`agenda.md`](agenda.md), [`triage.md`](triage.md), [`expediente.md`](expediente.md),
  [`notas.md`](notas.md), [`recetas.md`](recetas.md), [`profesionales.md`](profesionales.md),
  [`live-cola.md`](live-cola.md).
- Pantallas clínicas (`pacientes`, `urgencias`, `triage`, `agenda`, `consultas`/notas/receta,
  historia/`recetas`, auditoría) consumen API real en los flujos cableados. Admin `medicos`/
  `especialidades` cableados a API (M1). Agenda sin `@/mocks/doctors` (catálogo
  `/api/professionals`).

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

## Cómo se corre todo junto

```powershell
# Suite completa en Dev
./tools/run-all-tests.ps1

# Sin E2E (API no levantada, o en uso por alguien más)
./tools/run-all-tests.ps1 -Skip e2e

# Solo backend
./tools/run-all-tests.ps1 -Skip frontend,e2e

# QA
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
