# 06 — Decisiones abiertas

Instrucción atendida: *"No asumas nada, no inventes nada y pregunta si tienes dudas."*

Este documento contiene todo lo que **no** se dio por resuelto. Nada de esto fue asumido en los documentos 01–05. Cada punto indica qué se bloquea si no se responde.

---

## Decisiones ya ratificadas por el cliente

### Oleada 2026-08-23 (arquitectura final + operación)

| # | Tema | Resolución |
|---|---|---|
| — | **Topología final** | **Sin Edge.** Core central + SPA/PWA. Navegador e instalación = mismo cliente. Doc 03 reescrito. |
| — | **Cobro offline** | **Permitido.** Recibo provisional no fiscal; CFDI diferido; corte por dispositivo en contingencia. |
| — | **Farmacia offline** | **Permitida** (existencia negativa + reconciliación). **Estupefacientes y psicotrópicos: PENDIENTE** (Reglamento de Insumos + alcance). |
| — | **Firma offline** | Local + sello al sincronizar; nota inmutable al firmar; **dictamen legal** vs NOM-004 5.10 pendiente. |
| — | **Rechazo diferido** | Severidad admin/clínico; bandeja con SLA; nunca borrar; protocolo de contacto. |
| — | **Despliegue escalonado** | Aceptado **en entorno controlado**. No aplicable en shared hosting. |
| — | **Hospedaje** | SmarterASP **shared** = demos/ventas (datos sintéticos). **Instancia dedicada antes del primer paciente real.** |
| — | **Dispositivos** | Solo registrados: caché clínica + cola. Otros: solo en línea. Cola no se borra al logout. |
| — | **BI / dirección** | **Módulo en la app principal** (no app aparte). Permisos de solo lectura; solo agregados; sin PHI a nivel paciente; anti-reidentificación; lazy load; sin caché clínica offline del tablero. |
| — | **Infra del cliente** | Prevista; portabilidad Fase 0; flags CFDI/FHIR/RENAPO; deslinde contractual de Internet. |
| — | **DGIS / SINBA** | **Capacidad fija** del producto (no feature flag). Generación siempre; envío vía outbox cuando hay red. Demo: destino no productivo. |

### Oleada 2026-08-22 (histórico; parcialmente superado)

Estas dejan de ser preguntas. Se registran aquí y quedan reflejadas en los ADR del documento 03. **Nota:** la resolución “dos modalidades con/sin Edge” fue **superada** el 2026-08-23 (sin Edge). Se conserva el registro por trazabilidad.

| # | Tema | Resolución |
|---|---|---|
| 1 | Estrategia offline | ~~Dos modalidades Edge~~ → **Superado 2026-08-23:** Core + cola en dispositivo. Ver oleada superior. |
| 3 | Desviaciones al doc 2 | **ADR-006 aprobado.** Core sin HA de diseño; continuidad en dispositivo. |
| — | **Ventana de mantenimiento** | **No existe** (urgencias 24/7). Mitigación: despliegue escalonado en entorno dedicado. |
| — | **Transición online/offline** | Imperceptible al escribir (ADR-014); explícita al leer (SC-09). |
| — | **Nada bloquea el inicio de la atención** | Ratificado (ADR-015). |
| 5 | Identidad del paciente | Modelo doc 08 aceptado. |
| 11 | Alcance clínica vs. hospital | Congelado ambulatorio + urgencias. |
| — | **App de dirección** | Actualizado 2026-08-23: **módulo BI en app principal** (no bundle aparte). |

---

## A. Bloqueantes — no se puede empezar a construir sin esto

### 1. Modalidad de despliegue por sucursal — **RESUELTA en lo esencial**
Ambas modalidades son obligatorias y la modalidad es configuración por sucursal. Lo que queda abierto no es *si* se soportan, sino cómo se parametrizan. Esas preguntas están agrupadas en la nueva sección **E** de este documento y desarrolladas en el doc 07 §9.

**Sigue bloqueando el presupuesto y el dimensionamiento:** ¿cuántas sucursales y cuántas estaciones por sucursal en el primer año, y **cuáles tienen urgencias**? Esto último determina qué modalidad es obligatoria en cada sucursal, porque mientras el Core siga en 1 nodo sin HA la modalidad sin servidor no debe ofrecerse donde hay urgencias (doc 07 §6).

### 2. Hospedaje y residencia de datos
- ¿Nube pública (Azure / AWS / GCP), datacenter propio o híbrido?
- ¿Existe requisito o preferencia de que los datos residan en México?
- ¿El cliente tiene ya un proveedor o contrato vigente?

**Bloquea:** diseño de HA/DR, cifrado, gestión de llaves, costos.

### 3. Desviaciones al documento de arquitectura — **RESUELTA**
- **ADR-006 (refresh token en cookie `httpOnly`): aprobado.**
- **Redundancia del Core: no se hace.** El Core permanece en 1 nodo conforme al doc 2. En este punto **ya no hay desviación** que aprobar.

**Postura registrada:** la continuidad de la atención es responsabilidad de la **sucursal** —servidor local, o caché en el cliente cuando no hay servidor— y el Core se diseña asumiendo que **puede estar caído, reiniciándose o en mantenimiento**. Ver ADR-007 reformulado y doc 07 §5.

**Lo que sigue abierto es la consecuencia por sucursal, no la decisión:** ver pregunta 28 en la sección E.

### 4. Alcance real de la Fase 1
Los dos documentos de entrada **están truncados** (ver documento 00) y el `.docx` se declara "NO CONCLUYENTE".

- ¿Se toman las reglas recuperadas como base y se completan en talleres por módulo?
- ¿Existen versiones completas de esos documentos?
- ¿Hay un módulo que deba salir primero por necesidad del negocio?

**Bloquea:** el alcance de cada fase.

### 5. Identidad del paciente y CURP — **RESUELTA**
Se aprueba el modelo propuesto: **ID interno inmutable + CURP opcional validada + flujo de paciente no identificado + cola de fusión con revisión humana obligatoria**. La validación de CURP es **estructural con dígito verificador**, sin consulta en línea a RENAPO.

Queda así levantado el bloqueo que la regla del `.docx` (CURP obligatoria y única) imponía sobre el registro de pacientes inconscientes, recién nacidos y extranjeros en urgencias.

**Consecuencia para el diseño:** la unicidad de CURP se implementa como índice único **filtrado** (aplica sólo cuando hay CURP), no como restricción `NOT NULL UNIQUE`. La detección de duplicados se apoya en coincidencia probabilística sobre nombre, fecha de nacimiento y sexo, y **nunca fusiona de forma automática**.

---

## B. Legales y fiscales — requieren dictamen del cliente, no decisión técnica

### 6. Telesalud y artículo 71 Septies de la LGS
La reforma del 15-01-2026 redacta el art. 71 Septies en términos generales, a diferencia de 71 Quater y 71 Quinquies, que sí acotan al sector público (doc 01 §1).

- ¿MediCore ofrecerá telemedicina/teleconsulta?
- Si sí: ¿el área legal del cliente confirma si 71 Septies alcanza a prestadores privados?

**Recomendación:** construirlo como si aplicara. El costo incremental es bajo y el riesgo de no hacerlo es alto.

### 7. IVA en servicios médicos
El `.docx` calcula IVA al 16% con uso de CFDI D01 por defecto. El tratamiento del IVA en servicios médicos prestados por profesionales titulados tiene reglas específicas.

- ¿Qué determina el asesor fiscal del cliente, por tipo de servicio?
- ¿Hay servicios del catálogo que sí causen IVA (por ejemplo, venta de medicamentos o insumos, o estudios)?

**Bloquea:** la Fase 2. Programar esto mal tiene consecuencia fiscal directa.

### 8. Software como dispositivo médico
Una fuente secundaria afirmó que la reforma de 2026 somete al software médico a tecnovigilancia; **no se encontró sustento en el texto del decreto** (doc 01 §1).

- ¿Se prevé incorporar apoyo a la decisión clínica, cálculo de dosis, interpretación de resultados o IA diagnóstica?
- Si sí, ¿el área legal evaluará la posible clasificación como SaMD ante COFEPRIS?

**Recomendación:** mantener el alcance documental/administrativo mientras no haya dictamen.

### 9. Firma electrónica
- ¿Se requiere e.firma/FIEL del SAT con validez jurídica plena, o basta una firma electrónica simple con cadena de integridad y sello de tiempo?
- ¿Se requiere constancia de conservación conforme a NOM-151-SCFI-2016 (estado no verificado, ver doc 01 §8)?
- ¿Los médicos disponen de e.firma vigente?

**Impacto:** modelo de firma, costo de PSC, complejidad de la estación (lector de tarjeta).

### 10. Responsable sanitario y perfil del establecimiento
El paquete normativo aplicable depende del tipo de establecimiento y de los servicios activos (`mx-health-regulatory-core`).

- ¿Qué tipo de establecimiento es cada sucursal (consultorio general, consulta especializada, hospital)?
- ¿Qué servicios están activos hoy: laboratorio propio, imagenología/rayos X, urgencias, cirugía ambulatoria, anestesia, UCI, odontología, transfusión, RPBI?
- ¿Quién es el rol responsable sanitario que aprobará los parámetros clínicos versionados?

**Bloquea:** la matriz de cumplimiento y qué módulos normativos se activan.

---

## C. Producto y operación

### 11. Alcance "clínica" vs "hospital" — **RESUELTA**
Las Fases 1–4 se **congelan en clínica ambulatoria + urgencias**. Hospitalización, quirófanos y UCI quedan como dirección estratégica (Fase 5), **no** como compromiso con fecha.

**Consecuencia favorable:** el modelo de datos se diseña para admitir el episodio hospitalario más adelante (el episodio de urgencias ya es un caso particular de episodio), pero no se construye ni se estima ahora. También acota el paquete normativo aplicable, pendiente de la pregunta 10 sobre el tipo de establecimiento de cada sucursal.

### 12. Equipo y capacidades disponibles
Sin esto no hay calendario.

- ¿Cuántas personas y con qué perfiles (backend .NET/SQL, frontend React, QA, DevOps, DBA, diseño)?
- ¿Existe experiencia previa en sincronización offline y en despliegues distribuidos?
- ¿Quién operará los nodos Edge?

### 13. Fecha objetivo y qué es negociable
- ¿Hay una fecha comprometida con un cliente real o una demo?
- Si la fecha es fija: ¿qué se negocia, el alcance o el número de sucursales del piloto? (Lo que no se negocia son las pruebas de seguridad clínica SC-01 a SC-12.)

### 14. Migración desde un sistema previo
- ¿Existe un sistema actual (papel, Excel, otro software)?
- ¿Hay que migrar historial clínico? ¿Cuántos pacientes y con qué antigüedad?
- ¿Se requiere operación en paralelo durante la transición?

### 15. Internacionalización
El prototipo tiene i18n inicializado pero **vacío**, con `lng: 'en'` y cero llamadas a `useTranslation` (doc 02 §4).

- ¿Se prevé otro idioma o país? (Cambiaría decisiones sobre CURP, CFDI, CIE-10 y todo el módulo normativo.)
- Si no: ¿se retira el andamiaje de i18n, o se deja preparado extrayendo las cadenas?

### 16. Portal del paciente
Hoy es una consulta pública por CURP/expediente, sin autenticación (`src/pages/portal-paciente/page.tsx`).

- ¿El portal es parte del alcance?
- Si sí, requiere autenticación propia del paciente, consentimiento y auditoría de acceso. **Una consulta de expediente por CURP sin autenticación es una fuga de datos sensibles.**

### 17. Interoperabilidad: alcance y prioridad
- ¿Hay una necesidad real de intercambio hoy (aseguradoras, laboratorios externos, otras instituciones), o FHIR es preparación estratégica?
- ¿Se buscará certificación NOM-024 ante la DGIS? ¿En qué horizonte? (Recordar el requisito de 6 meses de madurez del SGSI.)
- ¿El cliente tiene licenciamiento de SNOMED CT? ¿Qué versión de CIE-10 debe usarse?

### 18. Pagos
El documento técnico menciona Stripe/Toss/PayPal como previstos y el prototipo tiene la dependencia de Stripe sin usar.

- ¿Se requiere cobro con tarjeta en línea, o sólo registro del método de pago en caja?
- ¿Qué PAC se usará para el timbrado CFDI?

### 19. Roles y permisos
El `.docx` fija 8 roles como catálogo cerrado; el requisito 5 pide configurabilidad total.

- ¿Se acepta roles dinámicos por tenant, con los 8 actuales como plantilla?
- ¿Un cliente podrá crear roles propios, o sólo ajustar los permisos de los existentes?

### 20. Estaciones con hardware
- ¿Qué hardware hay o habrá: impresoras térmicas, impresoras de etiquetas/brazalete, tabletas de firma, lectores biométricos, lectores de código de barras, básculas, equipos de laboratorio con interfaz?
- ¿Se acepta el shell nativo `MediCore Estación` (Tauri) para esas estaciones, o debe funcionar todo dentro del navegador?

---

## D. Confirmaciones de menor riesgo

21. **Enmascaramiento en el monitor de turnos:** ¿valor por defecto = número de turno únicamente? (Es la opción más segura.)
22. **Retención documental:** ¿se adopta el mínimo de 5 años de NOM-004 numeral 5.4, o el cliente define un plazo mayor por política?
23. **Break-glass:** ¿se habilita el acceso de emergencia con justificación y alerta? (Recomendado: sí. Sin él, el personal comparte credenciales.)
24. **Zona horaria:** ¿todas las sucursales en la misma zona, o hay sucursales en zonas distintas de México?
25. **Navegadores y sistemas soportados:** ¿se puede exigir un navegador moderno basado en Chromium? (Impacta service worker, IndexedDB, OKLCH y las APIs de PWA.)
26. **Idioma del código y la documentación:** el doc 2 fija código en inglés, explicaciones en español y documentación en el código en español. ¿Se confirma?
27. **Presupuestos de performance y RTO/RPO:** ¿se ratifican los valores propuestos en los documentos 03 §4 y 05 §3, o el cliente fija otros?

---

## E. Preguntas nuevas derivadas de las modalidades de despliegue y de la app de dirección

Surgen del análisis de [`07-modalidades-de-despliegue.md`](07-modalidades-de-despliegue.md), donde están desarrolladas con su fundamento. Se listan aquí para mantener este documento como el único índice de pendientes.

### Sobre el Core y el rechazo de ADR-007

28. **¿Se reconsidera ADR-007?** Dato verificado que puede cambiar la evaluación: la alta disponibilidad del Core es alcanzable en **SQL Server Standard** mediante Basic Availability Groups, **sin salto a Enterprise**, porque su limitación de "una sola base de datos por grupo" coincide exactamente con la base única multi-tenant que fija el doc 2. Los ≥2 nodos de API son .NET *stateless*, sin costo de licencia de base de datos. Fuente: Microsoft Learn, verificado 2026-08-22. *(La decisión sigue siendo del cliente; sólo se corrige el dato de costo.)*
29. Si se **mantiene** el rechazo: ¿se acepta por contrato que (a) la modalidad sin servidor **no se ofrezca en sucursales con urgencias**, y (b) exista una ventana de mantenimiento acordada con indisponibilidad simultánea declarada para todas las sucursales sin servidor?

### Sobre la modalidad con servidor

30. ¿Se estandariza **SQL Server 2025 Express** en el Edge para aprovechar el límite de 50 GB por base de datos, o **2022 Express** con 10 GB y una ventana de retención más corta?
31. ¿Cuál es la **ventana de retención local** de datos calientes en el Edge: 3, 6, 12 meses? Determina el dimensionamiento y la frecuencia de purga.
32. Sobre el **PC reutilizado**: ¿cuáles son sus características reales (procesador, memoria, disco, sistema operativo, uso actual)? ¿Se aceptan **todos** los controles obligatorios del doc 07 §3.2 —cifrado de disco, UPS, respaldo automático a segundo medio, sin uso interactivo compartido, actualizaciones en ventana controlada, ubicación con llave, alerta por retraso de sincronización y ensayo de restauración?
33. **¿Quién opera y respalda el Edge en cada sucursal?** ¿Personal de TI del cliente, soporte contratado, o administración remota a cargo del proveedor? Sin respuesta, el riesgo operativo del Edge no tiene dueño.

### Sobre la modalidad sin servidor

34. **Política de caché en equipos compartidos:** ¿se acepta **prohibir** la caché de datos clínicos en equipos de kiosco y compartidos, habilitándola sólo en dispositivos registrados?
35. ¿Se acepta el **cifrado de disco del sistema operativo como requisito** de toda estación que use caché offline? (IndexedDB no está cifrada.)
36. Tensión de diseño sin solución única (doc 07 §4.4): ¿cifrado de la caché **a nivel de aplicación** —más seguro ante robo del equipo, pero incompatible con recargar la aplicación estando offline, que es justo lo que la caché busca permitir— o caché protegida **sólo** por el cifrado de disco?
37. ¿Cuál es el **umbral de cola** que bloquea la captura nueva, por antigüedad y por volumen? Es preferible detener la captura de forma visible a acumular en silencio información que se puede perder.
38. ¿Existe ya **enlace redundante** en las sucursales, o es un costo nuevo? Se requieren cotizaciones reales: el enlace redundante es costo **recurrente** y el servidor local es costo **único**, por lo que "sin servidor" no es necesariamente más barato.
39. Para folios de documentos clínicos que se imprimen y se entregan: ¿se acepta la política de **bloques pre-asignados por dispositivo con huecos documentados**, dado que la alternativa —folio provisional reconciliado después— cambia el identificador de un documento ya entregado al paciente?

### Sobre la app de dirección

40. **¿El director puede ver datos a nivel de paciente, o sólo indicadores agregados?** — **RESUELTA 2026-08-23:** sólo agregados.
41. ¿App aparte vs módulo en la principal? — **RESUELTA 2026-08-23:** **módulo en la app principal** con permisos (ADR-013 reformulado). Ya no aplica el costo de una segunda aplicación.
42. ¿Qué **indicadores** necesita realmente la dirección? Sin esta lista el alcance del tablero no es estimable.

### Transversal

43. ¿Cuántas sucursales y cuántas estaciones por sucursal en el primer año, y **cuáles tienen urgencias**? Determina qué modalidad es obligatoria en cada una y todo el costo del despliegue.

---

## F. Preguntas nuevas derivadas de la identidad del paciente y del paciente no identificado

Surgen del análisis de [`08-identidad-y-paciente-no-identificado.md`](08-identidad-y-paciente-no-identificado.md), donde están desarrolladas con su fundamento normativo verificado. Ninguna se resolvió por cuenta propia: todas tienen componente legal o de política del cliente.

### Requieren dictamen legal del cliente

44. **Fotografía del paciente para identificación.** ¿Se desea capturarla? Es **dato biométrico y por tanto sensible**, y **no se verificó** una base de licitud específica para este fin en la LFPDPPP vigente. Las fracciones V y VI del artículo 9 habilitan tratar datos *"indispensables"* para la atención médica mientras el titular no pueda consentir (doc 01 §4), pero **si una fotografía facial es "indispensable" para identificar, o si excede la minimización exigida, es un juicio legal y no técnico**. Riesgo si se implementa sin dictamen: tratamiento de dato sensible sin habilitación clara. Riesgo si no se implementa: menor capacidad de identificación posterior. **No se propone como funcionalidad.**
45. **Aviso al Ministerio Público: ¿quién emite el juicio de presunción, y con qué criterio operativo?** Ya **no** es una laguna: la obligación sanitaria está verificada en el **artículo 19 fracción V** del Reglamento de la LGS en materia de Prestación de Servicios de Atención Médica, a cargo del **responsable del establecimiento**, y su disparador es *"lesiones u otros signos que **presumiblemente** se encuentren vinculadas a la comisión de hechos ilícitos"* — no "accidente" ni "lesión" (doc 01 §2, verificado el 2026-08-22). Lo que falta es del cliente: **¿qué rol de su organización emite ese juicio de presunción y con qué criterio documentado?** Sin eso, el sistema puede ofrecer y sugerir la notificación, pero nadie la asume. Queda además sin verificar si existen deberes **adicionales** de denuncia en legislación penal federal o estatal, que no se revisó.
46. **Artículo 81 del Reglamento en establecimiento ambulatorio — la pregunta se estrechó, pero no desapareció.** La verificación del **artículo 51 Bis 2 de la LGS** cambió el panorama: la ley obliga al *"prestador de servicios de salud"* —sin decir hospital— a *"proceder de inmediato para preservar la vida y salud del usuario, **dejando constancia en el expediente clínico**"* cuando no hay quien pueda autorizar, y **no exige el acuerdo de dos médicos** (doc 01 §2, verificado el 2026-08-22). Es decir, **la habilitación para actuar ya no depende de resolver si una clínica ambulatoria es "hospital"**. Lo que sigue abierto es más acotado: ¿el establecimiento debe cumplir además el requisito **reforzado** del artículo 81 del Reglamento —valoración con acuerdo de al menos dos médicos autorizados— por prestar servicio de urgencias, o le basta la constancia del 51 Bis 2? El diseño soporta el requisito más exigente para no quedar corto, pero el criterio debe dictaminarlo el área legal.

### Requieren política del cliente

47. **Conservación de las señas particulares una vez identificado el paciente.** La base de licitud del artículo 9 fracción VI opera *"mientras la persona titular no esté en condiciones de otorgar el consentimiento"*, y la finalidad declarada de las señas es **identificar**. Agotada esa finalidad: ¿se conservan como parte del expediente, se restringe su acceso a roles sujetos a secreto profesional, o se anonimizan mediante el motor de retención? Lo que **no** es admisible es dejarlas indefinidamente visibles para cualquier rol como si fueran expediente clínico ordinario. Se necesita una regla explícita.
48. **Quién puede ejecutar la búsqueda por descripción** para atender a familiares (doc 08 §7): ¿recepción, trabajo social, sólo personal clínico, o un rol específico? ¿Alcance limitado a la sucursal o a toda la organización? Es un flujo con una tensión normativa propia: el numeral **5.6** de la NOM-004 **obliga** a proporcionar información verbal a los familiares, mientras el **5.5.1** condiciona la entrega a terceros a solicitud escrita de quien tiene legitimación — y con un paciente no identificado **no se puede acreditar el parentesco de alguien cuya identidad se desconoce** (doc 08 §7, ambos numerales verificados el 2026-08-22). Se requiere criterio del cliente sobre el procedimiento operativo.
49. **Copia del documento de identidad.** Al verificar la identidad, ¿se conserva copia digital del documento cotejado, o basta registrar tipo, folio y quién cotejó? Conservar la copia amplía la superficie de datos sensibles sin necesidad clínica evidente. La propuesta es **no conservarla**, pero es decisión del cliente.
50. **Estado `no_recuperable`:** ¿qué plazo o criterio operativo lo dispara, y qué rol lo autoriza? Sin una regla, los expedientes de pacientes que nunca se identificaron quedan indefinidamente en las bandejas de pendientes.
51. **Convención de etiquetas temporales.** Se propone **alfabeto fonético** (Alfa, Bravo, Charlie…) por ser inconfundible al pronunciarse, que es donde ocurre la confusión real: "Desconocido 1" y "Desconocido 2" se distinguen en pantalla pero no en un pasillo. ¿Se acepta, o el cliente tiene convención propia? Queda excluido cualquier esquema basado en colores, porque colisiona con la semántica clínica de triage.
52. **Cese de la base de licitud.** Cuando el paciente recupera capacidad o aparece su representante, cesa el supuesto del artículo 9 fracción VI y vuelve a aplicar el consentimiento expreso y por escrito del artículo 8. ¿Cuál es el procedimiento operativo para recabarlo en ese momento y quién es responsable de ejecutarlo?

### Requieren consulta a la autoridad, no sólo decisión interna

53. **CURP de un paciente que nunca se identifica: hay que preguntarle a la DGIS.** Es la **única laguna normativa dura** que dejó esta verificación. La NOM-024 marca la CURP como requerida sin valor sustituto y su numeral **6.5.1** establece que *"los SIRES no deben autogenerar la CURP"*; el instructivo vigente de la DGIS prescribe valores de desconocimiento para nombre (`Desconocido`), fecha de nacimiento (`09/09/9999`) y edad (`999`), **pero no para la CURP** (doc 01 §3, verificado el 2026-08-22). Consecuencia: **un paciente no identificado no tiene representación prevista para el intercambio de información bajo NOM-024, y está prohibido inventarle una clave.** Se propone **consulta formal a la DGIS antes de construir el módulo de intercambio**, porque determina si esos episodios son reportables. No se resuelve por analogía con los otros rellenos, y no se debe implementar un valor inventado.
54. **Campo `sexo` en el reporte cuando no es determinable.** El numeral 5.9 de la NOM-004 lo exige en toda nota médica y no se localizó instrucción oficial de desconocimiento para ese campo. Internamente se conserva `no_determinado`; qué se emite hacia el reporte debe confirmarse en la misma consulta que el punto 53.
55. **NOM-046-SSA2-2005.** El instructivo de Lesiones de la DGIS la invoca como criterio para decidir el aviso al Ministerio Público, pero su ámbito declarado es violencia familiar, sexual y contra las mujeres, que **probablemente no cubre un accidente vial** (doc 01 §8). Requiere verificación antes de usarla como criterio.

---

## G. Preguntas nuevas derivadas del barrido del modelo de datos

Surgen de [`09-brechas-del-modelo-de-datos.md`](09-brechas-del-modelo-de-datos.md), donde cada una está desarrollada con el hallazgo que la origina, su evidencia en el código y el tipo propuesto. Ninguna se resolvió por cuenta propia: todas tienen componente clínico, legal o de producto. Cuando existe una recomendación técnica se conserva, y se declara como tal — es una recomendación, no una decisión tomada.

### Requieren criterio clínico o de dirección médica

56. **Qué se hace con los expedientes existentes cuyos antecedentes fueron prellenados.** La función que crea la historia clínica inicializa los antecedentes en `negado` y **todos** los aparatos y sistemas en `normal` (BM-PAC-14). Al corregir el tipo, los registros ya creados con esos valores son **indistinguibles** de los asentados por un clínico. ¿Se migran todos a `no_interrogado`, aceptando que se pierde información realmente asentada; se migran sólo los que nunca fueron editados; o se marcan todos como *"origen: prellenado por el sistema"* y se deja que el clínico los confirme en el siguiente contacto? **Recomendación técnica:** la tercera, por ser la única que no destruye ni afirma. Requiere criterio clínico del cliente.
57. **Cuántos signos vitales se exigen para poder guardar un triage.** Hoy nueve son obligatorios y no nulos, de modo que el triage del paciente en reanimación no se puede guardar (BM-URG-02). La propuesta es que el triage **siempre** se pueda guardar, exigiendo respuesta explícita por signo y no valor. ¿Hay algún signo vital cuya ausencia deba impedir el guardado, o basta la razón de no medición en todos? **Recomendación técnica:** ninguno debe impedirlo, y un triage con los nueve en `no_medido` y razón *"paciente en reanimación"* debe ser un registro válido y visible. Requiere criterio de enfermería y dirección médica.
58. **Qué se hace cuando se prescribe sin haber interrogado alergias.** La propuesta es que el sistema exija que el estado alérgico no sea `no_interrogado` para emitir una receta, con posibilidad de continuar declarando justificación (BM-FAR-05). ¿Bloqueo duro, bloqueo con justificación registrada, o advertencia sin bloqueo? **Recomendación técnica: bloqueo con justificación registrada.** El bloqueo duro por alergias no interrogadas reproduciría en urgencias exactamente el daño del campo obligatorio del caso del paciente no identificado: obliga a fabricar el dato o a no documentar. Requiere decisión de dirección médica.
59. **Unidad canónica de almacenamiento de peso y talla.** La propuesta lleva unidad explícita en el tipo de toda medición (BM-TRA-09, BM-URG-11). ¿Se almacena en la unidad capturada, conservando el dato original, o se normaliza a una unidad canónica al guardar? **Recomendación técnica:** almacenar lo capturado con su unidad y convertir al calcular, porque normalizar al guardar pierde la información de cómo se midió y reintroduce el error de conversión en el punto de escritura. Requiere validación clínica.

### Requieren dictamen legal o consulta a la autoridad

60. **Equivalencia del libro de control de farmacia electrónico con el libro físico.** El artículo 226 fracciones II y III de la LGS exige registro en libros de control y retención física de la receta (doc 01 §11; BM-FAR-07). Si el sistema produce el libro de control electrónico, ¿sustituye al físico o lo complementa? Depende del **Reglamento de Insumos para la Salud, no verificado** (doc 01 §8). Bloqueante para el alcance del módulo de farmacia. **No se decide por analogía.**
61. **Cuál es el reloj del último acto médico.** El plazo de conservación de cinco años corre desde el **último acto médico** (NOM-004 numeral 5.4), y la implementación actual lo ancla en la última consulta (BM-NOR-10). La propuesta enumera doce tipos de acto médico; se requiere **ratificar la lista**. ¿Una dispensación de farmacia es acto médico para efectos del numeral 5.4? ¿Una cita a la que el paciente no acudió? **Recomendación técnica:** todo acto que genere un documento en el expediente. Requiere criterio legal.
62. **Qué se registra como sexo biológico cuando el paciente declara identidad de género distinta.** La propuesta separa sexo biológico, identidad de género y sexo documental (BM-PAC-03). ¿Qué campo alimenta los rangos de referencia y el cálculo de dosis cuando difieren, y qué campo se imprime en cada documento? **Recomendación técnica:** sexo biológico para lo clínico, nombre de uso e identidad para el trato y la presentación, sexo documental para lo fiscal y los trámites. Requiere validación clínica y legal. Se relaciona con la pregunta 54, sobre el sexo no determinable.
63. **Escala de triage: cuatro colores o cinco niveles con escala declarada.** El prototipo usa cuatro niveles de color que **no corresponden a ninguna escala documentada**, y las escalas de uso internacional son de cinco (BM-URG-05). ¿Se conservan los cuatro colores como escala institucional propia, documentándola como tal, o se adopta una escala de cinco niveles? Bloqueante para el tipo del nivel de triage. El pendiente normativo asociado —si alguna norma mexicana prescribe una escala— está registrado en doc 01 §8.

### Requieren decisión de producto y de negocio

64. **Si la clínica prescribirá estupefacientes y psicotrópicos.** Hoy no puede: no hay recetario especial ni código de barras (BM-FAR-01). ¿Está en el alcance? Si lo está, se requiere el trámite de recetarios con código de barras ante la autoridad sanitaria (LGS artículo 241, doc 01 §11) y el diseño debe contemplar la administración de esos folios. Si **no** lo está, el sistema debe **impedir** la prescripción de esos medicamentos, no simplemente no soportarla. Decisión de producto con implicación regulatoria.
65. **Alcance del multi-tenant en la primera versión.** La propuesta exige identificador de tenant en toda entidad (BM-TRA-01). ¿La primera versión es realmente multi-tenant, o es una instalación por cliente? La respuesta **no cambia la recomendación** —el campo debe existir desde el inicio, porque agregarlo después obliga a migrar todo— pero sí cambia el alcance del trabajo de aislamiento, autorización y pruebas. Decisión de arquitectura y de negocio.
66. **Qué campos se retiran por minimización.** Se señalan datos posiblemente innecesarios: aseguradora y póliza obligatorias para todo paciente, correo electrónico obligatorio, y la denominación del paciente copiada en catorce entidades (BM-TRA-11, BM-PAC-13). ¿Qué se conserva? **Bloqueada** por la verificación pendiente del principio de minimización en la LFPDPPP de 2025 (doc 01 §8).
67. **Tratamiento fiscal del IVA en servicios médicos — reiteración de la pregunta 7.** No es una decisión nueva: es la **misma** pregunta 7 de la sección B, y se registra aquí porque el barrido del modelo de datos añadió una dependencia que antes no era visible. Los hallazgos BM-CAJ-02 y BM-CAJ-05 no se pueden cerrar sin ella, porque el objeto de impuesto por concepto y la regla de cálculo dependen de esa definición. Ver pregunta 7.

---

## H. Pendientes explícitos post-cierre (2026-08-23)

### 68. Estupefacientes y psicotrópicos — **PENDIENTE EN MEMORIA / ALCANCE**
Pedido explícito del cliente: dejarlo al final. No implementar surtido/prescripción de estupefacientes y psicotrópicos hasta:
1. Obtener y verificar el **Reglamento de Insumos para la Salud** en fuente oficial.
2. Decidir si están en el alcance comercial (pregunta 64).
3. Si **no** están en alcance: el sistema debe **impedir** su prescripción, no omitirlos en silencio.
**Recomendación técnica preliminar (condicionada):** bloquear surtido offline de estas clases por libro de control y recetario especial (LGS 226/241).

### 69. Dictamen firma electrónica local + sello
¿Satisface NOM-004 numeral 5.10?

### 70. Residencia / transferencia internacional de datos
Proveedor tipico sin DC en México. Requerido antes del primer paciente real.

### 71. Región y proveedor definitivo de producción
VPS dedicado u otro; no shared para PHI.

### 72. Supresión de celdas pequeñas en BI
Umbral numérico (p. ej. n&lt;5) a definir con dirección / legal.
