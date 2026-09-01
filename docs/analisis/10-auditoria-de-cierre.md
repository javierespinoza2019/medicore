# 10 — Auditoría de cierre

Fecha: **2026-08-23**
Estado: **cierre del análisis previo a implementación**

---

## 1. Propósito

Recorrer el conjunto documental, detectar contradicciones y vacíos tras el cambio de arquitectura (sin Edge), incorporar las decisiones del cliente del 2026-08-23, y dejar explícito el conflicto de hospedaje.

---

## 2. Contradicciones encontradas y resolución

| # | Contradicción | Resolución |
|---|---|---|
| C1 | Docs 03/05/07/00 describían **Edge por sucursal** y “dos modalidades obligatorias” | **Arquitectura vigente:** Core central + PWA/cliente. Edge descartado. Doc 03 reescrito; doc 07 marcado con revisión; índice actualizado |
| C2 | ADR-007 decía que el Core puede caer porque la **sucursal** absorbe; sin Edge eso solo vale por dispositivo | ADR-007 reformulado: continuidad en el **dispositivo**; degradación compartida aceptada por contrato |
| C3 | Cliente aceptó **despliegue escalonado** y eligió **hosting compartido** | No son compatibles. Shared = demos/ventas; escalonado = instancia dedicada. ADR-022 + §4 de este doc |
| C4 | App de dirección: agregados + **módulo en app principal** (no bundle aparte) | ADR-013 reformulado 2026-08-23 |
| C5 | Cobro/farmacia offline estaban “abiertos”; cliente los **permitió** | ADR-019; pendiente separado: estupefacientes/psicotrópicos |
| C6 | Doc 05 aún habla de “modalidad sin servidor / con Edge” en suites SS-* | Se reinterpretan como suite de **dispositivo** (sigue válida); renombrar referencias a Edge como históricas en próxima pasada de 05 |
| C7 | Índice aún lista modalidades Edge | Actualizado en esta pasada |

---

## 3. Conflicto de hospedaje (análisis)

Proveedor referido por el cliente como “SmartASP.NET”; el proveedor comercial verificado es **SmarterASP.NET** (2026-08-23). Conviene unificar el nombre en contratos.

### 3.1 Qué no es fiable en shared hosting

| Capacidad del diseño | Shared | Nota |
|---|---|---|
| Despliegue escalonado (≥2 instancias) | No | Un site entry / un app pool típico |
| Worker durable de outbox | Débil | Sin Windows Service; jobs dependen del proceso web y del reciclado del pool |
| Empuje en vivo (WebSockets) | Parcial | El proveedor indica soporte WebSocket en planes; no equivale a SLA de conexiones largas 24/7 |
| Reciclado / idle timeout | Fuera de control | Arranque en frío incompatible con urgencias si el proceso duerme |
| PITR / backups | Limitado | Backups automáticos cada dos días en shared (RPO ~48 h según material del proveedor); custom backup add-on |
| Residencia en México | **No** | DC publicados: US, EU, Asia, UK, AU — **ninguno en México** (verificado en sitio del proveedor 2026-08-23) |
| Control del entorno (SGSI / NOM-024) | Escaso | El responsable no opera el hipervisor ni políticas de vecinos |
| Encargo LFPDPPP | Por contrato | Shared típico no ofrece DPA clínico a medida; requiere revisión legal |

### 3.2 Costos de referencia (sitio del proveedor, 2026-08-23)

- Shared .NET: del orden de **USD 3–8 / mes** según plan.
- VPS Windows “SSD 1 Plus”: **USD 99.95 / mes** (4 cores, 8 GB RAM) — orden de magnitud del salto a control.

El salto no es “nube enterprise”; es **control del proceso**.

### 3.3 Postura acordada con el cliente

> Shared sirve para **desarrollo, demos y ventas** mientras se acondiciona lo necesario.

**Punto de corte verificable:** antes de dar de alta el **primer paciente real**, la carga de trabajo de producción debe estar en entorno controlado (VPS dedicado u equivalente con worker, backups definidos y despliegue sin cortar el servicio).

### 3.4 Salvaguardas del ambiente de ventas

1. Solo datos **sintéticos** (nunca PHI real ni “anonimizado”).
2. Banner persistente “Demostración”.
3. Feature flags CFDI / DGIS / FHIR / RENAPO **off**.
4. Reinicio a estado conocido entre demos.
5. Regla dura: **paciente real = migración**.

---

## 4. Vacíos que permanecen

| Vacío | Origen | Acción |
|---|---|---|
| Docs de entrada truncados | Consideraciones + reglas .docx | No cerrar reglas; doc 06 |
| Reglamento de Insumos para la Salud | No localizado en Diputados | Obtener vía DOF/COFEPRIS antes de recetas controladas |
| CURP inobtenible en NOM-024 / SINBA | Sin centinela oficial | Consulta formal a DGIS |
| Dictamen firma electrónica vs 5.10 | Pendiente legal | Antes de producción clínica |
| Dictamen IVA servicios médicos | Pendiente fiscal | Antes de Fase caja/CFDI |
| Residencia de datos / transferencia internacional | LFPDPPP + DC fuera de MX | Dictamen legal si se usa proveedor sin DC en México |
| NOM-024 en instalación del cliente | Entorno distinto | No vender como certificado sin verificar |
| Escala de triage (4 vs 5) | Doc 06 | Dirección médica |
| Portal del paciente / hospitalización | Truncados en entrada | Fuera de alcance F1–F4 |

---

## 5. Afirmaciones sin respaldo — política

Cualquier mención residual a “HA”, “Edge absorbe caída del Core” o “multiusuario offline equivalente” en documentos no reescritos debe tratarse como **histórica**. La fuente de verdad es doc 03 (2026-08-23) + este cierre.

---

## 6. Coherencia con mejores prácticas

| Área | Cómo queda en la propuesta |
|---|---|
| Desarrollo | Monolito modular, SPs, idempotencia, outbox, tests E2E como especificación |
| UX escritorio | PWA, teclado, densidad, indicador de sync, sin bloqueos en urgencias |
| W3C / WCAG 2.2 AA | Objetivo de calidad; triage no solo por color; lang correcto |
| Seguridad | httpOnly refresh, registro de dispositivos, minimización de caché, auditoría |
| Pacientes | Identidad progresiva, no fabricar datos, cola de fusión humana |
| Directivos | Solo BI agregados + anti-reidentificación |
| Personal clínico | Continuidad de captura; lectura honesta de antigüedad |

---

## 7. Suite E2E

Proyecto en `tests/e2e` (Playwright). El catálogo SC-01…SC-26 y flujos de consulta completa son la especificación ejecutable. Detalle de qué corre hoy vs skip: README del proyecto.
