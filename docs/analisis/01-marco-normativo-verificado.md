# 01 — Marco normativo verificado

`last_verified_at`: **2026-08-21**
Método: jerarquía de fuentes del skill `regulatory-change-control` (DOF → Cámara de Diputados → autoridad federal competente → autoridad estatal). No se respondió desde memoria en ningún punto marcado como verificado.

> **Regla que se aplicó en todo el documento:** un estándar internacional (ISO, NIST, OWASP, HL7, FHIR, SNOMED, LOINC, DICOM, W3C) **no** es una obligación legal mexicana salvo que una disposición lo incorpore expresamente. Se marca explícitamente la diferencia.

---

## 1. Hallazgo más relevante: reforma de Salud Digital a la Ley General de Salud (enero 2026)

**Estado: VIGENTE.** Publicada en el DOF el **15 de enero de 2026**, en vigor desde el 16 de enero de 2026.

- Fuente primaria: [Reforma 141 a la LGS, DOF 15-01-2026 (Cámara de Diputados)](https://www.diputados.gob.mx/LeyesBiblio/ref/lgs/LGS_ref141_15ene26.pdf)
- Confirmación en DOF: [SIDOF nota 5778298](https://sidof.segob.gob.mx/notas/imagenes/5778298)

Adiciona el **Capítulo VI Bis "Salud Digital" al Título Tercero**, artículos **71 Bis a 71 Octies**. Lectura literal del texto verificado:

| Artículo | Contenido | A quién obliga (lectura literal) |
|---|---|---|
| 71 Bis | Define salud digital: TIC en servicios de salud, incluyendo telesalud, telemedicina, salud móvil, **registros médicos o de salud electrónicos** y dispositivos portátiles. | Definitorio |
| 71 Ter | Finalidades de la salud digital. | Definitorio |
| 71 Quater | La Secretaría de Salud emitirá las disposiciones de implementación, supervisión y mejora continua **"en todas las instituciones públicas del Sistema Nacional de Salud"**. | Autoridad → sector **público** |
| 71 Quinquies | Aspectos a considerar por **"las instituciones públicas prestadoras de servicios de salud"**. | Sector **público** |
| 71 Sexies | Define telesalud. | Definitorio |
| **71 Septies** | **"Los servicios de telesalud deberán cumplir con las siguientes condiciones"**: I) personal designado y capacitado; II) sistemas seguros y confiables que garanticen **confidencialidad, protección de datos personales, integridad y disponibilidad** de la información médica por personal autorizado; III) mecanismos de **consentimiento informado** garantizando comprensión y voluntariedad; IV) **adecuada documentación y registro** de las atenciones. | **Redactado en términos generales, sin limitarse al sector público** |
| 71 Octies | La Secretaría promoverá, en coordinación con sector público, social y **privado**, el desarrollo y adopción de tecnologías emergentes. | Promocional, no impositivo |

### Por qué importa para MediCore

1. **71 Septies es el artículo con mayor impacto de producto.** A diferencia de 71 Quater y 71 Quinquies (que sí acotan al sector público), 71 Septies está redactado de forma general: *"los servicios de telesalud deberán cumplir…"*. Si MediCore habilita telemedicina en clínicas privadas, sus cuatro fracciones se traducen directamente en requisitos de producto (control de credenciales del prestador, cifrado y control de acceso, flujo de consentimiento informado específico para atención a distancia, y registro documental de la teleconsulta en el expediente).
2. **Requiere interpretación jurídica**, no de ingeniería: determinar si 71 Septies alcanza a prestadores privados. Se listó como pregunta en el documento 06. **La decisión de diseño propuesta es construirlo como si aplicara** (es el escenario conservador y de bajo costo incremental), pero sin declarar cumplimiento legal sin dictamen.
3. La reforma **no modificó** NOM-004 ni NOM-024, y **no** creó una obligación nueva de expediente electrónico para el sector privado. La adopción de medios electrónicos sigue siendo optativa conforme a NOM-004 numeral 5.12.

### Afirmación de fuente secundaria que NO se pudo confirmar

Una fuente secundaria (saludiario.com) afirma que la reforma somete al **software médico a tecnovigilancia "como si fuera un dispositivo físico"**. **No se encontró sustento a esa afirmación en el texto del decreto.** Lo que el texto verificado contiene es:

- Art. 262 Bis: tecnovigilancia **una vez otorgado el registro sanitario de los dispositivos médicos**.
- Facultad de COFEPRIS de coordinar farmacovigilancia y tecnovigilancia vía su Centro Nacional.

No hay en el texto una declaración de que un sistema de gestión clínica/ECE sea dispositivo médico. **Se trata como pregunta legal abierta con impacto real de producto** (documento 06): si alguna funcionalidad futura de MediCore realiza diagnóstico, cálculo de dosis o recomendación clínica automatizada, la clasificación como software como dispositivo médico (SaMD) ante COFEPRIS deja de ser hipotética. Un ECE administrativo-documental normalmente no lo es.

---

## 2. NOM-004-SSA3-2012 — Del expediente clínico

**Estado: VIGENTE.** Publicada en el DOF el **15 de octubre de 2012**; entró en vigor 60 días naturales después. No cancelada ni sustituida.
Fuente primaria consultada (texto íntegro): [DOF nota 5272787](http://diariooficial.segob.gob.mx/nota_detalle.php?codigo=5272787&fecha=15%2F10%2F2012)

Numerales verificados **directamente en el texto de la norma** (no de resúmenes):

| Numeral | Texto verificado (síntesis fiel) | Control de producto derivado |
|---|---|---|
| 4.4 | El expediente clínico es el conjunto **único** de información y datos personales del paciente, en establecimientos público, social **o privado**, y puede constar en soportes electrónicos, magnéticos, ópticos "y de cualquier otra índole". | Expediente único por paciente y organización; el soporte electrónico es válido. |
| 5.1 | Los prestadores de servicios de los establecimientos público, social y **privado** están **obligados a integrar y conservar** el expediente clínico; el establecimiento es **solidariamente responsable** del cumplimiento por parte de su personal, sin importar la forma de contratación. | La responsabilidad recae en la clínica, no en el proveedor de software. El sistema debe generar evidencia de que el personal cumplió. |
| 5.2 / 5.2.1–5.2.4 | Todo expediente debe llevar: tipo, nombre y domicilio del establecimiento (y en su caso institución); razón/denominación social del propietario o concesionario; nombre, sexo, edad y domicilio del paciente; y los demás que señalen las disposiciones sanitarias. | Estos datos se **heredan de la configuración de tenant/sucursal** e imprimen en todo documento. Refuerza el requisito de configurabilidad. |
| 5.4 (párrafo 2) | Los documentos **"deberán ser conservados por un periodo mínimo de 5 años, contados a partir de la fecha del último acto médico"**. | Motor de retención con reloj anclado al **último acto médico**, no a la fecha de creación del documento. |
| 5.4 (párrafo 1) | El expediente es **propiedad de la institución o del prestador** que lo genera; el paciente tiene **derechos de titularidad sobre la información** y sobre la confidencialidad de sus datos. | Separar "propiedad del expediente" de "derechos del titular de los datos". Impacta el diseño de ARCO y del portal del paciente. |
| 5.5 y 5.5.1 | Los datos que permitan identificar al paciente **no deberán divulgarse**. Publicación/divulgación para literatura, docencia, investigación o fotografías requiere **autorización escrita** y medidas de anonimización. Entrega a terceros sólo con solicitud escrita del paciente, tutor, representante legal o médico autorizado. | Punto de decisión de privacidad antes de toda divulgación/exportación; registro de autorizaciones; pseudonimización para uso secundario. |
| 5.10 | Todas las notas deben contener **fecha, hora y nombre completo de quien la elabora**, así como **firma autógrafa, electrónica o digital**; las dos últimas "se sujetarán a las disposiciones jurídicas aplicables". | La firma electrónica **sí** está admitida por la norma, pero su validez depende de otras disposiciones. Ver §6 sobre el riesgo de usar imágenes de firma. |
| 5.6 | *"Los profesionales de la salud están obligados a proporcionar información verbal al paciente, a quién ejerza la patria potestad, la tutela, representante legal, **familiares** o autoridades competentes."* Un resumen clínico o cualquier constancia se solicita **por escrito**. | **Verificado el 2026-08-22.** Leído junto con el 5.5.1 genera una tensión real en el caso del **paciente no identificado**: el 5.6 obliga a informar a los familiares, y el 5.5.1 condiciona la entrega a terceros a solicitud escrita de quien tiene legitimación — pero **no se puede acreditar el parentesco de alguien cuya identidad se desconoce**. Diseño del flujo en el doc 08 §7. |
| 5.11 | Las notas deben conservarse **"sin enmendaduras ni tachaduras"**. | **Inmutabilidad**: un documento firmado no se sobrescribe. Correcciones vía addendum/versión con trazabilidad de autoría. Este numeral es el fundamento normativo del diseño append-only. |
| 5.12 | El uso de medios electrónicos en la integración del expediente es **optativo**, en los términos de las disposiciones aplicables. | No existe obligación legal de digitalizar; la obligación es de contenido y conservación, sea papel o electrónico. |

### ¿La NOM-004 exige que el paciente esté identificado para poder registrar la atención? — **VERIFICADO el 2026-08-22**

Pregunta planteada a raíz del caso del paciente que ingresa a urgencias sin identidad. Se leyó el texto íntegro de la norma en el DOF, no resúmenes. **La respuesta es no, y el fundamento es concreto:**

| Numeral | Texto verificado | Lectura |
|---|---|---|
| **6.1.1** (Historia clínica — Interrogatorio) | *"Deberá tener como mínimo: **ficha de identificación**, en su caso, grupo étnico, antecedentes heredo-familiares, antecedentes personales patológicos […] y no patológicos, padecimiento actual […] e interrogatorio por aparatos y sistemas"* | La norma exige que **exista** una ficha de identificación como componente del interrogatorio. **No enumera campos obligatorios de esa ficha, no fija un mínimo de datos de identidad, y no condiciona la apertura del expediente a que el paciente esté identificado.** |
| **7.1** (Nota **inicial de urgencias**) | Contenido mínimo: **7.1.1** fecha y hora en que se otorga el servicio; **7.1.2** signos vitales; **7.1.3** motivo de la atención; **7.1.4** resumen del interrogatorio, exploración física y estado mental, en su caso; **7.1.5** resultados relevantes de estudios previos; **7.1.6** diagnósticos o problemas clínicos; **7.1.7** tratamiento y pronóstico | El contenido mínimo **propio** de la nota inicial de urgencias es íntegramente clínico: no enumera ningún dato de identidad. |
| **5.2 / 5.2.3** | El expediente debe contener *"nombre, sexo, edad y domicilio del paciente"* entre los datos generales | Requisito de **contenido del expediente**. |
| **5.9** | *"Las notas médicas y reportes a que se refiere esta norma deberán contener: **nombre completo del paciente, edad, sexo** y en su caso, número de cama o expediente."* | **Obligación transversal a toda nota médica**, no sólo a la historia clínica. Es el numeral que más pesa en este análisis y **no admite lectura laxa**. |
| **5.14** | El expediente se integra atendiendo a los servicios genéricos de consulta general, de especialidad, **urgencias** y hospitalización, observando además lo establecido en las NOM referidas en los numerales que enumera — para urgencias remite al numeral **3.16** | El numeral 3.16 de la NOM-004 remite a la **NOM-206-SSA1-2002**, que fue **dejada sin efectos** por la NOM-027-SSA3-2013 (ver más abajo). Es una **referencia cruzada desactualizada** en el texto vigente de la NOM-004; el propio numeral 3 la salva al decir *"o las que las sustituyan"*. |

**Conclusión normativa, con la precisión que exige el numeral 5.9.** La pregunta era si la norma exige identificar al paciente *para poder* registrar la atención, o asentar los datos *disponibles*. La respuesta correcta es más matizada que cualquiera de las dos opciones, y conviene enunciarla sin atajos:

1. **La norma no exige que el paciente esté identificado para registrar la atención.** El contenido mínimo de la nota inicial de urgencias (numeral 7.1) es íntegramente clínico y no incluye ningún dato de identidad. Nada en la norma condiciona la apertura del expediente ni el registro de la atención a la identificación.
2. **Pero la norma sí exige que los campos de nombre, edad y sexo estén poblados** en toda nota médica y reporte (numeral 5.9), y como datos generales del expediente (numeral 5.2.3). **No son campos que la norma permita dejar vacíos.**
3. **La pregunta operativa real, entonces, no es "¿se puede registrar sin identidad?" sino "¿qué valor lleva el campo cuando no se conoce?"** — y eso **no** lo resuelve la NOM-004, que no prevé el caso ni ofrece valor sustituto. Lo resuelve una instrucción oficial vigente de la DGIS: ver §3, *"Registro de pacientes no identificados en SINBA"*.

Esta lectura sostiene el diseño y además lo hace **más** defendible, porque la etiqueta temporal deja de ser una invención del producto y pasa a ser la forma de cumplir el numeral 5.9 cuando la identidad se desconoce. El modelo está en [`08-identidad-y-paciente-no-identificado.md`](08-identidad-y-paciente-no-identificado.md).

**Límite que queda abierto:** el numeral 5.9 exige también **sexo**, y no se localizó instrucción oficial sobre qué asentar cuando no es determinable. Se registra en §8.

### NOM-027-SSA3-2013 — Servicios de urgencias — **VERIFICADO el 2026-08-22**

Estaba en la lista de instrumentos no verificados y pasó a verificada. Título exacto: *"Regulación de los servicios de salud. Que establece los criterios de funcionamiento y atención en los servicios de urgencias de los establecimientos para la atención médica"*. Publicada en el **DOF el 4 de septiembre de 2013**, [nota 5312893](https://www.dof.gob.mx/nota_detalle.php?codigo=5312893&fecha=04/09/2013). No se localizó ningún instrumento oficial que la cancele o modifique.

**Su transitorio resuelve la referencia cruzada de la NOM-004:**

> *"La entrada en vigor de la presente norma, deja sin efectos a la Norma Oficial Mexicana NOM-206-SSA1-2002, Regulación de los servicios de salud. Que establece los criterios de funcionamiento y atención en los servicios de urgencias de los establecimientos de atención médica […]"*

**Hallazgo negativo, y es firme porque se leyó el texto completo:** la NOM-027-SSA3-2013 **no contiene ningún numeral** sobre registro administrativo del paciente de urgencias, identificación del paciente, pacientes que ingresan sin identificación o inconscientes, ni prohibición de condicionar la atención por requisitos administrativos, económicos o de identificación. **No es la fuente de esas reglas.** Para el expediente y las notas remite a la NOM-004 (su numeral 3.1).

Lo que sí aporta, y es relevante al diseño:

| Numeral | Texto verificado | Consecuencia |
|---|---|---|
| **5.4** | *"Para la recepción del paciente en el servicio de urgencias, se requiere que un médico valore y establezca las prioridades de atención del mismo."* | La clasificación es **acto médico**, no administrativo. Refuerza la prohibición de asignar un nivel de triage por omisión (doc 03 §11.3) y el estado explícito "sin clasificar" |
| **6.2.2** | El médico tratante debe valorar continua y permanentemente a los pacientes en observación y registrar notas de evolución **"por turno o al menos cada 8 horas y cuando existan cambios clínicos y terapéuticos significativos"** | Requisito temporal concreto que no estaba en la documentación de entrada: el sistema debe poder **detectar y alertar** la nota de evolución vencida, y hacerlo **fuera de línea**, porque el reloj sigue corriendo sin enlace |
| **6.2.7** | En caso de traslado a una unidad de mayor complejidad, el médico elabora la nota de referencia/traslado e integra copia en el expediente | Ya cubierto por el numeral 7.3 de la NOM-004 |

**Dato colateral:** la norma se inscribió en los Programas Nacionales de Normalización 2018 y 2019 para actualizarse como PROY-NOM-027-SSA3-2017, y **no se localizó publicación del proyecto ni de una norma actualizada**. Es un instrumento a vigilar en el catálogo de requisitos regulatorios.

### Obligación de atender la urgencia — **VERIFICADO el 2026-08-22, con una precisión incómoda**

Este es el respaldo normativo del criterio rector de continuidad de la atención (doc 03 §0). Conviene enunciarlo con exactitud, porque **el respaldo existe pero no dice literalmente lo que sería más conveniente que dijera**.

**Lo que sí está verificado en la Ley General de Salud** (compilación de la Cámara de Diputados, *"TEXTO VIGENTE / Últimas reformas publicadas DOF 15-01-2026"*):

| Artículo | Texto verificado (síntesis fiel con cita) |
|---|---|
| **51 Bis 2** | *"En caso de urgencia o que el usuario se encuentre en estado de incapacidad transitoria o permanente, la autorización para proceder será otorgada por el familiar que lo acompañe o su representante legal; **en caso de no ser posible lo anterior, el prestador de servicios de salud procederá de inmediato para preservar la vida y salud del usuario, dejando constancia en el expediente clínico**."* |
| **55** | Quien tenga conocimiento de accidentes o de que alguien requiera prestación urgente de servicios de salud debe cuidar que sea trasladado al establecimiento más cercano *"en los que puedan recibir atención inmediata"* |
| **469** | **Es un delito, no una falta administrativa.** *"Al profesional, técnico o auxiliar de la atención médica que sin causa justificada se niegue a prestar asistencia a una persona, en caso de notoria urgencia, poniendo en peligro su vida, se le impondrá de seis meses a cinco años de prisión…"* |
| **36, párrafo 3** | A los extranjeros que ingresen al país con el propósito de usar los servicios de salud se les cobra el costo íntegro, *"excepto en los casos de urgencias"* |
| **64 Bis 1** | Atención expedita a urgencias obstétricas *"independientemente de su derechohabiencia o afiliación a cualquier esquema de aseguramiento"* |
| **77 bis 37, fracc. I y XII** | *"El nivel de ingreso o la carencia de éste, no podrán ser limitantes para el acceso a la prestación de los servicios de salud"*; y derecho a *"Recibir atención médica en urgencias"* |

**Del Reglamento en materia de Prestación de Servicios de Atención Médica** (*"TEXTO VIGENTE / Última reforma publicada DOF 17-07-2018"*): el **artículo 71** obliga a establecimientos públicos, sociales y privados a *"prestar atención inmediata a todo usuario, en caso de urgencia"*; el **72** define urgencia como *"todo problema médico-quirúrgico agudo, que ponga en peligro la vida, un órgano o una función y que requiera atención inmediata"*; el **73** obliga al responsable del servicio a asegurar la valoración médica y el tratamiento o la estabilización; y el **85** prohíbe **retener** al usuario o al cadáver para garantizar el pago, con sanción en el artículo 244.

**La precisión incómoda, que se registra por honestidad y no se suaviza:** se buscó expresamente y **no existe, ni en la LGS ni en el Reglamento, una prohibición explícita de condicionar la atención de urgencia a la identificación del paciente o a la presentación de documentos.** Lo más cercano son tres reglas que **no** dicen eso:

- El artículo 85 del Reglamento prohíbe **retener después** de la atención para garantizar el pago, no condicionar **antes**.
- El artículo 215 Bis 6 del Reglamento sí prohíbe condicionar a la presentación de denuncia, pero **sólo** para "Emergencia Médica" derivada de la comisión de un delito o violación a derechos humanos (definida en el 215 Bis 2 fracc. I) y **sólo** en establecimientos del **sector público**. Un accidente de tránsito sin conducta delictiva no encuadra automáticamente.
- El artículo 469 de la LGS tipifica la **negativa** de asistencia como delito, no el condicionamiento administrativo.

**Consecuencia para este proyecto:** el criterio rector de continuidad de la atención **tiene respaldo normativo sólido pero indirecto** —artículo 51 Bis 2 y artículo 469 de la LGS, artículos 71 a 73 del Reglamento—, y **no** una prohibición expresa de exigir identificación. Por lo tanto, la afirmación defendible es que un sistema que impide registrar y atender por falta de datos administrativos **expone al personal al supuesto del artículo 469 y al establecimiento al incumplimiento del artículo 71**, no que exista un artículo que prohíba pedir la CURP. Es un argumento más estrecho que "la ley lo prohíbe", y es el que se sostiene.

**Aporte del artículo 51 Bis 2 al diseño, que no se tenía:** la constancia de atención sin consentimiento (doc 01, sección de consentimiento en urgencias) tiene fundamento **en la ley y no sólo en el reglamento**, y la ley exige *"dejando constancia en el expediente clínico"* **sin** requerir el acuerdo de dos médicos, que es una exigencia del artículo 81 del Reglamento. Son dos supuestos con requisitos distintos, y el sistema debe soportar el más exigente para no quedar corto.

### Aviso al Ministerio Público: dónde está la obligación — **VERIFICADO el 2026-08-22**

Complementa lo ya verificado sobre el numeral 10.3 de la NOM-004, que regula **la forma** del documento sin definir cuándo notificar. La obligación sanitaria **no está en la Ley General de Salud** —se revisaron todas las apariciones de "Ministerio Público" en el texto vigente y ninguna la impone al personal de salud por lesiones— sino en el Reglamento:

> **Reglamento de la LGS en materia de Prestación de Servicios de Atención Médica, artículo 19, fracción V**, como función del responsable del establecimiento: *"Notificar al Ministerio Público y, en su caso, a las demás autoridades competentes, los casos en que se les requieran servicios de atención médica para personas con **lesiones u otros signos que presumiblemente se encuentren vinculadas a la comisión de hechos ilícitos**."*

> **Artículo 92:** *"En el caso de muerte violenta o presuntamente vinculada a la comisión de hechos ilícitos, deberá darse aviso al Ministerio Público…"*

**El disparador no es "accidente" ni "lesión":** es la **presunción de vinculación con un hecho ilícito**. Un accidente automovilístico **no cae automáticamente** en el supuesto; requiere ese juicio, que es del médico y del responsable del establecimiento. Esto confirma la decisión de diseño ya adoptada: **el sistema sugiere y ofrece la notificación según la circunstancia de ingreso, pero no la determina ni bloquea nada**. Y la responsabilidad recae en el **responsable del establecimiento**, no sólo en el médico tratante, lo que tiene consecuencia en el modelo de roles.

**No verificado, y se declara:** el fundamento en legislación penal federal o estatal. No se revisó. Si se invoca, debe presentarse como fundamento penal —no sanitario— y con la advertencia de que la parte estatal varía por entidad federativa.

### Hoja de notificación al Ministerio Público: la forma del documento — **VERIFICADO el 2026-08-22**

Complemento del punto anterior: ahí quedó **cuándo** procede notificar; aquí queda **qué debe contener** el documento.

**NOM-004-SSA3-2012, numeral 10.3** (texto normativo, no apéndice): *"Hoja de notificación al Ministerio Público. En casos en los que sea necesario dar aviso a los órganos de procuración de justicia, la hoja de notificación deberá contener:"* **10.3.1** nombre, razón o denominación social del establecimiento notificador; **10.3.2** fecha de elaboración; **10.3.3** **identificación del paciente**; **10.3.4** acto notificado; **10.3.5** reporte de lesiones del paciente, en su caso; **10.3.6** agencia del Ministerio Público a la que se notifica; **10.3.7** nombre completo y firma del médico que realiza la notificación. Y el numeral **10.6** añade que todas las notas de ese apartado llevan encabezado con fecha y hora, y nombre completo y firma de quien las elabora.

**Alcance preciso:** el numeral 10.3 regula **la forma** del documento y se activa *"en casos en los que sea necesario dar aviso"*; **la NOM-004 no define cuándo es necesario** — eso lo fija el artículo 19 fracción V del Reglamento, verificado arriba.

**Requisitos funcionales derivados:** (a) debe existir el documento con esos siete campos, generable **fuera de línea**, append-only y con autoría verificable; (b) el campo 10.3.3 *"identificación del paciente"* **debe aceptar la identidad provisional** de un paciente no identificado, porque el supuesto típico —lesiones por hecho de tránsito— coincide con el del paciente sin identificar; (c) el sistema **sugiere** la notificación según la circunstancia de ingreso pero **no la determina**, porque el disparador es un juicio de presunción de hecho ilícito que corresponde al médico y al responsable del establecimiento, y **nunca bloquea** la atención; (d) el subsistema de Lesiones del SINBA captura expresamente la variable *"Se dio aviso al Ministerio Público"* (sí/no), por lo que el dato debe existir como campo estructurado y no como texto libre.

### Consentimiento informado en urgencias con paciente imposibilitado — **VERIFICADO el 2026-08-22**

Verificación solicitada expresamente a raíz del caso del **paciente inconsciente que llega sin acompañante**. Se consultó el texto de la norma y el del reglamento, no fuentes secundarias.

| Instrumento y numeral | Texto verificado (síntesis fiel) |
|---|---|
| **NOM-004-SSA3-2012, numeral 10.1.1.8** | Debe asentarse nombre completo y firma del paciente **"si su estado de salud lo permite"**; si su estado no le permite firmar y emitir su consentimiento, se asienta el nombre completo y firma del **familiar más cercano en vínculo que se encuentre presente**, del tutor o del representante legal. |
| **NOM-004-SSA3-2012, numeral 10.1.2** | Enumera los **eventos mínimos** que requieren carta de consentimiento informado: ingreso hospitalario; cirugía mayor; anestesia general o regional; salpingoclasia y vasectomía; donación y trasplantes; investigación clínica; necropsia hospitalaria; procedimientos diagnósticos y terapéuticos considerados por el médico **de alto riesgo**; y cualquier procedimiento que entrañe mutilación. |
| **NOM-004-SSA3-2012, numeral 10.1.3** | Se pueden obtener cartas adicionales cuando el personal lo estime pertinente, **"sin que, para ello, sea obligatorio el empleo de formatos impresos"**. |
| **NOM-004-SSA3-2012, numeral 10.1.4** | **"En los casos de urgencia, se estará a lo previsto en el artículo 81 del Reglamento de la Ley General de Salud en materia de prestación de servicios de atención médica."** |
| **Reglamento de la LGS en materia de Prestación de Servicios de Atención Médica, artículo 81, párrafo 1** | En caso de urgencia o incapacidad transitoria o permanente del paciente, el documento lo suscribe el **familiar más cercano en vínculo que le acompañe**, o su tutor o representante legal, una vez informado del carácter de la autorización. |
| **Artículo 81, párrafo 2** | **"Cuando no sea posible obtener la autorización por incapacidad del paciente y ausencia de las personas a que se refiere el párrafo que antecede, los médicos autorizados del hospital de que se trate, previa valoración del caso y con el acuerdo de por lo menos dos de ellos, llevarán a cabo el procedimiento terapéutico que el caso requiera, dejando constancia por escrito, en el expediente clínico."** |
| **Artículo 80** | La autorización escrita y firmada se recaba al ingreso **"siempre que el estado del usuario lo permita"**. |

Fuentes primarias consultadas: [DOF nota 5272787](https://www.dof.gob.mx/nota_detalle.php?codigo=5272787&fecha=15%2F10%2F2012) para la NOM-004, y la compilación oficial de la Cámara de Diputados del [Reglamento de la LGS en materia de Prestación de Servicios de Atención Médica](http://www.diputados.gob.mx/LeyesBiblio/regley/Reg_LGS_MPSAM_170718.pdf) (texto vigente con última reforma incorporada al 17-07-2018).

**Requisitos funcionales que se derivan, y que no estaban en la documentación de entrada:**

1. **La falta de consentimiento firmado no puede bloquear el registro ni el inicio de la atención de urgencia.** La norma condiciona la firma a que "el estado de salud lo permita" y remite expresamente al artículo 81 para urgencias. Un sistema que exija la firma para avanzar contradice el supuesto que la propia norma prevé.
2. **Debe existir un documento de "constancia de atención sin consentimiento del paciente"** que registre: la valoración del caso, los **razonamientos que acreditan el estado de urgencia**, la **ausencia** del familiar, tutor o representante, y la **atribución verificable de al menos dos médicos autorizados**. Es un requisito de forma explícito del artículo 81, y hoy no existe en las reglas de negocio ni en el prototipo.
3. **Ese documento debe poder generarse íntegramente fuera de línea**, porque el escenario que lo motiva es precisamente el de indisponibilidad. Es append-only y con la doble marca de tiempo ya definida.
4. **La firma de dos médicos distintos exige que el sistema soporte co-autoría verificada**, no un campo de texto con dos nombres. Se relaciona con el caso de prueba SC-12, que prohíbe atribuir una nota a un profesional distinto del autor autenticado.
5. El consentimiento **no requiere formato impreso** (numeral 10.1.3), lo que habilita el consentimiento electrónico sin necesidad de digitalizar papel.

**Límite de esta verificación, que queda como pregunta abierta:** el artículo 81 dice **"los médicos autorizados del hospital de que se trate"**. El alcance comprometido de MediCore es clínica ambulatoria con urgencias, **no** hospital. Si un establecimiento ambulatorio con servicio de urgencias queda comprendido en ese supuesto es una **cuestión jurídica que debe dictaminar el área legal del cliente**, y no se resuelve aquí. Se registra en el documento 06. En el mismo sentido, el numeral 10.1.2.1 exige consentimiento para **"ingreso hospitalario"**, evento que queda fuera del alcance congelado.

### Numerales verificados en el barrido del modelo de datos — **VERIFICADO el 2026-08-22**

Ampliación de esta sección producida por el barrido del modelo de datos ([`09-brechas-del-modelo-de-datos.md`](09-brechas-del-modelo-de-datos.md)). Se leyó de nuevo el texto íntegro de la norma en la publicación del DOF y se verificaron literalmente los numerales que sostienen los hallazgos de ese documento. Aquí se asientan **sólo los que esta sección no tenía**; los demás —5.1, 5.2.1 a 5.2.3, 5.4, 5.9, 5.10, 5.11, 6.1.1, 7.1.1 a 7.1.7, 10.1.2.1 a 10.1.2.9, 10.1.3 y 10.3.1 a 10.3.7— ya están asentados arriba y la relectura **confirma** su redacción, sin cambios.

| Numeral | Contenido verificado (síntesis fiel) | Hallazgo del doc 09 que lo invoca |
|---|---|---|
| 5.5.1 | Los datos del expediente sólo podrán proporcionarse a terceros cuando medie **solicitud escrita** del paciente, el tutor, el representante legal o un médico debidamente autorizado por ellos | BM-PAC-08, BM-SEG-02 |
| 5.7 | En los establecimientos para la atención médica, la información del expediente **será manejada con discreción y confidencialidad por todo el personal** del establecimiento | BM-TRA-01, BM-SEG-02 |
| 6.1.2 | Exploración física de la historia clínica: **habitus exterior**, signos vitales (temperatura, tensión arterial, frecuencia cardiaca y respiratoria), **peso y talla**, y datos por región anatómica | BM-TRA-09, BM-CON-07 |
| 6.1.5 y 6.2.5 | **Pronóstico**, exigido tanto en la historia clínica como en la nota de evolución. La norma lo exige y **no** prescribe una escala de valores | BM-CON-02 |
| 6.2.2 | Signos vitales en la nota de evolución *"según se considere necesario"* | BM-CON-03 |
| 6.2.6 | Tratamiento e indicaciones; en el caso de medicamentos, *"señalando como mínimo la dosis, vía de administración y periodicidad"* | BM-FAR-02 |
| 6.3 y 6.3.1–6.3.4 | **Nota de interconsulta**: criterios diagnósticos, plan de estudios, sugerencias diagnósticas y tratamiento, y los demás que marca el numeral 7.1 | BM-CON-05 |
| 6.4 y 6.4.1–6.4.3.3 | **Nota de referencia/traslado**: establecimiento que envía, establecimiento receptor, y resumen clínico con motivo de envío, impresión diagnóstica y terapéutica empleada | BM-NOR-09 |
| 7.2.1 | Cuando el paciente requiera interconsulta por médico especialista, **debe quedar por escrito** tanto la solicitud como la nota de interconsulta | BM-CON-05 |
| **8.9.1–8.9.11** | **Nota de egreso**, once incisos, entre ellos **8.9.6** problemas clínicos pendientes, **8.9.9** atención de factores de riesgo, **8.9.10** pronóstico y **8.9.11** causas de la muerte y necropsia en caso de defunción | BM-NOR-03, BM-URG-06 |
| 9.1.1–9.1.5 | **Hoja de enfermería**: habitus exterior, gráfica de signos vitales, **ministración de medicamentos con fecha, hora, cantidad y vía prescrita**, procedimientos realizados y observaciones | BM-NOR-05, BM-TRA-09 |
| 9.2.1–9.2.8 | **Reportes de servicios auxiliares de diagnóstico y tratamiento**: fecha y hora del estudio, identificación del solicitante, estudio solicitado, problema clínico, resultados, **incidentes y accidentes si los hubo**, identificación de quien realizó el estudio, y nombre completo y firma de quien informa | BM-EST-01, BM-EST-02, BM-EST-03 |
| 10.1.1.1–10.1.1.10 | **Carta de consentimiento informado**, diez incisos, entre ellos **10.1.1.9** nombre y firma del médico que informa y recaba el consentimiento y **10.1.1.10** nombre completo y firma de **dos testigos** | BM-NOR-01 |
| 10.2 y 10.2.3.1–10.2.3.8 | **Hoja de egreso voluntario**, ocho incisos, entre ellos el establecimiento, la calidad y el parentesco de quien solicita el egreso, y **dos testigos**. El numeral 10.2.2 remite al artículo 79 del Reglamento de la LGS en materia de prestación de servicios de atención médica, **no verificado**: ver §8 | BM-NOR-04 |

**Precisión de numeración que corrige una confusión frecuente:** la **nota de egreso es el numeral 8.9**, no el 8.8; el numeral **8.8 corresponde a la nota postoperatoria**. Toda cita del sistema o de la documentación que use 8.8 para la nota de egreso está mal y debe corregirse.

**Fundamento legal complementario:** la exigencia de consignar cédula profesional y, en su caso, Certificado de Especialidad vigente en todo documento clínico **no** proviene de la NOM-004 sino del **artículo 83 de la Ley General de Salud**, verificado el 2026-08-22. Ver §11.

### Riesgo detectado en la documentación de entrada

El `.docx` de reglas de negocio y el documento técnico citan la NOM-004 usando **"Art. 6.3.7"** y **"Art. 6.3.4"** para las hojas de egreso. La NOM-004 se estructura en **numerales**, no en artículos, y la relectura del 2026-08-22 permite precisar el error: el numeral **6.3 es la nota de interconsulta**, con incisos verificados 6.3.1 a 6.3.4; la **nota de egreso es el numeral 8.9** y la **hoja de egreso voluntario el 10.2**. Es decir, la cita de entrada **no corresponde al documento que pretende fundar**. Imprimir una cita legal incorrecta en un documento clínico (hoja de egreso, nota de enfermería) es un riesgo real de auditoría. **Recomendación: ninguna cita normativa se imprime en un documento del sistema sin estar verificada contra el texto del DOF y registrada en el catálogo de requisitos con su `source_url` y `last_verified_at`.**

---

## 3. NOM-024-SSA3-2012 — SIRES / Intercambio de información en salud

**Estado: VIGENTE.** Publicada en el DOF el **30 de noviembre de 2012**, en vigor el **29 de enero de 2013**. Dejó sin efectos la NOM-024-SSA3-2010.

Fuentes: [DOF nota 5280847](https://dof.gob.mx/nota_detalle.php?codigo=5280847&fecha=30/11/2012) · [PLATIICA — estado "Vigente"](https://platiica.economia.gob.mx/normalizacion/nom-024-ssa3-2012/) · [DGIS — preguntas frecuentes](http://www.dgis.salud.gob.mx/contenidos/intercambio/iis_preguntas_gobmx.html) · [DGIS — SIRES certificados](http://www.dgis.salud.gob.mx/contenidos/intercambio/sires_certificacion_gobmx.html) · [DGIS — guía rápida de certificación (v. 2025.05.30)](http://www.dgis.salud.gob.mx/contenidos/intercambio/guias/guia_rapida_proceso_de_certificacion.pdf?v=2025.05.30)

Hechos verificados que cambian el diseño:

1. **Aplica a los ECE.** La DGIS confirma expresamente que la versión 2012 aplica a Sistemas de Información de Registro Electrónico para la Salud (SIRES), "entre los que se encuentran los Expedientes Clínicos Electrónicos".
2. **La NOM-024 NO regula funciones ni funcionalidades del ECE.** La propia DGIS lo aclara: su objeto es regular los SIRES y establecer mecanismos para que los prestadores **registren, intercambien y consoliden** información. Consecuencia directa: *no* se puede justificar una funcionalidad clínica diciendo "lo pide la NOM-024".
3. **La certificación es condicional, no universal.** La guía de la DGIS indica que si el SIRES no registra información relacionada con ninguna de las Guías de Intercambio de Información (GIIS) aplicables, "es probable que no le sea aplicable la Certificación". La aplicabilidad depende del alcance real del sistema.
4. **El SGSI es obligatorio para certificar.** El cumplimiento de la GIIS del **Sistema de Gestión de Seguridad de la Información en Salud (GIIS-A004-01-07) es obligatorio**, y el sistema de seguridad debe tener **mínimo 6 meses de madurez** desde que concluyó su implementación.
5. **Vigencia del certificado: 2 años** (numeral 7.5.3), sujeta a verificaciones de seguimiento de la DGIS.
6. **Ámbito público vs privado no es simétrico.** Según la DGIS: un sistema con ámbito Sector Público puede implementarse en el privado; pero un sistema con ámbito Sector Privado sólo puede implementarse en el público si su grado de cumplimiento respecto de las GIIS aplicables es del **100%**.
7. Existe un listado público de SIRES con certificado vigente **y otro de SIRES cuyo certificado perdió vigencia**, con la leyenda "ACTUALMENTE NO CUMPLEN". Es decir, el estatus de certificación es público y reversible.

### Implicaciones de producto y de discurso comercial

- El plazo de **6 meses de madurez del SGSI** es una dependencia de calendario que hay que meter al roadmap desde el día 1. No es algo que se resuelva al final.
- **No se debe prometer "MediCore certificado NOM-024"** hasta tener dictamen y certificado. La forma correcta de posicionarlo es: *"diseñado para conformidad con NOM-024-SSA3-2012, con SGSI implementado y certificable"*. Además, el certificado se emite considerando **el SIRES y/o el prestador que lo implementa**, la versión y las GIIS del alcance: cada versión mayor y cada cambio de alcance impacta el certificado.
- Ninguna de las 8 skills ni la norma exigen FHIR. **FHIR es estándar voluntario**; se adopta por estrategia de integración, no por mandato legal. La conformidad con NOM-024 se logra vía las **GIIS de la DGIS**, no vía FHIR. El módulo HL7-FHIR del prototipo cubre el eje estratégico, **no** el eje de conformidad NOM-024. Son dos trabajos distintos y el prototipo actual no tiene el segundo.

### Registro de pacientes no identificados en SINBA — **VERIFICADO el 2026-08-22**

Es la respuesta oficial a la pregunta que la NOM-004 deja abierta en el numeral 5.9: **qué se escribe en el campo cuando no se conoce el dato.** No es interpretación propia ni analogía: es instrucción expresa de la autoridad.

**Fuente:** *Instructivo de llenado de la Hoja Diaria del Servicio de Urgencias (SINBA-SEUL-16-P DGIS)*, versión 2024, Dirección General de Información en Salud — [PDF](http://www.dgis.salud.gob.mx/descargas/urgencias/pdf/Instructivo_Urgencias_2024_V2.pdf), enlazado desde la [página oficial del subsistema](http://www.dgis.salud.gob.mx/contenidos/sinais/s_urgencias.html). La misma instrucción aparece en el *Instructivo de Lesiones y Violencia 2024* ([PDF](http://www.dgis.salud.gob.mx/descargas/lesiones/pdf/Instructivo_Lesiones_2024_V2.pdf)) y se mantuvo respecto de la versión anterior, es decir, es una convención estable y no un cambio reciente.

| Campo | Instrucción oficial verificada | Consecuencia de diseño |
|---|---|---|
| **Nombre** | *"En caso de pacientes de los que no es posible saber su nombre, colocar en los tres espacios la palabra **'Desconocido'**."* (en Lesiones: *"Desconocido (a)"*) | El sistema debe poder emitir el nombre con este valor convencional. La etiqueta temporal del doc 08 **acompaña** a este valor, no lo sustituye |
| **Fecha de nacimiento** | *"Cuando se desconozca la fecha de nacimiento del paciente, se debe anotar **'09' para el día, '09' para el mes y '9999' para el año (09/09/9999)**."* | Valor centinela oficial. El sistema no debe inventar una fecha plausible ni dejar el campo vacío |
| **Edad** | *"En caso de desconocer la edad exacta, no contar con la CURP ni la fecha de nacimiento, anotar **'999'**."* | Refuerza el tipado de edad como opcional con marca de desconocido (doc 08 §5.2) |
| **CURP del paciente** | *"Esta información es de vital importancia, por lo que debe agotar todas las opciones posibles para obtenerla"*, con instrucción de consultarla en credencial de elector, expediente o el portal de CURP. **No se prescribe ningún valor sustituto.** | **Hueco normativo real. Ver abajo.** |
| **CURP del profesional** | *"siendo esta variable obligatoria. Esta información no puede desconocerse y no debe dejarse sin respuesta."* | Contraste deliberado del propio instructivo: la CURP **del médico** no admite desconocimiento; **no dice lo mismo de la del paciente** |

**El hueco que sí existe, y no se rellena por analogía.** Ni la NOM-024 ni los instructivos de la DGIS establecen qué capturar en la **CURP del paciente** cuando es imposible obtenerla. En la **Tabla 1** del apartado **6.5** de la NOM-024 —*"Datos mínimos para la identificación de personas"*— varios atributos sí tienen valor explícito de no disponible (estado de nacimiento `00`, nacionalidad `NND`, entidad/municipio/localidad `00`/`000`/`0000`, clave de programa `ND`), pero **CURP, nombre y primer apellido aparecen como requeridos sin valor sustituto alguno**. Los numerales aplicables son el **6.5.1** (*"la CURP validada […] debe ser el atributo de identificación única de personas. Los SIRES no deben autogenerar la CURP"*) y el **6.5.5** (datos mínimos obligatorios de identificación).

**No se extienden los centinelas `999` y `09/09/9999` a la CURP**: están prescritos para sus campos y nada autoriza a trasladarlos. Queda como pendiente en §8 y como decisión abierta en el documento 06.

**Dos requisitos funcionales que se derivan y que la documentación de entrada no contempla:** (a) el sistema debe **poder generar los reportes obligatorios de un paciente no identificado**, con los valores convencionales, y no fallar ni omitir el registro; y (b) el numeral 6.5.1 **prohíbe autogenerar la CURP**, lo que descarta de plano cualquier solución de "CURP provisional calculada" para destrabar el flujo.

---

## 4. Privacidad: nueva LFPDPPP (2025) — cambio material respecto a toda la documentación de entrada

**Estado: LEY NUEVA VIGENTE.** Publicada en el DOF el **20 de marzo de 2025**, en vigor el **21 de marzo de 2025**. **Abroga** la LFPDPPP del 5 de julio de 2010. **Última reforma: DOF 14-11-2025** (art. 4, supletoriedad del Código Nacional de Procedimientos Civiles y Familiares).

Fuentes: [Texto vigente (Cámara de Diputados)](https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf) · [Historial de reformas](http://www.diputados.gob.mx/LeyesBiblio/ref/lfpdppp.htm) · [Publicación original DOF 20-03-2025](https://www.diputados.gob.mx/LeyesBiblio/ref/lfpdppp/LFPDPPP_orig_20mar25.pdf)

Cambios institucionales verificados:

- **El INAI se extinguió.** La supervisión, vigilancia, regulación y sanción en materia de datos personales del sector privado pasó a la **Secretaría Anticorrupción y Buen Gobierno**. El texto vigente define en su glosario `Secretaría: Secretaría Anticorrupción y Buen Gobierno`.
- En el sector privado, la Secretaría atiende estos asuntos a través de la **Dirección General de Datos Personales en el Sector Privado**.
- Los datos de salud siguen siendo **datos personales sensibles**, y las clínicas privadas siguen siendo sujetos obligados como responsables.

**Reglamento: pendiente.** El decreto dio 90 días naturales para expedir las adecuaciones reglamentarias; ese plazo venció en junio de 2025 y **a la fecha de verificación no se ha publicado el nuevo Reglamento**. La aplicación supletoria del Reglamento de 2011 "en lo que no contradiga la nueva ley" proviene de **fuente secundaria** y **debe ser confirmada por el área legal del cliente** antes de basar controles en ella.

### Impacto directo, y por qué es urgente

Toda la documentación de entrada (documento técnico y `.docx` de reglas de negocio) fue escrita contra el marco anterior. Concretamente:

| Elemento del sistema | Problema | Acción |
|---|---|---|
| Módulo "Aviso de Privacidad" | Los avisos de privacidad que citen al **INAI** como autoridad son incorrectos. | Plantillas versionadas, parametrizadas por autoridad vigente, con evidencia de entrega y control de versión del aviso. |
| Módulo "Derechos ARCO" | Los plazos, la autoridad receptora y la vía de impugnación cambian de institución. La nueva ley introduce además la noción de **plazo de conservación** para la supresión. | Motor de plazos configurable y versionado, no plazos escritos en el código. |
| Módulo "Documento de Seguridad" | Se mantiene como control, pero su fundamento debe re-citarse contra la ley vigente. | Re-vincular controles a la ley 2025. |
| Regla "sin borrado físico" (docx) | **Choca de frente** con el derecho de supresión y con el deber de suprimir datos que dejaron de ser necesarios. | Ver §5. |

### Base de licitud para tratar datos de salud sin consentimiento del titular — **VERIFICADO el 2026-08-22**

Verificación necesaria para sustentar el registro de un paciente que **no puede consentir** —el caso del paciente inconsciente— y, en particular, el registro de **señas particulares**. No se dio por hecho que la previsión de la ley de 2010 se hubiera conservado: se leyó el texto vigente.

Fuente: texto vigente en la compilación de la Cámara de Diputados, que declara *"Nueva Ley publicada en el Diario Oficial de la Federación el 20 de marzo de 2025 — TEXTO VIGENTE, Última reforma publicada DOF 14-11-2025"*.

| Artículo | Texto verificado (cita fiel abreviada) | Consecuencia |
|---|---|---|
| **7** | *"Todo tratamiento de datos personales estará sujeto al consentimiento de la persona titular, salvo las excepciones previstas por la presente Ley."* | Regla general. |
| **8** | *"Tratándose de datos personales sensibles, el responsable deberá obtener el consentimiento **expreso y por escrito** de la persona titular para su tratamiento, a través de su firma autógrafa, firma electrónica, o cualquier mecanismo de autenticación que al efecto se establezca. **No podrán crearse bases de datos que contengan datos personales sensibles, sin que se justifique la creación de las mismas para finalidades legítimas, concretas y acordes** con las actividades o fines explícitos que persigue el sujeto regulado."* | Los datos de salud son sensibles: la regla es consentimiento expreso y por escrito. **Y la segunda oración es una obligación de diseño**: cada conjunto de datos sensibles necesita finalidad legítima, concreta y acorde. Aplica de lleno a las señas particulares. |
| **9, fracción V** | *"Exista una situación de emergencia que potencialmente pueda dañar a un individuo en su persona o en sus bienes"* | Base de licitud aplicable a la urgencia médica. |
| **9, fracción VI** | *"Los datos personales sean indispensables para efectuar un tratamiento para atención médica, la prevención, diagnóstico, la prestación de asistencia sanitaria, o la gestión de servicios sanitarios, **mientras la persona titular no esté en condiciones de otorgar el consentimiento**, en los términos que establece la Ley General de Salud y demás disposiciones jurídicas aplicables y **que dicho tratamiento de datos se realice por una persona sujeta al secreto profesional u obligación equivalente**"* | Es la base de licitud precisa del caso del paciente inconsciente. **Se conservó** respecto del marco anterior. |

**Sustento legal de las señas particulares:** el artículo 9 fracciones V y VI permite tratar los datos **sin consentimiento** mientras el titular no esté en condiciones de otorgarlo, y una descripción física destinada a identificar al paciente para poder atenderlo cae dentro de *"indispensables para […] la atención médica […] o la gestión de servicios sanitarios"*. **Pero la habilitación viene con tres condiciones que son verificables y que el diseño debe cumplir**, no con un permiso abierto:

1. **"Indispensables"** — obliga a minimización real. Sólo lo necesario para identificar, no una descripción exhaustiva de la persona.
2. **"Mientras la persona titular no esté en condiciones de otorgar el consentimiento"** — la base de licitud es **temporal**. Cuando el paciente recupera capacidad o aparece su representante, **cesa** el supuesto y se vuelve a la regla general del artículo 8. Esto tiene una consecuencia directa: el sistema debe registrar **cuándo** dejó de aplicar la excepción y accionar el consentimiento a partir de ese momento. La documentación de entrada no contempla nada de esto.
3. **"Por una persona sujeta al secreto profesional u obligación equivalente"** — refuerza el control de acceso: estos datos no son visibles para cualquier rol administrativo.

Y del artículo 8 se deriva la cuarta condición: **finalidad legítima, concreta y acorde**. La finalidad de las señas particulares es **identificar al paciente**, no describirlo. Agotada la finalidad —es decir, una vez identificado— procede evaluar su conservación conforme al motor de retención del §5. Qué se hace exactamente con ellas en ese momento es una **decisión abierta** que requiere criterio del cliente, registrada en el documento 06.

---

## 5. El conflicto retención vs. supresión (hay que resolverlo por diseño, no por opinión)

Dos obligaciones verificadas apuntan en direcciones opuestas:

- **NOM-004 numeral 5.4:** conservación **mínima de 5 años** desde el último acto médico.
- **LFPDPPP vigente:** derechos del titular (incluida supresión) y deber de no conservar datos que ya no son necesarios para la finalidad.

El `.docx` resuelve esto con la regla "sin borrado físico: consentimientos, ARCO, referencias y vigilancia no se eliminan". Eso es correcto **como comportamiento por defecto** e incorrecto **como regla absoluta**: convierte una obligación condicional en una política permanente.

**Diseño propuesto — motor de retención con retención legal (legal hold):**

1. Toda entidad declara su **clase de retención** (documento clínico, dato administrativo, dato de marketing, adjunto, log de auditoría, evidencia fiscal).
2. Cada clase tiene una **política versionada** con: base normativa, reloj de inicio (`último acto médico`, `fecha de emisión`, `cierre de caso`), plazo mínimo, plazo máximo y acción al vencer (supresión, anonimización, archivo).
3. Una solicitud ARCO de supresión **no borra**: abre un caso que evalúa la política. Resultado posible: *procede*, *procede parcialmente*, *no procede por retención legal vigente* (con fundamento y fecha en que sí procederá), o *procede con anonimización*.
4. Lo que sí se puede satisfacer de inmediato sin tocar el expediente: retirar datos de finalidades secundarias (marketing, analítica, comunicaciones), revocar consentimientos y limitar el uso.
5. Al vencer la retención legal, la supresión/anonimización se **ejecuta y se registra**, y el registro de la ejecución sobrevive al dato.
6. El log de auditoría no se borra, pero **sí se pseudonimiza** cuando la retención del dato personal vence, para no convertir la bitácora en la puerta trasera que revive datos ya suprimidos. Este es el punto que la documentación de entrada no contempla.

> Conclusión operativa del skill `privacy-mx-health` aplicada aquí: la clínica no cumple porque el software tenga botones de ARCO. Cumple si existe el caso, la verificación de identidad, el plazo, la resolución fundada, la evidencia y el responsable. El software debe producir esa evidencia.

---

## 6. Firma electrónica: riesgo alto en el diseño actual

- NOM-004 numeral 5.10 admite firma **autógrafa, electrónica o digital**, y remite a "las disposiciones jurídicas aplicables".
- El prototipo implementa la "firma digital" como una **imagen PNG/SVG subida por el médico y guardada en `localStorage`** (`src/utils/appSettings.ts`, claves `medicore_settings_firma_{doctorId}`), y los documentos se exportan como **PDF rasterizado con `html2canvas` + `jsPDF`** (`src/utils/exportUtils.ts`).

Esto no es firma electrónica en sentido jurídico: es una imagen pegada en una imagen. No vincula criptográficamente al firmante con el contenido, no detecta alteración posterior, no tiene sello de tiempo, y el PDF resultante no tiene capa de texto (no es buscable, no es accesible, y es frágil como evidencia).

**Diseño propuesto (ver documento 03 para el detalle):** firma del lado servidor sobre el **hash del contenido canónico** del documento, con sello de tiempo, cadena de integridad, y soporte para e.firma/FIEL cuando el cliente la exija; PDF generado en servidor con capa de texto y metadatos de firma. Adicionalmente, evaluar **NOM-151-SCFI-2016** para constancia de conservación de mensajes de datos — **estado no verificado en esta pasada**, ver §8.

---

## 7. Fiscal: CFDI

**Estado verificado: CFDI 4.0 es la única versión válida** desde el 1 de abril de 2023. No existe versión 5.0.
Fuente: [SAT — Anexo 20](http://omawww.sat.gob.mx/tramitesyservicios/Paginas/anexo_20.htm)

Dato relevante para arquitectura, tomado del propio portal del SAT (fechas de última modificación de los artefactos técnicos):

| Artefacto | Última modificación publicada |
|---|---|
| Catálogos CFDI 4.0 (xls) | 06/08/2026 |
| Secuencia de cadena original (xslt) | 17/04/2026 |
| Matriz de errores (xls) | 25/03/2026 |
| Guía de llenado CFDI 4.0 | 16/01/2026 |
| Catálogo de datos (xsd) | 13/12/2024 |

**Conclusión de diseño: los catálogos del SAT cambian varias veces por año.** El `.docx` los describe como "catálogos SAT (cerrados)" con valores enumerados en el código. Eso genera rechazos de timbrado en producción. Los catálogos SAT deben vivir en base de datos, versionados por fecha de vigencia y actualizables sin desplegar código.

### Alerta fiscal que debe resolver el contador del cliente, no nosotros

El `.docx` establece: precios "sin IVA" en catálogo y cálculo de **IVA 16%** en facturación (`Math.round(base * 0.16 * 100) / 100`), con uso de CFDI por defecto **D01 (Honorarios médicos)**. En México, los servicios médicos prestados por profesionales con título legalmente expedido tienen un tratamiento particular en materia de IVA. **No se afirma aquí cuál es el correcto**: se marca como riesgo fiscal a validar con el asesor fiscal del cliente antes de programar la regla, porque calcular IVA donde no procede (o no calcularlo donde procede) es un defecto con consecuencia fiscal. Ver documento 06.

---

## 8. Instrumentos NO verificados en esta pasada

Por honestidad metodológica (política de fuentes: no inferir vigencia por antigüedad), los siguientes se **citan en la documentación de entrada y en la base de conocimiento**, aplican potencialmente al producto, y **no fueron verificados hoy**. No se debe construir una afirmación de cumplimiento sobre ellos hasta verificarlos:

| Instrumento | Relevancia para MediCore | Estado |
|---|---|---|
| Reglamento de la LGS en Materia de Prestación de Servicios de Atención Médica | Base de operación de establecimientos | **PARCIALMENTE VERIFICADO (2026-08-22).** Se verificaron los **artículos 77, 80, 81 y 82** en la compilación oficial de la Cámara de Diputados, por el caso de consentimiento en urgencias (ver §2). El resto del reglamento **sigue sin verificar**, y en particular el **artículo 79**, al que remite el numeral 10.2.2 de la NOM-004 para la hoja de egreso voluntario: ver los puntos concretos de abajo |
| **Reglamento de Insumos para la Salud** (artículos 28 a 31 y 50 a 52) | Contenido obligatorio de la receta médica —nombre, domicilio y número de cédula del prescriptor, y dosis, presentación, vía, frecuencia y duración— y régimen de los recetarios especiales para estupefacientes y psicotrópicos. Es el instrumento que **cierra** el módulo de recetas | **NO VERIFICADO (2026-08-22).** Se intentó y no se obtuvo el texto oficial: el reglamento **no aparece** en la compilación de reglamentos federales de la Cámara de Diputados (`LeyesBiblio/regla.htm`, revisada ese día) y la descarga directa del archivo esperado devolvió 404. Los requisitos de receta afirmados en el documento 09 se sostienen **exclusivamente** en la LGS (§11). **Falta:** obtener el texto vigente en el DOF o en el portal de COFEPRIS y verificar los artículos citados |
| NOM-005-SSA3-2018 (establecimientos ambulatorios) | Checklist de infraestructura del prototipo | NO VERIFICADO |
| NOM-016-SSA3-2012 (hospitales / consulta especializada) | Checklist; evolución a hospital | NO VERIFICADO |
| NOM-017-SSA2-2012 (vigilancia epidemiológica) | Módulo de vigilancia / SUIVE | NO VERIFICADO |
| NOM-035-SSA3-2012 (información en salud) | Reporte de información en salud | NO VERIFICADO |
| NOM-011-SSA3-2014 (atención de enfermería) | Notas de enfermería | NO VERIFICADO |
| ~~NOM-027-SSA3-2013 (urgencias)~~ | Módulo de urgencias | **VERIFICADA el 2026-08-22 — sale de esta lista.** Vigente, DOF 04-09-2013; deja sin efectos la NOM-206-SSA1-2002. Ver §2 |
| NOM-006 / 007 / 013 / 025 / 026 / 253 / 087 | Se activan por servicio | NO VERIFICADO |
| Regulación radiológica vigente | Imagenología | NO VERIFICADO |
| NOM-151-SCFI-2016 (conservación de mensajes de datos) | Conservación con valor probatorio | NO VERIFICADO |
| Lineamientos del Aviso de Privacidad | Módulo de aviso de privacidad | NO VERIFICADO (probable impacto por la ley 2025) |
| Reglamento de la LFPDPPP aplicable | Controles de privacidad | **PENDIENTE DE PUBLICACIÓN** (ver §4) |

### Puntos concretos que quedaron sin verificar el 2026-08-22 y que sí bloquean decisiones de diseño

A diferencia de la tabla anterior —instrumentos completos por verificar—, estos son **preguntas puntuales** que se buscaron expresamente y **no se pudieron confirmar en fuente oficial**. Se registran así, y no como afirmación, en cumplimiento de la política de fuentes:

| Punto | Por qué importa | Qué falta |
|---|---|---|
| **Qué se captura en la CURP del paciente cuando es inobtenible** | Es el **único** hueco que queda del flujo de paciente no identificado. La DGIS prescribe valores para nombre, fecha de nacimiento y edad, pero **no para la CURP**, y la NOM-024 numeral 6.5.1 **prohíbe autogenerarla** (§3) | Instrucción oficial. Se buscó en la NOM-024 (Tabla 1 del apartado 6.5) y en los instructivos vigentes de Urgencias y Lesiones de la DGIS, y ninguno la prevé. **No se rellena por analogía** con los centinelas de otros campos. Decisión abierta 53 |
| **Qué se asienta como sexo cuando no es determinable** | El numeral 5.9 de la NOM-004 lo exige en toda nota, y los instructivos de la DGIS no prevén el caso, a diferencia del nombre y la edad (§2, §3) | Instrucción oficial o criterio del cliente. El diseño propone `no_determinado` como valor explícito (doc 08 §5.2), declarado como decisión de producto y no como cumplimiento normativo |
| **Fundamento del aviso al Ministerio Público en legislación penal** | La obligación sanitaria **sí** quedó verificada (Reglamento art. 19 fracc. V, §2). Lo que falta es si existe además un deber de denuncia en legislación penal federal o estatal | No se revisó el Código Penal Federal, el Código Nacional de Procedimientos Penales ni códigos estatales. Si se invoca, debe presentarse como fundamento **penal**, no sanitario, y advirtiendo que la parte estatal **varía por entidad federativa** |
| **Prohibición expresa de condicionar la urgencia a la identificación** | Sostiene o no la formulación fuerte del criterio rector (§2) | No existe en la LGS ni en el Reglamento de Prestación de Servicios de Atención Médica. Quedan sin revisar la Ley General de Víctimas (art. 30), las leyes estatales de salud y los reglamentos internos institucionales |
| **Base de licitud para fotografía de identificación** | Una fotografía facial es dato biométrico y por tanto sensible. Se verificó la base general del artículo 9 fracciones V y VI de la LFPDPPP (§4), pero **no** que una fotografía califique como dato *"indispensable"* bajo el criterio de minimización | Dictamen legal. **No se propone la funcionalidad.** Decisión abierta 44 |
| **NOM-046-SSA2-2005** | El instructivo de Lesiones de la DGIS la invoca como criterio para decidir el aviso al Ministerio Público (§3) | No verificada, ni vigencia ni contenido. Su ámbito declarado —violencia familiar, sexual y contra las mujeres— **probablemente no cubre un accidente vial**, por lo que no se traslada |
| **GIIS de la DGIS derivadas del numeral 6.4 de la NOM-024** | Es el lugar donde podría existir una regla técnica sobre identificación incompleta que no aparece ni en la norma ni en los instructivos de captura | No revisadas |
| **Artículo 79 del Reglamento de la LGS en materia de Prestación de Servicios de Atención Médica** | Es el artículo al que remite el numeral 10.2.2 de la NOM-004 para la elaboración de la **hoja de egreso voluntario**. Condiciona el diseño del documento (doc 09, BM-NOR-04) | No verificado. El reglamento está parcialmente verificado (artículos 77, 80, 81 y 82); el 79 **no** se leyó. Se agrega como pendiente puntual |
| **SAT, Anexo 20 y Guía de llenado del CFDI 4.0, a nivel de campo** | El §7 verificó la vigencia de la versión 4.0 y la volatilidad de los catálogos, pero **no** los atributos obligatorios del comprobante. Por eso los hallazgos fiscales del doc 09 (BM-CAJ-02, BM-CAJ-03, BM-CAJ-06) se marcaron como incumplimiento **probable**, no verificado | **Falta:** los atributos obligatorios del nodo Comprobante (entre ellos `LugarExpedicion`, `Exportacion`, `TipoDeComprobante`, `Version`, `NoCertificado`), el domicilio fiscal del receptor, el objeto de impuesto en conceptos, y las reglas de cancelación con motivo y UUID de sustitución |
| **LFPDPPP vigente (2025): plazos y requisitos de las solicitudes ARCO** | El §4 verificó la base de licitud del artículo 9 fracciones V y VI, **no** el régimen de ejercicio de derechos. Sostiene el hallazgo BM-NOR-08 del doc 09 | **Falta:** plazo de respuesta, requisitos de acreditación de identidad del titular y de su representante, contenido mínimo de la respuesta, y régimen aplicable a los datos de personas fallecidas |
| **LFPDPPP vigente (2025): principio de minimización y deber de seguridad** | Sostiene seis hallazgos del doc 09 marcados como incumplimiento **probable** (BM-TRA-01, BM-TRA-11, BM-TRA-12, BM-PAC-13, BM-SEG-01, BM-SEG-05) | **Falta:** identificar los artículos que consagran minimización y deber de seguridad en la ley de 2025, para poder **fundar o retirar** esos seis hallazgos. Hoy no se afirma incumplimiento |
| **Calendario epidemiológico vigente (semanas epidemiológicas)** | Sostiene el cálculo de la semana epidemiológica en la notificación (doc 09, BM-NOR-07) | Debe provenir de **fuente oficial** y no calcularse por aproximación. No verificado |
| **Escalas de triage** | El prototipo usa cuatro niveles de color que no corresponden a ninguna escala documentada (doc 09, BM-URG-05) | **Falta:** determinar si alguna norma mexicana prescribe una escala de triage para establecimientos con urgencias, o si es decisión del establecimiento. La NOM-027-SSA3-2013 está verificada (§2) pero **no se revisó si prescribe escala**. Decisión abierta asociada en el documento 06 |

**Resueltos el 2026-08-22 y retirados de esta lista:** si la NOM-027 sustituyó a la NOM-206 (sí, por su transitorio); dónde está la obligación de avisar al Ministerio Público (Reglamento art. 19 fracc. V); y cómo se reporta a un paciente no identificado a la DGIS (instructivos SINBA 2024).

Se propone resolver esto con el **catálogo de requisitos regulatorios** descrito abajo, no con una investigación puntual que envejece.

---

## 9. Estándares voluntarios que sí se adoptan (y por qué)

Ninguno de estos es obligación legal mexicana. Se adoptan como marco de implementación y se declararán siempre como tales:

| Estándar | Uso en MediCore | Estado verificado |
|---|---|---|
| **WCAG 2.2 nivel AA** | Objetivo de accesibilidad de toda la UI | W3C Recommendation (05-10-2023, actualización editorial 12-12-2024); adoptada como **ISO/IEC 40500:2025**. WCAG 3.0 sigue siendo sólo Working Draft. [Fuente W3C](https://www.w3.org/WAI/standards-guidelines/wcag/) |
| ISO/IEC 27001, 27701, ISO 27799 | Marco del SGSI que la NOM-024 sí exige tener (vía GIIS-A004-01-07) | No verificado en esta pasada (no es requisito legal) |
| OWASP ASVS / API Security | Requisitos de seguridad de aplicación y pruebas | — |
| NIST CSF / SSDF | Gobierno de seguridad y SDLC seguro | — |
| HL7 FHIR (R4/R4B/R5) | Capa estratégica de integración | — |
| DICOM | Imagenología, fase posterior | — |
| SNOMED CT / LOINC / CIE-10 / WHO-ATC | Terminologías codificadas | CIE-10 y catálogos nacionales requieren verificar versión vigente y licenciamiento |

> Nota sobre SNOMED CT: su uso implica licenciamiento a nivel país/afiliado. **No se asume que el cliente tenga derecho de uso.** Ver documento 06.

---

## 10. Cómo se mantiene esto vivo: catálogo de requisitos regulatorios

Se propone implementar el `control-model.md` de la base de conocimiento como una **tabla real del sistema**, no como un documento Word. Cada requisito con: `requirement_id`, `regulation_id`, `legal_force`, `source_section`, `requirement_text`, `applicability_rule`, `facility_types`, `services`, `system_modules`, `workflow_control`, `operational_control`, `evidence`, `responsible_role`, `test_case`, `retention_rule`, `effective_from/to`, `source_url`, `last_verified_at`, `status`.

Beneficios concretos:

1. La **matriz de cumplimiento se genera**, no se redacta a mano.
2. Cada requisito se **liga a un caso de prueba automatizado**. Si el caso falla, el requisito aparece en rojo en el tablero de cumplimiento. Esto materializa la regla del `control-model`: *"no considerar un control completo si falta evidencia verificable o prueba de aceptación"*.
3. La **aplicabilidad se resuelve por configuración** del establecimiento (tipo de unidad + servicios activos), tal como lo exige `mx-health-regulatory-core`: activar "laboratorio" enciende el paquete NOM-007 y sus controles, sin tocar código.
4. `last_verified_at` vencido dispara una alerta de revisión. La obsolescencia normativa se vuelve visible en lugar de silenciosa.
5. Permite distinguir en la UI, para el cliente, entre **cumplimiento de producto**, **cumplimiento operativo** y **cumplimiento documental** — la distinción exacta que exige `CLAUDE.md` y que ningún checklist estático logra.

---

## 11. Ley General de Salud — ejercicio profesional y prescripción de medicamentos — **VERIFICADO el 2026-08-22**

**Añadido el 2026-08-22.** Sección nueva, producto del barrido del modelo de datos ([`09-brechas-del-modelo-de-datos.md`](09-brechas-del-modelo-de-datos.md)). Los artículos de la LGS que aparecen en §1 y §2 se refieren a la salud digital y a la obligación de atender la urgencia; aquí quedan los que gobiernan **quién puede firmar un documento clínico y cómo se prescribe un medicamento**, que es materia distinta y sostiene el módulo de recetas.

**Fuente:** compilación oficial de la Ley General de Salud de la Cámara de Diputados, *"TEXTO VIGENTE / Últimas reformas publicadas DOF 15-01-2026"*.

### 11.1 Artículo 83 — la cédula en los documentos del ejercicio profesional

| Artículo | Texto verificado (síntesis fiel con cita) |
|---|---|
| **83** | Quienes ejerzan las actividades profesionales, técnicas y auxiliares y las especialidades médicas deberán poner a la vista del público un anuncio con la institución que expidió el Título, el **número de la cédula profesional** y, en su caso, el **Certificado de Especialidad vigente**. *"**Iguales menciones deberán consignarse en los documentos y papelería que utilicen en el ejercicio de tales actividades**"*. (Reformado DOF 01-09-2011) |

**Por qué importa, y por qué se registra como hallazgo propio.** Es el fundamento **legal** —no sólo normativo— para exigir la cédula profesional y el certificado de especialidad **en todo documento clínico que el sistema emita**. Hasta ahora el requisito se apoyaba en el numeral 5.10 de la NOM-004, que exige nombre completo y firma de quien elabora la nota, pero **no** menciona la cédula. El artículo 83 cierra ese hueco con jerarquía de ley y con dos consecuencias concretas de diseño:

1. La cédula **no puede ser un campo opcional** del profesional que firma, ni una cadena copiada suelta en cada documento. Debe ser un atributo de la credencial verificable del profesional, con su vigencia.
2. La mención del **Certificado de Especialidad vigente** implica que la vigencia es un dato del modelo, no una nota administrativa: un certificado vencido cambia lo que legalmente puede consignarse en el documento.

Sostiene los hallazgos BM-TRA-08, BM-CON-06 y BM-SEG-03 del documento 09. Se relaciona con el numeral 5.1 de la NOM-004 (§2): el establecimiento es **solidariamente responsable** del cumplimiento por parte de su personal, de modo que permitir la emisión de documentos sin credencial verificable traslada el riesgo al cliente.

### 11.2 Artículos 225 a 241 — prescripción y clasificación de medicamentos

| Artículo | Contenido verificado (síntesis fiel con cita) | Consecuencia de diseño |
|---|---|---|
| **225** | Los medicamentos se identifican por sus denominaciones **genérica** y **distintiva**. *"La identificación genérica será obligatoria"*. (Reformado DOF 30-03-2022) | El catálogo de medicamentos debe separar ambas denominaciones y la genérica no puede faltar |
| **226**, fracciones I–VI | Clasificación de venta y suministro en **seis grupos**. Fr. II: receta **retenida** en la farmacia y **registrada en libros de control**; máximo dos presentaciones del mismo producto; **vigencia de treinta días** desde su elaboración. Fr. III: surtido **hasta tres veces**, con **sello y registro cada vez**, y retención en la tercera ocasión. Fr. IV: resurtible **tantas veces como lo indique el médico**. Fr. V y VI: sin receta | La clasificación **legal** de venta y suministro es un atributo del medicamento, distinto de su categoría farmacológica. De ella se derivan vigencia, resurtido y retención de la receta |
| **226**, último párrafo | *"**El emisor de la receta médica prescribirá los medicamentos en su denominación genérica** y, si lo desea, podrá indicar la denominación distintiva de su preferencia informando al paciente sobre las opciones terapéuticas"*. (Adicionado DOF 30-03-2022) | La receta se emite por denominación genérica; la distintiva es opcional y no la sustituye |
| **226 Bis** | En atención intrahospitalaria se podrán prescribir **dosis unitarias** conforme a los Lineamientos que expida la Secretaría de Salud. (Adicionado DOF 29-11-2019) | Se registra por completitud. Los **Lineamientos no se verificaron**; y la atención intrahospitalaria está fuera del alcance congelado de las Fases 1–4 |
| **240** | Sólo podrán prescribir **estupefacientes** los médicos cirujanos, los médicos veterinarios (en animales) y los cirujanos dentistas (casos odontológicos), siempre que tengan **título registrado** por las autoridades educativas competentes | La facultad de prescribir estupefacientes depende del tipo de profesional y de su título registrado: es una regla de autorización, no una preferencia de configuración |
| **241** | *"La prescripción de estupefacientes se hará en **recetarios especiales**, que contendrán, para su control, un **código de barras asignado por la Secretaría de Salud**, o por las autoridades sanitarias estatales"*: fr. I, tratamientos **no mayores de treinta días**; fr. II, la **cantidad máxima de unidades prescritas por día** debe ajustarse a las indicaciones terapéuticas del producto | Sin folio de recetario especial y código de barras asignado por la autoridad, la prescripción de estupefacientes **no es representable**. Es el fundamento del hallazgo BM-FAR-01 del documento 09 |

**Límite explícito de esta verificación.** El **Reglamento de Insumos para la Salud**, que desarrolla el contenido de la receta y el régimen de los recetarios especiales en sus artículos 28 a 31 y 50 a 52, **no se pudo verificar en fuente oficial el 2026-08-22** (ver §8). Todo lo que aquí se afirma sobre requisitos de la receta se sostiene **exclusivamente** en el texto de la Ley General de Salud transcrito arriba. Cualquier requisito adicional de contenido de la receta que se invoque debe presentarse como **pendiente de verificación**, no como obligación verificada.
