# 08 — Identidad del paciente y atención sin identificación

Fecha: **2026-08-22**
Estado: **propuesta de modelo; contiene preguntas abiertas al final**

## Por qué existe este documento

La pregunta que lo origina es concreta: un paciente de urgencias puede necesitar registrarse como *"Desconocido 1, accidente de auto, tatuaje mano izquierda, lunar en el hombro izquierdo"*. Esa información es válida, útil y a veces es lo único que hay. ¿Existe un campo para soportarla?

**El diagnóstico es que no falta un campo: el modelo asume que la identidad existe antes de la atención.** Verificado en el prototipo:

- `docs/frontend/src/mocks/patients.ts` — la interfaz `Patient` **no tiene ningún campo de señas particulares**, y `nombre`, `apellidos`, `fechaNacimiento`, `edad`, `sexo` y `curp` son todos obligatorios, sin posibilidad de ausencia. `sexo` está tipado como `'M' | 'F'`, que no admite "no determinado".
- `docs/frontend/src/mocks/urgencias.ts` — la interfaz `Urgencia` exige `patientId`, `patientName` y `patientExpediente` desde el ingreso, más `genero: 'M' | 'F'` y `edad: number` obligatorios.

Agregar un campo de texto para señas particulares no resuelve nada mientras `nombre` siga siendo obligatorio para crear al paciente y `patientId` siga siendo obligatorio para abrir la urgencia. Lo que hay que cambiar es la relación entre identidad y atención.

**Fundamento normativo, verificado y no supuesto:** la NOM-004-SSA3-2012 **no exige que el paciente esté identificado para registrar la atención** —el contenido mínimo de la nota inicial de urgencias del numeral 7.1 no incluye ningún dato de identidad—, y la LFPDPPP vigente habilita el tratamiento sin consentimiento mientras el titular no esté en condiciones de otorgarlo, con condiciones verificables. Todo el detalle, con numerales, artículos y fechas de verificación, está en [`01-marco-normativo-verificado.md`](01-marco-normativo-verificado.md) §2 y §4. Este documento no repite ese análisis: lo aplica.

---

## 1. Principio: la identidad es un atributo del sujeto, no un requisito del episodio

> **El episodio de atención existe desde el primer contacto y nunca depende de la identidad. La identidad es un atributo que puede llegar después, llegar parcial, o no llegar nunca.**

Modelo propuesto, con dos entidades donde el prototipo tiene una:

| Entidad | Qué es | Cuándo nace |
|---|---|---|
| **`Subject`** (sujeto de atención) | La persona **tal como la conoce esta organización**. Contiene los atributos de identidad, **todos opcionales**, y un estado de identificación explícito. | En el primer contacto, **siempre**. Nunca requiere datos para existir. |
| **`Encounter`** (episodio de atención) | El contacto asistencial: urgencia, consulta, estudio. Referencia a un `Subject`. | Al iniciar la atención. |

Consecuencias del diseño:

- **El padrón de pacientes deja de ser una entidad aparte.** El padrón son los `Subject` cuyo estado de identificación es verificado. Un "paciente no identificado" no es un caso especial con tabla propia: es un `Subject` en un estado anterior del mismo ciclo de vida. Esto evita el error clásico de mantener dos modelos paralelos que hay que fusionar a mano.
- **Todo documento clínico referencia `subject_id`**, nunca los campos de identidad. Una nota no contiene el nombre del paciente: contiene la referencia. El nombre se resuelve al presentar. Así la identidad puede cambiar sin tocar un solo documento clínico.
- `Encounter.subject_id` **no es opcional**, porque el `Subject` siempre existe. Se evitan claves foráneas nulas en todo el modelo clínico.

---

## 2. Estado de identificación

Concepto explícito, auditable y con transiciones controladas. No es un booleano `esAnonimo`.

| Estado | Significado |
|---|---|
| `no_identificado` | No hay datos de identidad. Existe etiqueta temporal (§3). |
| `declarada_sin_documento` | Un acompañante declaró nombre y datos, **sin documento que lo respalde**. Es información útil y a la vez no confirmada; el sistema no debe presentarla como equivalente a la verificada. |
| `verificada_con_documento` | Se cotejó contra documento (identificación oficial, acta, pasaporte, documento migratorio). Se registra **qué** documento se cotejó, no una copia del documento salvo decisión expresa. |
| `rectificada` | La identidad asignada era incorrecta y se corrigió. Estado distinguible de `verificada` porque **la historia importa**: hubo un error y alguien pudo haber decidido con datos mezclados (§6). |
| `no_recuperable` | El episodio se cerró —alta, traslado o defunción— sin que la identidad se pudiera establecer. **Estado terminal necesario:** sin él, estos expedientes quedarían indefinidamente "pendientes" y contaminarían para siempre las bandejas de trabajo. |

**Transiciones válidas y quién las ejecuta:**

| Transición | Quién | Requisito |
|---|---|---|
| `no_identificado` → `declarada_sin_documento` | Recepción, enfermería, médico | Ninguno adicional. Es captura de información. |
| `declarada_sin_documento` → `verificada_con_documento` | Rol con permiso de verificación de identidad | Registrar tipo de documento cotejado y quién lo cotejó |
| `no_identificado` → `verificada_con_documento` | Rol con permiso de verificación | Igual que arriba |
| cualquiera → `rectificada` | **Rol supervisor**, con justificación obligatoria | Genera alerta de seguridad del paciente (§6), no sólo entrada de auditoría |
| cualquiera → `no_recuperable` | Rol supervisor, al cierre del episodio | Justificación obligatoria |

Toda transición es un **evento append-only** con actor autenticado, `occurred_at` / `recorded_at`, tipo de evidencia y justificación cuando aplica. El estado actual es la proyección de esos eventos, no un campo que se sobrescribe.

**Cese de la base de licitud.** La habilitación del artículo 9 fracción VI de la LFPDPPP opera *"mientras la persona titular no esté en condiciones de otorgar el consentimiento"*. Por lo tanto, al pasar a un estado en que existe titular o representante capaz de consentir, el sistema debe **registrar el momento del cese** y accionar el flujo de consentimiento. Es un requisito derivado de la verificación del doc 01 §4 que la documentación de entrada no contempla.

---

## 3. Etiqueta temporal legible por humanos

Es la respuesta directa al "Desconocido 1", y es **seguridad del paciente**, no una convención de nombres. Y tiene un fundamento normativo que conviene tener presente porque cambia su naturaleza: **la etiqueta no es una invención del producto, es la forma de cumplir la norma cuando la identidad se desconoce.**

- El numeral **5.9** de la NOM-004 exige *"nombre completo del paciente, edad, sexo"* en **toda** nota médica y reporte. No es un campo que la norma permita dejar vacío.
- La NOM-004 **no dice qué poner cuando no se conoce**, pero la DGIS sí: el instructivo vigente de la Hoja Diaria del Servicio de Urgencias instruye *"colocar en los tres espacios la palabra 'Desconocido'"*, con `09/09/9999` para la fecha de nacimiento y `999` para la edad (doc 01 §3, verificado el 2026-08-22).

De ahí una consecuencia de diseño que hay que respetar con cuidado: **hay dos representaciones del mismo hecho, para dos destinatarios distintos.**

| Destinatario | Representación |
|---|---|
| **Operación clínica** (pantallas, brazalete, comunicación verbal) | La etiqueta operativa, `NN-ALFA`, más el descriptor. Es lo que evita confundir pacientes |
| **Reporte a SINBA y expediente formal** | Los valores oficiales de desconocimiento: `Desconocido`, `09/09/9999`, `999` |

**Y una regla de implementación que no es opcional:** `09/09/9999` y `999` son **valores sintácticos de reporte, no datos reales**. Se generan en la capa de reporte y **nunca** se almacenan como fecha de nacimiento ni como edad del sujeto. Guardarlos en el modelo corrompería toda la aritmética de edad y, con ella, los rangos de signos vitales y el cálculo de dosis — es decir, convertiría un requisito de reporte estadístico en un riesgo clínico.

### 3.1 Estructura

```
Identificador interno:  NN-<sucursal>-<AAMMDD>-<palabra>
Etiqueta de uso diario: NN-ALFA      (más el descriptor de §3.3)
```

- **Generación local, sin depender del Core.** El componente `<sucursal>-<AAMMDD>` lo conoce la estación sin preguntar a nadie, y `<palabra>` sale de una secuencia local: del Edge en modalidad con servidor, o de un bloque pre-asignado al dispositivo en modalidad sin servidor (mecánica en [`07-modalidades-de-despliegue.md`](07-modalidades-de-despliegue.md) §4.2).
- **Colisión imposible por construcción**, no por verificación: el código de sucursal separa sucursales, la fecha separa días, y dentro de un día una sucursal es la única autoridad de su propia secuencia. No hace falta consultar al Core para garantizar unicidad, que es exactamente el requisito.

### 3.2 Por qué palabras y no números

`Desconocido 1` y `Desconocido 2` son **peligrosamente parecidos** cuando el personal está bajo presión, y el punto de falla no es la pantalla: es la **comunicación verbal**. "Pásame los signos del dos" y "pásame los signos del doce" suenan casi igual en un pasillo con ruido.

Propuesta: un **alfabeto fonético** —Alfa, Bravo, Charlie, Delta…— que está diseñado precisamente para ser inconfundible al pronunciarse. Con 26 palabras por sucursal y por día hay margen sobrado; de agotarse, se concatena una segunda palabra.

**Restricción explícita:** las palabras **no pueden ser colores**. Rojo, naranja, amarillo y verde son semántica clínica de triage y están bloqueados como tokens clínicos (doc 04). Llamar "paciente Rojo" a un no identificado con triage verde sería un error inducido por el diseño.

### 3.3 Descriptor discriminante y etiquetado físico

La etiqueta nunca se muestra sola. Va acompañada de un **descriptor mínimo** capturable en segundos: sexo aparente si es determinable, rango de edad aparente, y hora de llegada. La cabecera de identidad del paciente —requisito SC-05 ya definido— muestra etiqueta **y** descriptor durante toda la atención.

**Identificación física:** la etiqueta se imprime en brazalete y se coloca al paciente. Es lo que evita administrar a uno lo que era para otro. Si no hay impresora, existe procedimiento manual documentado con la misma etiqueta escrita a mano: la falta de una impresora no puede detener la atención, pero tampoco puede dejar al paciente sin identificar.

**Antes de todo acto de riesgo** —administración de medicamento, transfusión, procedimiento— sobre un paciente no identificado, el sistema exige **confirmación explícita de correspondencia** entre la etiqueta del brazalete y el episodio en pantalla.

---

## 4. Señas particulares

### 4.1 Decisión: texto libre **y** estructura, con reconciliación posterior

Ninguna de las dos formas alcanza por separado, y la razón no es estética:

| | Texto libre | Estructurado |
|---|---|---|
| Velocidad de captura bajo presión | **Alta.** Se escribe como se habla | Baja. Obliga a navegar catálogos |
| Búsqueda confiable | **Mala.** "mano izq", "mano izquierda", "mano I" no coinciden entre sí | **Buena** |
| Utilidad para el caso de uso real (§7) | Insuficiente | Necesaria |

**Diseño adoptado:** el camino rápido es **un solo campo de texto libre**, que nunca bloquea y se captura en segundos. La estructuración es **posterior y opcional**, ejecutada por quien tenga tiempo —recepción, trabajo social, el turno siguiente— sobre el texto ya capturado. Es el mismo patrón de *captura libre con reconciliación posterior* ya adoptado para catálogos faltantes (doc 03 §11.5). **La velocidad de captura en urgencias no se sacrifica en ningún caso.**

### 4.2 Estructura propuesta

`senia_particular[]`, cada elemento con:

| Campo | Valores | Motivo |
|---|---|---|
| `tipo` | tatuaje, cicatriz, lunar o marca de nacimiento, amputación, prótesis u ortesis, piercing o expansión, deformidad, otro | Catálogo cerrado y buscable |
| `region_anatomica` | catálogo anatómico (mano, antebrazo, hombro, cuello, tórax, abdomen, muslo, pie, cabeza, rostro…) | Buscable |
| `lateralidad` | izquierda, derecha, bilateral, línea media, no aplica | **Campo propio, no embebido en el texto.** La lateralidad es clínicamente significativa y el usuario la mencionó explícitamente en los dos ejemplos. Buscar "izquierda" dentro de texto libre no es confiable |
| `descripcion` | texto corto | Lo que no cabe en catálogo |

**Separación necesaria:** vestimenta y objetos personales van en una colección **distinta** (`pertenencia[]`), no en señas particulares. Sirven para identificar en el momento, pero **cambian**: una playera roja no es una característica de la persona y no debe quedar como si lo fuera en el expediente.

### 4.3 Tratamiento como dato sensible

Una descripción física es dato personal de una persona identificable, y algunos rasgos **revelan categorías sensibles**: un tatuaje puede revelar convicciones religiosas u origen étnico, y una cicatriz quirúrgica revela estado de salud. Por lo tanto:

- **Finalidad acotada y declarada: identificar al paciente.** No describirlo, no perfilarlo. Es la exigencia del artículo 8 de la LFPDPPP vigente, que prohíbe crear bases de datos con datos sensibles sin finalidad legítima, concreta y acorde (doc 01 §4).
- **Minimización:** sólo lo que sirva para identificar. La interfaz no debe invitar a llenar una ficha antropométrica completa.
- **Acceso restringido** a roles sujetos a secreto profesional u obligación equivalente, que es una de las condiciones expresas del artículo 9 fracción VI.
- **Al identificarse el paciente, la finalidad se agota.** Lo que procede entonces —conservar, restringir el acceso, o anonimizar mediante el motor de retención del doc 01 §5— es una **decisión del cliente**, no técnica, y está en las preguntas abiertas. Lo que **no** es admisible es que queden indefinidamente visibles para cualquier rol como si fueran parte del expediente clínico ordinario.
- **Fotografía del paciente: no se propone.** Una fotografía facial es dato biométrico y por tanto sensible, y **no se verificó** una base de licitud específica para capturarla con fines de identificación en este supuesto. Lo que sí está verificado apunta a cautela: el numeral 5.5 de la NOM-004 exige *"autorización escrita"* del paciente y medidas de anonimización cuando se trate de publicación o divulgación de datos del expediente *"para efectos de literatura médica, docencia, investigación o **fotografías**, que posibiliten la identificación del paciente"*. **Ese numeral rige la divulgación, no la captura interna, y por lo tanto no resuelve la pregunta** — pero muestra que la norma trata la fotografía como un supuesto que merece regla propia. Se registra como decisión abierta con su análisis de riesgo, no como funcionalidad recomendada.

---

## 5. Circunstancias del ingreso, y datos clínicos que sí importan sin identidad

### 5.1 Circunstancia del ingreso

El "accidente de auto" del ejemplo es **circunstancia**, no vía de acceso. Son dos conceptos distintos y el prototipo sólo tiene el segundo:

- `viaAcceso` (ya existe en el prototipo) — **cómo llegó**: ambulancia, vehículo particular, por su propio pie, traslado de otra unidad.
- `circunstancia_ingreso` (nuevo) — **qué ocurrió**: hecho de tránsito, caída, agresión, intoxicación, quemadura, hallado en vía pública, causa médica no traumática, otro. Catálogo abierto con texto libre.

**Relación con la notificación al Ministerio Público.** La obligación sanitaria está verificada y su disparador es más estrecho de lo que parece: el **artículo 19 fracción V** del Reglamento de la LGS en materia de Prestación de Servicios de Atención Médica obliga al **responsable del establecimiento** a notificar los casos de *"personas con lesiones u otros signos que **presumiblemente** se encuentren vinculadas a la comisión de hechos ilícitos"* (doc 01 §2, verificado el 2026-08-22).

Tres consecuencias directas de esa redacción:

1. **El disparador no es "accidente" ni "lesión": es la presunción de vinculación con un hecho ilícito.** Un accidente de tránsito **no** cae automáticamente en el supuesto. Por eso **el sistema no decide**: sugiere la acción según la circunstancia de ingreso, la deja trazada si se ejecuta, y **nunca bloquea la atención** por ella.
2. **La responsabilidad es del responsable del establecimiento**, no sólo del médico tratante. Tiene consecuencia en el modelo de roles: debe existir quien reciba y atienda esa obligación, no sólo quien redacte el documento.
3. **"Se dio aviso al Ministerio Público" es además un dato reportable** en el subsistema de Lesiones de la DGIS (doc 01 §3), así que debe existir como campo estructurado del episodio, no sólo como documento adjunto.

### 5.2 Sexo y edad: seguridad clínica, no dato administrativo

`sexo: 'M' | 'F'` y `edad: number` obligatorios son inadecuados por dos motivos distintos, y el segundo es el grave:

1. No admiten la ausencia del dato, que es el caso que nos ocupa.
2. **Fuerzan a inventar un valor clínico.** La edad y el sexo alimentan rangos de signos vitales, umbrales de triage y cálculo de dosis. `vitalValidation.ts` ya usa rangos por edad. Un valor inventado para satisfacer una obligación de formulario **es un riesgo de dosificación**, no un dato administrativo incorrecto.

Tipado propuesto:

| Campo | Propuesta | Motivo |
|---|---|---|
| `sexo` | `masculino \| femenino \| no_determinado \| no_especificado`, más `origen: documento \| observado \| declarado` | `no_determinado` es "no se pudo determinar ahora"; `no_especificado` es "el documento no lo especifica". Son situaciones distintas. El `origen` permite corregir un valor observado sin que parezca una enmienda |
| `fecha_nacimiento` | **Opcional** | Deja de ser condición de entrada |
| `edad_estimada` | `{ valor, unidad: años \| meses \| días, rango_min, rango_max }`, con `origen: calculada \| estimada \| declarada` | La **unidad importa**: la dosificación neonatal se calcula por días de vida. Un `number` de años es insuficiente. El rango transmite la incertidumbre al clínico en lugar de ocultarla |
| `peso_estimado` | Nuevo, con marca de estimado | La dosificación pediátrica es por kilogramo. Sin identidad tampoco hay peso conocido, y hoy no existe el campo |

**Regla transversal:** todo valor estimado se presenta **visiblemente marcado como estimado** en cualquier pantalla donde influya en una decisión clínica. Ocultar la incertidumbre es peor que no tener el dato.

---

## 6. Reconciliación cuando aparece la identidad

### 6.1 Vinculación sin reescribir el expediente

Cuando se establece la identidad, **no se reescribe nada**. El mecanismo es un evento append-only de vinculación en una tabla `subject_link` (sujeto absorbido → sujeto sobreviviente), y las consultas resuelven la identidad **a través de la cadena de vínculos**.

Se descartó explícitamente la alternativa de reasignar `subject_id` en los documentos clínicos: aunque es más simple y más rápida de consultar, **destruye el registro de lo que se escribió originalmente**, que es justo lo que el numeral 5.11 de la NOM-004 protege al prohibir enmendaduras y tachaduras.

**Costo que se asume y conviene declarar:** toda consulta clínica debe resolver la identidad a través del cierre de vínculos, lo que añade una unión y exige índices adecuados. Es el precio de no reescribir la historia, y se paga.

Si el sujeto identificado ya existía en el padrón, se usa la **cola de fusión con revisión humana obligatoria** ya aprobada. **Nunca hay fusión automática**, en ningún escenario.

### 6.2 Cuando la identificación resultó equivocada

Es el escenario que la documentación de entrada no contempla y el que más daño puede causar.

- **No se borra ni se edita.** Se emite un evento **compensatorio** `vinculacion_revertida` con actor, justificación y doble marca de tiempo, y a continuación un nuevo evento de vinculación al sujeto correcto. El expediente conserva la secuencia completa: se vinculó a X, se revirtió, se vinculó a Y. Es auditable y respeta el numeral 5.11.
- **Genera alerta de seguridad del paciente, no sólo entrada de auditoría.** Y este es el punto importante: mientras la vinculación errónea estuvo vigente, un clínico pudo **leer** un expediente con datos mezclados y **decidir** sobre él. Una reversión no es un trámite de datos: es un evento con posible consecuencia clínica. Debe notificarse a los responsables de los episodios afectados y quedar en el estado `rectificada`, que existe precisamente para que esa historia no se pierda.
- **Reversibilidad como requisito**, no como cortesía: un error de vinculación descubierto tarde debe poder corregirse sin destruir el expediente.

---

## 7. Búsqueda por descripción cuando llega un familiar

Caso de uso real: alguien llega preguntando por una persona que no aparece. Es el motivo principal por el que las señas particulares valen la pena estructuradas.

**Flujo:** el personal —nunca el público— busca entre los `Subject` no identificados **de la organización**, filtrando por sexo aparente, rango de edad, circunstancia de ingreso, señas estructuradas con su lateralidad, y ventana de fecha y hora de llegada.

**La tensión normativa que hay que resolver, y que no es obvia.** Dos numerales de la NOM-004 apuntan en direcciones distintas, y ambos fueron verificados en el texto del DOF el 2026-08-22:

- **Numeral 5.5.1:** los datos proporcionados al personal de salud *"debido a que son datos personales son motivo de confidencialidad, en términos del secreto médico profesional […] Únicamente podrán ser proporcionados a terceros cuando medie la solicitud escrita del paciente, el tutor, representante legal o de un médico debidamente autorizado por el paciente, el tutor o representante legal"*.
- **Numeral 5.6:** *"Los profesionales de la salud están obligados a proporcionar información verbal al paciente, a quién ejerza la patria potestad, la tutela, representante legal, **familiares** o autoridades competentes."*

El 5.6 **obliga** a informar verbalmente a familiares; el 5.5.1 condiciona la entrega a terceros a solicitud escrita de quien tiene legitimación. **Y con un paciente no identificado el problema es circular: no se puede acreditar que alguien es familiar de una persona cuya identidad se desconoce.** Ese es el nudo real de este flujo, y por eso no se resuelve con una regla de permisos.

**Controles de privacidad que se derivan:**

- Confirmar a un desconocido que "hay un hombre con un tatuaje en la mano izquierda" **ya es una divulgación**, aunque el paciente no esté identificado.
- Por eso la búsqueda **devuelve coincidencias al personal, no identidades al solicitante**. El resultado que ve el solicitante no es una ficha: es la indicación de que hay una posible coincidencia y que debe atenderlo la persona responsable. Así se atiende el deber de información del 5.6 sin entregar datos a quien todavía no puede acreditar legitimación conforme al 5.5.1.
- **La confrontación e identificación ocurre en persona**, con personal responsable, y queda registrada. **Nunca por teléfono como confirmación, y nunca en un portal de autoservicio.** Esto se conecta con el hallazgo crítico ya registrado sobre la consulta pública de expediente sin autenticación (doc 02).
- **Toda búsqueda se audita**: quién buscó, con qué criterios, qué se devolvió y qué se hizo después. Una búsqueda sin resultado también se registra.
- Quién puede ejecutar esta búsqueda es una **decisión abierta** (§9).

---

## 8. Operación fuera de línea en ambas modalidades

Todo lo anterior debe funcionar sin el Core, coherentemente con lo ya definido:

| Capacidad | Con servidor local | Sin servidor local |
|---|---|---|
| Abrir episodio y generar etiqueta temporal | Sí, autoridad de la sucursal | Sí, con bloque pre-asignado al dispositivo |
| Capturar señas, circunstancia, sexo y edad estimados | Sí | Sí (append-only) |
| Imprimir brazalete | Sí | Sí, si la impresora es local |
| Búsqueda por descripción | Sí, sobre los no identificados de la sucursal | **Sólo lo que tenga el propio dispositivo.** Un no identificado registrado en otra estación no aparece |
| Vinculación y fusión de identidad | **En cola**, para revisión humana en el Core | **En cola**, igual |

La vinculación queda en cola porque la identidad del paciente es **autoridad del Core** (ADR-002) y la revisión humana es obligatoria. La consecuencia asumida es que un paciente puede permanecer sin vincular hasta que vuelva el enlace, **y eso es aceptable**: la atención ya ocurrió y quedó registrada, que es el objetivo. La reconciliación administrativa se hace después con rastro auditable, exactamente como establece el criterio rector del doc 03 §0.

**La limitación de la búsqueda en modalidad sin servidor merece atención:** en una sucursal con varias estaciones y sin servidor local, un familiar puede preguntar en recepción por alguien que fue registrado en otra estación y **no aparecerá**. Es otra manifestación concreta del problema de la cola por dispositivo (doc 03 §11.6) y un argumento adicional a favor del servidor local donde hay urgencias.

---

## 9. Preguntas abiertas de este documento

1. **Fotografía de identificación:** ¿se desea capturar fotografía del paciente no identificado? Es dato biométrico y por tanto sensible, y **no se verificó** base de licitud específica para este fin. Requiere dictamen legal del cliente. Riesgo si se implementa sin base: tratamiento de dato sensible sin habilitación. Riesgo si no se implementa: menor capacidad de identificación.
2. **Conservación de las señas particulares una vez identificado el paciente:** ¿se conservan como parte del expediente, se restringe su acceso, o se anonimizan al agotarse la finalidad de identificación? Es decisión del cliente con base en su política de retención (doc 01 §5).
3. **Quién puede ejecutar la búsqueda por descripción** (§7): ¿recepción, trabajo social, sólo personal clínico, sólo un rol específico? ¿Se limita a la sucursal o alcanza a toda la organización?
4. **Criterio operativo del aviso al Ministerio Público.** El fundamento **sí** quedó verificado —artículo 19 fracción V del Reglamento (doc 01 §2)—, así que la pregunta ya no es dónde está la obligación sino **cómo se opera**: el disparador es una *presunción* de vinculación con hecho ilícito, que es un juicio humano. ¿Qué circunstancias de ingreso la sugieren por omisión, qué rol es responsable dado que la obligación recae en el **responsable del establecimiento**, y existe además un deber de denuncia en legislación penal que el área legal deba dictaminar? Lo penal no se verificó y no se afirma.
5. **Alfabeto de etiquetas:** ¿se acepta el alfabeto fonético (Alfa, Bravo, Charlie…) o el cliente prefiere otra convención? Debe quedar excluido cualquier esquema basado en colores.
6. **Estado `no_recuperable`:** ¿qué plazo o criterio operativo lo dispara, y quién lo autoriza?
7. **Documento de identidad:** al verificar identidad, ¿se conserva copia digital del documento cotejado, o basta registrar tipo, folio y quién cotejó? Conservar la copia amplía la superficie de datos sensibles.
8. **CURP de un paciente que nunca se identifica: no hay salida verificada.** Es la única laguna normativa dura de este análisis. La NOM-024 marca la CURP como requerida sin valor sustituto y su numeral 6.5.1 establece que *"los SIRES no deben autogenerar la CURP"*; el instructivo de la DGIS prescribe valores de desconocimiento para nombre, fecha de nacimiento y edad, **pero no para la CURP** (doc 01 §3). Es decir: **un paciente no identificado no tiene representación prevista para el intercambio de información bajo NOM-024, y está expresamente prohibido inventarle una clave.** Se propone consulta formal a la DGIS antes de construir el módulo de intercambio, porque no es un detalle de captura: determina si esos episodios son reportables. **No se resuelve por analogía** con los rellenos de edad y fecha.
9. **Campo `sexo` cuando no es determinable:** el numeral 5.9 de la NOM-004 lo exige en toda nota médica y **no se localizó instrucción oficial de desconocimiento** para ese campo, a diferencia de los otros tres. Internamente se conserva como `no_determinado`; qué se emite en el reporte queda pendiente.
