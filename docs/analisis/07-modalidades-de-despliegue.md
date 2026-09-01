# 07 — Modalidades de despliegue y continuidad de la atención

Fecha: **2026-08-22** · Revisado: **2026-08-23**
Estado: **análisis; contiene preguntas abiertas al final**

---

## REVISIÓN 2026-08-23 — El nodo en la sucursal queda descartado

El cliente precisó la necesidad y **corrigió el planteamiento de las modalidades**. Sus palabras:

> *"El usuario entra vía web a `https://www.medicore.com` y puede operar con normalidad toda la operación de su clínica. El usuario puede instalar PWA en su equipo para que la experiencia sea más nativa y con mayor performance. Si el sistema detecta una caída en los servicios de backend y no se puede guardar, debería seguir operando y tener la capacidad de trabajar un caché de datos local para que en cuanto recupere la conexión estos sean enviados; aquí hay que ser muy cuidadosos para que no haya duplicidad en los datos."*

**No hay servidor en la clínica.** No existe el nodo Edge por sucursal. Entrar por navegador e instalar la PWA **no son dos modalidades**: son el mismo cliente, con instalación opcional. La resiliencia vive en el dispositivo, no en la sucursal.

### Qué queda vigente y qué queda superado en este documento

| Sección | Estado |
|---|---|
| §1, §2, §3, §5, §6 (modalidad CON servidor, Edge, asimetría, contrato por modalidad) | **Superadas.** Se conservan sólo como registro de la evaluación. |
| §4 (análisis de la modalidad SIN servidor) | **Vigente y ascendida**: dejó de ser una modalidad y pasó a ser *la* arquitectura. Todo su análisis —cola por dispositivo, folios, caja, datos sensibles en el equipo, cuota y desalojo del navegador, reloj, pestañas— es ahora la realidad del producto. |
| §7 (transparencia de modo) | **Vigente**, incluido su §7.2 sobre el límite estructural: el navegador no ejecuta los Stored Procedures, de ahí el rechazo diferido. |
| §8 (BI / dirección) | **Vigente en sustancia** (solo agregados, en línea, auditado). **Ajuste 2026-08-23:** no es app aparte — es módulo de la app principal con permisos. |
| §9 (asignación por perfil de sucursal) | **Superada.** |

La topología final, la asimetría entre escritura y lectura, los cuatro niveles de caché y el alcance acotado de la arquitectura orientada a eventos están en [`03-arquitectura-propuesta.md`](03-arquitectura-propuesta.md), pendiente de reescritura consolidada.

---

## REVISIÓN 2026-08-23 — Modalidad prevista: infraestructura del propio cliente

Decisión del cliente: **habrá tenants que instalen el sistema en su propia infraestructura**, y debe preverse desde el diseño.

Lo que hacía caro al nodo por sucursal no era ejecutar la aplicación localmente, sino **mantenerla consistente con una copia central**. Una instalación en infraestructura del cliente **sin consolidación central** no tiene ese costo: es el mismo artefacto desplegado en otro lugar. Las decisiones conservadoras del documento de arquitectura de entrada —una sola base, lógica en Stored Procedures, archivos en disco controlado por el servidor con sólo `FileId` en la entidad, sin Redis, sin microservicios— hacen que el sistema sea portable casi por accidente.

Ese tenant además obtiene **mejor experiencia**: con el servidor en su red local baja la latencia y el escenario de backend inalcanzable pasa a ser raro.

### El límite, que es nítido

- **Instalación local sola:** barata. Se soporta.
- **Instalación local + consolidación central del expediente:** es exactamente el problema de sincronización que se acaba de eliminar. **Fuera de alcance.** Si ese tenant necesita visión central de varias unidades, la salida es enviar hacia arriba **sólo indicadores agregados**, nunca replicar el expediente.

### Restricciones de portabilidad, obligatorias desde la Fase 0

Cuestan prácticamente cero si se deciden ahora y son caras de introducir después:

1. **Ninguna dependencia de funciones exclusivas de un proveedor de nube** dentro de los Stored Procedures ni en el camino crítico.
2. **Almacenamiento de archivos detrás de una abstracción** que funcione igual sobre disco local o sobre almacenamiento de objetos.
3. **Mismo artefacto de despliegue** para nube e instalación local: contenedores y migración de esquema por script.
4. **`TenantId` se conserva siempre**, incluso en una instalación de un solo tenant. Sin casos especiales en el código.
5. **Diagnóstico que funcione sin conexión**: registros locales y paquete exportable para soporte.
6. **Política de versiones soportadas** y camino de actualización definido, para evitar la deriva entre instalaciones.

### Capacidades que requieren Internet

**Revisión 2026-08-23 (cliente):** los reportes **DGIS/SINBA no son feature flag** — son **capacidad fija del producto**, siempre presentes. CFDI, FHIR y RENAPO sí permanecen configurables por tenant.

| Capacidad | ¿Flag? | Depende de | Sin Internet / flag off |
|---|---|---|---|
| **DGIS / SINBA** | **No — siempre on** | Red de la autoridad | Se generan y encolan; se envían al recuperar enlace. El módulo no se apaga |
| Timbrado CFDI | Sí | PAC autorizado | Cobro sí; comprobante no (si flag off o sin red) |
| FHIR | Sí | Contraparte externa | Sin intercambio |
| Validación CURP (RENAPO) | Sí | RENAPO | Captura sin validar en línea |

El outbox desacopla el envío del flujo clínico: **ninguna de estas capacidades puede impedir atender**.

**Contrato:**
- No se vende MediCore “sin DGIS/SINBA”.
- En on-prem, el cliente **debe** proveer Internet para el **envío** efectivo a la autoridad; sin Internet los reportes se acumulan en cola.
- Una instalación aislada **no puede** completar el envío a DGIS/SINBA ni facturar electrónicamente; eso no autoriza a quitar el módulo DGIS del producto.

### Deslinde de responsabilidades — cláusulas que el contrato debe cubrir

Estas son las consecuencias no técnicas, que son las que realmente cuestan:

- **Conectividad.** El cliente debe proveer y mantener salida a Internet para el **envío** de reportes DGIS/SINBA (capacidad fija del producto) y, si usa esas integraciones, para CFDI, FHIR o RENAPO. Formulado como ejemplo por el propio cliente respecto de RENAPO; se extiende a DGIS/SINBA como obligación de envío, no como opción de apagar el módulo.
- **Respaldos y recuperación.** Debe decir por escrito de quién es la responsabilidad, y exigir ensayos de restauración documentados. Un respaldo nunca restaurado no es un respaldo.
- **Actualizaciones.** Ventana de versiones soportadas y responsabilidad de aplicar cada actualización.
- **Soporte y diagnóstico.** Sin acceso a los registros el diagnóstico es a ciegas; debe pactarse cómo se entrega el paquete de diagnóstico.
- **Postura legal.** Si el tenant hospeda sus propios datos cambia quién es responsable y quién encargado del tratamiento bajo la LFPDPPP vigente. Cambia el aviso de privacidad y el contrato. **Requiere dictamen legal.**
- **Licenciamiento.** La licencia de SQL Server pasa a ser del cliente. Cambia el modelo comercial.
- **Acceso remoto.** Si la instancia vive dentro de la unidad, para que la app de dirección funcione desde fuera hay que exponerla a Internet o montar VPN, y eso es responsabilidad y riesgo del cliente.
- **Seguridad física y del entorno.** El SGSI que exige la NOM-024 cubre el entorno operativo; en instalación propia ese entorno es del cliente.

### Recomendación

**Diseñar para que sea posible; no convertirlo en producto todavía.** Que la arquitectura lo permita cuesta casi nada. Construir instalador, mecanismo de actualización, proceso de soporte y contratos diferenciados cuesta bastante y no se justifica hasta que haya un cliente que lo pague.

### Pendiente de verificación

**Si la certificación NOM-024 de la instancia en nube cubriría una instalación en infraestructura del cliente.** La certificación se refiere al sistema y a su entorno; un entorno distinto probablemente requiera tratamiento propio. **No se afirma en ningún sentido** hasta verificarlo. No debe ofrecerse comercialmente como certificado antes de resolverlo.

---

## Por qué existe este documento

El punto de partida no es una preferencia de infraestructura. Es una situación clínica, planteada así por el cliente:

> *"Quiero darte ese sentido humano: un paciente en urgencias vive, entonces por eso el énfasis en que esté disponible en ese sentido; por eso el modo offline, para que continúe operando y no haya un tema de '¿está caído el sistema?' y tengamos un paciente en fila de urgencias en espera. Muchas veces un paciente llega inconsciente, y que falle el sistema no debería ser motivo para detener el flujo, incluso si no sabemos su nombre."*

De ahí se sigue el orden del razonamiento, que va del paciente hacia la infraestructura: **la atención no se detiene** → por lo tanto el sistema debe operar sin el centro → por lo tanto hay que decidir, sucursal por sucursal, **dónde vive la capacidad de seguir atendiendo**. Ese último punto es el objeto de este documento.

La operación fuera de línea **no es una característica del producto**: es lo que hay que construir para que la primera afirmación sea verdadera. Y elegir modalidad no es elegir una opción técnica: es decidir cuánta continuidad tendrá cada sucursal. El criterio rector que resuelve las disyuntivas está en [`03-arquitectura-propuesta.md`](03-arquitectura-propuesta.md) §0; la regla de que nada puede bloquear el inicio de la atención, en su §11.

Este documento **sustituye** el planteamiento de `03` §2, que presentaba tres topologías rivales entre las cuales había que elegir una. Dos decisiones del cliente lo dejaron obsoleto:

> **1. Las dos modalidades son obligatorias, no alternativas.** El producto debe soportar ambas, y la modalidad es **configuración por sucursal**: un mismo cliente puede tener sucursales de los dos tipos operando a la vez.
>
> **2. La continuidad de la atención es responsabilidad de la sucursal.** El Core se diseña **asumiendo que puede estar caído, reiniciándose o en mantenimiento**, sin que eso detenga la atención médica.

Se conserva íntegro lo ya establecido en los documentos 01–06: topología Edge + Core, autoridad de escritura repartida por agregado, documentos clínicos append-only, doble marca de tiempo `occurred_at` / `recorded_at`, tokens clínicos de triage bloqueados y WCAG 2.2 AA como objetivo de calidad.

---

## 1. Las dos modalidades

| | **Modalidad CON servidor** (Edge en la clínica) | **Modalidad SIN servidor** (estaciones contra el Core) |
|---|---|---|
| Con quién habla la estación | Con un servidor en la LAN de la clínica | Directo con el Core, por Internet |
| Quién sube al Core | El servidor local, de forma diferida | Cada estación, por su cuenta |
| Dónde se guardan los datos locales | En la base de datos del servidor local | En el navegador de cada estación (IndexedDB) |
| Unidad de la cola de salida | **La sucursal** | **El dispositivo** |
| Autoridad de escritura offline | La sucursal (un solo escritor coordinado) | Cada dispositivo, de forma independiente |
| ¿Quién valida la escritura? | El Edge, con **los mismos Stored Procedures** | Nadie hasta que el Core la recibe (§7.2) |
| Si el Core se reinicia | **No se percibe** | **Se percibe de inmediato** |
| Costo | Desembolso único por sucursal | Enlace redundante, que es **costo recurrente** |

La diferencia decisiva, de la que se derivan casi todas las demás, es la **unidad de la cola**. En modalidad con servidor hay un único escritor por sucursal que coordina a todas las estaciones. En modalidad sin servidor hay tantos escritores independientes como dispositivos, y **ninguno ve la cola de los demás**.

---

## 2. Principio de diseño que hace posible soportar ambas

> **El cliente habla el mismo contrato de API sin saber si al otro lado está un Edge o el Core. Sólo cambian la URL base y la política de caché.**

Este es el requisito que permite una sola base de código para las dos modalidades, y por eso se formaliza como ADR (doc 03, ADR-012). Consecuencias que deben respetarse desde el primer módulo:

- Los mismos Stored Procedures se despliegan en el Edge y en el Core. La lógica de negocio **no se duplica ni se bifurca por modalidad**.
- Ninguna respuesta de la API puede depender de si el emisor es Edge o Core. Nada de campos "sólo en la nube".
- La estación **descubre** su punto de servicio por configuración, no por código compilado. Cambiar una sucursal de modalidad es un cambio de configuración y un despliegue, no una versión distinta del producto.
- Toda operación de escritura es **idempotente por clave de operación** desde el día uno, independientemente de la modalidad.

### El orden de construcción no es indiferente

| Camino | Costo inicial | Costo de cambiar de opinión después |
|---|---|---|
| Construir el motor de sincronización en Fase 0 | Mayor en Fase 0 | **Cero.** La modalidad sin servidor es un subconjunto: la misma cola, el mismo contrato, sólo sin Edge en medio. |
| Construir primero sólo la modalidad sin servidor y añadir el Edge después | Menor al inicio | **Muy alto.** Obliga a reabrir *cada módulo ya escrito* para introducir idempotencia, folios por sucursal, identidad sin coordinación y doble marca de tiempo. |

La operación offline **no es una capa que se superpone**: es una propiedad del modelo de datos y de cada operación de escritura. Un módulo escrito suponiendo que "el servidor central siempre responde y asigna el folio" no se adapta, se reescribe. Por eso el motor de sincronización permanece en Fase 0 (ver [`05-roadmap-qa-riesgos.md`](05-roadmap-qa-riesgos.md)).

---

## 3. Modalidad CON servidor: el Edge en la clínica

Cada sucursal ejecuta **MediCore Edge**: la misma API .NET y una instancia de SQL Server con los mismos Stored Procedures, servida en la LAN. Las estaciones hablan siempre con el Edge. El Core consolida, reporta, interopera y conserva el respaldo de registro.

### 3.1 El marco conceptual que lo sostiene

> **El Edge no es el custodio de la verdad. Es un caché autoritativo con cola de salida.**

Tres consecuencias, que son las que vuelven defendible reutilizar un equipo existente:

1. **Si el Edge muere de forma catastrófica, lo único que se pierde es el delta que aún no había salido de la cola.** Con el enlace en línea, la cola se drena en segundos.
2. Por lo tanto, **el riesgo de usar hardware de consumo es una función del retraso de sincronización**, y ese retraso es una métrica medible con umbral de alerta. El riesgo deja de ser una intuición y se vuelve un indicador operativo.
3. El escenario verdaderamente destructivo exige la **conjunción** de dos fallas: que el enlace esté caído durante horas *y* que el disco del Edge muera en esa misma ventana.

### 3.2 Variante A1 — PC existente reutilizado

El cliente aporta un equipo que ya tiene en la clínica.

**Riesgos que introduce, sin suavizar:** disco único sin redundancia, sin memoria ECC, fuente de alimentación de consumo; equipo físicamente accesible, a menudo en recepción y con frecuencia de uso compartido, por lo que alguien lo apaga; reinicios por Windows Update en horario de atención. Y contiene datos personales sensibles, por lo que la seguridad física es un control exigible, no un detalle.

**Controles mínimos obligatorios para autorizar esta variante.** No son recomendaciones:

| Control | Motivo |
|---|---|
| Cifrado de disco completo (BitLocker) y cifrado en reposo de la base | Datos personales sensibles en un equipo físicamente accesible |
| UPS | El corte eléctrico es la falla más frecuente y corrompe bases de datos |
| Respaldo local automático a un segundo medio, más envío al Core | Un respaldo en el mismo disco no es un respaldo |
| Sin sesión interactiva de usuario ni uso compartido del equipo | Evita apagados y ejecución de software ajeno |
| Actualizaciones del sistema en ventana controlada | Evita reinicios en horario de atención |
| Ubicación con llave y acceso restringido | Control de seguridad física exigible sobre datos sensibles |
| **Alerta por retraso de sincronización** | Es lo que acota la pérdida potencial: si la cola crece, el riesgo crece |
| Ensayo de restauración documentado | Un respaldo nunca restaurado no es un respaldo |

Si el cliente **no** acepta estos controles, la variante A1 no debe autorizarse en esa sucursal. Aportar el equipo reduce el costo del hardware; no reduce las obligaciones sobre datos sensibles.

### 3.3 Variante A2 — Equipo dedicado

Especificado por el proveedor: dos discos en espejo, UPS, gabinete con llave, cifrado de disco, sin uso interactivo, actualizaciones en ventana controlada. Mismos controles del §3.2, con probabilidad de falla sustancialmente menor. Es la variante indicada para sucursales con urgencias.

### 3.4 Restricción de licenciamiento del Edge (dato verificado)

**SQL Server Express — límites por instancia.** Fuente: Microsoft Learn, *Editions and supported features of SQL Server 2022*. Verificado el 2026-08-22.

| Límite | 2022 Express | 2025 Express |
|---|---|---|
| Tamaño máximo por base de datos relacional | **10 GB** | **50 GB** |
| Memoria máxima del *buffer pool* | 1,410 MB | 1,410 MB |
| Capacidad de cómputo | menor de 1 socket o 4 núcleos | menor de 1 socket o 4 núcleos |
| SQL Server Agent | **No incluido** | **No incluido** |

Consecuencias de ingeniería:

- **El Edge puede operar con costo cero de licencia de base de datos.** Es lo que vuelve viable desplegar Edge en muchas sucursales y reutilizar un equipo existente sin cargo adicional.
- **El límite de tamaño se administra por diseño.** El doc 2 ya obliga a guardar los archivos en almacenamiento controlado por el servidor y conservar en la base sólo el `FileId` GUID. Como los adjuntos —que son lo que realmente crece— no viven en la base, el Edge sólo almacena filas. Aun así debe diseñarse con una **ventana de retención local de datos calientes** (pacientes con actividad reciente, agenda próxima, episodios abiertos, cola de salida sin confirmar), **no** como copia histórica completa. El histórico se consulta contra el Core. El tamaño de esa ventana es una pregunta abierta (§10).
- **La ausencia de SQL Server Agent fija una decisión de implementación:** el trabajador de sincronización, la purga de la retención y los respaldos locales se implementan como un *Worker Service* de .NET corriendo como servicio de Windows, no como jobs de SQL. Es además preferible: es el mismo binario que corre en el Core, cubierto por las mismas pruebas.
- **El monitoreo del tamaño de la base es requisito operativo.** Agotar el límite provoca **fallos de escritura**, que en una clínica significa no poder registrar atención. Debe existir alerta por umbral y purga automática.

---

## 4. Modalidad SIN servidor: análisis a fondo

Las estaciones hablan directo con el Core por Internet. La PWA precachea el *app shell* y un conjunto clínico de seguridad en IndexedDB, con una cola de escritura **por navegador**.

Esta modalidad es legítima y necesaria —hay sucursales donde no se justifica un servidor—, pero sus implicaciones son sustancialmente más profundas que "funciona un poco peor sin Internet". Se exponen sin suavizar.

### 4.1 La cola es por dispositivo, no por sucursal

Es la implicación raíz. Dos usuarios de la misma clínica, ambos sin Internet, **no se ven entre sí**. Cada navegador tiene su propia cola y su propia versión de los hechos. Se rompen como flujo compartido:

- **Cola de sala de espera.** Recepción registra la llegada; el consultorio no la ve.
- **Monitor de turnos.** Depende de un estado compartido que no existe.
- **Enlace farmacia ↔ caja.** La dispensación y el cobro dejan de estar acoplados.
- **Coordinación triage ↔ consulta.** El médico no ve la clasificación que enfermería acaba de capturar en otra estación.
- **Búsqueda de un paciente no identificado por descripción.** Un familiar pregunta en recepción por alguien que fue registrado en otra estación, y **no aparece**. Es la misma raíz, con una consecuencia humana propia; ver [`08-identidad-y-paciente-no-identificado.md`](08-identidad-y-paciente-no-identificado.md) §8.

**Regla de diseño que se deriva, y que debe implementarse como restricción explícita:**

> En modalidad sin servidor, estando offline **sólo se permite escribir lo que es append-only o propiedad exclusiva del dispositivo**. Todo lo que tenga estado mutable compartido queda en **sólo lectura**.

Es la aplicación estricta de la autoridad de escritura por agregado (ADR-002) a un contexto donde no hay escritor único por sucursal. Módulo por módulo:

| Módulo | Offline en modalidad SIN servidor | Motivo |
|---|---|---|
| Triage, signos vitales | **Escritura** (append-only, en cola local) | Hecho clínico inmutable; no colisiona |
| Nota clínica, evolución | **Borrador local**; la firma exige estar en línea | Un documento firmado no puede quedar sólo en un navegador |
| Ingreso a urgencias | **Escritura** (append-only) | Hecho clínico; la atención no puede esperar |
| Receta | **Borrador**, sin folio definitivo | Ver §4.2 |
| Alta de paciente | **Escritura con ID provisional** | ID interno + cola de fusión con revisión humana |
| Agenda y citas | **Sólo lectura** | Dos dispositivos sobre-reservarían el mismo consultorio |
| Inventario de farmacia | **Sólo lectura** | Dos dispositivos descontarían el mismo stock físico |
| Caja, cobro, corte | **Sólo lectura** | Ver §4.3 |
| Timbrado CFDI | **No disponible** | Requiere el PAC; ya era imposible offline |
| Catálogos, roles, branding | **Sólo lectura** | El Core es autoridad única |
| Auditoría | **Escritura local encadenada** | Con la salvedad grave del §4.5 |

Compárese con la modalidad con servidor, donde **todos** esos módulos siguen operando en escritura porque el Edge es el escritor único de la sucursal. Esa es la diferencia real entre las dos modalidades, y la razón por la que **no deben venderse como equivalentes**.

### 4.2 Folios y secuencias

Offline, un dispositivo no puede pedirle al Core el siguiente número de una serie. Hay dos caminos y ninguno es gratuito.

**Opción 1 — Bloques de folios pre-asignados por dispositivo.** Cada dispositivo reserva por adelantado un rango mientras está en línea.

- A favor: el folio impreso es **definitivo desde la emisión**. El documento que se entrega al paciente no cambia de identidad después.
- En contra: produce **huecos** en la serie, lo que obliga a documentar la política ante una auditoría; un dispositivo que permanezca offline más de lo previsto **agota su bloque** y deja de poder emitir; y un equipo perdido se lleva un rango que queda inutilizable.

**Opción 2 — Folio provisional reconciliado al sincronizar.** El dispositivo emite un identificador local marcado como provisional y el definitivo se asigna al llegar al Core.

- A favor: sin huecos y sin agotamiento.
- En contra: el documento **ya impreso y entregado** al paciente cambia de identificador después. Inaceptable para un documento clínico entregado, y obliga a reimprimir conservando la trazabilidad del provisional.

**Conclusión, que es un híbrido según la naturaleza del documento:**

- **Documentos clínicos que se imprimen y se entregan** (receta, orden de estudio): **bloques pre-asignados**, porque la identidad de un documento entregado no puede cambiar. NOM-004 numeral 5.11 exige notas sin enmendaduras; un identificador que cambia después es exactamente lo que hay que evitar.
- **Documentos fiscales**: **forzosamente provisionales**, porque el folio fiscal del CFDI lo produce el PAC al timbrar y eso requiere estar en línea. Lo que se emite offline es un **comprobante interno de cobro**, rotulado como no fiscal, con el CFDI en cola de "pendiente de timbrar". No es una limitación de MediCore, es una propiedad del timbrado.

**En modalidad con servidor el problema prácticamente desaparece:** el Edge es escritor único por sucursal, así que emite series por sucursal **sin huecos y definitivas**, sin depender del Core.

### 4.3 Caja y corte de caja

Offline, la sesión de caja sería **por dispositivo**:

- No puede haber un turno compartido por dos estaciones estando offline: cada una tendría su propio acumulado y el arqueo físico no cuadraría contra ninguno por separado.
- Un corte es un cierre sobre un conjunto **completo** de movimientos. Si parte de ellos vive en la cola de otro dispositivo, el corte es **incorrecto, no incompleto**, y eso es peor: produce un número que parece válido.

Por eso caja queda en **sólo lectura** offline en esta modalidad. Si una sucursal necesita cobrar con el enlace caído, **necesita un servidor local**. No es un ajuste de configuración: es la razón por la que existen las dos modalidades.

### 4.4 Datos sensibles residentes en el dispositivo

**Hecho técnico:** IndexedDB **no ofrece cifrado a nivel de aplicación**. Los datos quedan en el perfil del navegador, en disco, legibles por quien tenga acceso al sistema de archivos o al perfil, salvo que exista cifrado de disco del sistema operativo. Poner un conjunto clínico de seguridad en IndexedDB significa, literalmente, **dejar datos de salud en el disco del equipo**.

Marco aplicable (doc 01): la **LFPDPPP vigente (2025)** clasifica los datos de salud como **sensibles**, y la **NOM-024-SSA3-2012** exige un SGSI.

- **Robo o pérdida del equipo.** Es el escenario central. Sin cifrado de disco, el atacante lee el expediente con herramientas comunes. **Cifrado de disco del sistema operativo obligatorio** en toda estación que use caché offline.
- **No existe borrado remoto real.** Una PWA no puede garantizar el borrado en un equipo que no vuelve a conectarse. Cualquier "borrado remoto" es en realidad "borrado en el próximo arranque con conexión", que en un equipo robado nunca ocurre. Debe decirse así y no prometerse otra cosa.
- **Equipos compartidos y personales.** En un equipo compartido, la caché de un usuario queda accesible al siguiente. **La caché de datos clínicos debe estar prohibida por política en equipos de kiosco y compartidos**, y ser una capacidad que se habilita por dispositivo registrado, no por defecto.
- **Minimización.** Se cachea sólo lo necesario para la continuidad clínica: pacientes de la agenda del día y episodios abiertos, no el padrón. Por lista explícita, no por "lo que se haya consultado".
- **TTL y purga.** La caché caduca por tiempo y se purga al cerrar sesión y al cambiar de usuario. Un dato clínico en un dispositivo no debe sobrevivir a la jornada.
- **Bloqueo de sesión** por inactividad con re-autenticación, porque la estación está en un pasillo.
- **Tensión de diseño que debe resolverse explícitamente.** Cifrar los datos locales a nivel de aplicación con una llave derivada de la sesión protege ante robo del disco, pero deja de funcionar en el escenario que justifica la caché: recargar la aplicación estando offline, cuando no hay forma de validar credenciales contra el servidor. Sostener ambas cosas exige una verificación local de credencial, que es una superficie de ataque nueva. **No se resuelve por decreto; es una decisión con contrapartida** (§10).

### 4.5 Cuota del navegador y desalojo: riesgo de pérdida silenciosa

Es el riesgo más subestimado de esta modalidad.

**Hechos técnicos:** el almacenamiento por origen está sujeto a **cuota**; los navegadores pueden **desalojar** los datos de un origen bajo presión de almacenamiento; y **borrar los datos del sitio destruye IndexedDB**, incluida la cola de salida. Los valores exactos de cuota y las heurísticas de desalojo **dependen del navegador y de su versión**, por lo que deben medirse en los navegadores soportados y no darse por conocidos.

Por qué es grave: la cola de salida **es** el registro de la atención capturada offline. Si el navegador la desaloja, o el usuario o el área de TI "limpian el navegador", **se pierde atención médica ya registrada, sin que nadie se dé cuenta**. Y el log de auditoría local se pierde con ella, lo que borra incluso la evidencia de que existió.

Controles exigibles:

- **Solicitar almacenamiento persistente** con `navigator.storage.persist()`, tratándolo como una **solicitud que puede ser denegada**, no como garantía. Si se deniega, la aplicación debe saberlo y avisar.
- **Medir la cuota** con `navigator.storage.estimate()` y alertar al acercarse al límite, igual que se vigila el tamaño de la base en el Edge.
- **Indicador permanente de cola pendiente** (§7.6).
- **Advertencia previa a operaciones destructivas** conocidas, y comunicación explícita al área de TI del cliente de que borrar los datos del sitio destruye información clínica no sincronizada.
- **Umbral de cola que bloquea la captura.** Si la cola supera un límite por tamaño o antigüedad, la aplicación deja de aceptar captura nueva y exige recuperar conexión. Es preferible detener la captura de forma visible a acumular en silencio información que se puede perder. El umbral es un parámetro a decidir (§10).

### 4.6 Reloj del dispositivo

El reloj de una estación puede tener desviación o ser manipulado, y de él sale `occurred_at`, que es la hora del acto médico. Un expediente con horas incorrectas es un expediente defectuoso.

- En cada contacto con el servidor, calcular y almacenar el **desplazamiento** entre la hora del servidor y la del dispositivo, conservando ambas.
- **Contador monótono por dispositivo** que ordene los eventos locales con independencia del reloj, para que reajustar la hora no reordene los hechos. Un evento nuevo nunca puede recibir una marca anterior a la del último evento de ese dispositivo.
- Todo dato capturado offline se marca como **hora no confirmada por servidor** hasta reconciliarse, coherente con el modelo de doble marca de tiempo.

### 4.7 Concurrencia entre pestañas

Varias pestañas del mismo origen comparten la misma IndexedDB. Si dos drenan la cola a la vez, hay envíos duplicados; si dos editan el mismo borrador, se sobreescriben.

Controles: **un solo escritor por origen**, mediante *Web Locks* o elección de líder por `BroadcastChannel`, de modo que sólo una pestaña ejecute el trabajador de sincronización; propagación de estado entre pestañas por el mismo canal; y detección de divergencia en borradores con bloqueo suave. Las transacciones de IndexedDB son atómicas, pero **la atomicidad de la base no impide enviar dos veces**: el drenado debe estar serializado de forma explícita.

### 4.8 Dependencia total de Internet, y por qué "sin servidor" no siempre es más barato

En esta modalidad la disponibilidad percibida por la sucursal es el **producto** de tres: enlace del ISP × plataforma de nube × Core. Las disponibilidades se multiplican, no se promedian, así que el resultado es siempre **menor que el del componente más débil**.

**No se presentan cifras**: los números deben provenir de los SLA realmente contratados y de la operación real del Core. La aritmética que debe hacerse con ellos, cuando existan, es la multiplicación anterior.

**Comparación de costo, que suele plantearse mal:** la mitigación obligatoria aquí es un **enlace redundante** (fibra más respaldo LTE/5G con conmutación automática), que es un **costo recurrente mensual y perpetuo**. Un servidor local es un **desembolso único**, y en la variante A1 el hardware ya está pagado. En un horizonte de varios años la comparación puede invertirse. La conclusión no puede darse por sentada en ninguna dirección: requiere las cotizaciones reales del cliente (§10).

### 4.9 Superficie de conflicto

Con servidor hay **un escritor por sucursal**. Sin servidor hay **tantos escritores como dispositivos**, por lo que la superficie de conflicto crece con el número de estaciones.

Qué se hace con ella: **se elimina por construcción en lugar de resolverse**, aplicando la restricción del §4.1. Al permitir offline únicamente escrituras append-only o de propiedad exclusiva del dispositivo, los conflictos genuinos se reducen a los dos que ya tenían tratamiento definido: identidad del paciente —cola de fusión con revisión humana obligatoria, nunca automática— y edición concurrente de un borrador —bloqueo suave con detección de divergencia. Todo lo demás queda en sólo lectura, precisamente para no crear conflictos que después habría que resolver adivinando.

---

## 5. Continuidad en la sucursal: el Core puede estar caído

Postura ratificada por el cliente, y que reemplaza cualquier planteamiento previo de redundancia central:

> **La continuidad de la atención es responsabilidad de la sucursal.** El Core se diseña **asumiendo que puede estar caído, reiniciándose o en mantenimiento**, sin que eso detenga la atención médica.

El Core permanece con **1 nodo de API**, conforme al doc 2. En este punto **ya no hay desviación** respecto al documento de arquitectura: se respeta tal como está escrito. Lo que cambia es dónde se coloca la resiliencia — en la sucursal, que es donde ocurre la atención, y no en el centro.

**Qué se gana:** se respeta el doc 2 sin excepciones en este punto; no hay costo de infraestructura redundante en el centro; y el Core deja de ser un componente que hay que tratar con cuidado, porque su caída no tiene consecuencia clínica en las sucursales con servidor local.

**Qué se acepta a cambio:** durante una caída del Core se difieren el timbrado CFDI, la interoperabilidad, los reportes multisucursal, la app de dirección y los cambios de configuración central. Ninguno de ellos es atención médica. Y las sucursales **sin** servidor local quedan expuestas, como se detalla enseguida.

### 5.1 La asimetría, que es el argumento técnico más fuerte a favor del servidor local

El cliente confirmó que **no hay ventana de mantenimiento**: la operación es 24/7 real, por urgencias. Ese dato interactúa con el reencuadre de una forma que conviene ver con precisión, porque apunta en direcciones opuestas según la modalidad.

| | **Con servidor local** | **Sin servidor local** |
|---|---|---|
| Reinicio o actualización del Core | **No se percibe.** La sucursal sigue atendiendo y la información se envía cuando el enlace vuelve | **Se percibe de inmediato.** Es la única vía de servicio |
| ¿Se necesita ventana de mantenimiento negociada? | **No.** El Core puede actualizarse o reiniciarse en cualquier momento | **Sí, y no existe.** Cualquier momento es horario de atención |
| Alcance de una caída del Core | Diferimiento de funciones no clínicas | Interrupción del servicio |
| Forma de fallar | Aislada por sucursal | **Simultánea y correlacionada** en todas las sucursales sin servidor |

Las dos lecturas, dichas de forma directa:

- **Para las sucursales con servidor local, el reencuadre convierte la ausencia de ventana de mantenimiento de un problema en un no-problema.** Precisamente porque ninguna de esas sucursales depende del Core para atender, el Core puede actualizarse, reiniciarse o migrarse **en cualquier momento y sin negociar nada con nadie**. Es una ventaja operativa real y considerable: elimina la clase entera de problemas de "cuándo tocamos producción".
- **Para las sucursales sin servidor local, la misma ausencia de ventana es un problema sin salida limpia.** No hay hora del día en que reiniciar el Core sea inocuo, porque no hay hora en que la clínica no atienda. La caída además es **simultánea en todas** esas sucursales, que es la peor forma de fallar en un sistema del que depende la atención médica.

Consecuencias que deben quedar registradas:

1. La modalidad sin servidor **no debe ofrecerse para sucursales con urgencias**. Ahí la continuidad no es negociable y sólo el servidor local la provee.
2. Para las demás sucursales sin servidor, la interrupción por caída o actualización del Core debe quedar **declarada y aceptada explícitamente**, entendiendo que no puede acotarse a una ventana.
3. Las dos modalidades **no deben presentarse como equivalentes**.

*Nota, sin recomendación asociada:* si en el futuro el negocio pidiera reducir la exposición de las sucursales sin servidor, existe la opción de redundancia del Core en edición Standard de SQL Server mediante Basic Availability Groups, cuya limitación de una sola base de datos por grupo coincide con la base única del doc 2 (Microsoft Learn, verificado 2026-08-22). No se propone hoy.

---

## 6. Contrato de degradación por modalidad

Los niveles **no son equivalentes entre modalidades** y por eso se declaran por separado. Es la tabla que debe firmarse con el cliente.

### Modalidad CON servidor

| Nivel | Situación | Qué sigue funcionando |
|---|---|---|
| N0 | Core y Edge en línea | Todo |
| **N1** | **Edge sin Core** | **Toda la operación clínica y de caja de la sucursal.** Se difieren CFDI, interoperabilidad, reportes multisucursal y app de dirección |
| N2 | Estación sin Edge | Lectura del conjunto clínico de seguridad y captura en cola de triage, signos vitales, ingreso a urgencias y borradores |
| N3 | Sin energía | Formatos impresos de contingencia; captura diferida posterior con `occurred_at` ≠ `recorded_at` |

### Modalidad SIN servidor

| Nivel | Situación | Qué sigue funcionando |
|---|---|---|
| N0 | Core en línea | Todo lo que no requiera un servidor local |
| **N1** | **— no existe —** | **No hay nivel intermedio.** Sin servidor local, nada absorbe la caída del enlace ni el reinicio del Core |
| N2 | Estación sin Core | Lectura del conjunto clínico de seguridad y captura en cola **por dispositivo**, con las restricciones del §4.1. Sin caja, sin folios definitivos, sin coordinación entre estaciones |
| N3 | Sin energía | Igual que arriba |

**La conclusión que debe quedar explícita:** en modalidad sin servidor, la primera falla de enlace —que es la más frecuente de todas— lleva directamente al nivel de contingencia más severo antes del corte eléctrico. **No hay escalón intermedio.**

---

## 7. Transparencia de modo: la transición debe ser imperceptible

Requisito de primer nivel planteado por el cliente:

> *"Si la conexión a central está caída debe seguir operando y en cuanto recupere la conexión de enviarse a central, la información debe ser imperceptible para el usuario final; que falle algo para el usuario no debería afectar, es vital esta parte. Por ejemplo en urgencias, que no se pueda guardar en central no debería ser problema, ya que es un asunto literalmente de vida o muerte para el paciente. El sistema debe responder offline y luego subir la información al central. Si hay conexión y puede guardar directo, mejor; si no, entonces en modo offline."*

Esta sección formaliza ese requisito, y también expone honestamente dónde tiene un límite.

### 7.1 Un solo camino de escritura, no dos

La formulación intuitiva —"si hay conexión guarda directo, si no guarda local"— es correcta como *intención*, pero implementada literalmente como una bifurcación por conectividad produce exactamente lo contrario de lo que se busque:

- **Dos comportamientos distintos.** El camino en línea tiene la latencia de la red; el camino local es instantáneo. El usuario percibe la diferencia, que es lo que se quería evitar.
- **Dos conjuntos de errores.** El camino en línea puede fallar con tiempo de espera agotado, error de red o error del servidor; el local no. Cada pantalla tendría que manejar ambos.
- **Dos rutas de código por cada mutación**, es decir el doble de superficie de prueba y la certeza de que una de las dos estará menos probada. En un sistema clínico, la menos probada es la que se usa en la peor circunstancia.
- **Un tercer estado, el peor de todos:** conexión presente pero degradada. Detectar "si hay conexión" no es un booleano fiable; `navigator.onLine` indica que hay una interfaz de red, no que el servidor responda.

**La forma de lograr que sea imperceptible es la contraria:**

> **Toda escritura va primero a una cola local durable, y la sincronización ocurre siempre en segundo plano.** No hay rama por conectividad en el código de los módulos: hay un único camino.

Esto **satisface la intención del cliente sin excepción**, incluido el "si hay conexión, mejor": con enlace disponible la cola se vacía en milisegundos y el dato llega al servidor de inmediato, sin que el camino del código haya cambiado. La diferencia entre estar en línea y no estarlo deja de ser una decisión de la aplicación y se convierte en una **propiedad del tiempo que tarda la cola en vaciarse**. Y ese es precisamente el efecto buscado: con o sin enlace, la pantalla responde igual, confirma igual y falla igual, porque hace lo mismo.

Se formaliza como ADR (doc 03, ADR-014).

### 7.2 El límite estructural en la modalidad sin servidor

Aquí la imperceptibilidad tiene un tope que no puede eliminarse con esfuerzo de ingeniería, y debe decirse con claridad.

El doc 2 exige que la lógica de negocio viva en **Stored Procedures** y que la **API sea la fuente de verdad** de validación y autorización. Con servidor local eso se cumple sin concesiones: el Edge ejecuta **los mismos SPs**, de modo que valida de verdad y confirma de verdad. Lo que el usuario ve confirmado, está confirmado por la autoridad.

**Sin servidor local, el navegador no puede ejecutar los Stored Procedures.** Por lo tanto, aceptar una escritura estando offline significa **aceptar algo que aún no fue validado por la autoridad**. Las salidas posibles y sus costos:

| Salida | Qué implica | Costo |
|---|---|---|
| **(a) Replicar validaciones en el cliente** | Reimplementar en TypeScript reglas que viven en SPs | **Dos implementaciones de la misma regla clínica**, que divergirán con el tiempo. En reglas de dosis, alergias o interacciones, la divergencia es un riesgo clínico, no un defecto cosmético. Además contradice el doc 2 |
| **(b) Aceptar rechazo diferido** | Se acepta localmente y el Core puede rechazar después | Exige una **bandeja de reconciliación** y plantea un problema clínico real: una nota o una receta aceptada **ante el paciente** y rechazada horas después, cuando el paciente ya se fue con su receta en la mano |
| **(c) Restringir qué se puede escribir offline** | Sólo lo append-only e intrínsecamente válido | Es lo ya adoptado en §4.1, y **reduce** la superficie del problema, pero no lo elimina para el conjunto mínimo clínico |

**Postura propuesta:** combinar (c) como restricción de base con (b) para lo que quede, y usar (a) **únicamente** para validaciones estructurales sin criterio clínico (formato, obligatoriedad, rangos duros ya definidos en `vitalValidation.ts`), nunca para reglas clínicas de decisión. Toda escritura offline en esta modalidad se marca como **pendiente de validación** hasta que el Core la confirma.

**Conclusión que no debe suavizarse:** en la modalidad sin servidor, **la imperceptibilidad no puede prometerse al mismo nivel que con servidor local**. Se puede lograr que la captura nunca se interrumpa y que el usuario nunca vea un error de red, pero no se puede garantizar que lo aceptado ante el paciente sea definitivo. Con servidor local sí, porque el Edge es la autoridad. Es una diferencia de naturaleza, no de grado, y debe estar en el contrato.

Qué hacer clínicamente cuando el Core rechaza en diferido algo ya aceptado ante el paciente es una **pregunta abierta** que requiere criterio clínico del cliente, no una decisión técnica (§10).

### 7.3 Imperceptible al escribir, explícito al leer datos rezagados

Aplicar "imperceptible" sin matiz chocaría con la seguridad clínica: ya está definido el caso **SC-09**, que exige que ninguna pantalla muestre datos obsoletos sin indicar su antigüedad. La resolución es distinguir los dos sentidos del flujo:

> **Escribir es silencioso. Leer datos rezagados es explícito.**

- **Al escribir:** nunca se bloquea ni se interrumpe al profesional, y **jamás se le muestra un error de red al capturar**. Un mensaje de "no se pudo guardar, revise su conexión" frente a un paciente en urgencias es un defecto de diseño, no una información útil: el profesional no puede hacer nada con esa información y sí puede perder tiempo con ella.
- **Al leer:** sí se indica de forma visible cuando lo que está en pantalla puede estar desactualizado, con su antigüedad. Decidir sobre un dato viejo sin saber que es viejo es un riesgo clínico. Aquí la transparencia no molesta: informa.

No hay contradicción entre ambos porque atienden riesgos opuestos. Ocultar un fallo de escritura no daña al paciente, porque el dato está a salvo en la cola local y llegará. Ocultar que un dato leído es viejo sí puede dañarlo.

### 7.4 Degradación por capacidad, no global

"Que falle algo no debería afectar al usuario" tiene una consecuencia arquitectónica precisa: **la caída de una capacidad no puede tumbar el flujo clínico**. Si el timbrado CFDI, la interoperabilidad, la app de dirección o los reportes multisucursal no responden, la consulta y las urgencias continúan sin enterarse.

Diseño propuesto:

- **Aislamiento por capacidad con corte de circuito.** Cada dependencia externa —PAC de timbrado, servicios de interoperabilidad, almacenamiento de archivos, motor de reportes— tiene su propio corte de circuito con tiempo de espera acotado. Un servicio lento **no** consume los recursos del proceso ni contagia al resto: un tiempo de espera agotado que se acumula es la vía más común por la que una dependencia secundaria tumba un sistema entero.
- **Indicador por capacidad, no un estado global.** Se elimina el binario "en línea / fuera de línea", que es engañoso: lo normal en un sistema distribuido es que algunas capacidades funcionen y otras no. En su lugar, estado por capacidad, visible sólo donde es relevante — el aviso de "timbrado diferido" pertenece a caja, no a la pantalla de triage.
- **Ninguna capacidad no clínica puede ser dependencia de arranque** de una pantalla clínica.

### 7.5 Mecánica que hace posible la imperceptibilidad

Cada punto es una obligación de implementación, no una aspiración:

| Mecanismo | Para qué |
|---|---|
| **Clave de idempotencia en toda mutación** | El reintento es seguro por construcción. Sin esto, reintentar duplica, y el reintento automático es el corazón de la imperceptibilidad |
| **Confirmación basada en la escritura local durable** | El usuario recibe la confirmación cuando el dato está a salvo localmente, **no** cuando responde la red. Es lo que iguala la latencia con y sin enlace |
| **Interfaz optimista, sin girador esperando al servidor** | Un girador es una interrupción visible que delata el estado de la red |
| **Reintento con retroceso exponencial y reanudación automática** al recuperar el enlace, **sin acción del usuario** | Un botón "sincronizar ahora" como camino principal traslada al profesional una responsabilidad que es del sistema. Puede existir, pero **sólo como herramienta de diagnóstico** |
| **Sincronización incremental y reanudable** | Un enlace intermitente no debe reiniciar el envío desde cero: con enlaces malos, un envío que se reinicia nunca termina |
| **Orden causal preservado al vaciar la cola** | Una nota no puede llegar antes del episodio que la contiene. El orden se preserva por dependencias declaradas, no confiando en el reloj (§4.6) |
| **Aislamiento de elementos con falla permanente** | Un elemento que falla de forma definitiva se aparta a una **bandeja de excepciones** y **no bloquea la cola**. Sin esto, un solo registro corrupto detiene toda la sincronización de la sucursal: es el modo de falla más común de las colas y el más dañino |

### 7.6 Lo que el usuario sí debe percibir siempre

Hay una excepción irrenunciable a la imperceptibilidad: **el profesional tiene derecho a saber si lo que capturó ya está a salvo.** Ocultarlo por completo sería tratarlo como si no fuera responsable del expediente que firma.

Cómo mostrarlo sin generar ansiedad ni interrumpir: **indicador pasivo** de estado de sincronía con conteo de pendientes y antigüedad del más viejo, en una zona fija de la interfaz; sin ventanas modales, sin sonidos, sin colores de alarma mientras el comportamiento sea normal; con escalamiento visual **sólo** al cruzar el umbral del §4.5, que es el punto en que sí hay algo que decidir.

Esto **no contradice** la imperceptibilidad, y la razón es precisa: no interrumpe, no bloquea y no exige ninguna acción. Informa sin pedir. Lo que se buscaba eliminar era el error de red frente al paciente y la espera, no la transparencia.

### 7.7 Urgencias como caso de prueba rector

El cliente lo planteó como literalmente de vida o muerte. De ahí se deriva una regla de diseño verificable, que se convierte en la prueba rectora de todo el mecanismo:

> **Ningún fallo de red, del Core o de la sincronización puede impedir registrar triage, signos vitales, ingreso a urgencias ni la nota de atención.** En ninguna modalidad, en ningún nivel de degradación, por ninguna razón.

Es un criterio binario y verificable: se prueba desconectando y observando si se puede registrar. Los casos de prueba bloqueantes que se derivan se añaden a la lista SC del documento [`05-roadmap-qa-riesgos.md`](05-roadmap-qa-riesgos.md), en continuidad con SC-01 a SC-12.

La regla se extiende más allá de la red: **tampoco un dato administrativo faltante puede impedir el registro**, que es el caso del paciente inconsciente sin nombre. Eso se desarrolla en [`03-arquitectura-propuesta.md`](03-arquitectura-propuesta.md) §11, junto con el flujo de paciente no identificado y la prohibición de pantallas que inviten a detenerse.

**Consecuencia específica de esta modalidad que conviene traer aquí:** con la cola de urgencias **por dispositivo**, un paciente clasificado como rojo en la estación de recepción puede no aparecer en la pantalla del médico, porque cada estación ordena su propia cola sobre un conjunto incompleto. Es el único escenario del análisis en que *"la fila se detiene"* puede volverse literal, y es el argumento más fuerte a favor del servidor local en sucursales con urgencias y más de una estación — por encima del argumento de costo. Análisis en `03` §11.6.

---

## 8. App de dirección (alcance nuevo)

Requisito: un director debe poder revisar la operación de sus clínicas desde celular, tablet o laptop. Es **consulta y supervisión multisucursal, no captura clínica**.

### 8.1 De dónde lee, y la honestidad sobre el rezago

La app lee del **Core**. Por lo tanto muestra datos con el **retraso de sincronización de cada sucursal**, que es distinto para cada una y variable: una sucursal con servidor local que lleva horas sin enlace puede aparecer con datos de la mañana.

**Requisito no negociable:** la interfaz debe indicar **"datos al \<fecha y hora\>" por sucursal**, de forma visible y **por sucursal**, no como aviso global. Un director que decide creyendo que ve la operación en vivo, cuando ve la de hace cuatro horas, decide con información falsa. Es la aplicación directa de SC-09 y del principio del §7.3 al contexto de dirección.

Consecuencia del reencuadre del §5 que conviene notar: **si el Core está caído, la app de dirección no funciona** — y eso es aceptable. Un tablero de supervisión no es atención médica y su indisponibilidad no tiene consecuencia clínica.

### 8.2 Autenticación, rol y minimización de datos

- **Rol propio de dirección**, de sólo lectura, sin captura clínica ni configuración. Se integra a la matriz de permisos del sistema; no es un mecanismo aparte.
- **Sin caché offline de datos clínicos en dispositivos personales.** La app de dirección es de consulta en línea. Habilitar caché offline en el teléfono personal del director introduciría toda la superficie de riesgo del §4.4 sin la justificación que la respalda ahí, que es la continuidad de la atención. Un tablero no es atención médica.
- **Autenticación reforzada**, por ser acceso multisucursal desde un dispositivo no administrado, y **auditoría de todo acceso** con el mismo modelo del resto del sistema. La app de dirección no puede convertirse en un camino que eluda la auditoría y el consentimiento.
- **Minimización de PHI:** el diseño propuesto es que el nivel por defecto sean **indicadores agregados sin identificar pacientes** (ocupación, tiempos de espera, productividad, ingresos, inventario, cumplimiento documental). El acceso a nivel de paciente, si se autoriza, sería un permiso explícito, configurable y auditado. **Esto no se asume** (§10).

### 8.3 ¿Mismo bundle o aplicación aparte?

| | Misma base de código, PWA responsiva | Bundle aparte |
|---|---|---|
| Costo de construcción | Menor | Mayor |
| Peso descargado al teléfono | Arrastra el *bundle* clínico completo | Sólo lo necesario para tableros |
| Superficie de PHI en el dispositivo | Mayor: lleva la maquinaria de caché clínica a un equipo personal | Menor por construcción |
| Presupuesto de performance en red móvil | Difícil de cumplir | Alcanzable |

**Recomendación:** aplicación aparte que **comparta el design system, el cliente de API y los tipos del dominio**, pero no el *bundle* clínico. Justificación doble: presupuesto de performance en red móvil y minimización de datos por diseño. Se registra como decisión abierta porque tiene costo (§10).

Su ubicación en el roadmap se define en [`05-roadmap-qa-riesgos.md`](05-roadmap-qa-riesgos.md); no puede preceder al núcleo clínico porque consume datos que aún no existen.

---

## 9. Recomendación de asignación por perfil de sucursal

| Perfil de sucursal | Modalidad recomendada | Motivo |
|---|---|---|
| Con urgencias | **CON servidor, variante A2 (dedicado)** | La continuidad no es negociable y sólo el servidor local la provee (§5.1, §7.7). Con más de una estación, la cola por dispositivo deja de priorizar correctamente: es motivo clínico, no de costo (`03` §11.6) |
| Clínica de consulta con caja propia | **CON servidor**; A1 si el equipo aportado cumple los controles del §3.2 | Necesita caja y folios definitivos offline (§4.2, §4.3) |
| Consultorio pequeño, 1–3 estaciones, sin caja | **SIN servidor**, con enlace redundante y la degradación aceptada por contrato | El costo del servidor no se justifica y la degradación es tolerable |
| Sucursal nueva o piloto | **SIN servidor** al abrir, migrar cuando crezca | La modalidad es configuración por sucursal y es reversible por diseño |

---

## 10. Preguntas abiertas de este documento

Ninguna fue asumida en el análisis. Se consolidan también en [`06-decisiones-abiertas.md`](06-decisiones-abiertas.md) sección E.

**Sobre la modalidad con servidor**

1. ¿Se estandariza **SQL Server 2025 Express** en el Edge (50 GB por base) o **2022 Express** (10 GB) con una ventana de retención más corta?
2. ¿Cuál es la **ventana de retención local** de datos calientes: 3, 6, 12 meses?
3. Sobre el **PC reutilizado**: ¿características reales del equipo, y se aceptan **todos** los controles obligatorios del §3.2?
4. **¿Quién opera y respalda el Edge en cada sucursal?** Sin respuesta, el riesgo operativo del Edge no tiene dueño.

**Sobre la modalidad sin servidor**

5. **Pregunta clínica, no técnica:** ¿qué se hace cuando el Core **rechaza en diferido** una escritura ya aceptada ante el paciente (§7.2)? ¿Quién es notificado, en qué plazo, quién resuelve la bandeja de reconciliación, y qué ocurre si el paciente ya se fue con una receta que el Core rechazó? Requiere criterio clínico del cliente.
6. ¿Se acepta **prohibir la caché de datos clínicos en equipos de kiosco y compartidos**, habilitándola sólo en dispositivos registrados?
7. ¿Se acepta el **cifrado de disco del sistema operativo como requisito** de toda estación con caché offline?
8. Tensión del §4.4: ¿cifrado de la caché **a nivel de aplicación** —más seguro ante robo, pero incompatible con recargar la app estando offline— o protección **sólo** por cifrado de disco?
9. ¿Cuál es el **umbral de cola** que bloquea la captura nueva, por antigüedad y por volumen?
10. ¿Existe ya **enlace redundante** en las sucursales, o es costo nuevo? Se requieren cotizaciones reales para compararlo contra el costo único del servidor local (§4.8).
11. ¿Se acepta la política de **bloques de folios pre-asignados con huecos documentados** para documentos clínicos que se imprimen y se entregan (§4.2)?

**Sobre la app de dirección**

12. **¿El director puede ver datos a nivel de paciente, o sólo indicadores agregados?** Es la pregunta de mayor impacto de privacidad de este alcance y **no se asumió respuesta**.
13. ¿Se aprueba construirla como **aplicación aparte** (§8.3), con el costo adicional que implica?
14. ¿Qué **indicadores** necesita realmente la dirección? Sin la lista, el alcance del tablero no es estimable.

**Transversal**

15. ¿Cuántas sucursales y cuántas estaciones por sucursal en el primer año, y **cuáles tienen urgencias**? Determina qué modalidad es obligatoria en cada una y todo el costo del despliegue.
