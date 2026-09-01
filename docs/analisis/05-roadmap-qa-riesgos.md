# 05 — Roadmap, plan de QA y riesgos

## 1. Nota sobre estimaciones

**No se proponen fechas de calendario.** El tamaño y composición del equipo no fue informado, y sin ese dato una fecha sería inventada. Lo que sí se puede fijar sin suposiciones es el **orden**, las **dependencias** y el **tamaño relativo** de cada fase, además de las **puertas de calidad** que deben cumplirse para pasar de una a otra.

El calendario se cierra al responder las preguntas 12 y 13 del documento 06.

Se usa una unidad relativa: **1 bloque ≈ el esfuerzo de construir el módulo de Triage completo** (backend con SPs, API, frontend integrado, pruebas y documentación). Es una referencia concreta que ambas partes pueden calibrar tras la primera entrega real.

---

## 2. Fases

**Alcance congelado.** Las Fases 1–4 cubren **clínica ambulatoria y urgencias**. Hospitalización, quirófanos y UCI quedan en la Fase 5, fuera del compromiso y como contrato aparte (doc 06, decisión 11). Las fases 0–4 se diseñan para admitir el episodio hospitalario más adelante, pero no lo construyen ni lo estiman.

**Una sola línea de trabajo para las dos modalidades de despliegue.** Cada sucursal se despliega en modalidad **sin servidor** (M0, las estaciones hablan por Internet contra el Core) o **con servidor** (M1–M3, un Edge en la clínica al que hablan las estaciones), y un mismo cliente puede tener sucursales de ambos tipos. La modalidad es un parámetro de despliegue por sucursal (ADR-011), **no una bifurcación del roadmap**: el plan de fases es idéntico para todas y lo que cambia es dónde se despliega el nodo. El detalle de las modalidades está en [`07-modalidades-de-despliegue.md`](07-modalidades-de-despliegue.md) §2; aquí sólo se recogen sus consecuencias sobre orden, puertas de calidad, pruebas y riesgos.

### Fase 0 — Fundación (bloqueante para todo lo demás) · ~6–8 bloques

Nada de esto es visible para el usuario final y todo es irrenunciable. Intentar saltarla es la causa más común de fracaso en este tipo de proyecto.

| Entregable | Detalle |
|---|---|
| ADRs ratificados | Los ADRs del documento 03, firmados por el cliente. **ADR-006 (aprobado) y ADR-007 (rechazado) ya están resueltos** y no vuelven a abrirse aquí. Quedan por ratificar el resto, en particular ADR-001 (Edge), ADR-010 (el Edge cabe en SQL Server Express) y ADR-011 (la modalidad de despliegue es configuración por sucursal). |
| Esqueleto de solución | Clean Architecture por capas (API / Business / DataAccess / Models / Common), DI, `ApiResponse<T>`, `GlobalExceptionHandler`, Serilog enriquecido. |
| Base de datos | Convenciones, `TenantId` en toda tabla de negocio, RCSI, scripts DDL idempotentes versionados, carpeta de SPs, estrategia de migración compatible hacia atrás. |
| Identidad y acceso | Autenticación, JWT access+refresh, MFA, lockout, recuperación de contraseña, roles y permisos dinámicos en BD, `PermissionGate` por endpoint, feature flags Sucursal>Tenant>Global. |
| Aislamiento multi-tenant | Suite de pruebas que verifica que el tenant A no lee ni escribe datos de B, ejecutada en CI en cada commit. Prioridad declarada por el doc 2. |
| Tenant, sucursal y branding | Configuración, generador de paleta con validación de contraste, gestión de assets con `FileId`. |
| Design system endurecido | Correcciones de accesibilidad del doc 02 §3, componentes faltantes del doc 04 §4, Storybook, `strict: true`. |
| Motor de sincronización | ULID, idempotencia, cola de salida, protocolo Edge↔Core, estados de sincronización, resolución por dominio (doc 03 §4). **El componente de mayor riesgo técnico: se construye primero, no al final.** **Su permanencia en Fase 0 se confirma** tras incorporar las dos modalidades obligatorias: construir la capacidad de sincronización antes que los módulos deja la modalidad sin servidor como un **subconjunto sin costo adicional** —consiste en no desplegar el Edge—, mientras que el orden inverso (construir primero sin servidor y añadir el Edge después) obliga a reabrir **todos los módulos ya escritos** para introducir idempotencia, folios locales por sucursal y la doble marca de tiempo `occurred_at`/`recorded_at`. Ésa es la ruta cara, porque la operación offline es una propiedad del modelo de datos y de cada escritura, no una capa que se superpone (ADR-011; doc 07 §1). |
| Empaquetado, instalación y actualización remota del Edge | Instalador desatendido con comprobación previa de requisitos, alta de la sucursal, emisión de credenciales `mTLS`, actualización remota con reversión y reporte de estado del nodo. **No es trabajo posterior de despliegue:** en modalidad con servidor habrá equipos reutilizados aportados por el cliente (M1) y sucursales sin personal técnico en sitio, así que instalar y actualizar tiene que ser una operación remota y desatendida desde el primer día. Incluye el *Worker Service* de .NET que sustituye a SQL Server Agent, ausente en Express (doc 07 §3). |
| Almacenamiento local del navegador (modalidad sin servidor) | Cola de salida durable **por dispositivo** en IndexedDB, solicitud de almacenamiento persistente, medición de cuota con umbral y aviso, detección de desalojo y de vaciado del almacenamiento, y comunicación explícita en la interfaz de que la cola no se comparte entre estaciones. Es lo que hace utilizable la modalidad sin servidor y se construye junto con el motor de sincronización, no después. |
| Auditoría y evidencia | Entidad append-only, cadena de integridad, catálogo de eventos. |
| Catálogo de requisitos regulatorios | La tabla del doc 01 §10, con los requisitos verificados ya cargados. |
| CI/CD y ambientes | Ambientes separados, SAST, análisis de dependencias, presupuestos de performance en CI, canal de publicación del Edge conectado con el empaquetado de la fila anterior. |
| Observabilidad | Métricas por sucursal: retraso de sincronización, tamaño de cola, tasa de error, latencia p95. En modalidad con servidor se añade el tamaño de la base del Edge con alerta por umbral (ADR-010); en modalidad sin servidor, el pendiente y la cuota **por dispositivo**. Sin esto, un Edge desincronizado —o un navegador cuya cola dejó de drenar— es invisible. |

**Puertas de calidad F0.** Comunes a ambas modalidades: pruebas de aislamiento multi-tenant en verde y restauración de respaldo ejecutada y documentada. Además, una puerta específica por modalidad, porque el mecanismo de continuidad no es el mismo:

| Modalidad | Puerta específica |
|---|---|
| **Con servidor** (M1–M3) | Una sucursal simulada opera **24 h con el Core apagado** y sincroniza sin pérdida ni duplicados al reconectar. |
| **Sin servidor** (M0) | Un dispositivo opera **24 h con el Core inalcanzable**, incluyendo cierre del navegador y **reinicio completo del equipo** durante la ventana, y al reconectar sincroniza sin pérdida ni duplicados. Además: el desalojo de cuota y el vaciado del almacenamiento se detectan y se comunican al usuario, sin pérdida silenciosa; y la interfaz declara que la cola es por dispositivo y que **no hay coordinación entre estaciones** mientras el enlace esté caído. |

La segunda puerta no es una variante menor de la primera: en modalidad con servidor lo que se prueba es que **la sucursal** sigue operando; en modalidad sin servidor, sólo que **cada dispositivo** conserva lo suyo. Liberar la primera no acredita la segunda.

---

### Fase 1 — Núcleo clínico ambulatorio · ~10–14 bloques

El ciclo que hace que la clínica pueda atender: **registro → agenda → recepción → triage → consulta → receta → expediente**.

| Módulo | Notas |
|---|---|
| Pacientes e índice maestro (MPI) | Identidad interna, CURP opcional validada, **flujo de paciente no identificado**, cola de identificación, fusión con revisión humana (doc 02 §2.4). |
| Agenda | 11 estados con matriz de transiciones validada en servidor, colisiones, reglas de bloqueo, vistas día/semana/mes/lista/consultorios, reserva offline por consultorio. |
| Sala de espera y monitor de turnos | Tiempo real en LAN; **monitor con token de dispositivo y enmascaramiento configurable** (doc 02 §2.2). |
| Triage | Rangos duros, validaciones cruzadas, IMC calculado, registro inmutable, versión de la regla clínica aplicada. |
| Consulta (SOAP) | Estructura mínima para cierre, CIE-10 codificado, historia clínica, nota de evolución, plantillas. |
| Recetas | Medicamento sólo de catálogo, vía cerrada, folio por sucursal, **alerta de alergia bloqueante antes de prescribir**. |
| Expediente unificado | Línea de tiempo, versionado, addendum, inmutabilidad de lo firmado. |
| Firma y documentos | Firma en servidor sobre hash canónico, sello de tiempo, PDF con capa de texto (ADR-009). |
| PWA y contingencia | Service worker, precache, conjunto clínico de seguridad, niveles N0–N3 con indicadores. |

**Puerta de calidad F1:** los 12 recorridos clínicos críticos pasan en Playwright, en línea y en los niveles N1 y N2; auditoría completa de cada acción; `axe` sin violaciones; presupuestos de performance cumplidos.

---

### Fase 2 — Financiero, farmacia y estudios · ~8–11 bloques

Caja y cortes (invariantes de conciliación del `.docx` como pruebas basadas en propiedades), facturación CFDI 4.0 con **catálogos SAT versionados en BD** (ADR-008) y cola de timbrado, farmacia con inventario y lotes/caducidad, estudios con parámetros y rangos de referencia.

**Dependencia externa crítica:** selección y contratación del PAC. Es un camino crítico que debe iniciarse en la Fase 0, no aquí.
**Dependencia legal:** resolución de la pregunta de IVA (doc 01 §7) **antes** de programar la regla fiscal.

**Puerta de calidad F2:** invariantes de cuadre de caja verificados con pruebas de propiedad; timbrado y cancelación reales en el ambiente de pruebas del PAC; ninguna operación financiera duplicada bajo reintento y partición de red.

---

### Fase 3 — Urgencias, normatividad, seguridad avanzada y app de dirección · ~10–14 bloques (~8–11 previos, más ~2–3 de la app de dirección)

Urgencias con máquina de estados y umbrales por nivel; los 11 submódulos de normatividad **reescritos contra el marco verificado** (LFPDPPP 2025, sin referencias al INAI); motor de retención con retención legal; ARCO con resolución fundada; vigilancia epidemiológica con reglas versionadas y acuse; break-glass; tablero de cumplimiento generado desde el catálogo de requisitos.

#### App de dirección (alcance nuevo)

Consulta y supervisión **multisucursal** para el director desde celular, tablet o laptop: actividad por sucursal, ocupación, tiempos de espera, productividad, caja y estado de cumplimiento. **No es captura clínica**: es sólo lectura y lee del Core.

**Por qué en Fase 3 y no antes:**

- Consume datos que no existen hasta que el núcleo clínico (Fase 1) y el financiero (Fase 2) están construidos. Adelantarla obligaría a diseñar indicadores sobre fuentes inventadas y a rehacerlos después.
- Comparte con el tablero de cumplimiento de esta misma fase el patrón de **lectura agregada multisucursal contra el Core**, de modo que ambos se apoyan en la misma capa de consulta en lugar de construirla dos veces.
- Colocarla en Fase 2 la pondría a competir con el camino crítico del PAC y el timbrado, que no admite desplazamiento.

**Requisitos propios que no pueden omitirse:**

| Requisito | Motivo |
|---|---|
| Antigüedad del dato **visible por sucursal** | La app lee del Core, así que presenta cada sucursal con el rezago de sincronización que ésa tenga en ese momento. Una sucursal operando en N1 puede llevar horas sin consolidar. Aplica la regla de SC-09, pero desglosada por sucursal y no como un único aviso global: un director que compara sucursales necesita saber cuál está viendo al día y cuál no. |
| MFA obligatorio y sin persistencia local de datos clínicos identificables | El acceso ocurre desde dispositivos móviles, con frecuencia personales, fuera de la red de la clínica (doc 03 §7). |
| Exportación e impresión auditadas y limitadas por rol | Misma superficie de fuga que ya cubre R-09. |
| Alcance de datos acotado a agregados de operación | Si la dirección debe poder abrir expediente identificable desde esta app es **decisión abierta**, no un supuesto: cambia el modelo de consentimiento y de auditoría de acceso. |

**Decisión abierta con implicación de performance:** ¿la app de dirección es una **PWA responsiva del mismo código base** o un **bundle aparte**? El mismo código base evita duplicar autenticación, permisos y design system, pero le entrega al director el peso de una aplicación construida para estaciones de trabajo, contra los presupuestos de arranque y de tamaño de bundle de §3, fijados pensando en la PWA clínica instalada en LAN y no en un celular sobre red móvil. Un bundle aparte cumple esos presupuestos con holgura, al costo de mantener dos superficies. Debe resolverse antes de iniciar la fase; queda como pregunta abierta para el documento 06.

**Puerta de calidad F3:** cada requisito del catálogo con un caso de prueba ligado y en verde, o marcado explícitamente como control operativo (no de producto). Para la app de dirección: ninguna pantalla presenta un indicador multisucursal sin declarar la antigüedad del dato de cada sucursal que lo compone.

---

### Fase 4 — Interoperabilidad, conformidad NOM-024 y BI · ~8–12 bloques

Modelo canónico, servicio de terminología, punto de decisión de consentimiento, gateway con **dos adaptadores distintos**: FHIR (estratégico) y **GIIS de la DGIS** (conformidad). Implantación formal del SGSI. Reportes y BI sobre réplica de lectura.

**Punto a resolver antes de esta fase:** la réplica de lectura para BI es infraestructura adicional al nodo único que fija ADR-007, rechazado por el cliente. ¿Se autoriza una réplica de sólo lectura para reportes —que no aporta alta disponibilidad y por tanto no reabre ADR-007—, o el BI se ejecuta contra la misma instancia asumiendo su impacto en la operación? No se asume aquí ninguna de las dos.

**Restricción de calendario ineludible:** el SGSI requiere **6 meses de madurez** desde la conclusión de su implementación antes de poder certificar NOM-024 (doc 01 §3). Por eso el SGSI debe **iniciarse en la Fase 0**, aunque su certificación se coseche en la Fase 4. Si se deja para esta fase, la certificación se retrasa medio año adicional.

---

### Fase 5 — Evolución a hospital · fuera del compromiso, contrato aparte

Hospitalización, censo y camas, quirófanos, UCI, laboratorio propio, imagenología con DICOM/PACS, dietología, banco de sangre. Cada servicio activa su paquete normativo condicional (`mx-health-regulatory-core`).

**Alcance congelado fuera de este compromiso** por decisión del cliente (doc 06, decisión 11): hospitalización, quirófanos y UCI son **contrato aparte**, no una fase con fecha dentro del actual. Lo que sí se hace ahora, sin costo apreciable, es diseñar el modelo de datos para admitir el episodio hospitalario más adelante —el episodio de urgencias ya es un caso particular de episodio—. **No estimable hasta acotar el alcance.**

---

### Transversal y continuo

Accesibilidad, presupuestos de performance, ensayos de recuperación (DR drills), pruebas de penetración antes de producción, revisión trimestral del catálogo regulatorio, capacitación y documentación de usuario.

---

## 3. Presupuestos de performance

Valores **propuestos**, para ratificar. Se miden en CI y su incumplimiento rompe el build: sin esto, el rendimiento se degrada sin que nadie lo note.

| Métrica | Objetivo |
|---|---|
| Arranque en frío de la PWA instalada | < 2.0 s hasta interactivo |
| Arranque en caliente (ya cacheada) | < 800 ms |
| Transición entre rutas | < 150 ms (p95) |
| INP (latencia de interacción) | < 200 ms (p75); objetivo < 100 ms |
| Lectura desde Edge en LAN | < 50 ms (p95) |
| Lectura desde Core | < 300 ms (p95) |
| Lectura offline desde IndexedDB | < 30 ms (p95) |
| Bundle inicial | < 250 KB comprimido |
| Chunk por ruta | < 120 KB comprimido |
| Listado de 10 000 filas | Virtualizado, scroll a 60 fps |
| Retraso de sincronización con Core en línea | < 5 s (p95) |

Nota: los objetivos de arranque **exigen** eliminar las dependencias de CDN del `index.html` actual (Font Awesome, Remix Icon, Google Fonts). Hoy el arranque depende de tres terceros y no funciona sin Internet.

Dos precisiones derivadas del alcance nuevo:

- En **modalidad sin servidor** no existe la lectura desde Edge en LAN: toda lectura no cacheada va contra el Core por Internet, con el presupuesto de < 300 ms (p95) y sujeta al enlace de la sucursal. El objetivo de < 50 ms sólo aplica a sucursales con servidor.
- La **app de dirección** introduce un perfil de uso distinto —red móvil, dispositivo personal—. Si comparte bundle con la aplicación clínica, estos presupuestos deben cumplirse **también sobre red móvil**; si va en bundle aparte, requiere su propio conjunto de presupuestos. La decisión sigue abierta (§2, Fase 3).

---

## 4. Plan de QA

### Pirámide

| Nivel | Alcance |
|---|---|
| **Unitarias** | Validadores clínicos (rangos, cruces PAS/PAD, IMC), máquinas de estado, cálculo y validación de paleta, motor de retención, reglas de vigilancia, cálculo de folios, formateo de documentos. |
| **Integración** | Contrato de cada SP (entradas, salidas, filtrado por `TenantId`), repositorios, transaccionalidad de folios y stock. |
| **Contrato de API** | Un contrato por endpoint, verificado desde el cliente generado. |
| **E2E (Playwright)** | Los 12 recorridos clínicos críticos, en N0, N1 y N2; y, sin Edge desplegado, los recorridos que la modalidad sin servidor admite. |
| **No funcionales** | Performance, accesibilidad, seguridad, resiliencia. |

### Suites especializadas (las que hacen la diferencia en este proyecto)

**1. Aislamiento multi-tenant** — prioridad declarada del doc 2. Para cada endpoint: un tenant no puede leer, escribir, listar, exportar ni inferir por conteo datos de otro. Incluye intentos de manipular `tenantId`/`branchId` en body, query y ruta contra el valor del JWT.

**2. Partición de red y sincronización** — la suite de mayor valor y la más olvidada. Matriz de escenarios:

| Escenario | Resultado esperado |
|---|---|
| Core cae 24 h; sucursal opera; Core vuelve | Cero pérdidas, cero duplicados, orden clínico preservado |
| Entrega duplicada del mismo lote | Idempotencia: un solo registro |
| Entrega fuera de orden | Convergencia al mismo estado final |
| Dos sucursales crean el mismo paciente offline | Ambos se preservan; entran a cola de fusión; nunca fusión automática |
| Desfase de reloj de +/- 10 min en una estación | El Edge sella con su reloj; se registra el desfase; el orden no se altera |
| Edge cae a media firma | La firma no queda parcial: o el documento está firmado o sigue en borrador |
| Corte de caja iniciado offline y Core vuelve a media operación | El corte es atómico; no se puede reabrir |
| Sucursal con dos versiones de esquema (Core actualizado, Edge no) | El Edge sigue operando y sincronizando |
| Disco lleno en el Edge | Degradación controlada con alerta, nunca pérdida silenciosa |
| Reloj del sistema hacia atrás | La cadena de integridad detecta la anomalía |

**3. Seguridad clínica** — casos que **jamás** pueden liberarse en rojo. Se marcan como bloqueantes absolutos, por encima de cualquier fecha:

| # | Caso |
|---|---|
| SC-01 | Las alergias y alertas del paciente se presentan de forma inequívoca **antes** de emitir una receta |
| SC-02 | Prescribir un medicamento al que el paciente es alérgico exige confirmación explícita con justificación registrada |
| SC-03 | No se puede **cerrar** un episodio de urgencias sin clasificación de triage. Y en sentido inverso: el sistema **no asigna un nivel por omisión**. El `.docx` fija amarillo automático; se verifica que eso **no** ocurre y que en su lugar el episodio queda en estado explícito "sin clasificar", ordenado con prioridad alta hasta clasificarse (doc 03 §11.3). Bloquear el cierre es legítimo; bloquear el inicio no lo es |
| SC-04 | El alta con recetas pendientes está bloqueada; forzarla exige motivo y genera evento de excepción |
| SC-05 | La cabecera de identidad del paciente es visible en todo momento durante la atención |
| SC-06 | Un documento firmado no puede modificarse por ninguna vía de la API |
| SC-07 | La cola de urgencias ordena por nivel, luego estado, luego hora de llegada, incluso offline |
| SC-08 | Los signos vitales fuera de rango crítico se destacan y **nunca** se guardan silenciosamente como normales |
| SC-09 | En modo contingencia, ninguna pantalla presenta datos obsoletos sin indicar su antigüedad |
| SC-10 | El nivel de triage es distinguible sin percepción de color (texto + icono) |
| SC-11 | Los datos capturados offline nunca se pierden al cerrar el navegador o reiniciar la estación |
| SC-12 | El sistema no permite atribuir una nota a un profesional distinto del autor autenticado |

**3.b Nada bloquea el inicio de la atención** — derivados del criterio rector de [`03-arquitectura-propuesta.md`](03-arquitectura-propuesta.md) §0 y del modelo de [`08-identidad-y-paciente-no-identificado.md`](08-identidad-y-paciente-no-identificado.md). Son **bloqueantes absolutos** al igual que SC-01…SC-12, y están redactados como criterios observables: cada uno se ejecuta y se ve, no se argumenta.

| # | Caso | Criterio observable de aprobación |
|---|---|---|
| SC-13 | Registrar y atender a un paciente inconsciente **sin ningún dato de identidad** y con el **Core caído** | Se completa el ingreso, se clasifica triage, se registran signos vitales y se escribe una nota, sin que aparezca ningún campo obligatorio de identidad y sin que el estado del Core se mencione en pantalla como impedimento. Al restablecer el enlace, todo lo capturado llega al Core sin intervención del usuario |
| SC-14 | Clasificar triage **sin ningún dato administrativo** | El triage se guarda con episodio, hora, nivel y autor. Nombre, CURP, domicilio, contacto, aseguradora, forma de pago y firma de consentimiento están ausentes y **ninguno impide guardar** |
| SC-15 | El sexo **no tiene valor por omisión** en la ruta de ingreso | Al abrir el formulario de ingreso, ningún control de sexo aparece preseleccionado. Si nadie lo captura, el valor persistido es `no_determinado`, **nunca** `masculino` ni `femenino` |
| SC-16 | La edad desconocida no obliga a inventar un número | Se puede guardar con edad ausente, o con edad estimada y su rango en la unidad correcta (años, meses o días). Todo valor estimado se presenta marcado como estimado en cualquier pantalla donde influya en una decisión clínica |
| SC-17 | **Dos o más pacientes no identificados simultáneos nunca se confunden** | Con al menos tres no identificados abiertos a la vez, las etiquetas son fonéticamente distinguibles entre sí, ninguna usa un color de triage, y toda pantalla que las muestre incluye el descriptor discriminante. Antes de un acto de riesgo se exige confirmación explícita de correspondencia con el brazalete |
| SC-18 | **Nunca hay fusión automática de identidades** | Ningún flujo, en línea o fuera de línea, produce una fusión sin revisión humana registrada. Se intenta provocarla con dos sujetos de datos casi idénticos y el resultado es una propuesta en cola, no una fusión |
| SC-19 | Ningún fallo de red, de Core, de validación diferida o de sincronización produce un bloqueo en la ruta de ingreso | Se inyectan por separado: pérdida de red, Core con error 500, latencia extrema, token expirado a media captura y rechazo diferido de una escritura. En los cinco casos la captura continúa, no aparece diálogo modal que obligue a esperar, y el pendiente queda visible en el indicador pasivo |
| SC-20 | Un **catálogo faltante** no impide avanzar | Con un catálogo no sincronizado, el campo acepta captura libre, queda marcado como pendiente de normalizar y genera tarea de reconciliación. En ningún caso se presenta un desplegable vacío que impida continuar |
| SC-21 | La identidad asignada después **no altera ni contradice** lo ya registrado | Tras vincular el episodio a un paciente del padrón, el contenido, la autoría y las marcas de tiempo de todos los documentos previos son **byte a byte idénticos** a los de antes de la vinculación. La vinculación aparece como evento añadido, no como modificación |
| SC-22 | Una vinculación **equivocada** se corrige sin destruir el expediente | La reversión genera evento compensatorio con justificación y autor, deja el estado en `rectificada`, conserva visible la secuencia completa (vinculado a X, revertido, vinculado a Y), y **emite alerta de seguridad del paciente** a los responsables de los episodios afectados. Ningún registro se borra ni se edita |
| SC-23 | La **búsqueda por descripción** no divulga a quien no acredita interés legítimo | La búsqueda sólo es accesible a roles autorizados y autenticados, devuelve coincidencias al personal y no fichas al solicitante, y **toda** ejecución queda auditada con criterios y resultado, incluidas las que no devuelven nada |
| SC-24 | La **hoja de notificación al Ministerio Público** se genera fuera de línea y no bloquea | Contiene los siete campos del numeral 10.3 de la NOM-004, acepta la identidad provisional en el campo de identificación del paciente, se genera sin conexión, y su ausencia no impide ninguna acción clínica. El sistema **sugiere** la notificación según la circunstancia de ingreso pero **no la determina**: el disparador normativo es la presunción de vinculación con un hecho ilícito, no el tipo de accidente (Reglamento de la LGS en materia de Prestación de Servicios, artículo 19 fracción V; doc 01 §2). Existe además el dato estructurado "se dio aviso al Ministerio Público" |
| SC-25 | Los **valores oficiales de desconocimiento nunca contaminan el modelo clínico** | En el reporte a SINBA de un paciente no identificado se emiten `Desconocido`, `09/09/9999` y `999` conforme al instructivo vigente de la DGIS (doc 01 §3). Y en el modelo del sujeto, la fecha de nacimiento y la edad siguen **ausentes**: se verifica por inspección de la base y de la API que `9999` y `999` **no** están almacenados, y que ningún cálculo de edad, rango de signos vitales o dosis los toma como entrada. Es el caso que separa un requisito de reporte estadístico de un riesgo clínico |
| SC-26 | La **nota de evolución vencida en observación de urgencias se detecta sin conexión** | Con el paciente en área de observación y el enlace caído, el sistema señala el vencimiento del intervalo exigido por el numeral 6.2.2 de la NOM-027-SSA3-2013 —*"por turno o al menos cada 8 horas y cuando existan cambios clínicos y terapéuticos significativos"*—, calculado contra el reloj local reconciliado. El aviso es visible y **no bloqueante** |

**4. Auditoría y trazabilidad** — para cada evento del catálogo: se genera, es inmutable, la cadena de integridad detecta cualquier alteración, y el intento fallido también se registra.

**5. Documentos** — pruebas de archivo de referencia (*golden file*): un documento clínico generado hoy debe ser idéntico al de referencia salvo cambio deliberado y versionado de plantilla. Verificación de firma y hash.

**6. Accesibilidad** — `axe` automatizado en CI + recorrido manual con teclado y NVDA por release.

**7. Migración de datos** — si hay sistema previo (pregunta 10 del doc 06): conteos, integridad referencial, reconciliación y reversibilidad.

**8. Modalidad sin servidor** — casos propios de las sucursales sin Edge, donde el **único** almacenamiento local es el del navegador y la cola de salida es **por dispositivo**, no por sucursal (doc 07 §2). Se numeran `SS-nn`. No sustituyen a SC-01…SC-12 ni a la suite 2, que siguen aplicando: la suite 2 prueba la sucursal como unidad y ésta prueba el dispositivo como unidad.

| # | Caso | Criterio de aceptación |
|---|---|---|
| SS-01 | Al habilitar la modalidad en un dispositivo, la aplicación solicita almacenamiento persistente con `navigator.storage.persist()` | Se registra el resultado. Si se **deniega**, el dispositivo queda marcado como no apto para captura offline prolongada y la interfaz lo advierte **antes** de que el usuario capture, no después de perder algo. |
| SS-02 | Medición periódica de la cuota disponible con `StorageManager.estimate()` | Al rebasar el umbral configurado, aviso persistente y drenado prioritario de la cola. Al acercarse a la saturación, la captura nueva se **bloquea con mensaje explícito** en lugar de aceptar escrituras que puedan perderse. El umbral es configuración, no constante en código. |
| SS-03 | Desalojo del almacenamiento del origen por presión de almacenamiento del navegador, simulado llenando el origen hasta forzarlo | Al siguiente arranque se detecta por reconciliación del contador de pendientes contra el Core; el usuario recibe un aviso que identifica **qué** quedó sin sincronizar; queda evento de auditoría. **Cero pérdidas silenciosas.** |
| SS-04 | Borrado de la caché o de los datos del sitio, por el usuario o por política de TI, con capturas pendientes | La aplicación advierte antes de cualquier acción destructiva **que ella misma ofrezca** (cerrar sesión, cambiar de usuario, limpiar datos) mientras haya cola pendiente. Si el borrado ocurre **fuera** de la aplicación, al reabrir se detecta el vaciado por reconciliación contra el Core y se comunica con la lista de lo no recibido. **Pregunta abierta:** si el área de TI del cliente aplica directivas que borran datos de sitio al cerrar sesión de Windows, la modalidad sin servidor no es viable en esos equipos; debe confirmarse antes de autorizarla. |
| SS-05 | Reloj del dispositivo desviado o manipulado: adelantado, atrasado y modificado a media captura | `recorded_at` lo sella siempre el servidor al recibir; `occurred_at` viaja como lo declaró el dispositivo, junto con el desfase medido contra el reloj del servidor y la procedencia. Un reloj falseado **no** altera el orden clínico ni permite retro-fechar, y la anomalía queda auditada (doc 03 §3 y §4, regla 4). Diferencia con la suite 2: aquí no hay Edge que selle, así que mientras el dispositivo está offline su marca es **provisional** y la interfaz la presenta como tal. |
| SS-06 | Dos o más pestañas del mismo navegador escribiendo sobre la misma cola de salida | Sólo una pestaña drena la cola a la vez, coordinada entre pestañas (doc 03 §6 ya formaliza `BroadcastChannel`). Sin envíos duplicados ni entradas perdidas por escritura concurrente; el contador de pendientes es idéntico en todas las pestañas; cerrar la pestaña que estaba drenando transfiere el rol sin intervención del usuario y sin reenviar lo ya confirmado. |
| SS-07 | Pérdida o robo del dispositivo con datos clínicos en IndexedDB | **IndexedDB no está cifrada por sí misma**, así que la prueba verifica los controles compensatorios, no una protección inexistente: el contenido local está acotado al conjunto clínico de seguridad y a la cola pendiente, se purga al cerrar sesión y por expiración, el refresh token se revoca de forma remota (ADR-006) y el sistema puede **listar qué contenía ese dispositivo**, insumo indispensable para evaluar una vulneración de datos personales sensibles (doc 01 §4). Resultado esperado en un equipo sin cifrado de disco: la modalidad sin servidor **no se autoriza** en ese dispositivo. |
| SS-08 | Dos usuarios de la **misma sucursal** sin servidor, operando con el enlace caído | Cada dispositivo tiene su propia cola y no ve la del otro. La sala de espera compartida, el monitor de turnos y el enlace farmacia↔caja quedan **explícitamente no disponibles**, no degradados en silencio ni mostrando un estado que ya no se actualiza. La interfaz declara la limitación con texto inequívoco antes de que el usuario intente coordinarse, y en ningún punto —interfaz, documentación o material comercial— el sistema promete coordinación compartida en esta modalidad. |
| SS-09 | Cierre del navegador y **reinicio completo del equipo** con capturas pendientes, sin Edge al que delegar | Al reabrir, la cola está íntegra, los borradores se restauran y el drenado se reanuda solo, sin acción del usuario. Se prueba con el equipo apagado por completo, no sólo con la pestaña cerrada. Complementa SC-11, que aplica a todas las modalidades: aquí la durabilidad depende **exclusivamente** del dispositivo. |
| SS-10 | Transición de offline a online con la cola grande, equivalente a la jornada completa del escenario de la puerta de calidad F0 | La cola se drena por lotes reanudables, sin bloquear la interfaz ni agotar memoria; una interrupción a media transferencia no duplica nada, por clave de idempotencia por operación (doc 03 §4, regla 2); reintentos con retroceso exponencial. Al terminar, el conteo en el Core coincide exactamente con el del dispositivo y el pendiente en pantalla llega a cero. |

---

## 5. Matriz de riesgos

| # | Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|---|
| R-01 | La complejidad de sincronización Edge↔Core se subestima y desborda el proyecto | **Alta** | **Alto** | Construirla en Fase 0, no al final. Reducir su superficie con la partición de autoridad de escritura (ADR-002). Suite de partición de red desde el día 1. |
| R-02 | El cliente no acepta el costo de infraestructura por sucursal | Media | Alto | La modalidad es configuración por sucursal (ADR-011): se ofrece la modalidad sin servidor donde el costo del Edge no se justifica, y el Edge sobre equipo aportado por el cliente (M1) cuando ese equipo cumple los controles obligatorios del doc 07 §4, siempre con la degradación documentada y aceptada por contrato. El riesgo de que ambas modalidades se perciban como equivalentes se trata aparte en R-19. |
| R-03 | Deriva normativa (nuevo Reglamento de la LFPDPPP, disposiciones de salud digital, catálogos SAT) | **Alta** | Medio | Catálogo de requisitos con `last_verified_at` y alertas; reglas y catálogos en BD, no en código; revisión trimestral. |
| R-04 | Se promete o se asume "certificación NOM-024" antes de tenerla | Media | Alto | Lenguaje comercial controlado ("diseñado para conformidad… certificable"); SGSI iniciado en Fase 0 por el requisito de 6 meses de madurez. |
| R-05 | Error fiscal por IVA en servicios médicos | Media | Alto | Bloquear la implementación de la regla hasta dictamen del asesor fiscal del cliente. |
| R-06 | Clasificación como software como dispositivo médico si se añade lógica de decisión clínica | Baja hoy, crece con IA | **Alto** | Mantener el alcance documental/administrativo; toda funcionalidad de apoyo a la decisión pasa por revisión legal previa (doc 01 §1). |
| R-07 | Reglas de negocio incompletas (los dos documentos de entrada están truncados) | **Alta** | Medio | Talleres de definición por módulo antes de construir cada uno; nada se asume. |
| R-08 | Alcance abierto entre "clínica" y "hospital completo" | **Alta** | Alto | Congelar el alcance de Fases 1–4 en clínica ambulatoria + urgencias; hospitalización como fase separada con contrato propio. |
| R-09 | Fuga de datos por el monitor de turnos o por exportaciones | Media | **Alto** | Token de dispositivo, enmascaramiento por defecto restrictivo, auditoría y límites de exportación. |
| R-10 | Deuda de accesibilidad acumulada por presión de fechas | Alta | Medio | `axe` bloqueante en CI desde Fase 0; corregir componentes base antes de construir pantallas nuevas. |
| R-11 | Operación del Edge (respaldos, actualizaciones, energía, personal no técnico en la sucursal) | **Alta** | Alto | Actualización automática con reversión, respaldo continuo hacia el Core, monitoreo remoto, UPS obligatorio, manual de contingencia impreso en cada sucursal. Aplica a toda modalidad con servidor (M1–M3); el caso específico del equipo reutilizado que aporta el cliente se detalla en R-20. |
| R-12 | Ransomware en un Edge de sucursal | Baja | **Alto** | Cifrado de disco, mínimo privilegio, segmentación de red, respaldos inmutables en el Core, ensayos de restauración. |
| R-13 | Divergencia de versiones entre Edge y Core durante despliegues | Alta | Medio | Compatibilidad hacia atrás obligatoria en toda migración; matriz de versiones soportadas probada en CI. |
| R-14 | Resistencia del personal clínico al cambio | Media | Alto | Diseño con usuarios reales, atajos de teclado que superen la velocidad del papel, capacitación por rol, despliegue piloto en una sucursal. |
| R-15 | Dependencia de terceros (PAC, proveedor de e.firma, servidor de terminología, SNOMED) | Media | Medio | Adaptadores desacoplados con contrato propio, modo diferido para todos, evaluación temprana de licenciamiento. |
| R-16 | Pérdida silenciosa de datos clínicos en modalidad sin servidor por desalojo de cuota del navegador o por borrado de la caché | Media | **Alto** | Solicitud de almacenamiento persistente al habilitar el dispositivo, y bloqueo de la captura offline prolongada si el navegador la deniega; medición de cuota con umbral configurable, aviso y bloqueo de captura antes de la saturación; reconciliación del pendiente contra el Core en cada arranque para detectar un vaciado ocurrido fuera de la aplicación; drenado prioritario cuando hay enlace; advertencia dentro de la aplicación antes de toda acción destructiva propia. Casos SS-01 a SS-04. |
| R-17 | Fuga de datos clínicos por IndexedDB **no cifrada** en equipo personal, compartido o robado, en modalidad sin servidor | Media | **Alto** | Los datos de salud son **datos personales sensibles** bajo la LFPDPPP vigente desde el 21-03-2025, que mantiene esa clasificación y el deber de medidas de seguridad demostrables (doc 01 §4); y el SGSI que exige la NOM-024 vía GIIS-A004-01-07 (doc 01 §3) debe cubrir explícitamente el dispositivo del usuario final, no sólo el centro de datos. Controles: conjunto local mínimo y acotado, purga al cerrar sesión y por expiración, revocación remota del refresh token (ADR-006), MFA, cifrado de disco del equipo como **condición para autorizar** la modalidad, e inventario de qué contiene cada dispositivo para poder evaluar una vulneración. Caso SS-07. |
| R-18 | Indisponibilidad **total y simultánea** de todas las sucursales sin servidor por caída del Core, que permanece en 1 nodo sin alta disponibilidad de base de datos | **Alta** | **Alto** | **Es el riesgo de mayor severidad de esta matriz y es consecuencia directa de una decisión del cliente:** el rechazo de ADR-007. No admite mitigación técnica dentro de la modalidad sin servidor —un mantenimiento, un reinicio de SQL Server, un despliegue fallido o una falla de disco detienen la atención en toda la red de clínicas a la vez—. Mitigaciones parciales: no ofrecer esta modalidad en sucursales con urgencias y declararlo por contrato (doc 07 §5 y §6), ventanas de mantenimiento fuera de horario de atención, enlace redundante en la sucursal, PITR y ensayos de restauración documentados. Las únicas mitigaciones reales son desplegar Edge en la sucursal o reconsiderar ADR-007, alcanzable en edición Standard con Basic Availability Groups (doc 07 §5). |
| R-19 | La modalidad sin servidor se vende, se contrata o se percibe como equivalente a la modalidad con servidor | **Alta** | **Alto** | Matriz de degradación por modalidad firmada **sucursal por sucursal** como anexo del contrato (doc 07 §2 y §6); la interfaz declara el nivel de degradación alcanzable y qué deja de funcionar sin enlace (caso SS-08); el material comercial no puede afirmar "opera sin conexión" sin calificar la modalidad; prohibición explícita de la modalidad sin servidor en sucursales con urgencias mientras siga rechazado ADR-007. |
| R-20 | Edge sobre PC reutilizado aportado por el cliente (M1): disco único sin redundancia, sin memoria ECC, apagados por uso compartido o acceso físico, reinicios por Windows Update en horario de atención | **Alta** | Medio | Los controles del doc 07 §4 son **condición de autorización**, no recomendación: cifrado de disco, UPS, respaldo local a un segundo medio más envío al Core, sin sesión interactiva ni uso compartido, actualizaciones en ventana controlada, ubicación con llave y alerta por retraso de sincronización. El impacto se acota porque el Edge no es el custodio de la verdad: la pérdida potencial es lo que no alcanzó a salir de la cola. Si el cliente no acepta los controles, M1 no se autoriza. Advertencia: en M1 sin capa PWA reforzada, la caída del Edge deja la sucursal sin sistema hasta restablecerlo; para sucursales que no toleran eso, la modalidad indicada es M3. |
| R-21 | Agotamiento del límite de tamaño de SQL Server Express en el Edge, con fallos de escritura en plena atención | Media | **Alto** | Límite verificado: **10 GB por base de datos en 2022 Express y 50 GB en 2025 Express**, con *buffer pool* de 1,410 MB, el menor de 1 socket o 4 núcleos, **sin SQL Server Agent** y sin Always On (Microsoft Learn, *Editions and supported features of SQL Server 2022*; doc 07 §3). Diseño en consecuencia: ventana de retención local de datos calientes en lugar de copia histórica completa (ADR-010), adjuntos fuera de la base —sólo `FileId`, que el doc 2 ya exigía—, alerta por umbral de ocupación y purga automática ejecutada por el *Worker Service* de .NET, no por SQL Agent, que Express no incluye. Pendiente de decisión: estandarizar 2022 o 2025 Express (doc 07 §7, pregunta 4). |
| R-22 | **Identificación errónea de un paciente no identificado**: vincular el episodio al paciente equivocado, o confundir a dos no identificados simultáneos | Media | **Muy alto** | Es el riesgo clínico propio del modelo de identidad progresiva, y **el daño posible es directo al paciente**: administrar a uno lo que era para otro, o decidir sobre un expediente mezclado. Controles: etiqueta con palabra fonéticamente inconfundible y descriptor discriminante siempre visible (doc 08 §3); brazalete físico obligatorio; confirmación explícita de correspondencia antes de todo acto de riesgo; revisión humana obligatoria con datos en conflicto lado a lado para vincular o fusionar, **sin excepción y sin fusión automática**; reversibilidad por evento compensatorio que **emite alerta de seguridad del paciente** a los responsables de los episodios afectados, no sólo entrada de auditoría (doc 08 §6.2). Casos SC-17, SC-18, SC-21, SC-22. |
| R-23 | **Dato clínico fabricado para satisfacer un formulario**: sexo por omisión, edad inventada, o nivel de triage asignado automáticamente | **Alta** | **Alto** | Ya existe en el prototipo y está verificado: `NuevoIngresoModal.tsx` L41 arranca el sexo en masculino, y el `.docx` fija triage amarillo por omisión (doc 02 §2.5). No bloquea a nadie, y por eso es peligroso: **produce un registro falso en silencio** y la edad y el sexo alimentan rangos de referencia y cálculo de dosis. Controles: ningún control clínico con valor preseleccionado; estado explícito "sin clasificar" en lugar de un nivel de triage por omisión, ordenado con prioridad alta; valores estimados marcados visiblemente como estimados en toda pantalla donde influyan en una decisión clínica; unidad correcta en la edad (años, meses o días). Casos SC-03, SC-15, SC-16. |
| R-24 | **Tratamiento de datos sensibles sin base de licitud o sin finalidad acotada** al registrar señas particulares, o divulgación indebida por la búsqueda por descripción | Media | **Alto** | El artículo 8 de la LFPDPPP vigente prohíbe crear bases de datos con datos sensibles sin finalidad legítima, concreta y acorde, y la habilitación del artículo 9 fracción VI opera **sólo mientras** el titular no pueda consentir (doc 01 §4, verificado). Ciertos rasgos revelan categorías sensibles: un tatuaje puede revelar convicciones religiosas u origen étnico. Controles: finalidad declarada y acotada a identificar; minimización real en la interfaz, que no debe invitar a llenar una ficha antropométrica; acceso restringido a roles sujetos a secreto profesional; registro del momento en que **cesa** la base de licitud; búsqueda por descripción que devuelve coincidencias al personal y no fichas al solicitante, íntegramente auditada. **Fotografía de identificación no se implementa sin dictamen legal.** Decisiones abiertas 44, 47, 48 y 52. Caso SC-23. |
