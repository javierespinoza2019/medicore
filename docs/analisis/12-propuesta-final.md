# 12 — Propuesta final consolidada

Fecha: **2026-08-23**  
Estado: **lista para decisión de arranque** — no se implementa el sistema hasta autorización explícita del cliente.

Este documento es la **fuente de verdad** de producto/arquitectura tras el análisis. Donde un documento anterior contradiga este (p. ej. Edge, app BI aparte, DGIS como flag), **prevalece este**.

---

## 1. Premisa

La atención no se detiene. Ante conflicto entre continuidad de la atención y exigencia administrativa, **gana la atención**; lo administrativo se reconcilia después con rastro auditable. La trazabilidad clínica (quién, qué, `occurred_at`, `recorded_at`) no se relaja.

Respaldo normativo (verificado en doc 01): LGS 51 Bis 2, 469; Reglamento de prestación arts. 71–74, 85 — con el alcance real ya declarado (no hay prohibición expresa de pedir documentos; sí hay exposición si el software impide atender).

---

## 2. Producto

| | |
|---|---|
| Alcance F1–F4 | Clínica ambulatoria + urgencias, multi-tenant, multi-sucursal, white-label |
| Forma | SPA + PWA (mismo cliente; instalar = mejor UX) |
| Stack | .NET monolito modular + SQL Server (SPs) + React/TS/Vite/Tailwind |
| UI | Prioridad al prototipo `docs/frontend`; endurecer seguridad y modelo |
| Fuera | Hospital, quirófanos, UCI, portal paciente → contrato aparte |
| Pendiente | Estupefacientes/psicotrópicos → impedir hasta norma + decisión |

---

## 3. Arquitectura

- **Core central.** Sin Edge en clínica.
- Offline: escritura siempre a cola local + idempotencia; lectura del servidor con enlace; caché mínima con antigüedad; empuje en vivo.
- Outbox: efectos externos no bloquean atención.
- Dispositivos registrados para cola/caché clínica.
- On-prem del cliente: mismo artefacto, sin sync del expediente al centro.
- **Sin mocks** en demo/staging/prod: datos sintéticos solo vía API/BD reales.

**Degradación:** con enlace = completo; sin enlace = captura (cobro/surtido según reglas) por estación; sin coordinación compartida entre estaciones.

---

## 4. Integraciones

| Capacidad | Tratamiento |
|---|---|
| **DGIS / SINBA** | **Fija.** Siempre en el producto. Sin red → outbox. Demo → destino no productivo. |
| CFDI | Feature flag |
| FHIR | Feature flag |
| RENAPO | Feature flag |

---

## 5. BI / dirección

Módulo `features/bi` **en la app principal** (no app aparte).

- Permisos de solo lectura; API GET de agregados.
- Solo indicadores agregados; supresión de celdas pequeñas.
- Sin abrir expediente desde el KPI.
- Sin cola/caché clínica del tablero.
- Lazy load; auditoría de acceso.

---

## 6. Decisiones de negocio cerradas

Cobro offline · farmacia offline · firma local+sello · rechazo diferido · BI en app principal · shared = ventas sintéticas · dedicado antes de PHI · dispositivos registrados · identidad progresiva · refresh httpOnly · DGIS/SINBA fijo · sin Edge · sin mocks que tapen integración.

---

## 7. Estructura de repositorio

```
MedicalCore/
├── backend/          # Api, Worker, Business, DataAccess, Models, Common, database/, tests/
├── frontend/         # PWA clínica + módulo bi/ con permisos
├── e2e/              # Playwright (aceptación contra stack real)
├── tools/            # seed-demo, diagnose-export
└── docs/             # análisis + prototipo de referencia
```

---

## 8. Plan por fases

| Fase | Objetivo |
|---|---|
| **0** | Fundación real (.NET+SQL+auth+cola+tenant) + vertical E2E sin mocks + migración a dedicado |
| **D** | Demo ventas sobre stack real + seed sintético; DGIS con destino demo |
| **1** | Núcleo clínico (identidad, triage, urgencias, consulta, receta, expediente, live) |
| **2** | Caja, CFDI, farmacia general, estudios, bandeja rechazos |
| **3** | Privacidad LFPDPPP 2025, SGSI/retención, **módulo BI** |
| **4** | Envío productivo DGIS/SINBA, FHIR opcional, camino NOM-024 |
| **5** | Hospital / instalador on-prem producto → aparte |

Prioridad si el equipo es chico: no fabricar datos → fundación real → dedicado → urgencias/identidad → consulta/receta → caja → farmacia → BI → interop.

---

## 9. Lo que no se promete

1. Multiusuario offline equivalente a servidor en clínica.  
2. 24/7 sin degradación si cae la BD central.  
3. Certificación NOM-024 automática.  
4. CFDI/FHIR/RENAPO sin Internet o con flag off (DGIS/SINBA: el módulo no se apaga; sin red solo se difiere el **envío**).  
5. Estupefacientes.  
6. Demo creíble sin backend real.

---

## 10. Documentación

| Doc | Rol |
|---|---|
| **12 (este)** | Propuesta final canónica |
| 01 | Marco normativo verificado |
| 02 / 09 | Auditoría FE / brechas de modelo |
| 03 | Arquitectura + ADRs |
| 04 | Design system / white-label |
| 08 | Identidad / paciente no identificado |
| 10 / 11 | Cierre y plan detallado |
| 05–07 | Contienen secciones históricas Edge; prevalece este doc + 03 |

---

## 11. Criterio de arranque

- Autorizar **Fase 0** cuando el cliente lo indique.  
- **Demo ventas** solo con vertical real + seed sintético.  
- **Pacientes reales** solo tras dedicado + dictámenes mínimos + SC críticos en verde.
