# Plan de pruebas — ciclo de calidad (por módulo)

Fecha: **2026-09-10**  
Objetivo: maximizar calidad verificable del software con suite **automatizada** contra **stack real** (API + BD Dev/QA).  
Fuente de estrategia: [`pruebas.md`](pruebas.md). Producto: propuesta 12 + UI viva en `frontend/`.

> Este documento es el **plan ejecutable**. No afirma que las etapas ya se corrieron: cada oleada registra resultado real en el board o en el resumen del agente.

---

## 1. Alcance y reglas

### Incluye
- Unitarias .NET, contrato API, E2E Playwright (chromium + contrato-api), type-check/lint FE.
- Casos SC (seguridad clínica) y authZ / multi-tenant / offline.
- **Seguridad automatizable** (capa «pentest light»): IDOR, JWT, roles, tenant, abuse básico de API — **sin** exploits ofensivos contra hosts públicos ni DoS.

### Excluye (explícito)
- Production / PHI real (`AllowRealPatientData`).
- `DELETE` / `TRUNCATE` para limpiar.
- Aceptación de caja/CFDI/estudios/surtido farmacia como flujo completo (placeholders Fase 2+).
- PENTEST manual ofensivo, fuzzing agresivo, o ataques a `medi-core.app` sin autorización escrita aparte.
- Afirmar cumplimiento NOM/LFPDPPP solo por verde en CI.

### Orquestador
```powershell
./tools/run-all-tests.ps1              # build → test → frontend → e2e
./tools/run-all-tests.ps1 -Skip e2e    # si API no está arriba
```
E2E dirigido (ejemplos):
```powershell
cd tests/e2e
npx playwright test specs/06-seguridad-clinica --project=contrato-api
npx playwright test specs/01-auth-seguridad --project=chromium
```

---

## 2. Inventario actual (baseline)

| Capa | Estado aprox. |
|---|---|
| .NET unitarias | 2 proyectos, ~22 archivos `*Tests.cs`, ~133 Fact/Theory |
| E2E specs | **46** archivos bajo `tests/e2e/specs/` |
| Integración SP dedicada | **Pendiente** (cubierto en parte vía contrato API) |
| SC-01…SC-24 | Mayoría activos en mapa/API/UI; SC-25/26 y varios SS aún documentales o skip |
| FE | `type-check` / `lint` en orquestador |

Detalle de specs: ver `pruebas.md` §Niveles y carpetas `00-smoke`…`10-admin`.

---

## 3. Criterio de «módulo listo» en este ciclo

Un módulo pasa el ciclo si:

1. **Contrato API** (si tiene API) verde en Dev.
2. **UI** (si tiene pantalla cableada): smoke E2E sin mocks; placeholders = aserción de honestidad.
3. **AuthZ**: rol sin permiso → 403 API y deep-link UI denegado donde aplique.
4. **Tenant**: lectura cruzada → 404/403 (no fuga).
5. **Clínico** (si aplica): no fabrica datos; SC relevantes verdes.
6. Sin regresiones en `run-all-tests.ps1` (etapas acordadas).

---

## 4. Plan por módulo (orden de ejecución)

Prioridad: **P0** bloqueante calidad / seguridad · **P1** alto valor · **P2** cobertura / UI · **P3** fase futura.

### M0 — Fundación (siempre primero)

| ID | Qué | Cómo | Pri |
|---|---|---|---|
| M0.1 | Build solución | `run-all-tests` etapa build | P0 |
| M0.2 | Unitarias .NET | etapa test | P0 |
| M0.3 | FE type-check + lint | etapa frontend | P0 |
| M0.4 | Health + no PHI + no Production | `00-smoke/api-health` | P0 |

**Enrich:** asertar headers de seguridad básicos en health/login (no divulgar stack en 500) — P1.

---

### M1 — Auth y sesiones

| ID | Qué | Specs existentes | Enrich propuesto | Pri |
|---|---|---|---|
| M1.1 | Login / refresh / logout / revoke-all | `api-auth`, `login` | Token caducado mid-flow → 401 sin tumbar UI de captura (SC-19 parcial) | P0 |
| M1.2 | Permisos por rol API | `permisos-por-rol` | Matriz completa de endpoints clínicos por rol `trabajo_social` | P1 |
| M1.3 | PermissionGate UI | `permisos-por-rol-ui` | Deep-links normatividad/finanzas/auditoría | P1 |
| M1.4 | Break-glass | `api-break-glass` | No concede `canAdminUsers` / `canVerAuditoria` | P0 |
| M1.5 | Lockout intentos | skip hoy | Reactivar con cuenta sintética dedicada | P2 |

**Seguridad automatizable:** JWT manipulado (firma inválida, tenant claim ajeno), cookie refresh reuse tras logout, revoke-all invalida refresh.

---

### M2 — Multi-tenant e aislamiento

| ID | Qué | Existente | Enrich | Pri |
|---|---|---|---|
| M2.1 | Lectura cruzada sujetos/encuentros | `08-multi-tenant/aislamiento`, `api-multi-tenant` | IDOR: cambiar solo `entityId` en PUT/POST de notas/Rx | P0 |
| M2.2 | Sucursales / white-label | `api-branches`, `white-label-ui` | Logo/color no filtra otro tenant | P1 |
| M2.3 | Hub cola | `api-clinical-queue-hub` | Suscripción a grupo de otro tenant rechazada | P0 |

---

### M3 — Pacientes / identidad

| ID | Qué | Existente | Enrich | Pri |
|---|---|---|---|
| M3.1 | Alta / búsqueda / foto | `api-subjects`, `registro-ui` | Listado UI Readdy: stats/filtros/acciones (`page-pacientes`) | P1 |
| M3.2 | No identificado | `no-identificado` | SC-17 tres etiquetas simultáneas distinguibles | P0 |
| M3.3 | Vinculación / revert | `registro-ui` SC-22 | Alerta riesgo + auditoría `subject.link.revert` | P0 |
| M3.4 | Sexo/edad sin default | SC-15/16 en mapa | UI nuevo sujeto: ningún sexo preseleccionado | P0 |
| M3.5 | Expediente tabs | `expediente-ui` | Layout listado post-alineación no rompe testids | P1 |

---

### M4 — Operación (urgencias, triage, sala, monitor, agenda)

| ID | Qué | Existente | Enrich | Pri |
|---|---|---|---|
| M4.1 | Encuentros / cola | `api-encounters` | Orden SC-07 con escala 5 niveles demo | P0 |
| M4.2 | Triage sin bloqueo | `triage-sin-bloqueo`, `api-triage`, `triage-print-ui` | Sin nivel por omisión UI (SC-03) | P0 |
| M4.3 | Urgencias + Rx | `urgencias-receta-ui` | SC-04 override + evento auditoría | P0 |
| M4.4 | Agenda | `agenda-ui`, `api-appointments`, `api-schedule-blocks` | Traslape 409 + bloqueo reglas | P0 |
| M4.5 | Sala de espera UI | `sala-espera-ui` | Smoke: `page-sala-espera`, cola urgencias, sin citas inventadas | P1 |
| M4.6 | Monitor turnos | `monitor-turnos-ui` | Solo número (#21); sin nombre/PHI en DOM | P0 |
| M4.7 | Dashboard | `dashboard-ui` | Sin KPI ingresos inventados | P1 |

---

### M5 — Clínico (consultas, notas, recetas)

| ID | Qué | Existente | Enrich | Pri |
|---|---|---|---|
| M5.1 | Flujo consulta UI | `flujo-consulta-ui` | Firma nota + addendum; PUT nota 405 (SC-06) | P0 |
| M5.2 | Recetas / alergias | `flujo-consulta`, `api-prescriptions` | SC-01 visible; SC-02 justificación; controlados 422 | P0 |
| M5.3 | Notas AuthZ | `api-notes` | Caja 403 crear nota | P0 |
| M5.4 | Recetas listado UI | parcial | `?paciente=` vacío → empty state; cancelación detalle | P1 |

---

### M6 — Expediente / historia / alergias

| ID | Qué | Existente | Enrich | Pri |
|---|---|---|---|
| M6.1 | Record + alergias | `api-clinical-record` | Lista vacía ≠ «sin alergias» si `no_interrogado` | P0 |
| M6.2 | Historia append | mismo | Addendum NOM-004 5.11; no UPDATE destructivo | P0 |

---

### M7 — Admin establecimiento

| ID | Qué | Existente | Enrich | Pri |
|---|---|---|---|
| M7.1 | Usuarios UI | `usuarios-ui`, `api-users` | Roles plantilla; sin permiso 403 | P0 |
| M7.2 | Médicos / especialidades | `profesionales-especialidades-ui` | Baja lógica; roomId | P0 |
| M7.3 | Medicamentos admin | `api-medications-admin` | Controlados no prescritibles | P0 |
| M7.4 | Sucursales / consultorios UI | parcial white-label | CRUD consultorio smoke | P1 |
| M7.5 | Catálogos CIE/estudios | — | Placeholder honesto (sin CRUD inventado) | P2 |
| M7.6 | Dispositivos PWA UI | — | Lista estaciones / aprobación (si API) | P1 |

---

### M8 — Seguridad (roles, auditoría)

| ID | Qué | Existente | Enrich | Pri |
|---|---|---|---|
| M8.1 | Auditoría API | `api-audit` | 403 sin `canVerAuditoria` | P0 |
| M8.2 | Auditoría UI | deep-link roles | Flujo: consultar actor sesión → tabla Readdy; Resultado N/D | P1 |
| M8.3 | Roles UI | — | Cards/modal; Nuevo/Duplicar disabled §19 | P1 |

---

### M9 — Offline / sync / PWA

| ID | Qué | Existente | Enrich | Pri |
|---|---|---|---|
| M9.1 | Idempotencia sync | `api-sync-idempotencia`, `cola-idempotencia` | Replay ULID same result | P0 |
| M9.2 | SC-11 IndexedDB | `sc-11-indexeddb` | Reinicio pestaña | P0 |
| M9.3 | SC-19 estación | `sc-19-estacion-offline` | Sin modal bloqueante | P0 |
| M9.4 | Dos estaciones | `dos-estaciones-offline` (parcial skip) | Activar sync cruzado si estable | P1 |
| M9.5 | Workbox / SW | — | Tras deploy: precache no 403; o documentar clear-SW | P1 |
| M9.6 | Caja offline | skip Fase 2 | Mantener skip explícito | P3 |

---

### M10 — Placeholders honestos (no negocio)

| ID | Módulo | Enrich | Pri |
|---|---|---|---|
| M10.1 | Farmacia / Estudios | Specs smoke «Módulo en preparación» | P1 |
| M10.2 | Finanzas (caja/CFDI) | Spec: placeholder + sin montos | P1 |
| M10.3 | Normatividad | Spec smoke rutas + profesionales API si aplica | P2 |
| M10.4 | FHIR / Reportes | Deep-link / hiddenInNav | P2 |

---

### M11 — Accesibilidad

| ID | Qué | Existente | Enrich | Pri |
|---|---|---|---|
| M11.1 | Login axe + teclado | `wcag-basico` | Ampliar a dashboard y pacientes (smoke axe) | P1 |

---

### M12 — Seguridad clínica (mapa SC)

| ID | Qué | Existente | Enrich | Pri |
|---|---|---|---|
| M12.1 | SC-01…SC-24 mapa | `sc-mapa`, `sc-ui` | Cerrar skips documentados o justificar | P0 |
| M12.2 | SC-25 / SC-26 | documental | Skip hasta DGIS reporte / observación umbral | P3 |
| M12.3 | SS-* dispositivo | parcial vía SC-11/19 | Plan Fase offline reforzada | P2 |

---

### M13 — Seguridad «pentest light» (nuevo paquete propuesto)

Carpeta sugerida: `tests/e2e/specs/11-seguridad-api/`.

| ID | Caso | Técnica | Pri |
|---|---|---|---|
| S.1 | Acceso sin token a rutas clínicas | 401 | P0 |
| S.2 | Token de tenant A en recurso B | 404/403 | P0 |
| S.3 | Escalada: rol caja → crear nota / ver auditoría | 403 | P0 |
| S.4 | Break-glass no abre admin/auditoría | 403 | P0 |
| S.5 | Mass assignment: body con `tenantId` ajeno ignorado | aislamiento | P0 |
| S.6 | Path traversal / segmentos foto sujeto | 400/404 | P1 |
| S.7 | Rate: N logins fallidos (sin lockout DoS) | documentar política | P2 |
| S.8 | Headers: no stack trace en 500 controlado | smoke | P1 |

**Prohibido en automatización:** SQLi payload dump, XSS almacenado masivo, fuzz de DoS, ataques a demo pública sin ventana acordada.

---

## 5. Oleadas de ejecución (cómo lo corre el agente)

| Oleada | Módulos | Comando orientativo | Duración relativa |
|---|---|---|---|
| **O1** | M0 + M1 + M2 + M13 (S.1–S.5) | build/test/frontend + contrato auth/tenant + nuevo seguridad | Media |
| **O2** | M3 + M4 + M12 (SC) | e2e pacientes + operación + sc-mapa/sc-ui | Alta |
| **O3** | M5 + M6 + M7 | clínico + expediente + admin | Alta |
| **O4** | M8 + M9 + M10 + M11 | seguridad UI + offline + placeholders + a11y | Media |
| **O5** | Suite completa | `./tools/run-all-tests.ps1` | Completa |

Tras cada oleada: registrar en board qué pasó/falló; bugs nuevos → resumen + `06` si requiere decisión.

---

## 6. Enrich prioritario a implementar antes/durante O1–O2

Orden sugerido de **nuevos** specs (si el ciclo autoriza código de prueba):

1. `11-seguridad-api/idor-tenant.spec.ts` (S.2, S.5)
2. `11-seguridad-api/authz-matriz.spec.ts` (S.1, S.3, S.4)
3. `03-…/monitor-turnos-ui.spec.ts` (#21 sin PHI)
4. `03-…/sala-espera-ui.spec.ts`
5. `01-…/auditoria-ui.spec.ts` (layout + consultar)
6. Placeholders: `finanzas-ui`, ampliar normatividad smoke
7. Ampliar axe a 1–2 pantallas clínicas

---

## 7. Definición de éxito del ciclo

- O1–O4 ejecutadas con evidencia (log/`run-all-tests` o Playwright report).
- Cero fallos P0 abiertos sin ticket/bug anotado.
- Placeholders no se hacen pasar por flujos de negocio.
- Lista de gaps remanentes (SC-25/26, caja F2, integración SP dedicada) explícita.

### QA guiado (overlay, 2026-09-11)

Perfil aparte: [`pruebas.md`](pruebas.md) §QA guiado · `tools/run-guided-qa.ps1`.
Piloto completo: Smoke · SC-RX · URG · OFF · AUTHZ (`CP-MC-AUTHZ` M13/SC-23/UI).

---

## 8. Relación con docs

- Estrategia viva: [`pruebas.md`](pruebas.md)
- SC: [`05-roadmap-qa-riesgos.md`](../analisis/05-roadmap-qa-riesgos.md)
- PWA/SW: [`pwa-dispositivos.md`](pwa-dispositivos.md) (precaching 403 post-deploy = clear SW / republish assets)
