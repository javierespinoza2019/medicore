# MediCore — Análisis y Propuesta Técnica

Fecha de elaboración: **2026-08-21** · Última consolidación: **2026-08-23**
Estado: **propuesta para decisión de arranque** — ver docs 10 y 11

## Alcance de este análisis

Este conjunto de documentos es el resultado de cruzar cuatro fuentes:

1. El paquete de conocimiento regulatorio `docs/claude-mx-health-expert` (memoria, taxonomía, política de fuentes, modelo de control y 8 skills especializadas).
2. `docs/1- Consideraciones Iniciales.txt` — documento técnico del MVP MediCore.
3. `docs/2- Arquitectura para Cruzar y comparar.txt` — reglas de arquitectura y seguridad no negociables (.NET + React + SQL Server, monolito modular multi-tenant).
4. `docs/3- Reglas de negocio sistema medicore(NO CONCLUYENTES).docx` — reglas de negocio por módulo.
5. El prototipo UI/UX existente en `docs/frontend` (React 19 + Vite + Tailwind, 39 pantallas, datos mock).
6. Verificación en fuentes oficiales (DOF, Cámara de Diputados, DGIS, SAT, W3C) realizada el **2026-08-21**.

## Documentos

| # | Documento | Contenido |
|---|-----------|-----------|
| 01 | [Marco normativo verificado](01-marco-normativo-verificado.md) | Qué está vigente hoy, con fuente y fecha de verificación. Separa obligación legal de estándar voluntario. Incluye lo que **no** pudo verificarse. |
| 02 | [Auditoría del prototipo frontend](02-auditoria-prototipo-frontend.md) | Inventario factual del diseño existente, qué se conserva, qué se corrige y por qué. |
| 03 | [Arquitectura propuesta](03-arquitectura-propuesta.md) | Topología, estrategia offline por dominio, integridad de datos, seguridad, decisiones (ADR) y desviaciones justificadas respecto al doc 2. |
| 04 | [Design system y white-label](04-design-system-white-label.md) | Configurabilidad por cliente/sucursal, generación de paleta con validación de contraste, tokens clínicos bloqueados, WCAG 2.2 AA. |
| 05 | [Roadmap, QA y riesgos](05-roadmap-qa-riesgos.md) | Fases, presupuestos de performance, plan de pruebas (incluye pruebas de seguridad clínica y de partición de red), matriz de riesgos. |
| 06 | [Decisiones abiertas](06-decisiones-abiertas.md) | Preguntas que **deben** responderse antes de construir. Nada aquí fue asumido. Incluye el registro de las decisiones ya resueltas. |
| 07 | [Modalidades de despliegue](07-modalidades-de-despliegue.md) | **Añadido el 2026-08-22.** Las dos modalidades obligatorias (con servidor local y sin servidor), sus variantes de equipo y controles mínimos, el contrato de degradación por modalidad, el análisis a fondo de las implicaciones de operar sin servidor, y la app de dirección. Sustituye el planteamiento "Opción A/B/C" del doc 03 §2. |
| 08 | [Identidad y paciente no identificado](08-identidad-y-paciente-no-identificado.md) | **Añadido el 2026-08-22.** Modelo de identidad progresiva: separación entre sujeto de atención y episodio, estado de identificación auditable, etiqueta temporal legible generada localmente, estructura de señas particulares, tipado correcto de sexo y edad como dato de seguridad clínica, reconciliación sin reescribir el expediente, y búsqueda por descripción para atender a familiares. Responde a la pregunta de cómo registrar a un paciente como *"Desconocido 1, accidente de auto, tatuaje mano izquierda"*. |
| 09 | [Brechas del modelo de datos](09-brechas-del-modelo-de-datos.md) | Barrido de tipos/formularios: **87 hallazgos**. El modelo no tiene forma de decir "no sé". |
| 10 | [Auditoría de cierre](10-auditoria-de-cierre.md) | **2026-08-23.** Contradicciones resueltas, vacíos, conflicto de hospedaje shared vs diseño. |
| 11 | [Plan de implementación](11-plan-de-implementacion.md) | **2026-08-23.** Fases D→0→1→2→3→4, prioridades, punto de corte paciente real, dependencias externas. |
| 12 | [Propuesta final consolidada](12-propuesta-final.md) | **Fuente de verdad** de producto/arquitectura tras el análisis. Incluye BI en app principal y DGIS/SINBA fijo. |

## Memoria y skills para agentes

| Artefacto | Ubicación |
|---|---|
| Memoria del repo | [`AGENTS.md`](../AGENTS.md), [`CLAUDE.md`](../CLAUDE.md) |
| Reglas Cursor | [`.cursor/rules/`](../.cursor/rules/) |
| Skills de mantenimiento | [`.cursor/skills/`](../.cursor/skills/) (`medicore-maintain`, `medicore-architecture`, `medicore-clinical-safety`, `medicore-regulatory`) |
| Pack regulatorio | [`../claude-mx-health-expert/`](../claude-mx-health-expert/) |

## Decisiones ya ratificadas — consolidado **2026-08-23**

| Decisión | Estado |
|---|---|
| **Topología** | Core central + SPA/PWA. **Sin Edge en clínica.** Navegador e instalación = mismo cliente |
| **Offline** | Escritura siempre a cola local; lectura del servidor con enlace; caché mínima; empuje en vivo |
| **ADR-006** refresh `httpOnly` | Aprobado |
| **Identidad progresiva** | Aprobada (doc 08) |
| **Nada bloquea ingreso a urgencias** | Ratificado |
| **Alcance F1–F4** | Ambulatorio + urgencias; hospital = contrato aparte |
| **Cobro offline** | Permitido (recibo provisional; CFDI diferido) |
| **Farmacia offline** | Permitida (existencia negativa reconciliable). **Estupefacientes/psicotrópicos: pendiente** |
| **Firma offline** | Local + sello al sincronizar; dictamen legal pendiente |
| **Rechazo diferido** | Bandeja por severidad; nunca borrar; protocolo de contacto |
| **Despliegue escalonado API** | Aceptado **en entorno controlado** (no en shared) |
| **Hospedaje** | Shared (SmarterASP) = demos/ventas; **dedicado antes del primer paciente real** |
| **Dispositivos** | Solo registrados cachean clínico + cola |
| **App dirección / BI** | Módulo en la **app principal** con permisos de solo lectura; solo agregados; anti-reidentificación |
| **Infra del cliente** | Prevista; portabilidad desde Fase 0; flags CFDI/FHIR/RENAPO |
| **DGIS / SINBA** | **Capacidad fija del producto** (no feature flag). Sin Internet: outbox; el módulo no se deshabilita |
| **Integraciones externas** | Feature flags por tenant |

Detalle y preguntas aún abiertas: [`06-decisiones-abiertas.md`](06-decisiones-abiertas.md). Plan: [`11-plan-de-implementacion.md`](11-plan-de-implementacion.md).

## Documento de apoyo

- [`3-reglas-de-negocio-extraido.md`](../3-reglas-de-negocio-extraido.md) — texto extraído del `.docx` para poder citarlo y versionarlo.

## Advertencias sobre las fuentes de entrada

Estas observaciones son hechos verificables sobre los archivos entregados, no juicios:

- `docs/1- Consideraciones Iniciales.txt` **está truncado**. Termina a media tabla, en la sección `5.5 Administración y Seguridad`, en la fila `Usuarios /app/administracion/usuarios CRUD`. Falta el resto de administración/seguridad, y las secciones posteriores (reportes, interoperabilidad, portal del paciente, roadmap a hospital) no están en el archivo.
- `docs/3- Reglas de negocio ... (NO CONCLUYENTES).docx` **también está truncado en varios puntos**: la regla de CURP corta en `"dígito ver"`; el catálogo SAT de método de pago corta en `"Default: PUE ("`; la sección `4. Hojas de Egreso (NOM-004 · Art. 6.3.7)` no tiene contenido; y el documento termina a media sección `4.1 Flujo` de Consentimientos Informados. El propio título lo declara no concluyente.
- Por lo anterior, **no se dio por cerrada ninguna regla de negocio**. Las reglas recuperadas se tomaron como insumo, y los huecos se listan en el documento 06 como preguntas, no como supuestos.
