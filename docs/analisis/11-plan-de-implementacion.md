# 11 — Plan de implementación

Fecha: **2026-08-23**
Estado: **propuesta para decisión de arranque** — el cliente decide cuándo iniciar
Unidad de esfuerzo: **bloque** = esfuerzo relativo de construir un módulo completo tipo Triage (SPs + API + UI + pruebas + docs), conforme doc 05. **Sin fechas en calendario** (tamaño de equipo no informado).

---

## 0. Lectura rápida

| Qué | Decisión |
|---|---|
| Producto | Clínica ambulatoria + urgencias; multi-tenant; white-label |
| Topología | Core central + SPA/PWA; **sin Edge** |
| Offline | Cola local + caché mínima + empuje en vivo cuando hay red |
| Demo/ventas | SmarterASP.NET **shared**, datos sintéticos |
| Producción con pacientes | Instancia dedicada **antes del primer paciente real** |
| App / BI dirección | Módulo `bi` en la app principal; solo agregados; permisos |
| Fuera de alcance F1–F4 | Hospitalización, quirófanos, UCI, portal paciente (salvo que se contrate aparte) |

---

## 1. Principio de priorización

El riesgo clínico inmediato **no** está en la arquitectura: está en el modelo de datos del prototipo (doc 09: historia prellenada, botón de signos vitales inventados, alergias ambiguas). Eso se corrige **antes** de vender demos creíbles y **mucho antes** del primer paciente real.

Orden:

1. No fabricar datos clínicos.
2. Identidad progresiva y ruta de urgencias sin bloqueo.
3. Cola local + idempotencia + indicador de sync.
4. Núcleo clínico ambulatorio.
5. Caja/CFDI/farmacia.
6. Interoperabilidad y certificación.

---

## 2. Dependencias externas (levantar en paralelo desde el día 1)

| Dependencia | Por qué | Cuándo bloquea |
|---|---|---|
| Consulta formal a **DGIS** (CURP inobtenible) | NOM-024 sin centinela | Intercambio / Fase interoperabilidad |
| Obtener **Reglamento de Insumos** | Recetas controladas / estupefacientes | Farmacia controlada |
| Contratación **PAC** | CFDI | Caja fiscal |
| Dictamen **firma electrónica** vs NOM-004 5.10 | Valor de firma local+sello | Producción clínica firmada |
| Dictamen **IVA** servicios médicos | Fiscal | CFDI correcto |
| Dictamen **transferencia / residencia** de datos | DC fuera de México en shared/VPS típico | Primer paciente real |
| Contrato **encargo del tratamiento** con hosting | LFPDPPP | Primer paciente real |
| Entorno **dedicado** (VPS ≥ control de proceso) | Outbox, deploy, backups | Primer paciente real |

---

## 3. Fases

### Fase D — Demo comercial (en shared)

**Objetivo:** mostrar el producto para ventas **sin PHI real**.

| Prioridad | Entrega | Bloques (ord.) |
|---|---|---|
| D0 | Ambiente SmarterASP shared + banner “Demostración” + datos sintéticos + flags CFDI/FHIR/RENAPO off; **DGIS/SINBA siempre en producto** (destino demo no productivo) | 1 |
| D1 | Endurecimiento crítico del modelo en UI mock (quitar defaults clínicos, botón “valores normales”, alergias tipadas) suficiente para demo honesta | 2–3 |
| D2 | Flujos demo: login → paciente → triage/consulta → receta mock → cobro mock | 2–3 |
| D3 | Suite E2E smoke + mapa SC (muchos en skip hasta API real) | 1 |

**Puerta de calidad D:** ninguna pantalla de demo fabrica sexo/alergias/antecedentes; banner visible; sin integraciones externas activas.

---

### Fase 0 — Fundación (antes o en paralelo a D, pero obligatoria antes de pacientes reales)

| Prioridad | Entrega | Bloques (ord.) |
|---|---|---|
| 0.1 | Solución .NET + SQL Server + multi-tenant (`TenantId`) + auth (ADR-006) | 2–3 |
| 0.2 | Contrato API + ULID + idempotencia + cola cliente + IndexedDB + indicador de sync | 2–3 |
| 0.3 | Outbox + worker (requiere entorno donde el worker viva) | 1–2 |
| 0.4 | Registro de dispositivos | 1 |
| 0.5 | Design system / white-label (tokens; triage bloqueado) + assets locales (no CDN) | 1–2 |
| 0.6 | Portabilidad: abstracción de archivos, sin APIs exclusivas de cloud, mismo artefacto contenedor/script | 1 |
| 0.7 | Observabilidad, auditoría append-only, backups definidos | 1 |
| 0.8 | **Migración a instancia dedicada** + prueba de restore | 1 |

**Puerta de calidad 0:**

- Escritura siempre local; sync en segundo plano; sin duplicados bajo reintento.
- Worker de outbox estable tras reciclado.
- Deploy sin corte de servicio (escalonado) **en el entorno de producción**.
- Restore de backup ensayado y documentado.
- **Ningún paciente real** aún en shared.

---

### Fase 1 — Núcleo clínico ambulatorio + urgencias

| Prioridad | Entrega | Bloques (ord.) |
|---|---|---|
| 1.1 | MPI / sujeto + identidad progresiva (doc 08) | 2–3 |
| 1.2 | Agenda | 2 |
| 1.3 | Triage + signos vitales (sin obligatoriedad que bloquee al crítico) | 2 |
| 1.4 | Urgencias (cola, ingreso, observación) | 2–3 |
| 1.5 | Consulta + notas (firma local+sello) | 2–3 |
| 1.6 | Receta (sin estupefacientes hasta resolver pendiente) | 2 |
| 1.7 | Expediente / historia (sin prellenar “negado/normal”) | 2 |
| 1.8 | Empuje en vivo sala/urgencias | 1 |
| 1.9 | SC-01…SC-26 en verde en E2E contra API | 2 |

**Puerta de calidad 1:** SC bloqueantes en verde; paciente no identificado operable offline; cero campos admin obligatorios en ingreso urgencias.

---

### Fase 2 — Financiero, farmacia, estudios

| Prioridad | Entrega | Bloques (ord.) |
|---|---|---|
| 2.1 | Caja, cortes, cobro offline (recibo provisional) | 2–3 |
| 2.2 | CFDI 4.0 + PAC + catálogos versionados | 2–3 |
| 2.3 | Inventario / surtido (existencia negativa reconciliable) | 2 |
| 2.4 | Estudios / resultados | 2 |
| 2.5 | Bandeja de rechazo diferido + protocolo clínico | 1 |

**Pendiente explícito:** estupefacientes y psicotrópicos (libro de control, recetario especial) — **no implementar** hasta Reglamento de Insumos + decisión de alcance. Si quedan fuera de alcance, el sistema debe **impedir** prescribirlos, no “no soportarlos en silencio”.

**Puerta de calidad 2:** cobro offline no fiscal correcto; CFDI solo con flag on; sin retención de paciente por cobro (art. 85).

---

### Fase 3 — Privacidad, normatividad, seguridad operativa

| Prioridad | Entrega | Bloques (ord.) |
|---|---|---|
| 3.1 | Aviso de privacidad / ARCO bajo LFPDPPP **2025** (no la de 2010) | 2–3 |
| 3.2 | Consentimientos, egresos, notificación MP (sugiere, no decide) | 2 |
| 3.3 | SGSI operativo + retención / motor de supresión con retención legal | 2–3 |
| 3.4 | Módulo BI en app principal (agregados + umbral de celda + permisos + lazy) | 1–2 |

**Puerta de calidad 3:** ningún módulo de privacidad asume INAI; auditorías de acceso a BI.

---

### Fase 4 — Interoperabilidad y madurez

| Prioridad | Entrega | Bloques (ord.) |
|---|---|---|
| 4.1 | **DGIS/SINBA — capacidad fija:** GIIS, instructivos, valores `Desconocido` oficiales, outbox de envío (no es flag) | 2–3 |
| 4.2 | FHIR (sí es flag / opcional por tenant) | 2–3 |
| 4.3 | Camino a certificación NOM-024 (si el negocio lo pide) | por definir |

**Nota de alcance:** el modelo de datos y la generación de reportes DGIS/SINBA deben diseñarse desde Fase 1 (campos y centinelas), aunque el **envío productivo** a la autoridad madure en Fase 4. No se trata como módulo opcional.

**Puerta:** respuesta DGIS sobre CURP inobtenible incorporada; envío DGIS/SINBA operativo en outbox.

---

### Fase 5 — Fuera de este contrato

Hospitalización, quirófanos, UCI, DICOM completo, portal del paciente: **contrato aparte**.

Instalación en infraestructura del cliente como **producto empaquetado** (instalador, updates, soporte): se **diseña** desde Fase 0 (portabilidad); se **vende** cuando haya cliente que lo pague.

---

## 4. Matriz de prioridades (qué primero si el equipo es pequeño)

| Orden | Ítem | Razón |
|---|---|---|
| 1 | No fabricar datos (doc 09 críticos) | Daño clínico / credibilidad demo |
| 2 | Auth + tenant + cola + idempotencia | Base de todo offline |
| 3 | Identidad progresiva + urgencias | Premisa del producto |
| 4 | Entorno dedicado + worker + backups | Condición legal/operativa de PHI |
| 5 | Consulta + receta + expediente | Núcleo ambulatorio |
| 6 | Caja + CFDI | Ingreso del cliente |
| 7 | Farmacia general | Cierre de flujo |
| 8 | BI dirección | Venta a directivos |
| 9 | Interop | Cumplimiento externo |

---

## 5. Fuera de alcance (explícito)

- Equivalencia “multiusuario offline como con servidor local”.
- Edge sync bidireccional.
- Redundancia de Core en shared.
- Estupefacientes/psicotrópicos hasta resolver pendiente.
- Certificación NOM-024 afirmada sin SGSI maduro y entorno controlado.
- Datos de pacientes reales en ambiente de demo.

---

## 6. Criterio para decir “iniciamos”

El arranque de implementación puede comenzar por **Fase D + 0.1–0.2** en cuanto el cliente lo autorice.

El arranque de **pacientes reales** requiere, como mínimo: Fase 0 con puerta en verde, dictámenes de residencia/encargo, entorno dedicado, y SC clínicos críticos en verde.
