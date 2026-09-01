# 03 — Arquitectura propuesta

Fecha: **2026-08-21** · Revisado: **2026-08-23**
Estado: **arquitectura vigente para ratificación**

---

## 0. La premisa que define la arquitectura

Esta arquitectura no parte de un requisito técnico. Parte de una situación clínica, planteada así por el cliente:

> *"Quiero darte ese sentido humano: un paciente en urgencias vive, entonces por eso el énfasis en que esté disponible en ese sentido; por eso el modo offline, para que continúe operando y no haya un tema de '¿está caído el sistema?' y tengamos un paciente en fila de urgencias en espera. Muchas veces un paciente llega inconsciente, y que falle el sistema no debería ser motivo para detener el flujo, incluso si no sabemos su nombre."*

El razonamiento va del paciente hacia la arquitectura:

1. **La atención no se detiene.**
2. **Por lo tanto, el sistema debe seguir operando cuando el backend no responde.**
3. **La resiliencia vive en el dispositivo** (cola local durable + caché mínima), no en un servidor en la clínica.

### Criterio de decisión rector

> **Ante cualquier conflicto entre la continuidad de la atención y una exigencia administrativa, gana la continuidad de la atención. La reconciliación administrativa se hace después, con rastro auditable.**

Límite innegociable:

> **Esto no relaja la integridad del expediente clínico.** Append-only, doble marca de tiempo `occurred_at` / `recorded_at`, autoría verificable. Se difiere lo administrativo; nunca la trazabilidad clínica.

Respaldo normativo (verificado, doc 01): LGS arts. 51 Bis 2 y 469; Reglamento de prestación de servicios arts. 71–74 y 85. Alcance real: no existe prohibición expresa de pedir documentos para urgencia; sí existe exposición legal si el software impide atender.

---

## 1. Decisión arquitectónica vigente (2026-08-23)

El cliente precisó la necesidad:

> Entrar vía web a `https://www.medicore.com`, operar con normalidad; instalar PWA opcionalmente; si caen los servicios de backend, seguir operando con caché local y enviar al recuperar el enlace, sin duplicidad.

### Topología

| Pieza | Decisión |
|---|---|
| Backend | Monolito modular .NET, **1 región / instancia de producto**, SQL Server **una sola BD multi-tenant**, lógica de persistencia en **Stored Procedures**, sin Redis, sin microservicios |
| Cliente | SPA React + TypeScript + Vite + Tailwind, servida en la URL del producto, **instalable como PWA** |
| Navegador vs PWA | **El mismo cliente.** Instalar mejora arranque y sensación nativa; no cambia arquitectura ni capacidad offline |
| Nodo en la clínica | **Descartado.** No hay Edge por sucursal |
| Instalación en infra del cliente | **Prevista** (mismo artefacto, sin consolidación central del expediente). Detalle en doc 07 |
| Shell nativo | Tauri 2 **opcional**, sólo para hardware (impresoras, firma, e.firma, DICOM, kiosco) |

Esto **respeta al pie de la letra** la topología del doc 2 (SPs, Clean Architecture, DDD estratégico, `TenantId` en claims, API como fuente de verdad). La operación 24/7 se obtiene con **cola de salida en el cliente**, no con réplica de SPs.

### Lo que se acepta a cambio (contrato explícito)

Sin servidor en la clínica, cuando el backend no responde:

- La captura clínica **por dispositivo** continúa.
- La coordinación entre estaciones (cola de urgencias compartida, sala de espera, farmacia↔caja, monitor de turnos) **deja de ser compartida** y cae a la última foto conocida etiquetada con antigüedad.
- Folios autoritativos, CFDI, FHIR y RENAPO se difieren o (salvo DGIS/SINBA) pueden depender de banderas. **DGIS/SINBA es capacidad fija del producto** (§9): sin Internet se encola; no se apaga por configuración.

**Esto no se vende como “operación normal idéntica sin Internet”.** Se vende como continuidad de la atención en la estación, con degradación declarada.

---

## 2. Dominios de falla (contrato)

| # | Falla | Cubierto por |
|---|---|---|
| F1 | Enlace a Internet caído | Cola local + caché de seguridad + lectura con antigüedad |
| F2 | API/BD central caída o en despliegue | Igual que F1; mitigación de despliegue: instancias escalonadas **cuando el hospedaje lo permita** (ver §8 y doc 10) |
| F3 | Estación pierde red / navegador | IndexedDB durable; cola no se borra al cerrar sesión |
| F4 | Corte eléctrico | Contingencia en papel + captura diferida (`occurred_at` ≠ `recorded_at`) |
| F5 | Pérdida del centro de datos | Respaldos + DR del proveedor/instancia; **no** hay Edge que absorba |
| F6 | Corrupción lógica | Append-only + PITR + cadena de integridad |
| F7 | Compromiso / ransomware | MFA, segmentación, backups inmutables, registro de dispositivos |

---

## 3. Asimetría escritura / lectura (núcleo del diseño)

### Escribir — siempre local, un solo camino

1. Toda mutación genera **clave de idempotencia en el momento de la captura**.
2. Se persiste primero en **cola durable (IndexedDB)**.
3. La UI confirma contra esa escritura local (**nunca** contra la red).
4. Un drenador en segundo plano envía al API; con enlace, la cola se vacía en milisegundos.
5. Reintentos con retroceso exponencial; un elemento con falla permanente **no bloquea** al resto (bandeja de excepciones / rechazo diferido).

**Prohibido:** bifurcación `if (online) saveRemote else saveLocal` en cada módulo.

### Leer — servidor cuando hay enlace; caché sólo en contingencia

- Con enlace: lectura del servidor (verdad).
- Sin enlace: última foto conocida **con antigüedad visible** (SC-09).
- Con enlace: **empuje en vivo** (SignalR u equivalente) para cola de urgencias, sala de espera y monitor de turnos.

### Cuatro niveles de caché

| Nivel | Qué | Política |
|---|---|---|
| 1 | App shell, catálogos, config, marca, permisos | Completo, siempre |
| 2 | Conjunto clínico de seguridad del **grupo de trabajo previsible** (agendados del día, cola de urgencias, vistos recientes) | Caducidad + purga; **mínimo** |
| 3 | Estado compartido (cola, sala, existencias, turno de caja) | Sólo última foto; **nunca como verdad** |
| 4 | Resto | Por demanda |

**Prohibido:** cachear el padrón completo o la historia clínica completa en el dispositivo.

### Registro de dispositivos (decisión 2026-08-23)

Sólo equipos **registrados** por un administrador cachean datos clínicos y tienen cola de salida. Cualquier otro navegador opera **sólo en línea**. Al cerrar sesión: se purgan lecturas cacheadas; **la cola de salida nunca se borra**.

---

## 4. Offline por dominio (vigente)

| Dominio | Sin backend | Notas |
|---|---|---|
| Triage / signos vitales | Sí | Append-only; ningún SV obligatorio que impida documentar al crítico (doc 09) |
| Nota clínica | Sí; firma local + sello al sincronizar | Una vez firmada localmente: **inmutable** |
| Ingreso urgencias / paciente no ID | Sí | Modelo doc 08; etiqueta operativa ≠ centinelas DGIS |
| Receta | Condicionado | Requiere catálogo + alergias en caché; si no, no se prescribe a ciegas |
| Agenda | Lectura | Sin árbitro local no se sobreagenda |
| Farmacia surtir | **Permitido** | Existencia puede quedar negativa; reconciliación marcada. **Estupefacientes/psicotrópicos: pendiente** |
| Caja / cobro | **Permitido** | Recibo provisional no fiscal; CFDI diferido; corte por dispositivo en contingencia |
| Timbrado CFDI / FHIR / RENAPO | Feature flags | Si deshabilitado o sin Internet: no bloquean atención (outbox) |
| Reportes DGIS / SINBA | **Siempre activos** (capacidad fija) | Sin Internet: se generan y quedan en outbox; al recuperar enlace se envían. **Nunca** se deshabilitan por flag de producto |
| Catálogos / roles / branding | Lectura | Escritor único = Core |

---

## 5. Eventos (EDA acotada)

| Sí | No |
|---|---|
| Expediente y auditoría como hechos append-only | Broker (Kafka/Rabbit) en MVP |
| **Outbox transaccional** en la misma TX del SP | Modelos de lectura separados / CQRS completo |
| Eventos de dominio → empuje al cliente | Consistencia eventual en lecturas clínicas |
| Versionado de esquema de eventos desde día 1 | Microservicios |

El outbox desacopla CFDI, DGIS, FHIR, notificaciones y reportes del flujo clínico: **fallar una capacidad no tumba la consulta**.

Simetría: cola del cliente → Core; outbox del Core → mundo exterior.

---

## 6. Integridad, identidad y seguridad clínica

- ULID en el borde (ADR-005).
- Append-only + addendum; prohibición de enmendaduras (NOM-004 5.11).
- Identidad progresiva: sujeto ≠ episodio (ADR-016, doc 08).
- Nada bloquea el inicio de la atención (ADR-015, §11).
- Endurecimiento del modelo de datos: el sistema debe poder decir **"no sé"** (doc 09: 87 hallazgos).
- PDF clínicos en servidor (ADR-009); no html2canvas como evidencia.
- Firma: local + sello al sincronizar; requiere dictamen legal vs NOM-004 5.10.

### Rechazo diferido (decisión 2026-08-23)

Clasificación administrativo vs clínico; bandeja a rol nombrado con SLA; **nunca borrar**; corrección por addendum; protocolo escrito de contacto al paciente en clase clínica.

---

## 7. Backend y frontend (alineado al doc 2)

**Backend:** Clean Architecture, DDD estratégico, módulos por bounded context, SPs, `TenantId` en claims, `ApiResponse<T>`, Serilog enriquecido, GlobalExceptionHandler sin filtrar secretos.

**Frontend:** conservar prototipo (tokens OKLCH, AppLayout, máquinas de estado, vitalValidation, documentStore IndexedDB). Corregir: auth, monitor de turnos, permisos duales, `strict: true`, lazy loading, assets locales (no CDN), a11y teclado, triage no sólo por color.

**White-label:** cuatro capas de tokens; tokens clínicos de triage **bloqueados** (doc 04).

**BI / dirección:** módulo `features/bi` **dentro de la app principal** (no app aparte). Visible solo con permiso de dirección; **solo lectura** (API GET de agregados); sin PHI a nivel paciente; **supresión de celdas pequeñas**; **sin** cola/caché clínica offline para indicadores; carga diferida (`lazy`) para no pesar el flujo de urgencias. Auditoría de todo acceso al tablero.

---

## 8. Hospedaje y despliegue (conflicto explícito)

| Ambiente | Uso permitido |
|---|---|
| **SmarterASP.NET shared** (cliente dijo “SmartASP.NET”) | Desarrollo, demos y **ventas** con datos sintéticos |
| **Instancia dedicada pequeña (VPS u equivalente)** | Antes del **primer paciente real** |

En shared hosting **no** es implementable de forma fiable: despliegue escalonado multi-instancia, worker de outbox como proceso durable, control de reciclado del app pool, PITR completo, ni residencia en México (centros publicados del proveedor: US/EU/Asia — **ninguno en México** verificado 2026-08-23). Detalle en doc 10.

**Salvaguardas del ambiente de ventas:** datos sintéticos (nunca reales ni “anonimizados”); banner de demostración; flags CFDI/FHIR/RENAPO **apagados**; **DGIS/SINBA permanece en el producto** (destino de envío **no productivo** en demo); reinicio a estado conocido entre demos; regla dura: **paciente real = disparador de migración**.

Despliegue escalonado de API: **aceptado por el cliente** y aplicable en instancia dedicada / entorno controlado; **no** se promete en shared.

---

## 9. Integraciones externas

### 9.1 DGIS / SINBA — capacidad fija del producto (decisión 2026-08-23)

**No es feature flag.** Los reportes e intercambio hacia DGIS/SINBA forman parte del sistema en todo tenant y toda instalación.

| Situación | Comportamiento |
|---|---|
| Con Internet y credenciales de autoridad | Generación + envío por outbox (no bloquea atención) |
| Sin Internet / autoridad caída | Se **generan** igual; quedan en outbox hasta poder enviar |
| Demo / datos sintéticos | Misma tubería de código; destino **no productivo** |
| Instalación on-prem | Módulo siempre presente; el cliente **debe** proveer Internet para el envío real a la autoridad |

Contrato: no existe la opción comercial “MediCore sin reportes DGIS/SINBA”. Lo que sí puede diferirse es el **momento del envío**, nunca la existencia del módulo.

Pendiente externo: consulta a DGIS sobre CURP inobtenible (doc 06).

### 9.2 Feature flags (solo estas)

Configurables por tenant:

| Flag | Si off / sin Internet |
|---|---|
| Timbrado CFDI (PAC) | Cobro sí; comprobante no |
| FHIR | Sin intercambio con terceros |
| Validación CURP (RENAPO) | Captura sin validar en línea |

Contrato: si el cliente requiere CFDI, FHIR o RENAPO, **provee Internet**. DGIS/SINBA no se negocia como opcional; el Internet para su envío sí es responsabilidad contractual del cliente en on-prem.

---

## 10. Registro de decisiones (ADR) — estado 2026-08-23

| ADR | Estado |
|---|---|
| **ADR-001** Topología | **Reformulado:** Core central + PWA/cliente; **sin Edge** |
| ADR-002 Autoridad por agregado | Vigente en lo aplicable (folios por sucursal; Core = catálogos/config) |
| ADR-003 SPA + PWA | Vigente |
| ADR-004 Tauri opcional | Vigente |
| ADR-005 ULID | Vigente |
| ADR-006 Refresh httpOnly | **Aprobado** |
| ADR-007 Continuidad | **Reformulado:** continuidad en el **dispositivo**; Core puede caer; degradación por dispositivo aceptada |
| ADR-008 Catálogos SAT en BD | Vigente |
| ADR-009 PDF en servidor | Vigente |
| ADR-010 Edge en Express | **Obsoleto** (no hay Edge) |
| ADR-011 Modalidad por sucursal Edge/sin Edge | **Obsoleto**; sustituido por instalación cloud vs infra-cliente |
| ADR-012 Contrato API idéntico | Vigente (cloud vs instalación local del mismo artefacto) |
| ADR-013 BI / dirección | **Actualizado 2026-08-23:** módulo en la **app principal** con permisos; solo agregados; lazy load; no app aparte |
| ADR-014 Escritura siempre local | Vigente |
| ADR-015 Nada bloquea ingreso | Vigente |
| ADR-016 Identidad progresiva | Vigente |
| **ADR-017** Registro de dispositivos | **Nuevo** |
| **ADR-018** Outbox + EDA acotada | **Nuevo** |
| **ADR-019** Cobro y farmacia offline | **Nuevo** (estupefacientes pendiente) |
| **ADR-020** Firma local + sello sync | **Nuevo** (dictamen legal pendiente) |
| **ADR-021** Portabilidad / infra-cliente | **Nuevo** (doc 07) |
| **ADR-022** Hospedaje demo vs producción | **Nuevo** (punto de corte paciente real) |
| **ADR-023** DGIS/SINBA capacidad fija | **Nuevo** — no feature flag; outbox si no hay red |

### ADR-001 — Core central + cliente PWA (sin Edge)
**Decisión:** un backend central; resiliencia en el dispositivo.
**Consecuencia:** se elimina el costo de sync Edge↔Core; se acepta cola por dispositivo.

### ADR-017 — Registro de dispositivos
Sólo equipos registrados tienen caché clínica y cola de salida.

### ADR-018 — Outbox transaccional
Efectos externos fuera del camino clínico crítico.

### ADR-019 — Cobro y surtido offline
Permitidos con las reglas de §4; estupefacientes/psicotrópicos **pendientes** del Reglamento de Insumos.

### ADR-020 — Firma local + sello al sincronizar
Inmutabilidad inmediata; sello de tiempo confiable diferido; dictamen legal vs 5.10.

### ADR-021 — Instalación en infraestructura del cliente
Mismo artefacto; sin consolidación del expediente; portabilidad desde Fase 0; flags de integración.

### ADR-022 — Demo en shared; producción en controlado
Shared = ventas/demos; migración obligatoria antes del primer paciente real.

### ADR-013 — BI de dirección como módulo de la app principal
**Decisión (2026-08-23):** el tablero de inteligencia de negocio vive en `frontend` como módulo `features/bi`, no como aplicación aparte.
**Reglas:** permiso explícito (solo lectura); solo indicadores agregados; umbral/supresión de celdas pequeñas; sin acceso a expediente desde el KPI; sin participar en la cola offline clínica; `React.lazy` del módulo; auditoría de acceso.
**Motivo:** un solo producto, un solo login, roles distintos. La separación en otra app añadía costo sin beneficio de producto pedido por el cliente.
**Consecuencia:** la API expone endpoints GET de agregados con autorización propia; un 403 de API no se sustituye ocultando el menú en el FE.

### ADR-023 — DGIS/SINBA capacidad fija
No feature flag; generación siempre; envío por outbox; demo con destino no productivo.

---

## 11. Nada puede bloquear el inicio de la atención

Se conserva el desarrollo previo (campos no obligatorios, no fabricar datos, paciente no identificado, prohibición de pantallas bloqueantes). Detalle de modelo en doc 08; endurecimiento sistémico en doc 09.

**Ajuste 2026-08-23:** la fila de urgencias “compartida” sin backend **no existe**. Con enlace, el empuje en vivo la mantiene. Sin enlace, cada estación ve su propio conjunto + última foto. Sucursales de urgencias de alto volumen con muchas estaciones deben dimensionar conectividad (y, si en el futuro lo pagan, instalación local del artefacto —ADR-021— sin volver a inventar Edge sync).

---

## 12. Referencias

- Modalidades, portabilidad, flags: [`07-modalidades-de-despliegue.md`](07-modalidades-de-despliegue.md)
- Identidad: [`08-identidad-y-paciente-no-identificado.md`](08-identidad-y-paciente-no-identificado.md)
- Modelo de datos: [`09-brechas-del-modelo-de-datos.md`](09-brechas-del-modelo-de-datos.md)
- Auditoría de cierre y hospedaje: [`10-auditoria-de-cierre.md`](10-auditoria-de-cierre.md)
- Plan por fases: [`11-plan-de-implementacion.md`](11-plan-de-implementacion.md)
