# MediCore — Presentaciones

## Archivos

| Archivo | Audiencia |
|---|---|
| **`MediCore-Presentacion-Comercial.pptx`** | Clientes / negocio (lenguaje no técnico) |
| **`MediCore-Arquitectura-Tecnica.pptx`** | Arquitectos / tech leads |
| `generar-presentacion-ventas.py` | Regenera el deck comercial |
| `generar-presentacion-arquitectura.py` | Regenera el deck técnico |

```bash
python docs/ventas/generar-presentacion-ventas.py
python docs/ventas/generar-presentacion-arquitectura.py
```

---

## Deck comercial

Ver sección siguiente. Fuente de producto: `docs/analisis/12-propuesta-final.md`.

## Deck técnico (arquitectura)

**20 diapositivas.** Fuente: docs `12` + `03` (+ ADRs).

| # | Tema |
|---|---|
| 1 | Portada |
| 2 | Agenda técnica |
| 3 | Premisa clínica → arquitectura |
| 4 | Topología vigente (sin Edge) |
| 5 | Qué se descartó |
| 6 | Stack y capas |
| 7 | Asimetría escritura / lectura |
| 8 | Caché N1–N4 + dispositivos |
| 9 | Dominios de falla F1–F7 |
| 10 | Offline por dominio |
| 11 | Outbox / EDA acotada |
| 12 | Integraciones (DGIS fijo vs flags) |
| 13 | Multi-tenant, SPs, seguridad clínica |
| 14 | BI (ADR-013) |
| 15 | Hospedaje / on-prem |
| 16 | ADRs vigentes |
| 17 | No-promesas |
| 18 | Repo + fases |
| 19 | Checklist de revisión |
| 20 | Resumen |

**Uso sugerido:** 45–60 min con Q&A. No mezclar con el deck comercial en la misma sesión salvo que haya dos audiencias.

## Cómo usarlo (guía rápida de venta)

| Diapositiva | Objetivo | Tip del presentador |
|---|---|---|
| Portada | Marca y tono | Abrir con “atención que no se detiene”. |
| Agenda | Marco de 10 min | No leerla entera; decir “recorrido de producto y decisión”. |
| El reto | Empatía | Preguntar: “¿qué les duele más hoy?” |
| Qué es | Definición | Una frase; no entrar a tecnología. |
| Para quién | Calificar | Si piden hospital/UCI: “es un proyecto aparte”. |
| Promesa | Diferenciador | Urgencias sin papelería bloqueante. |
| Recorrido | Historia | Contar un paciente de punta a punta. |
| Módulos clínicos | Detalle clínico | Enfocarse en paciente no identificado + triage. |
| Caja / farmacia | Operación | Recibo provisional y surtido con corte de red. |
| Sin Internet | Expectativa real | Ser honestos: por estación, no “LAN mágica”. |
| Sucursales / marca | Escalamiento | Nube vs servidor propio. |
| Dirección | Decisor económico | Indicadores sin abrir expediente. |
| Cumplimiento | Confianza | DGIS/SINBA incluido; CFDI cuando lo activen. |
| Cómo se usa | Adopción | Navegador + app instalable. |
| Beneficios | Resumen | Cerrar beneficios antes de modalidades. |
| Modalidades | Opción de compra | Dejar que elijan nube o on-prem. |
| Preguntas | Descubrimiento | Usar como checklist de discovery. |
| Cierre | Call to action | Pedir demo + entrevista operativa. |

## Qué no prometer en viva voz

1. Hospital / quirófano / UCI como parte de este paquete.
2. Continuidad total si cae el servidor central (en nube) o el servidor local (on-prem).
3. Multiusuario offline compartido entre todas las PCs como si hubiera un servidor de piso.
4. Certificación NOM-024 “automática”.
5. Estupefacientes / psicotrópicos (aún fuera de alcance).
6. Que la demo sea creíble sin backend real (cuando exista demo, debe ser stack real + datos sintéticos).

## Personalización antes de la reunión

- Sustituir “¿Conversamos…?” por datos de contacto reales.
- Añadir logo del cliente prospecto solo si hay NDA / reunión formal.
- Si el prospecto es 100 % on-prem, adelantar la diapositiva de modalidades.
