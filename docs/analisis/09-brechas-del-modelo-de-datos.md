# 09 — Brechas del modelo de datos

**Fecha:** 2026-08-22
**Alcance:** los 34 archivos de tipos de dominio de `docs/frontend/src/mocks/` y los formularios de captura de `docs/frontend/src/pages/`.
**Objeto:** endurecimiento del modelo de datos. No se propone rediseñar la UI ni cambiar el stack. El prototipo se conserva como activo.
**Origen:** generalización del caso resuelto en el documento 08 (paciente inconsciente sin identidad). Ese caso no era una excepción: era la primera manifestación detectada de un patrón que recorre todo el modelo.

---

## 0. Cómo leer este documento

### 0.1 Clases de hallazgo

Cada hallazgo se clasifica en **una** clase primaria. La clase responde a la pregunta "¿por qué hay que arreglarlo?", no a "¿qué tan urgente es?".

| Clase | Significado |
|---|---|
| **RSC** | **Riesgo de seguridad clínica.** El defecto puede producir daño al paciente por sí mismo, típicamente porque el sistema afirma un dato clínico que nadie observó, o porque impide documentar lo que sí se observó. |
| **INV** | **Incumplimiento normativo verificado.** Se contrastó contra el texto oficial del instrumento y el modelo no puede satisfacer el requisito. El fundamento se cita con numeral o artículo exacto. |
| **IPV** | **Incumplimiento probable pendiente de verificar.** Hay indicio fundado de incumplimiento, pero el instrumento o el numeral concreto **no se verificó en fuente oficial**. No se afirma incumplimiento: se registra la sospecha y lo que falta verificar. |
| **DD** | **Deuda de diseño.** No hay riesgo clínico directo ni norma incumplida, pero el modelo obliga a soluciones frágiles, impide una función legítima o hace inevitable el retrabajo. |

### 0.2 Severidad

La severidad es transversal a los dominios y se asigna con un criterio único, para que un hallazgo "Alta" de caja sea comparable con un hallazgo "Alta" de urgencias:

- **Crítica** — el defecto fabrica un dato clínico o legal que nadie asentó, o impide registrar un acto médico que ocurrió, o hace imposible cumplir un requisito expreso de norma verificada en un documento que se imprime y se firma.
- **Alta** — el defecto hace inevitable el dato falso o la omisión en escenarios ordinarios y frecuentes, no excepcionales.
- **Media** — el defecto se manifiesta en escenarios reales pero acotados, o degrada la trazabilidad y la interoperabilidad sin producir un dato falso.
- **Baja** — molestia de modelado, sin consecuencia clínica, legal ni fiscal identificada.

### 0.3 Los tres patrones de defecto que explican casi todo el catálogo

El barrido no encontró 87 problemas independientes. Encontró tres patrones estructurales que se manifiestan 87 veces:

1. **El modelo no tiene forma de decir "no sé".** Todo campo obligatorio y no nulo obliga a inventar. El tipo `alergias: string[]` no puede expresar "no se interrogó"; `edad: number` no puede expresar "desconocida"; `dolor: number` no puede expresar "paciente no valorable". Cuando el clínico no puede decir "no sé", el sistema le exige mentir.
2. **El valor por omisión pasa por dato observado.** Un campo obligatorio que estorba se nota y se llena. Un valor por omisión plausible no se nota nunca. `createEmptyHistoriaClinica` inicializa los antecedentes en `'negado'` y los aparatos y sistemas en `'normal'`; `NuevoIngresoModal` inicializa el sexo en `'M'`; el triage tiene un botón que escribe diez signos vitales inventados. Ninguno de esos datos fue observado y todos son indistinguibles de un dato observado.
3. **La ausencia se resuelve con un centinela silencioso.** Cuando falta un dato, el código no falla: sustituye. `sucursales[0]` cuando no se sabe la sucursal, `'Dr. Asignado'` cuando no hay médico, `parseFloat(x) || 0` cuando no hay peso, `patient?.sexo ?? 'F'` cuando no hay paciente. El sustituto se imprime en un documento que se firma.

Los tres tienen la misma raíz: **el modelo confunde "vacío" con "normal" y "desconocido" con "cero".**

### 0.4 Relación con los documentos previos

Este documento **complementa** y no repite:

- **Documento 02 §2.3** identificó que la firma del prototipo es una imagen PNG en `localStorage`. Aquí no se repite ese hallazgo: se documenta el nivel de tipo, es decir, que las entidades modelan la firma como `boolean` o no la modelan (BM-TRA-05), y se propone el tipo que la sustituye.
- **Documento 02 §2.4 y §2.5** y **documento 08** resolvieron la identidad del paciente no identificado. Aquí no se repite: se documentan las **manifestaciones nuevas** del mismo patrón, en particular los sustitutos silenciosos de sexo que quedaron dispersos en cuatro archivos y que sobreviven a la corrección del tipo `Patient` (BM-PAC-03).
- **Documento 01 §5** verificó el plazo de conservación de la NOM-004. Aquí se documenta que la implementación ancla el reloj de retención en la fecha de la última consulta y no en la del último acto médico (BM-NOR-10).
- **Documento 01 §7** verificó que CFDI 4.0 es la única versión válida y que los catálogos del SAT son volátiles. Aquí se documentan las carencias de atributos del comprobante, **marcadas como IPV** porque el Anexo 20 no se verificó a nivel de campo en esta pasada.
- **Documento 01 §8** ya registra como no verificadas la NOM-011-SSA3-2014 (enfermería), la NOM-017-SSA2-2012 (vigilancia) y la NOM-151-SCFI-2016. Los hallazgos que dependen de ellas se marcan IPV y remiten a esa lista en vez de duplicarla.

**Lo que este barrido aportó a los documentos previos, y donde quedó asentado:** los numerales de la NOM-004 verificados aquí y la precisión de que la nota de egreso es el numeral **8.9** están en el documento 01 §2; el **artículo 83 de la Ley General de Salud** y los artículos 225 a 241 sobre prescripción abrieron el §11 **nuevo** de ese documento; los instrumentos que no se pudieron verificar se sumaron a su §8; y las doce decisiones abiertas que este barrido produjo son las preguntas 56 a 67 del documento 06. Ver §12 y §13.

---

## 1. Tabla resumen

### 1.1 Hallazgos por severidad y clase

| Severidad | RSC | INV | IPV | DD | **Total** |
|---|---:|---:|---:|---:|---:|
| **Crítica** | 11 | 7 | 1 | 0 | **19** |
| **Alta** | 9 | 21 | 6 | 5 | **41** |
| **Media** | 1 | 7 | 4 | 11 | **23** |
| **Baja** | 0 | 0 | 1 | 3 | **4** |
| **Total** | **21** | **35** | **12** | **19** | **87** |

Se cuenta una sola clase por hallazgo, la primaria. Varios hallazgos tienen una segunda clase que se indica en su encabezado —por ejemplo BM-PAC-14 es riesgo de seguridad clínica **y** incumplimiento verificado— y no se cuenta dos veces.

### 1.2 Hallazgos por dominio

| Dominio | Crítica | Alta | Media | Baja | Total |
|---|---:|---:|---:|---:|---:|
| Transversal | 5 | 6 | 3 | 0 | 14 |
| Pacientes y expediente | 5 | 4 | 4 | 2 | 15 |
| Triage y urgencias | 3 | 6 | 2 | 0 | 11 |
| Consulta y notas clínicas | 1 | 3 | 3 | 0 | 7 |
| Recetas y farmacia | 3 | 5 | 1 | 0 | 9 |
| Estudios y resultados | 0 | 4 | 3 | 0 | 7 |
| Agenda y citas | 0 | 0 | 1 | 2 | 3 |
| Caja, cobros y CFDI | 0 | 4 | 2 | 0 | 6 |
| Normatividad | 2 | 6 | 2 | 0 | 10 |
| Seguridad, usuarios y roles | 0 | 3 | 2 | 0 | 5 |
| **Total** | **19** | **41** | **23** | **4** | **87** |

### 1.3 Los quince hallazgos de mayor severidad

| # | ID | Hallazgo | Clase | Archivo |
|---|---|---|---|---|
| 1 | BM-PAC-14 | El expediente nuevo afirma antecedentes negados y todos los aparatos y sistemas normales | RSC · INV | `mocks/historiaClinica.ts:570-601` |
| 2 | BM-URG-01 | Botón "Autocompletar valores normales" escribe diez signos vitales inventados | RSC | `pages/triage/page.tsx:105-118, 423, 818` |
| 3 | BM-URG-02 | Nueve signos vitales obligatorios y no nulos impiden documentar al paciente crítico | RSC | `mocks/triage.ts:6-16` · `pages/triage/page.tsx:305-308` |
| 4 | BM-PAC-01 | `alergias: string[]` no distingue "sin alergias conocidas" de "no se interrogó" | RSC | `mocks/patients.ts:20` · `pages/pacientes/detalle/page.tsx:312-313` |
| 5 | BM-FAR-01 | Sin recetario especial ni código de barras: no se pueden prescribir estupefacientes | INV | `mocks/recetas.ts:1-8, 23-40` |
| 6 | BM-TRA-02 | Dieciocho entidades clínicas y financieras sin `sucursalId`; los documentos se imprimen con `sucursales[0]` | INV | 13 componentes de impresión |
| 7 | BM-TRA-05 | La firma se modela como `boolean` o no se modela | INV | `mocks/egresos.ts:25-26` · `mocks/notasEnfermeria.ts:56` |
| 8 | BM-NOR-01 | El consentimiento informado no tiene médico que informa y admite un solo testigo opcional | INV | `mocks/consentimientos.ts:1-20` |
| 9 | BM-NOR-03 | La hoja de egreso no tiene pronóstico, problemas pendientes, causas de muerte ni dos testigos | INV | `mocks/egresos.ts:1-28` |
| 10 | BM-PAC-02 | `edad: number` no puede expresar la edad de un neonato ni de un lactante | RSC | `mocks/patients.ts:7` |
| 11 | BM-TRA-07 | Actor fabricado: el sistema firma documentos con nombres que nadie capturó | INV | `pages/triage/page.tsx:362` · `pages/consultas/page.tsx:239,312` |
| 12 | BM-TRA-09 | Los signos vitales tienen tres representaciones incompatibles y ninguna lleva unidad | RSC · INV | `mocks/triage.ts` · `mocks/notasEvolucion.ts` · `mocks/notasEnfermeria.ts` |
| 13 | BM-URG-04 | `parseFloat(...) \|\| 0` imprime peso 0 kg y talla 0 m en la hoja de triage | RSC | `pages/triage/components/TriagePrintModal.tsx:137-138` |
| 14 | BM-FAR-02 | Dosis, frecuencia y duración como texto libre: no hay verificación de dosis posible | RSC | `mocks/recetas.ts:16-19` |
| 15 | BM-PAC-03 | Sustitutos de sexo contradictorios entre módulos: `'M'` en urgencias, `'F'` en historia clínica | RSC | `pages/urgencias/.../NuevoIngresoModal.tsx:41` · `pages/consultas/.../HistoriaClinicaForm.tsx:162` |

### 1.4 Lo que el prototipo hace bien y debe conservarse como precedente

Un catálogo de defectos que no reconoce los aciertos induce a rediseñar lo que ya está resuelto. Estos patrones del prototipo son correctos y deben ser la referencia al corregir el resto:

| Precedente | Dónde | Por qué es el patrón a replicar |
|---|---|---|
| `inmunizaciones: 'desconocido'` | `mocks/historiaClinica.ts:588` | Es el único campo del expediente que declara explícitamente la ignorancia en vez de fabricar un valor. Es exactamente el patrón que falta en los otros doce campos del mismo objeto. |
| `glucosa: number \| null` | `mocks/triage.ts:15` | Único signo vital que admite "no se midió", y el formulario lo respeta (`pages/triage/page.tsx:359`). Los otros nueve deberían tener el mismo tipo. |
| `ParametroResultado.unidad: string` | `mocks/estudios.ts:15` | Único lugar del modelo donde la unidad es un dato y no un supuesto. |
| Trazabilidad de anulación | `mocks/certificados.ts:32-36` | `estado`, `anuladoPor`, `anuladoEn`, `motivoAnulacion`: el patrón correcto de append-only. Debe replicarse en recetas, cobros y notas. |
| `ProfesionalSalud` | `mocks/profesionales.ts:1-16` | Cédula, vigencia de cédula, certificación de consejo y vigencia: el modelo de credenciales está bien resuelto. El problema es que está desconectado de `User` y de `Doctor`. |
| `Appointment.sucursalId` y `Consultation.sucursalId` | `mocks/appointments.ts:3` · `mocks/consultas.ts:5` | Dos de las tres entidades que sí llevan ámbito de sucursal. Son la prueba de que el patrón correcto ya está en el código y sólo falta generalizarlo. |

---

## 2. Dominio transversal

Estos catorce hallazgos no pertenecen a un módulo: son propiedades del modelo completo. Se atienden primero porque casi todos los hallazgos de dominio los presuponen.

---

### BM-TRA-01 · Crítica · DD + IPV — El modelo no tiene noción de tenant

**Evidencia.** La cadena `tenant` no aparece **ni una vez** en `docs/frontend/src/`. Ninguna de las 34 entidades de dominio lleva identificador de organización.

**Caso real que no se puede representar.** MediCore se ofrece como multi-tenant. Dos clínicas distintas contratan el servicio. Con el modelo actual, `patients`, `recetas`, `urgencias`, `caja` y `facturacion` son colecciones globales: no existe el campo por el cual filtrar. Cualquier consulta que omita el filtro —y no hay filtro que omitir, porque no hay campo— devuelve datos de todos los clientes. El expediente de un paciente de la clínica A es visible desde la clínica B.

**Consecuencia.** Legal y de privacidad. Es una fuga de datos personales sensibles entre responsables distintos, no entre usuarios del mismo responsable. Adicionalmente hace imposible la portabilidad y la supresión por tenant, y contamina toda métrica agregada.

**Fundamento.** El principio de seguridad y el deber de confidencialidad de la LFPDPPP vigente son aplicables, pero **el numeral exacto no se verificó en fuente oficial en esta pasada**: se marca IPV. La NOM-004 numeral 5.7 (verificado, DOF 15-10-2012) obliga a que la información del expediente sea manejada con discreción y confidencialidad, lo cual un modelo sin frontera de tenant no puede sostener.

**Cambio propuesto.** Tipo base obligatorio en toda entidad persistida, sin excepción:

```ts
/** Identificador de la organización contratante. Frontera dura de aislamiento. */
export type TenantId = string & { readonly __brand: 'TenantId' };

export interface EntidadDeTenant {
  readonly tenantId: TenantId;
}
```

Toda entidad de dominio extiende `EntidadDeTenant`. La marca de tipo (`__brand`) impide pasar un `string` cualquiera donde se espera un `TenantId`, que es la clase de error que produce fugas.

---

### BM-TRA-02 · Crítica · INV — Dieciocho entidades sin `sucursalId`, y los documentos se imprimen con `sucursales[0]`

**Evidencia.** Sólo seis de los 34 archivos de `mocks/` mencionan `sucursalId` o `sucursal:`, y de esos, tres son de configuración o reportes. Las entidades **clínicas y financieras** que no llevan ámbito de sucursal son: `TriageRecord`, `Urgencia`, `Receta`, `NotaEvolucion`, `HistoriaClinica`, `NotaEnfermeria`, `HojaEgreso`, `ConsentimientoInformado`, `EstudioSolicitado`, `DispensacionFarmacia`, `InventarioFarmacia`, `FacturaCFDI`, `CashSession`, `CashTransaction`, `CertificadoMedico`, `ReferenciaMedica`, `CasoVigilancia`, `SolicitudARCO`.

La consecuencia es directa y está en el código: como la entidad no sabe en qué sucursal ocurrió, **trece componentes de impresión resuelven el establecimiento tomando el primero del arreglo**:

| Componente | Línea |
|---|---|
| `pages/triage/components/TriagePrintModal.tsx` | 91 |
| `pages/recetas/components/RecetaPrintModal.tsx` | 19 |
| `pages/pacientes/detalle/components/ExpedientePrintModal.tsx` | 53 |
| `pages/consultas/components/NotaEvolucionPrintModal.tsx` | 36 |
| `pages/consultas/components/HistoriaClinicaPrintModal.tsx` | 29 |
| `pages/consultas/components/CertificadoMedicoPrintModal.tsx` | 24 |
| `pages/normatividad/consentimientos/components/ConsentimientoPrintModal.tsx` | 17 |
| `pages/normatividad/egresos/components/EgresoPrintModal.tsx` | 18 |
| `pages/normatividad/referencias/components/ReferenciaPrintModal.tsx` | 18 |
| `pages/normatividad/notas-enfermeria/components/NotaEnfermeriaPrintModal.tsx` | 15 |
| `pages/normatividad/vigilancia/components/VigilanciaPrintModal.tsx` | 17 |
| `pages/normatividad/derechos-arco/components/ARCOPrintModal.tsx` | 17 |
| `pages/agenda/components/TicketPrintModal.tsx` | 18 |

Todos ejecutan `const sucursal = sucursales[0];`, es decir `'Clínica Central - CDMX'` (`mocks/branches.ts:27-28`).

**Caso real que no se puede representar.** Un paciente es atendido en la sucursal de Guadalajara. Se imprime su receta, su nota de evolución y su consentimiento informado. Los tres documentos declaran haber sido emitidos en la Clínica Central de la Ciudad de México, con el domicilio de la Ciudad de México. El acto médico y el documento que lo acredita apuntan a establecimientos distintos.

**Consecuencia.** Legal. El documento clínico identifica falsamente al establecimiento donde se prestó el servicio. Ante una queja ante CONAMED, un requerimiento de autoridad sanitaria o un juicio, el expediente acredita una atención en un lugar donde no ocurrió. Operativamente también rompe el corte de caja, el inventario y todo indicador por sucursal.

**Fundamento (verificado 2026-08-22, texto del DOF).**
- NOM-004-SSA3-2012 numeral **5.2.1**: "Tipo, nombre y domicilio del establecimiento y en su caso, nombre de la institución a la que pertenece".
- Numeral **10.1.1.2** (consentimiento informado): "Nombre, razón o denominación social del establecimiento".
- Numeral **10.2.3.1** (hoja de egreso voluntario): "Nombre y domicilio del establecimiento".
- Numeral **10.3.1** (notificación al Ministerio Público): "Nombre, razón o denominación social del establecimiento notificador".

**Cambio propuesto.**

```ts
export type SucursalId = string & { readonly __brand: 'SucursalId' };

/** Todo acto clínico, administrativo o fiscal ocurre en una sucursal concreta. */
export interface ActoEnSucursal extends EntidadDeTenant {
  readonly sucursalId: SucursalId;
}
```

Las dieciocho entidades listadas extienden `ActoEnSucursal`. Los trece componentes de impresión resuelven el establecimiento a partir de `entidad.sucursalId` y **no deben tener acceso al arreglo completo de sucursales**; se les inyecta el establecimiento resuelto. Regla de implementación: eliminar `sucursales[0]` del código de impresión y hacer que el tipo del componente reciba `sucursal: Sucursal` como propiedad obligatoria, de modo que el compilador impida el olvido.

---

### BM-TRA-03 · Alta · INV — `Sucursal` no tiene los datos del establecimiento que exige la norma

**Evidencia.** `mocks/branches.ts:9-23`. `Sucursal` tiene `nombre`, `direccion`, `ciudad`, `estado`, `codigoPostal`, `telefono`, `email`, horarios y consultorios. **No tiene** tipo de establecimiento, razón o denominación social del propietario o concesionario, licencia sanitaria, ni CLUES.

Adicionalmente, la licencia sanitaria está modelada en el lugar equivocado: `ProfesionalSalud.licenciaSanitariaEstablecimiento` (`mocks/profesionales.ts:9-10`) cuelga del profesional. La licencia sanitaria es del establecimiento, no del médico. Con ese modelado, dos médicos de la misma sucursal pueden declarar licencias distintas.

**Caso real que no se puede representar.** Emitir cualquier documento del expediente con los datos generales que la norma exige. También: registrar que la sucursal de Monterrey pertenece a una persona moral distinta de la de la Ciudad de México, escenario ordinario en grupos clínicos.

**Consecuencia.** Legal. Todo documento del expediente nace incompleto respecto del contenido mínimo obligatorio.

**Fundamento (verificado 2026-08-22).** NOM-004-SSA3-2012 numeral **5.2.1** ("Tipo, nombre y domicilio del establecimiento…") y numeral **5.2.2** ("En su caso, la razón y denominación social del propietario o concesionario").

**Cambio propuesto.**

```ts
export interface Sucursal extends EntidadDeTenant {
  id: SucursalId;
  nombre: string;
  /** NOM-004 5.2.1 — "Tipo … del establecimiento". */
  tipoEstablecimiento: 'consultorio' | 'clinica_ambulatoria' | 'clinica_con_urgencias' | 'hospital' | 'laboratorio' | 'gabinete_imagen';
  /** NOM-004 5.2.2 — razón o denominación social del propietario o concesionario. */
  propietario: { razonSocial: string; rfc: string; tipoPersona: 'fisica' | 'moral' };
  /** NOM-004 5.2.1 — nombre de la institución a la que pertenece, cuando aplique. */
  institucionPerteneciente: string | null;
  domicilio: Domicilio;
  licenciaSanitaria: { numero: string; vigenciaHasta: FechaISO; emitidaPor: string } | null;
  /** Clave Única de Establecimientos de Salud. Requerida para reportar a la DGIS. */
  clues: string | null;
  // … horarios y consultorios sin cambio
}
```

`licenciaSanitariaEstablecimiento` y `vigenciaLicencia` se eliminan de `ProfesionalSalud`.

---

### BM-TRA-04 · Alta · INV — No existe la doble marca de tiempo, y algunos documentos sólo guardan fecha

**Evidencia.** Ninguna entidad tiene `occurred_at` / `recorded_at`. El patrón dominante es `fecha: string` más `hora: string` como dos campos de texto independientes, sin zona horaria: `mocks/notasEvolucion.ts:26-27`, `mocks/urgencias.ts:12-15`, `mocks/triage.ts:4-5`, `mocks/recetas.ts:33-34`, `mocks/consentimientos.ts:13-14`.

Casos peores, donde **no hay hora en absoluto**:
- `mocks/historiaClinica.ts:573-574`: `fechaCreacion` y `fechaActualizacion` se guardan como `new Date().toISOString().split('T')[0]`, es decir se descarta la hora deliberadamente.
- `mocks/estudios.ts:35`: `fechaResultado: string | null` sin hora.
- `mocks/derechosARCO.ts:9-10`: `fechaSolicitud` y `fechaRespuesta` sin hora.
- `mocks/vigilancia.ts:9`: `fechaNotificacion` sin hora, en una entidad cuyo `tipoNotificacion` puede ser `'inmediata'`.

Y en `pages/triage/page.tsx:348-349`, la fecha y la hora del registro se toman del reloj del momento de guardar y se asientan como si fueran la hora del acto.

**Caso real que no se puede representar.** El médico atiende una urgencia a las 23:40 y captura la nota a las 00:20 del día siguiente. El modelo puede guardar una hora o la otra, no las dos. Si guarda la de captura, el expediente afirma que la atención ocurrió después de que ocurrió; si guarda la del acto, no queda rastro de que la nota se elaboró con cuarenta minutos de retraso, que es justo el dato que interesa en una auditoría. El caso extremo, frecuente en urgencias, es la nota que se captura al día siguiente: el expediente la fecha al día siguiente.

**Consecuencia.** Legal y de trazabilidad. Imposibilita reconstruir la secuencia real de los actos, que es el objeto de una auditoría de expediente. En vigilancia epidemiológica con notificación inmediata, imposibilita acreditar el cumplimiento del plazo.

**Fundamento (verificado 2026-08-22).** NOM-004-SSA3-2012 numeral **5.10**: "Todas las notas en el expediente clínico deberán contener **fecha, hora** y nombre completo de quien la elabora, así como la firma autógrafa, electrónica o digital". Guardar sólo la fecha, como hace `createEmptyHistoriaClinica`, incumple el numeral de forma literal.

**Cambio propuesto.**

```ts
/** Instante absoluto con zona horaria explícita. Nunca se parte en fecha y hora. */
export type InstanteISO = string & { readonly __brand: 'InstanteISO' }; // '2026-08-22T23:40:00-06:00'
export type FechaISO = string & { readonly __brand: 'FechaISO' };       // '2026-08-22'

export interface Fechado {
  /** Cuándo ocurrió el acto en el mundo real. Lo declara quien registra. */
  readonly ocurrioEn: InstanteISO;
  /** Cuándo el sistema lo recibió. Lo pone el servidor. Inmutable. */
  readonly registradoEn: InstanteISO;
  /** Zona horaria de la sucursal al momento del acto, para presentación estable. */
  readonly zonaHoraria: string; // IANA, p. ej. 'America/Mexico_City'
}
```

Regla: `ocurrioEn` es capturable y editable antes de firmar; `registradoEn` nunca es capturable. Cuando la diferencia entre ambos exceda un umbral configurable, la nota se marca como registro diferido y el documento impreso lo declara.

---

### BM-TRA-05 · Crítica · INV — La firma se modela como `boolean`, o no se modela

**Evidencia.**
- `mocks/egresos.ts:25-26`: `firmaPaciente: boolean; firmaMedico: boolean;`
- `mocks/notasEnfermeria.ts:56`: `firmaEnfermera: boolean;`
- `mocks/notasEvolucion.ts:22-39`: `NotaEvolucion` **no tiene ningún campo de firma**.
- `mocks/consultas.ts:3-26`: `Consultation` **no tiene ningún campo de firma**.
- `mocks/recetas.ts:23-40`: `Receta` **no tiene ningún campo de firma**.
- `mocks/consentimientos.ts:12`: `consentido: boolean` es lo más parecido a una firma que existe.
- `mocks/estudios.ts:21-43`: `EstudioSolicitado` no tiene firma de quien informa.

**Caso real que no se puede representar.** Acreditar, ante una autoridad o un tribunal, que el doctor García firmó esta nota de evolución, con este contenido exacto, en este momento, y que el contenido no se modificó después. Un `boolean` en `true` no acredita nada: no dice quién firmó, ni cuándo, ni sobre qué contenido, y se puede poner en `true` desde cualquier parte del código.

**Consecuencia.** Legal. El expediente electrónico pierde valor probatorio. Este es el hallazgo con mayor exposición jurídica del catálogo después de los de seguridad clínica.

**Fundamento (verificado 2026-08-22).** NOM-004-SSA3-2012 numeral **5.10**: exige "la firma autógrafa, electrónica o digital, según sea el caso; estas dos últimas se sujetarán a las disposiciones jurídicas aplicables". El documento 01 §6 ya estableció que la implementación actual (imagen en `localStorage`) no es firma en sentido jurídico. Aquí se cierra el hueco del **modelo**: aunque se implementara una firma criptográfica, no hay dónde guardarla.

**Cambio propuesto.**

```ts
export type FirmaRol = 'autor' | 'paciente' | 'representante_legal' | 'testigo' | 'responsable_servicio' | 'informante';

export interface Firma {
  readonly rol: FirmaRol;
  readonly firmanteTipo: 'usuario' | 'persona_externa';
  /** Usuario del sistema, cuando aplique. */
  readonly usuarioId: UsuarioId | null;
  /** Nombre completo tal como se asienta en el documento. NOM-004 5.10. */
  readonly nombreCompleto: string;
  /** LGS art. 83: cédula y, en su caso, certificado de especialidad, en los documentos. */
  readonly cedulaProfesional: string | null;
  readonly certificadoEspecialidad: string | null;
  /** Hash del contenido canónico firmado. La firma se rompe si el contenido cambia. */
  readonly hashContenido: string;
  readonly algoritmo: 'SHA-256';
  readonly firmadoEn: InstanteISO;
  readonly medio: 'autografa_digitalizada' | 'electronica_simple' | 'electronica_avanzada' | 'efirma_sat';
  /** Sello de tiempo de tercero, cuando exista. */
  readonly selloTiempo: string | null;
}

export interface Firmable {
  readonly firmas: readonly Firma[];
  readonly estadoDocumental: 'borrador' | 'firmado' | 'anulado';
}
```

Los `boolean` de `HojaEgreso` y `NotaEnfermeria` se eliminan. `NotaEvolucion`, `Consultation`, `Receta`, `EstudioSolicitado`, `ConsentimientoInformado`, `TriageRecord` y `NotaEnfermeria` implementan `Firmable`.

---

### BM-TRA-06 · Alta · INV — Los documentos clínicos son mutables y no hay addendum

**Evidencia.** Ninguna entidad clínica tiene estado documental. `HistoriaClinica` tiene `fechaActualizacion` (`mocks/historiaClinica.ts:574`), lo que evidencia que el diseño previsto es la sobreescritura in situ: la versión anterior desaparece. `NotaEvolucion` no tiene ni `fechaActualizacion`, es decir se modifica sin dejar rastro. La única excepción correcta es `CertificadoMedico` (`mocks/certificados.ts:32-36`), que sí modela anulación con autor, momento y motivo.

**Caso real que no se puede representar.** El médico asienta un diagnóstico, y dos días después, con el resultado de laboratorio, corrige el diagnóstico. La corrección legítima requiere que conste **lo que se asentó originalmente** y **la corrección**, porque las decisiones intermedias se tomaron con la información original. El modelo actual borra la primera versión y deja el expediente afirmando que el médico siempre supo lo que supo después.

**Consecuencia.** Legal. Elimina la posibilidad de acreditar qué información tenía el clínico en cada momento, que es la pregunta central de cualquier análisis de responsabilidad profesional.

**Fundamento (verificado 2026-08-22).** NOM-004-SSA3-2012 numeral **5.11**: las notas deberán conservarse "sin enmendaduras ni tachaduras". La lectura en soporte electrónico de esa exigencia es la inmutabilidad del documento firmado: no se corrige sobre el original, se agrega. Concuerda con el numeral 5.10, que ata la firma al contenido.

**Cambio propuesto.** Toda entidad clínica es append-only tras la firma. Se agrega el tipo de addendum y se prohíbe la mutación:

```ts
export interface Addendum extends Fechado, Firmable {
  readonly id: string;
  readonly documentoTipo: string;
  readonly documentoId: string;
  readonly motivo: 'correccion_de_error' | 'informacion_adicional' | 'resultado_tardio' | 'aclaracion';
  readonly texto: string;
  /** Qué se corrige. No se altera el documento original. */
  readonly campoCorregido: string | null;
  readonly valorAnteriorTextual: string | null;
}
```

Regla de implementación: las entidades clínicas se declaran con `readonly` en todas sus propiedades una vez `estadoDocumental === 'firmado'`. Toda corrección posterior es un `Addendum`. El documento impreso incluye los addenda a continuación del original, nunca en lugar de él.

---

### BM-TRA-07 · Crítica · INV — Actor fabricado: el sistema atribuye actos a personas que nadie capturó

**Evidencia.**
- `pages/triage/page.tsx:362`: `realizadoPor: 'Lic. Carmen Vargas'` — literal fijo en el código, en el momento de guardar el registro de triage.
- `pages/consultas/page.tsx:239` y `:312`: `doctorName: doctors[0]?.nombre || 'Dr. Asignado'`.
- `pages/estudios/page.tsx:264`: `doctorName: doctor?.nombre || 'Dr. Asignado'`.
- `pages/urgencias/components/AtencionUrgenciaPanel.tsx:442`: `doctorName={urgencia.doctorName || 'Dr. Alejandro García'}` — cuando la urgencia no tiene médico asignado, el panel de atención estampa el nombre de un médico concreto.
- `pages/pacientes/detalle/page.tsx:755`: `anuladoPor: 'Dr. Alejandro Garcia Mendoza'` en el flujo de anulación de certificados.

El defecto de tipo que lo permite: `TriageRecord.realizadoPor: string` (`mocks/triage.ts:18`), `DispensacionFarmacia.usuario: string` (`mocks/farmacia.ts:59`), `CashTransaction.usuario: string` (`mocks/caja.ts:38`), `NotaEvolucion.medico: string` (`mocks/notasEvolucion.ts:28`). El autor es una **cadena de texto**, no una referencia al usuario autenticado.

**Caso real que no se puede representar.** Saber quién realizó realmente el triage. El campo dice "Lic. Carmen Vargas" en todos los registros, incluidos los que capturó otra persona en otra sucursal en otro turno. En el caso de `AtencionUrgenciaPanel`, la atribución es peor que vacía: es falsa y nombra a una persona identificable.

**Consecuencia.** Legal, y potencialmente daño a un tercero. Atribuye actos médicos a profesionales que no los realizaron. Si el acto se cuestiona, el expediente acusa a quien no estuvo.

**Fundamento (verificado 2026-08-22).** NOM-004-SSA3-2012 numeral **5.10**: toda nota debe contener "nombre completo de quien la elabora". El nombre debe ser de quien elabora, no un literal del código fuente. Numeral **9.2.7**: "Identificación del personal que realizó el estudio".

**Cambio propuesto.** El autor nunca se captura ni se sustituye: se deriva de la sesión y es obligatorio.

```ts
export type UsuarioId = string & { readonly __brand: 'UsuarioId' };

/** Autor de un acto. Se resuelve del contexto de autenticación, jamás de un literal. */
export interface Autoria {
  readonly registradoPorUsuarioId: UsuarioId;
  /** Copia inmutable de las credenciales al momento del acto (LGS art. 83). */
  readonly registradoPorSnapshot: {
    nombreCompleto: string;
    rol: UserRole;
    cedulaProfesional: string | null;
    certificadoEspecialidad: string | null;
  };
}
```

Regla de implementación: se prohíben los operadores `||` y `??` con literal de nombre de persona. Si no hay usuario autenticado, la operación falla; no se sustituye. La copia (`snapshot`) es necesaria porque la cédula del profesional puede cambiar o vencer después, y el documento debe conservar lo que se imprimió.

---

### BM-TRA-08 · Alta · INV — Tres identidades profesionales paralelas y ninguna es la fuente de verdad

**Evidencia.** Coexisten `User` (`mocks/users.ts:4-22`), `Doctor` (`mocks/doctors.ts:1`) y `ProfesionalSalud` (`mocks/profesionales.ts:1-16`). `User` tiene un `doctorId?` opcional que apunta a `Doctor`, pero **nada conecta a `ProfesionalSalud`**, que es precisamente la entidad que sí tiene la cédula, su vigencia, la certificación de consejo y la vigencia de la certificación.

Además, la cédula se copia como texto libre en al menos seis entidades: `Receta.doctorCedula` (`mocks/recetas.ts:30`), `NotaEvolucion.medicoCedula` (`:29`), `HojaEgreso.cedulaTratante` (`mocks/egresos.ts:23`), `ReferenciaMedica.cedulaRemitente` y `cedulaReceptor` (`mocks/referencias.ts:18,20`), `CasoVigilancia.cedulaMedico` (`mocks/vigilancia.ts:17`), `CertificadoMedico.doctorCedula` (`mocks/certificados.ts:11`). Y en `User`, la cédula es **opcional**: `cedulaProfesional?: string` (`mocks/users.ts:15`).

**Caso real que no se puede representar.** Impedir que un usuario con rol `medico` y sin cédula capturada emita una receta. El tipo lo permite: `cedulaProfesional` es opcional. Tampoco se puede bloquear a un médico cuya cédula venció, porque la vigencia vive en otra entidad desconectada.

**Consecuencia.** Legal. El establecimiento es solidariamente responsable del cumplimiento por parte del personal que presta servicios en él (NOM-004 numeral 5.1, verificado). Permitir la emisión de documentos sin credencial verificable traslada ese riesgo al cliente.

**Fundamento (verificado 2026-08-22, Cámara de Diputados, LGS con últimas reformas DOF 15-01-2026).** LGS artículo **83** (reformado DOF 01-09-2011): "Quienes ejerzan las actividades profesionales, técnicas y auxiliares y las especialidades médicas, deberán poner a la vista del público un anuncio que indique la institución que les expidió el Título, Diploma, número de su correspondiente cédula profesional y, en su caso, el Certificado de Especialidad vigente. **Iguales menciones deberán consignarse en los documentos y papelería que utilicen en el ejercicio de tales actividades** y en la publicidad que realicen al respecto."

Es decir: la cédula y, cuando aplique, el certificado de especialidad vigente, deben constar en los documentos. No es opcional.

**Cambio propuesto.** `ProfesionalSalud` se convierte en la fuente única de credenciales y `User` la referencia. La cédula deja de ser opcional para los roles que la requieren, mediante unión discriminada:

```ts
type UsuarioBase = { id: UsuarioId; nombre: string; apellidos: ApellidosPersona; email: string; /* … */ };

export type User = EntidadDeTenant & UsuarioBase & (
  | { rol: 'medico' | 'enfermeria'; profesionalId: ProfesionalId }   // obligatorio
  | { rol: 'admin' | 'recepcion' | 'caja' | 'farmacia' | 'laboratorio' | 'directivo'; profesionalId: ProfesionalId | null }
);
```

Los seis campos `*Cedula: string` denormalizados se sustituyen por el `registradoPorSnapshot` de `Autoria` (BM-TRA-07), que además incorpora el certificado de especialidad que hoy no se imprime en ningún documento.

---

### BM-TRA-09 · Crítica · RSC + INV — Los signos vitales tienen tres representaciones incompatibles y ninguna lleva unidad

**Evidencia.** El mismo concepto clínico está modelado tres veces, con tipos distintos:

| Concepto | `TriageRecord` (`mocks/triage.ts:6-16`) | `SignosVitalesEvolucion` (`mocks/notasEvolucion.ts:10-20`) | `NotaEnfermeria` (`mocks/notasEnfermeria.ts:31-39`) |
|---|---|---|---|
| peso | `number` | `string` | `string` |
| talla | `number` | `string` | `string` |
| temperatura | `number` | `string` | `string` |
| presión sistólica | `number` | `string` | `string` |
| frecuencia cardiaca | `number` | `string` | `string` |
| saturación | `number` | `string` | `string` |
| glucosa | `number \| null` | `string` | `string` |

Ninguno de los veintitantos campos lleva unidad. La unidad es un supuesto implícito del código: `mocks/triage.ts:42` guarda `talla: 1.62`, es decir metros, y el cálculo de IMC de `pages/triage/page.tsx:244` asume metros; pero en pediatría la talla se registra en centímetros, y `mocks/notasEnfermeria.ts:39` la declara `string`, con lo que `'162'` y `'1.62'` son ambos válidos y significan lo mismo.

**Caso real que no se puede representar.** Graficar la evolución de la presión arterial de un paciente a lo largo de su estancia, tomando los valores del triage, de la nota médica y de la hoja de enfermería. Son tres tipos distintos, dos de ellos texto libre, ninguno con unidad. La gráfica no se puede construir sin heurísticas de interpretación, y una heurística sobre un signo vital es una fuente de error clínico.

El caso peligroso: un peso registrado como `'8'` en la nota de enfermería de un lactante. ¿Ocho kilogramos, o ocho libras porque el papá lo dijo así? El tipo no lo sabe y el sistema calcula dosis con ese número.

**Consecuencia.** Seguridad clínica. En un sistema que presenta o calcula dosis, una unidad implícita es un error de medicación esperando ocurrir. Y adicionalmente, incumplimiento: la gráfica de signos vitales es contenido obligatorio de la hoja de enfermería.

**Fundamento (verificado 2026-08-22).** NOM-004-SSA3-2012 numeral **9.1.2**: la hoja de enfermería deberá contener "Gráfica de signos vitales". Numeral **6.1.2**: la exploración física de la historia clínica deberá tener "signos vitales (temperatura, tensión arterial, frecuencia cardiaca y respiratoria), peso y talla".

**Cambio propuesto.** Una sola representación, con unidad en el tipo y ausencia explícita. Se define un módulo `signosVitales.ts` que las tres entidades consumen:

```ts
/** Medición con unidad explícita. La ausencia es un estado, no un cero ni una cadena vacía. */
export type Medicion<U extends string> =
  | { estado: 'medido'; valor: number; unidad: U }
  | { estado: 'no_medido'; razon: 'no_disponible' | 'paciente_no_cooperador' | 'equipo_no_disponible' | 'no_aplica' | 'diferido'; nota?: string };

export type UnidadPeso = 'kg' | 'g';
export type UnidadTalla = 'cm' | 'm';
export type UnidadTemp = 'C';
export type UnidadPresion = 'mmHg';
export type UnidadGlucosa = 'mg/dL' | 'mmol/L';
export type UnidadFrecuencia = 'lpm' | 'rpm';
export type UnidadSat = '%';

export interface SignosVitales {
  peso: Medicion<UnidadPeso>;
  talla: Medicion<UnidadTalla>;
  temperatura: Medicion<UnidadTemp> & { sitio?: 'axilar' | 'oral' | 'rectal' | 'timpanica' | 'temporal' };
  presion: { sistolica: Medicion<UnidadPresion>; diastolica: Medicion<UnidadPresion>; posicion?: 'sentado' | 'acostado' | 'de_pie'; miembro?: string };
  frecuenciaCardiaca: Medicion<UnidadFrecuencia>;
  frecuenciaRespiratoria: Medicion<UnidadFrecuencia>;
  saturacionOxigeno: Medicion<UnidadSat> & { aporteOxigeno?: { fio2?: number; litrosPorMinuto?: number } };
  glucosa: Medicion<UnidadGlucosa>;
  /** IMC no se almacena: se deriva de peso y talla al momento de presentar. Ver BM-TRA-10. */
}
```

`TriageRecord`, `SignosVitalesEvolucion` y los nueve campos de `NotaEnfermeria` se sustituyen por `signosVitales: SignosVitales`. La saturación con aporte de oxígeno es necesaria porque un 98 % con mascarilla reservorio y un 98 % al aire ambiente son hallazgos clínicos opuestos, y hoy son el mismo número.

---

### BM-TRA-10 · Media · DD — Valores derivados almacenados como si fueran datos

**Evidencia.**
- `mocks/patients.ts:7`: `edad: number`, calculada en `pages/pacientes/nuevo/page.tsx:274` con `calcularEdadDesdeFecha(form.fechaNacimiento)` y persistida. Deja de ser cierta el día del cumpleaños.
- `mocks/triage.ts:8`: `imc: number`, derivable de peso y talla.
- `mocks/derechosARCO.ts:16`: `diasRestantes: number`. Es el plazo legal restante de una solicitud ARCO, almacenado. Al día siguiente miente, y es el dato con el que se decide si se está a tiempo.
- `mocks/retencion.ts:147,149`: `aniosTranscurridos` y `diasRestantes`.
- `mocks/urgencias.ts:27`: `edad: number`, copia de la de `Patient`.
- `mocks/caja.ts:9-13`: `totalEfectivo`, `totalTarjeta`, `totalTransferencia`, `totalIngresos`, `cantidadTransacciones` en `CashSession`, derivables de las transacciones.

**Caso real.** Una solicitud ARCO se recibe el 1 de agosto con `plazoDias: 20` y `diasRestantes: 20`. El 15 de agosto la pantalla sigue diciendo 20 días restantes, porque nadie recalculó. El responsable de privacidad decide con un dato falso sobre un plazo legal.

**Consecuencia.** Operativa y legal. Los derivados almacenados divergen en silencio.

**Cambio propuesto.** Los derivados se calculan al leer y no se persisten. `Patient.edad` se elimina y se sustituye por la función de edad clínica descrita en BM-PAC-02. `TriageRecord.imc` se elimina. `SolicitudARCO.diasRestantes` y `RegistroRetencionPaciente.{aniosTranscurridos,diasRestantes}` se eliminan; el plazo se deriva de `fechaSolicitud` más `plazoDias`. Los totales de `CashSession` se conservan **sólo** al cerrar la sesión, como cifras selladas del corte, y se renombran para que su naturaleza sea explícita: `totalesAlCierre: TotalesCorte | null`.

---

### BM-TRA-11 · Media · IPV — Identidad del paciente denormalizada en catorce entidades

**Evidencia.** `patientName` y `patientExpediente` se copian en `Urgencia` (`mocks/urgencias.ts:10-11`), `Receta` (`:26-27`), `HojaEgreso`, `ConsentimientoInformado`, `NotaEnfermeria`, `EstudioSolicitado`, `DispensacionFarmacia`, `ReferenciaMedica`, `CasoVigilancia`, `SolicitudARCO`, `CertificadoMedico`, `Consultation`, `TriagePatient` y `CashTransaction` (como `paciente`).

**Caso real.** Un paciente corrige su nombre por resolución judicial de cambio de identidad de género. Se actualiza `Patient`. Las catorce copias conservan el nombre anterior, y los tableros, listas y búsquedas siguen mostrándolo. El derecho de rectificación se ejerció y el sistema no lo cumplió.

**Consecuencia.** Privacidad y operativa. Multiplica la superficie de datos personales y hace la rectificación inviable.

**Fundamento.** El principio de minimización y el derecho de rectificación de la LFPDPPP vigente son aplicables, pero **el numeral exacto no se verificó en esta pasada**: IPV.

**Cambio propuesto.** Las entidades conservan sólo `pacienteId`. La resolución del nombre para presentación e impresión se hace en el momento de leer. Excepción legítima y única: los **documentos firmados** conservan un `snapshot` inmutable de la identidad tal como se imprimió, porque el documento firmado no puede cambiar retroactivamente. La distinción es la clave: la copia en la entidad transaccional es deuda; la copia en el documento firmado es requisito.

---

### BM-TRA-12 · Alta · IPV — La contraseña vive en la entidad de dominio, en claro

**Evidencia.** `mocks/users.ts:9`: `password: string;` como propiedad de `User`. Los valores son literales en claro: `password: 'Admin123!'` en `mocks/users.ts:43`, `:63`, `:83` y siguientes.

**Consecuencia.** Seguridad. Aunque sea un prototipo sin backend, el tipo es el contrato que se va a implementar: modelar la contraseña como propiedad del usuario induce a persistirla junto con el resto del perfil y a exponerla en cualquier respuesta que serialice `User`.

**Fundamento.** El deber de seguridad de la LFPDPPP vigente es aplicable; **el numeral exacto no se verificó en esta pasada**: IPV.

**Cambio propuesto.** `password` se elimina de `User`. Las credenciales viven en una entidad separada que nunca se serializa hacia el cliente:

```ts
/** Nunca se expone por API. Nunca se incluye en el tipo User. */
interface CredencialUsuario {
  usuarioId: UsuarioId;
  hashContrasena: string;      // Argon2id
  algoritmo: 'argon2id';
  actualizadaEn: InstanteISO;
  debeCambiar: boolean;
  segundoFactor: { tipo: 'totp' | 'ninguno'; habilitadoEn: InstanteISO | null };
}
```

---

### BM-TRA-13 · Media · DD — Las llaves foráneas son `string` y hay al menos una rota en los datos

**Evidencia.** `mocks/profesionales.ts:38`: `sucursalId: 's1'`. En `mocks/branches.ts:27` las sucursales son `'suc1'`, `'suc2'`, etc. `'s1'` no existe. El compilador no lo detecta porque ambos son `string`.

**Consecuencia.** Deuda de diseño con manifestación ya presente: una llave foránea inválida en los datos semilla. En producción, referencias colgantes silenciosas.

**Cambio propuesto.** Tipos marcados para todos los identificadores (`TenantId`, `SucursalId`, `PacienteId`, `UsuarioId`, `ProfesionalId`, `RecetaId`, …), como en BM-TRA-01 y BM-TRA-02. El patrón cuesta una línea por identificador y convierte una clase entera de errores en errores de compilación.

---

### BM-TRA-14 · Alta · IPV — Los diagnósticos son texto libre y el catálogo CIE-10 no se usa

**Evidencia.** Existe `mocks/diagnosticos.ts` con `DiagnosticoCIE10`, pero las entidades que registran diagnósticos usan cadenas: `Consultation.diagnosticoPrincipal: string` y `diagnosticosSecundarios: string[]` (`mocks/consultas.ts:19-20`), `NotaEvolucion.diagnosticoPrincipal: string` (`mocks/notasEvolucion.ts:34`), `HojaEgreso.diagnosticoIngreso`/`diagnosticoEgreso: string` (`mocks/egresos.ts:11,16`), `Receta.diagnosticoRelacionado: string` (`mocks/recetas.ts:38`), `CertificadoMedico.diagnostico: string` (`mocks/certificados.ts:17`). Sólo `CasoVigilancia` tiene un campo `cie10` (`mocks/vigilancia.ts:7`), y es `string` sin validación.

En los datos semilla el código va embebido en el texto: `'Gastritis (K29.7)'`, `'Cefalea tensional (G44.2)'` (`pages/pacientes/detalle/page.tsx:529,531`).

**Caso real.** Reportar morbilidad a la DGIS, o construir el reporte de los diagnósticos más frecuentes, o detectar que un paciente tiene diabetes registrada en tres notas escritas de tres formas distintas. Ninguna es posible sobre texto libre.

**Consecuencia.** Interoperabilidad y reporte obligatorio de información en salud. El documento 01 §8 registra la NOM-035-SSA3-2012 (información en salud) como **no verificada**, por lo que aquí no se afirma incumplimiento: se marca IPV.

**Cambio propuesto.**

```ts
export interface DiagnosticoAsentado {
  /** Código de la clasificación vigente. Obligatorio salvo impresión diagnóstica inicial. */
  codigo: string | null;
  sistema: 'CIE-10' | 'CIE-11';
  /** Texto tal como lo asentó el clínico. Se conserva siempre. */
  textoLibre: string;
  tipo: 'principal' | 'secundario' | 'impresion_diagnostica' | 'descartado';
  certeza: 'confirmado' | 'presuntivo' | 'a_descartar';
  /** Presente al ingreso, para distinguir comorbilidad de complicación. */
  presenteAlIngreso: boolean | null;
}
```

El texto libre se conserva porque en la primera valoración el clínico legítimamente no tiene un código; lo que no debe ocurrir es que el código nunca llegue.

---

## 3. Pacientes y expediente

---

### BM-PAC-01 · Crítica · RSC — `alergias: string[]` no distingue "sin alergias conocidas" de "no se interrogó"

**Evidencia.**
- `mocks/patients.ts:20`: `alergias: string[];`
- `pages/pacientes/nuevo/page.tsx:287`: todo paciente nuevo se crea con `alergias: []`, sin que el formulario pregunte por alergias en ninguno de sus tres pasos.
- `pages/pacientes/detalle/page.tsx:312-313`: la interfaz renderiza, para el arreglo vacío, el texto **"Sin alergias registradas"**.
- `pages/pacientes/page.tsx:173`: la métrica del tablero cuenta como "con alergias" a quienes tienen el arreglo no vacío, es decir clasifica a todos los demás como sin alergias.
- `pages/pacientes/page.tsx:281`: la exportación escribe `p.alergias.join(', ')`, o sea celda vacía.

**Caso real que no se puede representar.** Un paciente recién registrado en recepción, al que nadie ha interrogado sobre alergias. El expediente afirma "sin alergias registradas". El médico lo lee y prescribe penicilina. El paciente es alérgico a la penicilina y nunca se le preguntó.

La formulación es exacta: el arreglo vacío significa hoy tres cosas clínicamente distintas y opuestas, y el sistema elige la más peligrosa como interpretación por omisión.

1. Se interrogó y el paciente niega alergias conocidas.
2. No se interrogó.
3. No se pudo interrogar (paciente inconsciente, sin acompañante).

**Consecuencia.** Seguridad clínica, directa y grave. Es el mismo defecto que el sexo inicializado en `'M'` del caso original, aplicado al dato que gobierna la seguridad de la prescripción.

**Cambio propuesto.** El estado alérgico es una entidad con estado explícito, no un arreglo.

```ts
export type EstadoInterrogatorio<T> =
  | { estado: 'no_interrogado' }
  | { estado: 'no_se_pudo_interrogar'; razon: 'paciente_no_valorable' | 'sin_informante' | 'barrera_idiomatica' | 'paciente_se_niega' }
  | { estado: 'negado'; interrogadoEn: InstanteISO; informante: TipoInformante }
  | { estado: 'presente'; interrogadoEn: InstanteISO; informante: TipoInformante; datos: T };

export type TipoInformante = 'paciente' | 'familiar' | 'acompanante' | 'expediente_previo' | 'personal_de_traslado' | 'autoridad';

export interface Alergia {
  sustancia: string;
  /** Distinguir alergia de intolerancia y de efecto adverso es clínicamente decisivo. */
  tipo: 'alergia' | 'intolerancia' | 'efecto_adverso_conocido';
  categoria: 'medicamento' | 'alimento' | 'ambiental' | 'latex' | 'medio_de_contraste' | 'otro';
  manifestacion: string;
  severidad: 'leve' | 'moderada' | 'grave' | 'anafilaxia' | 'desconocida';
  certeza: 'confirmada' | 'probable' | 'referida_por_paciente';
  registradoEn: InstanteISO;
}

/** En Patient: */
export type EstadoAlergico = EstadoInterrogatorio<readonly Alergia[]>;
```

Reglas de implementación derivadas, que son la parte que evita el daño:
1. El estado por omisión al crear un paciente es `{ estado: 'no_interrogado' }`. **No** `negado`.
2. La interfaz **nunca** muestra "sin alergias" para `no_interrogado`: muestra "Alergias no interrogadas" con tratamiento visual de advertencia, no de tranquilidad.
3. El flujo de prescripción exige que el estado alérgico no sea `no_interrogado` antes de emitir la receta, o que el prescriptor lo declare expresamente y quede registrado quién lo hizo. Ver BM-FAR-05.

El mismo tipo `EstadoInterrogatorio<T>` resuelve los antecedentes (BM-PAC-14, BM-PAC-15), el tipo de sangre (BM-PAC-07) y la medicación habitual.

---

### BM-PAC-02 · Crítica · RSC — `edad: number` no puede expresar la edad de un neonato ni de un lactante

**Evidencia.** `mocks/patients.ts:7`: `edad: number`. `mocks/urgencias.ts:27` y `mocks/triage.ts:26` la copian. El cálculo de `pages/pacientes/nuevo/page.tsx:95-102` devuelve años enteros y decrementa, de modo que **todo menor de un año tiene edad `0`**.

**Caso real que no se puede representar.** Un recién nacido de 18 horas de vida con ictericia. Un lactante de 3 meses con fiebre. Un prematuro de 34 semanas con 12 días de vida extrauterina. Los tres son `edad: 0`, indistinguibles entre sí y de un niño de 11 meses.

Esto importa porque la conducta clínica cambia por completo: la fiebre en el menor de 3 meses es una urgencia con protocolo propio; la dosificación pediátrica se calcula por kilogramo y por edad en meses; en el neonato la edad se cuenta en horas y la edad corregida por prematurez es un dato distinto de la edad cronológica.

**Consecuencia.** Seguridad clínica. En un sistema que presenta rangos de referencia y dosis, la edad de un lactante es un parámetro de cálculo, y hoy está truncada a cero.

**Cambio propuesto.** La edad no se almacena (BM-TRA-10): se deriva. Lo que se almacena es la fecha de nacimiento con la precisión que se conozca.

```ts
export type FechaNacimiento =
  | { precision: 'instante'; valor: InstanteISO }        // neonato: importa la hora
  | { precision: 'dia'; valor: FechaISO }
  | { precision: 'mes'; anio: number; mes: number }
  | { precision: 'anio'; anio: number }
  | { precision: 'edad_estimada'; anios: number; estimadaEn: FechaISO; estimadaPor: UsuarioId }
  | { precision: 'desconocida' };

/** Edad derivada, en la unidad clínicamente pertinente. */
export type EdadClinica =
  | { unidad: 'horas'; valor: number }     // < 7 días
  | { unidad: 'dias'; valor: number }      // < 1 mes
  | { unidad: 'meses'; valor: number; dias: number }  // < 2 años
  | { unidad: 'anios'; valor: number; meses: number } // < 18 años
  | { unidad: 'anios'; valor: number }
  | { unidad: 'estimada'; valor: number }
  | { unidad: 'desconocida' };

export function edadClinica(nac: FechaNacimiento, en: InstanteISO): EdadClinica;
```

Para el prematuro se agrega, en el expediente neonatal, `edadGestacionalAlNacer: { semanas: number; dias: number } | null`, que permite derivar la edad corregida.

---

### BM-PAC-03 · Crítica · RSC — Sustitutos de sexo contradictorios entre módulos

Este hallazgo **no repite** el del documento 08. Ahí se corrigió el tipo `Patient.sexo` para el paciente no identificado. Lo que aquí se documenta son los cuatro **sustitutos silenciosos** dispersos en el código, que sobreviven a la corrección del tipo y que discrepan entre sí.

**Evidencia.**
- `pages/urgencias/components/NuevoIngresoModal.tsx:41`: `useState<'M' | 'F'>('M')` — en urgencias, el desconocido es hombre.
- `pages/consultas/components/HistoriaClinicaForm.tsx:162`: `const sexo = patient?.sexo ?? 'F'` — en la historia clínica, el desconocido es mujer.
- `pages/consultas/components/HistoriaClinicaReadOnly.tsx:55`: `const sexo = patient?.sexo ?? 'F'`.
- `pages/sala-espera/page.tsx:198`: `genero: patient?.sexo || 'M'`.

Y la consecuencia funcional del sustituto de la historia clínica está dos veces en el mismo archivo:
- `pages/consultas/components/HistoriaClinicaForm.tsx:313`: imprime `sexo === 'F' ? 'Femenino' : 'Masculino'`, es decir imprime "Femenino" sin dato.
- `pages/consultas/components/HistoriaClinicaForm.tsx:499`: `{sexo === 'F' && (` habilita el apartado de **antecedentes gineco-obstétricos**.

**Caso real que no se puede representar.** Un paciente cuyo sexo no se conoce. Según el módulo en que se le mire, el sistema afirma que es hombre (urgencias, sala de espera) o que es mujer (historia clínica). Y en la historia clínica se le abre y se le imprime un apartado de antecedentes gineco-obstétricos, con gestas, partos y fecha de última menstruación, sobre una persona de la que no se sabe el sexo.

El caso complementario, igual de real: una persona con identidad de género femenina y sexo registrado masculino en sus documentos. El modelo tiene un solo campo, así que obliga a elegir entre registrar el dato que gobierna los rangos de referencia y la dosificación, o el dato con el que la persona debe ser tratada y nombrada.

**Consecuencia.** Seguridad clínica —el sexo alimenta rangos de referencia y cálculo de dosis— y trato digno.

**Cambio propuesto.** Separar los tres conceptos que hoy están colapsados en uno, y prohibir el sustituto.

```ts
/** Dato clínico. Gobierna rangos de referencia y dosificación. */
export type SexoBiologico = 'masculino' | 'femenino' | 'intersexual' | 'no_determinado' | 'no_registrado';

/** Dato de identidad. Gobierna cómo se nombra y se trata a la persona. */
export interface IdentidadDeGenero {
  identidad: 'masculina' | 'femenina' | 'no_binaria' | 'otra' | 'no_declarada';
  nombreDeUso: string | null;
  pronombre: string | null;
}

/** Dato administrativo. Lo que dice el documento oficial, para trámites y CFDI. */
export type SexoDocumental = 'H' | 'M' | 'X' | 'sin_documento';
```

Reglas de implementación:
1. `no_registrado` y `no_determinado` son valores válidos y **no** se sustituyen nunca. Se elimina todo `?? 'F'`, `|| 'M'` y `useState('M')` sobre sexo.
2. Los apartados dependientes del sexo (gineco-obstétricos) se habilitan por `sexoBiologico === 'femenino' || sexoBiologico === 'intersexual'`, y **además** son habilitables manualmente por el clínico, porque el criterio real es la presencia de órganos y no la etiqueta.
3. Con `no_determinado` o `no_registrado`, la interfaz muestra "No determinado" y **no** una de las dos opciones.
4. Donde se presenta al paciente se usa el `nombreDeUso` y el pronombre; donde se emite un documento oficial o fiscal se usan los datos documentales.

Nota de coordinación: el documento 08 §5.2 ya propuso `no_determinado` como valor explícito, declarado como decisión de producto y no como cumplimiento normativo. Esta propuesta lo respeta y lo extiende.

---

### BM-PAC-06 · Crítica · RSC — El modelo no tiene embarazo ni edad gestacional

**Evidencia.** `Patient` (`mocks/patients.ts:1-24`) no tiene ningún campo relativo a embarazo. `AntecedentesGinecoObstetricos` (`mocks/historiaClinica.ts:33-45`) es un antecedente de la historia clínica, no un estado actual, y `HistoriaClinica.ago` es `null` por omisión (`:593`). El único lugar del sistema donde aparece la gestación es `CertificadoMedico.semanasGestacion?: number` (`mocks/certificados.ts:26`), es decir en un certificado, no en el expediente.

**Caso real que no se puede representar.** Una mujer embarazada de 22 semanas llega a urgencias por dolor abdominal. El sistema no tiene dónde asentar que está embarazada. El médico prescribe un medicamento contraindicado en el embarazo, o solicita una radiografía, y el expediente nunca advirtió nada porque no tenía dónde saberlo.

**Consecuencia.** Seguridad clínica, con dos víctimas potenciales. El estado de embarazo es una contraindicación transversal a la prescripción y a los estudios de imagen; es, junto con las alergias, el dato de seguridad más importante del expediente.

**Cambio propuesto.** El embarazo es un estado clínico vigente, con su propia línea de tiempo, no un antecedente.

```ts
export type EstadoGestacional =
  | { estado: 'no_aplica' }                    // sexo biológico sin posibilidad de gestación
  | { estado: 'no_interrogado' }
  | { estado: 'no_embarazada'; determinadoEn: InstanteISO; metodo: 'interrogatorio' | 'prueba_negativa' }
  | { estado: 'embarazo_descartado_por_prueba'; fecha: InstanteISO }
  | { estado: 'posible_embarazo'; razon: string }   // en edad fértil, sin descartar
  | { estado: 'embarazada'; edadGestacional: EdadGestacional; fum: FechaISO | null; fpp: FechaISO | null; confirmadoPor: 'clinico' | 'laboratorio' | 'ultrasonido' }
  | { estado: 'puerperio'; fechaTerminoEmbarazo: FechaISO };

export interface EdadGestacional {
  semanas: number;
  dias: number;          // 0-6. La obstetricia trabaja en semanas + días, no en semanas enteras.
  calculadaPor: 'fum' | 'ultrasonido' | 'estimacion_clinica';
  vigenteAl: FechaISO;   // la edad gestacional avanza; se recalcula desde esta fecha
}
```

Regla de implementación: para toda persona con capacidad de gestación en edad fértil, el estado por omisión es `no_interrogado` y el flujo de prescripción y de solicitud de estudios de imagen lo exige resuelto. `CertificadoMedico.semanasGestacion` se sustituye por una referencia al `EstadoGestacional` vigente al emitir.

---

### BM-PAC-14 · Crítica · RSC + INV — El expediente nuevo afirma antecedentes negados y todos los aparatos y sistemas normales

Éste es, con diferencia, el hallazgo más grave del catálogo.

**Evidencia.** `mocks/historiaClinica.ts:570-601`, función `createEmptyHistoriaClinica`, que es la que se ejecuta al abrir una historia clínica que no existe:

```ts
apnp: {
  tabaquismo: 'negado',      // :578
  alcoholismo: 'negado',     // :580
  toxicomanias: 'negado',    // :582
  actividadFisica: 'sedentario', // :585
  inmunizaciones: 'desconocido', // :588  ← el único correcto
  …
},
app: [],
ago: null,
interrogatorio: sistemasInterrogatorio.map((sistema, i) => ({
  id: `int-${patientId}-${i}`,
  sistema,
  estado: 'normal' as const,   // :597
  detalle: '',
})),
```

Es decir: una historia clínica **recién creada, que nadie ha tocado**, afirma que el paciente niega tabaquismo, niega alcoholismo, niega toxicomanías, es sedentario, y que **todos** los aparatos y sistemas del interrogatorio fueron explorados y resultaron normales.

**Caso real que no se puede representar.** Distinguir un interrogatorio por aparatos y sistemas que se realizó y salió normal, de uno que no se realizó. Son clínicamente opuestos y hoy son el mismo dato. El expediente de un paciente al que nunca se interrogó es indistinguible del de un paciente sano interrogado a fondo.

Peor: el documento se imprime. `pages/consultas/components/HistoriaClinicaPrintModal.tsx` produce la historia clínica en papel, con la afirmación de normalidad de todos los sistemas, para ser firmada.

**Consecuencia.** Seguridad clínica e incumplimiento. Clínicamente, hace que el interrogatorio pierda todo valor como fuente de información: quien lo lea no puede saber si dice algo. Legalmente, el establecimiento produce un documento que afirma actos de exploración que no se realizaron. Es la definición de expediente fabricado.

Nótese la ironía útil: `inmunizaciones: 'desconocido'` en la línea 588 demuestra que el equipo sabe perfectamente cómo se modela esto bien. El patrón correcto ya está en el archivo, aplicado a un campo, y falta en los otros trece.

**Fundamento (verificado 2026-08-22).**
- NOM-004-SSA3-2012 numeral **6.1.1**: el interrogatorio de la historia clínica deberá tener como mínimo "ficha de identificación, en su caso, grupo étnico, antecedentes heredo-familiares, antecedentes personales patológicos (**incluido uso y dependencia del tabaco, del alcohol y de otras sustancias psicoactivas**, de conformidad con lo establecido en la Norma Oficial Mexicana, referida en el numeral 3.12 de esta norma) y no patológicos, padecimiento actual […] e **interrogatorio por aparatos y sistemas**".
- Numeral **6.1.2**: exploración física con habitus exterior, signos vitales, peso y talla y datos por región anatómica.
- Numeral **5.11**: las notas se expresarán "sin abreviaturas […] sin enmendaduras ni tachaduras". Un contenido prellenado que nadie asentó es lo contrario de una nota elaborada.

La norma exige que el interrogatorio y la exploración **se realicen y se asienten**. Prellenarlos con "negado" y "normal" no satisface el requisito: lo simula.

**Cambio propuesto.** Toda respuesta de antecedente e interrogatorio arranca en `no_interrogado`, usando el tipo de BM-PAC-01, y el documento impreso lo declara.

```ts
export type RespuestaSistema =
  | { estado: 'no_interrogado' }
  | { estado: 'sin_alteraciones'; interrogadoEn: InstanteISO }
  | { estado: 'con_alteraciones'; interrogadoEn: InstanteISO; detalle: string };

export interface AntecedentesNoPatologicos {
  tabaquismo: EstadoInterrogatorio<{ indiceTabaquico?: number; detalle: string }>;
  alcoholismo: EstadoInterrogatorio<{ patron: 'ocasional' | 'frecuente' | 'dependencia'; detalle: string }>;
  toxicomanias: EstadoInterrogatorio<{ sustancias: string[]; detalle: string }>;
  actividadFisica: EstadoInterrogatorio<{ nivel: 'sedentario' | 'leve' | 'moderado' | 'intenso' }>;
  inmunizaciones: EstadoInterrogatorio<{ esquema: string }>;   // ya era correcto
  // …
}

export const createEmptyHistoriaClinica = (…): HistoriaClinica => ({
  // …
  apnp: {
    tabaquismo: { estado: 'no_interrogado' },
    alcoholismo: { estado: 'no_interrogado' },
    toxicomanias: { estado: 'no_interrogado' },
    actividadFisica: { estado: 'no_interrogado' },
    inmunizaciones: { estado: 'no_interrogado' },
  },
  interrogatorio: sistemasInterrogatorio.map((sistema) => ({ sistema, respuesta: { estado: 'no_interrogado' } })),
});
```

Reglas de implementación:
1. Ningún campo clínico se inicializa con un valor que pueda pasar por observación. Regla general aplicable a todo el código.
2. La historia clínica no se puede firmar mientras los apartados obligatorios de la NOM-004 numeral 6.1 estén en `no_interrogado`; la interfaz muestra qué falta.
3. El documento impreso rotula explícitamente los apartados no interrogados como "No interrogado", nunca en blanco y nunca como normal.

---

### BM-PAC-15 · Media · RSC — `EstadoHabitual` no admite "no interrogado"

**Evidencia.** `mocks/historiaClinica.ts:1`: `export type EstadoHabitual = 'negado' | 'presente' | 'ex';`. Lo mismo en `:13` (`alcoholismo: 'negado' | 'ocasional' | 'frecuente'`) y `:15` (`toxicomanias: 'negado' | 'presente'`).

**Caso real.** No hay forma de expresar que no se preguntó. La enumeración obliga a `'negado'`, que es una afirmación positiva sobre el paciente.

**Cambio propuesto.** Se resuelve con `EstadoInterrogatorio<T>` de BM-PAC-01, como se detalla en BM-PAC-14. Se conserva `'ex'` como matiz dentro del estado `presente`, porque el ex fumador es clínicamente distinto del que nunca fumó y del fumador activo.

---

### BM-PAC-05 · Alta · RSC — El contacto de emergencia es una cadena y no tiene teléfono

**Evidencia.** `mocks/patients.ts:14-15`: `contactoEmergencia: string; parentescoEmergencia: string;`. En los datos semilla el nombre y el parentesco vienen mezclados en el primer campo, con el segundo duplicándolo. `mocks/urgencias.ts:25` copia `contactoEmergencia: string`. **Ningún campo guarda el teléfono del contacto de emergencia.**

**Caso real que no se puede representar.** Llamar al contacto de emergencia. El dato existe como nombre y no como forma de contacto, que es su única razón de ser.

Casos adicionales que tampoco se representan: dos contactos, orden de prelación, que el contacto sea también el representante legal, o que el paciente no tenga contacto (persona sola, indigente, migrante), que hoy se expresa con cadena vacía e indistinguible de "no se preguntó".

**Consecuencia.** Operativa con impacto clínico: en un deterioro súbito o un fallecimiento, no hay a quién avisar.

**Cambio propuesto.**

```ts
export interface ContactoDeEmergencia {
  nombreCompleto: string;
  parentesco: Parentesco;
  telefonos: readonly Telefono[];   // al menos uno
  esRepresentanteLegal: boolean;
  prioridad: number;
  notas: string | null;
}

/** En Patient: */
contactosDeEmergencia: EstadoInterrogatorio<readonly ContactoDeEmergencia[]>;
```

El uso de `EstadoInterrogatorio` permite distinguir "el paciente declara no tener contacto" de "no se preguntó", que es el mismo defecto de BM-PAC-01 en otro campo.

---

### BM-PAC-07 · Alta · RSC — El expediente no tiene tipo de sangre

**Evidencia.** `Patient` (`mocks/patients.ts:1-24`) no tiene tipo de sangre. `HistoriaClinica` tampoco. El único filtro clínico del listado de pacientes es por alergia (`pages/pacientes/page.tsx:71`).

**Caso real que no se puede representar.** Registrar el grupo y Rh de un paciente. En una clínica con urgencias, es un dato de referencia inmediata; y el Rh negativo en una embarazada tiene consecuencias de manejo propias.

**Consecuencia.** Seguridad clínica y operativa.

**Cambio propuesto.**

```ts
export type GrupoSanguineo = 'A' | 'B' | 'AB' | 'O';
export type FactorRh = 'positivo' | 'negativo';

export type TipoSangre = EstadoInterrogatorio<{
  grupo: GrupoSanguineo;
  rh: FactorRh;
  /** Distinción crítica: lo que el paciente dice no es una tipificación. */
  fuente: 'tipificacion_en_laboratorio' | 'referido_por_paciente' | 'documento_externo';
  tipificadoEn: FechaISO | null;
}>;
```

La distinción de `fuente` es la parte importante: un tipo de sangre referido por el paciente no es utilizable para transfundir, y el modelo debe impedir que se confunda con uno tipificado.

---

### BM-PAC-08 · Alta · INV — No hay representante legal, tutela ni patria potestad

**Evidencia.** `Patient` no tiene representante legal. `ConsentimientoInformado.firmadoPor: string` (`mocks/consentimientos.ts:15`) es una cadena, sin indicación de en qué calidad firma. `ConsentimientoInformado.tipo` incluye `'menor_edad'` (`:6`), lo que evidencia que el caso se contempló en la interfaz sin haberlo modelado en los datos.

**Caso real que no se puede representar.** Un menor de edad que acude con su abuela, sin sus padres. Una persona con declaración judicial de interdicción, cuyo tutor debe consentir. Un adulto mayor con deterioro cognitivo cuyo hijo es su representante. En los tres casos el sistema no sabe quién puede consentir ni acredita por qué.

**Consecuencia.** Legal. Un consentimiento firmado por quien no tenía facultad para otorgarlo no es un consentimiento.

**Fundamento (verificado 2026-08-22).**
- NOM-004-SSA3-2012 numeral **10.1.1.8**: cuando el estado de salud del paciente no le permita firmar y emitir su consentimiento, "deberá asentarse el nombre completo y firma del familiar más cercano en vínculo que se encuentre presente, del tutor o del representante legal".
- Numeral **5.5.1**: los datos podrán proporcionarse a terceros cuando medie solicitud escrita "del paciente, el tutor, representante legal o de un médico debidamente autorizado por el paciente, el tutor o representante legal".
- Numeral **5.6**: obligación de informar a "quién ejerza la patria potestad, la tutela, representante legal".

La norma distingue expresamente cuatro figuras —paciente, quien ejerce patria potestad, tutor y representante legal— y el modelo no tiene ninguna.

**Cambio propuesto.**

```ts
export type CalidadJuridica =
  | 'titular'
  | 'patria_potestad'
  | 'tutor'
  | 'representante_legal'
  | 'familiar_mas_cercano_presente';   // NOM-004 10.1.1.8, caso de urgencia

export interface RepresentacionLegal {
  personaId: string;
  nombreCompleto: string;
  calidad: CalidadJuridica;
  parentesco: Parentesco | null;
  /** Documento que acredita la calidad. Obligatorio salvo familiar más cercano presente. */
  documentoAcreditante: { tipo: 'acta_nacimiento' | 'resolucion_judicial' | 'poder_notarial' | 'identificacion' | 'ninguno'; folio: string | null } | null;
  vigenteDesde: FechaISO;
  vigenteHasta: FechaISO | null;
  puedeConsentirActosMedicos: boolean;
  puedeEjercerDerechosARCO: boolean;
}

/** En Patient: */
representaciones: readonly RepresentacionLegal[];
/** Derivado de la edad y de las representaciones vigentes. No se almacena. */
// capacidadJuridicaParaConsentir(paciente, fecha): 'propia' | 'requiere_representante' | 'indeterminada'
```

---

### BM-PAC-10 · Alta · RSC — `estado: 'activo' | 'inactivo'` no contempla la defunción

**Evidencia.** `mocks/patients.ts:22`: `estado: 'activo' | 'inactivo';`. No hay fecha de defunción en ninguna parte del modelo de paciente. La defunción sólo existe como valor en `HojaEgreso.estadoAlta: 'fallecimiento'` (`mocks/egresos.ts:17`) y en `CasoVigilancia.estado: 'defuncion'` (`mocks/vigilancia.ts:12`), es decir en documentos, no en el estado de la persona.

**Caso real que no se puede representar.** Un paciente fallece. El expediente sigue "activo". El sistema puede agendarle una cita, enviarle un recordatorio, cobrarle o incluirlo en una campaña. `pages/pacientes/page.tsx:87-88` habilita el modal de agendar cita para cualquier paciente del listado.

**Consecuencia.** Operativa y de trato: citar o contactar a una persona fallecida es un daño evitable a la familia. También clínica: el estado vital es información relevante al abrir un expediente.

**Cambio propuesto.**

```ts
export type EstadoVital =
  | { estado: 'vivo' }
  | { estado: 'finado'; fechaDefuncion: InstanteISO | null; certificadoDefuncion: string | null; fuente: 'certificado' | 'informado_por_familiar' | 'registro_externo' };

/** Separado del estado administrativo del expediente. */
export type EstadoExpediente = 'activo' | 'inactivo' | 'fusionado' | 'bloqueado_por_retencion';
```

Regla de implementación: con `EstadoVital.estado === 'finado'`, se bloquean el agendado, los recordatorios y toda comunicación saliente, y el expediente permanece consultable y sujeto a la política de retención.

---

### BM-PAC-04 · Media · DD — Los apellidos se colapsan en una sola cadena

**Evidencia.** `mocks/patients.ts:5`: `apellidos: string`. El formulario captura correctamente por separado (`pages/pacientes/nuevo/page.tsx` con `apellidoPaterno` y `apellidoMaterno`) y luego los **concatena al guardar**: `apellidos: \`${form.apellidoPaterno.trim()} ${form.apellidoMaterno.trim()}\`.trim()` (`:272`). El dato se captura estructurado y se destruye al persistir.

**Caso real que no se puede representar.** Recuperar el apellido paterno. Es necesario para la CURP, para el RFC, para el reporte a la DGIS y para ordenar un listado. También: una persona extranjera con un solo apellido, o con dos apellidos que son un apellido compuesto, quedan indistinguibles.

**Consecuencia.** Interoperabilidad y calidad de dato. Además, `pages/pacientes/nuevo/page.tsx:66` valida los nombres contra `NOMBRE_REGEX`, que sólo admite caracteres latinos, con lo que un nombre en otro alfabeto no se puede capturar.

**Cambio propuesto.**

```ts
export interface ApellidosPersona {
  paterno: string | null;
  materno: string | null;
  /** Para personas cuyo nombre no se descompone así. Se usa si paterno y materno son null. */
  apellidoUnico: string | null;
}

export interface NombrePersona {
  nombres: string;
  apellidos: ApellidosPersona;
  /** Nombre completo tal como aparece en el documento de identidad, sin normalizar. */
  comoEnDocumento: string | null;
}
```

Y relajar `NOMBRE_REGEX` para admitir el rango Unicode de letras, conservando la validación contra caracteres de control y de formato.

---

### BM-PAC-09 · Media · INV — No hay grupo étnico ni lengua del paciente

**Evidencia.** Ni `Patient` ni `HistoriaClinica` tienen grupo étnico o lengua. La única mención al idioma en el modelo es inexistente.

**Caso real que no se puede representar.** Un paciente hablante de náhuatl con español limitado. No hay dónde asentar que requiere intérprete, ni que el consentimiento informado se explicó a través de un tercero, que es precisamente lo que da o quita validez a ese consentimiento.

**Consecuencia.** Legal y clínica. Un consentimiento que el paciente no comprendió no es informado.

**Fundamento (verificado 2026-08-22).** NOM-004-SSA3-2012 numeral **6.1.1**: el interrogatorio deberá tener como mínimo "ficha de identificación, **en su caso, grupo étnico**, antecedentes heredo-familiares […]". El "en su caso" condiciona su captura, no su existencia en el modelo.

**Cambio propuesto.**

```ts
/** NOM-004 6.1.1. Autoadscripción; nunca se infiere ni se asigna. */
grupoEtnico: EstadoInterrogatorio<{ autoadscripcion: string; puebloOComunidad: string | null }>;

lenguaYComunicacion: {
  lenguaPrincipal: string | null;          // ISO 639-3
  requiereInterprete: boolean;
  lenguaDeSenas: boolean;
  otrosApoyos: string | null;
};
```

Y en `ConsentimientoInformado`, el registro de si se otorgó a través de intérprete y quién fue.

---

### BM-PAC-12 · Media · DD — El folio de expediente se genera por conteo y no tiene ámbito

**Evidencia.** `pages/pacientes/nuevo/page.tsx:270`: `expediente: \`EXP-2026-${String(patients.length + 1).padStart(4, '0')}\``. El tipo es `expediente: string` (`mocks/patients.ts:3`), sin ámbito de tenant ni de sucursal.

**Caso real.** Dos recepcionistas registran simultáneamente en dos sucursales: ambos obtienen el mismo folio. Y en multi-tenant, el folio `EXP-2026-0001` existe en todas las organizaciones a la vez, sin nada que los distinga.

Este hallazgo se enfoca deliberadamente en el **modelo** y no en la generación: el defecto de generar folios como "conteo de registros más uno" ya está asentado en el documento 02 §5, punto 6, y aquí no se repite. El problema de fondo que se agrega es que el identificador **no declara su ámbito de unicidad**.

**Cambio propuesto.**

```ts
export interface FolioExpediente {
  /** Único dentro de (tenantId, serie). */
  readonly valor: string;
  readonly serie: string;          // p. ej. la sucursal de apertura
  readonly tenantId: TenantId;
  readonly asignadoEn: InstanteISO;
}
```

La unicidad se garantiza en el servidor por secuencia con ámbito, no por conteo del arreglo en el cliente.

---

### BM-PAC-11 · Baja · DD — Centinelas de texto en campos de texto

**Evidencia.** `pages/pacientes/nuevo/page.tsx:285`: `medicoAsignado: 'Por asignar'`, en un campo tipado `medicoAsignado: string` (`mocks/patients.ts:18`) que además guarda un **nombre** y no un identificador. Y `ultimaVisita: ''` (`:286`) para el paciente que nunca ha sido visto.

**Consecuencia.** La cadena `'Por asignar'` es indistinguible del nombre de un médico. Cualquier búsqueda, agrupación o reporte por médico la trata como un profesional. Y `''` en `ultimaVisita` obliga a comparaciones de cadena vacía dispersas por el código.

**Cambio propuesto.** `medicoAsignado: MedicoId | null` y `ultimaVisita: InstanteISO | null`. La ausencia se expresa con `null` y la interfaz decide cómo presentarla.

---

### BM-PAC-13 · Baja · IPV — Aseguradora y póliza obligatorias en el tipo

**Evidencia.** `mocks/patients.ts:16-17`: `aseguradora: string; poliza: string;` no opcionales. La mayoría de los pacientes de una clínica ambulatoria en México paga de su bolsillo.

**Consecuencia.** Fuerza la cadena vacía como representación de "no asegurado" y captura datos sin necesidad para la mayoría de los registros.

**Fundamento.** Principio de minimización de la LFPDPPP vigente; **numeral no verificado en esta pasada**: IPV.

**Cambio propuesto.** `cobertura: { tipo: 'particular' } | { tipo: 'aseguradora'; aseguradoraId: string; poliza: string; vigenciaHasta: FechaISO | null } | { tipo: 'institucion_publica'; institucion: string; folio: string } | { tipo: 'no_declarada' }`.

---

## 4. Triage y urgencias

---

### BM-URG-01 · Crítica · RSC — Un botón escribe diez signos vitales inventados

**Evidencia.** `pages/triage/page.tsx`:

```ts
const normalValues: VitalFormData = {   // :105-118
  peso: '70', talla: '1.70', temperatura: '36.5',
  presionSistolica: '120', presionDiastolica: '80',
  frecuenciaCardiaca: '72', frecuenciaRespiratoria: '16',
  saturacionOxigeno: '98', glucosa: '90', dolor: '0',
  notas: '', nivelUrgencia: 'verde',
};
```

`:423`: `setForm(normalValues);`
`:818`: la interfaz expone la acción con la etiqueta **"Autocompletar valores normales"**.

**Caso real.** Se abre el triage de un lactante de tres meses y se pulsa el botón, por costumbre o por error. El expediente queda con peso 70 kg, talla 1.70 m, frecuencia cardiaca 72 y frecuencia respiratoria 16, y con nivel de urgencia verde. Todos esos valores son groseramente anormales para un lactante: 72 latidos por minuto en un lactante de tres meses es bradicardia. El sistema no sólo inventó los datos: los clasificó como normales y asignó la prioridad más baja.

Y si algún cálculo de dosis usa el peso, usará 70 kg para un paciente de 6 kg.

**Consecuencia.** Seguridad clínica. Es el defecto más peligroso del catálogo porque combina las tres condiciones del daño: fabrica datos clínicos, los presenta como observados, y alimenta decisiones de prioridad y de dosis.

**Cambio propuesto.** Se elimina `normalValues` y la acción de autocompletar. Si se desea conservar una ayuda de captura, la única forma admisible es que **no escriba en los campos**: mostrar los rangos de referencia por edad al lado de cada campo, que es información útil y no un dato fabricado. El prototipo ya tiene la infraestructura para eso (`VitalRange` en `mocks/triage.ts:403` y el indicador de `pages/triage/page.tsx:859`).

Regla de implementación general, aplicable más allá de este hallazgo: **ninguna acción de la interfaz debe escribir valores clínicos que el usuario no observó.** Autocompletar es admisible para datos administrativos (copiar el domicilio del titular, repetir la sucursal del turno anterior) e inadmisible para datos clínicos.

---

### BM-URG-02 · Crítica · RSC — Nueve signos vitales obligatorios impiden documentar al paciente crítico

**Evidencia.** `mocks/triage.ts:6-16`: `peso`, `talla`, `imc`, `temperatura`, `presionSistolica`, `presionDiastolica`, `frecuenciaCardiaca`, `frecuenciaRespiratoria`, `saturacionOxigeno` y `dolor` son `number` no nulos. Sólo `glucosa` admite `null` (`:15`).

`pages/triage/page.tsx:305-308` lo confirma en el formulario:

```ts
const requiredFields: (keyof VitalFormData)[] = [
  'peso', 'talla', 'temperatura', 'presionSistolica', 'presionDiastolica',
  'frecuenciaCardiaca', 'frecuenciaRespiratoria', 'saturacionOxigeno', 'dolor',
];
```

y `:311-312` marca error si alguno está vacío. `:343`: `if (!validate() || …) return;` — sin los nueve, **no se guarda nada**.

**Caso real que no se puede representar.** El caso central de una clínica con urgencias: llega un paciente en paro cardiorrespiratorio. El personal reanima. No hay peso, no hay talla, no hay presión arterial detectable, no hay saturación medible, y el paciente no puede referir dolor. El triage de ese paciente —el más grave que entrará ese día— **no se puede guardar**. La enfermera tiene dos opciones: no documentar, o inventar nueve números.

Variantes igualmente ordinarias: paciente agitado o combativo que no permite la toma; paciente en camilla que no se puede pesar ni medir; amputado, en quien la talla y el IMC no aplican; obeso que excede la báscula; lactante al que no se toma presión con el equipo disponible.

Este es exactamente el mismo defecto que el del documento 08, trasladado del registro de identidad al registro clínico: **un campo obligatorio en el punto de entrada de la urgencia obliga a fabricar o a no documentar.**

**Consecuencia.** Seguridad clínica y legal. La atención del paciente más grave queda sin registro, o con registro falso.

**Fundamento (verificado 2026-08-22).** La NOM-004 numeral **7.1.2** exige signos vitales en la nota inicial de urgencias, y el numeral **6.1.2** en la exploración física. Ninguno de los dos exige que estén **todos** ni prohíbe asentar que no fue posible obtenerlos; la obligatoriedad total es una decisión del prototipo, no un requisito de la norma. La NOM-027-SSA3-2013, verificada en el documento 01 §2, sostiene la obligación de atender la urgencia; nada en ella condiciona la atención a la toma completa de signos.

**Cambio propuesto.** Los nueve campos adoptan `Medicion<U>` de BM-TRA-09, cuyo estado `no_medido` lleva razón obligatoria. La validación cambia de naturaleza: no exige valores, exige **una respuesta explícita** por cada signo, que puede ser un valor o una razón de no medición.

```ts
export interface TriageRecord extends ActoEnSucursal, Fechado, Autoria, Firmable {
  id: string;
  pacienteId: PacienteId;
  signosVitales: SignosVitales;          // BM-TRA-09
  dolor: EscalaDolor;                    // BM-URG-03
  nivelUrgencia: NivelTriage;            // BM-URG-05
  motivoConsulta: string;
  notas: string;
}
```

Regla de implementación: el triage siempre se puede guardar. Lo que la interfaz exige es que ningún signo quede sin respuesta, no que todos tengan número. Un triage con nueve `no_medido` y razón "paciente en reanimación" es un registro clínicamente valioso y hoy es imposible.

---

### BM-URG-04 · Crítica · RSC — `parseFloat(...) || 0` imprime peso 0 kg en la hoja de triage

**Evidencia.** `pages/triage/components/TriagePrintModal.tsx:137-138`:

```ts
const peso = parseFloat(form.peso) || 0;
const talla = parseFloat(form.talla) || 0;
```

`:140` calcula el IMC con esos valores y `:268` lo clasifica. `:145`: `const dolorNum = parseInt(form.dolor, 10);` sin guarda, que produce `NaN`.

**Caso real.** Se imprime la hoja de triage de un paciente sin peso registrado. El documento dice **0 kg** y **0 m**, y presenta un IMC calculado a partir de ceros. El cero no es un valor faltante: es un valor, y un valor imposible. Un peso de cero en un documento clínico es peor que un espacio en blanco, porque el blanco se interpreta como ausencia y el cero se interpreta como medición.

**Consecuencia.** Seguridad clínica y legal. Documento clínico impreso con datos imposibles.

**Cambio propuesto.** Con `Medicion<U>` (BM-TRA-09), el componente de impresión no puede caer en cero: si el estado es `no_medido`, imprime "No medido" y la razón; si es `medido`, imprime valor y unidad. El IMC no se imprime cuando peso o talla no están medidos.

Regla de implementación transversal: **se prohíbe el patrón `|| 0` y `?? 0` sobre magnitudes clínicas y montos.** Es la forma más común de convertir una ausencia en una afirmación.

---

### BM-URG-03 · Alta · RSC — El dolor es obligatorio y no admite "no valorable"

**Evidencia.** `mocks/triage.ts:16`: `dolor: number;`. `mocks/notasEnfermeria.ts:44`: `dolorEva: string;`. Obligatorio en la validación (`pages/triage/page.tsx:307`).

**Caso real que no se puede representar.** El dolor en la escala visual análoga lo **autorreporta** el paciente. Un paciente inconsciente, intubado, con afasia, con demencia avanzada, o un lactante, no puede autorreportarlo. La escala correcta en esos casos es otra (conductual, no autorreportada). El modelo obliga a un número en una escala que no aplica, y `0` significa "sin dolor", que es una afirmación clínica falsa sobre un paciente inconsciente.

**Cambio propuesto.**

```ts
export type EscalaDolor =
  | { escala: 'EVA'; valor: number }                      // 0-10, autorreportado
  | { escala: 'FLACC' | 'PAINAD' | 'conductual'; valor: number; instrumento: string }
  | { estado: 'no_valorable'; razon: 'paciente_no_consciente' | 'barrera_de_comunicacion' | 'edad' | 'sedacion' }
  | { estado: 'no_valorado' };
```

---

### BM-URG-05 · Alta · RSC — El nivel de triage tiene valor por omisión

**Evidencia.** `pages/urgencias/components/NuevoIngresoModal.tsx:44`: `useState<NivelUrgencia>('amarillo')`. `pages/triage/page.tsx:117`: `normalValues.nivelUrgencia = 'verde'`.

**Caso real.** El nivel de triage es el resultado de una valoración clínica y determina el orden de atención. Un valor por omisión significa que un ingreso capturado sin valorar queda clasificado. Si queda en amarillo, un paciente rojo espera; si queda en verde, espera más.

**Consecuencia.** Seguridad clínica: retraso en la atención de un paciente crítico.

**Cambio propuesto.**

```ts
export type NivelTriage =
  | { estado: 'sin_clasificar' }
  | { estado: 'clasificado'; nivel: 1 | 2 | 3 | 4 | 5; escala: 'MTS' | 'ESI' | 'institucional'; clasificadoPor: UsuarioId; clasificadoEn: InstanteISO; motivo: string };
```

El estado inicial es `sin_clasificar` y la interfaz lo presenta como pendiente y no como una categoría. Se propone además migrar de cuatro a cinco niveles con escala declarada, porque la escala de cuatro colores del prototipo no corresponde a ninguna escala de triage documentada y eso impide auditar la clasificación; esto se registra como decisión abierta.

---

### BM-URG-06 · Alta · INV — `EstadoUrgencia` no contempla defunción, alta voluntaria, fuga ni traslado

**Evidencia.** `mocks/urgencias.ts:4`: `export type EstadoUrgencia = 'esperando' | 'en_atencion' | 'observacion' | 'alta';`

**Caso real que no se puede representar.** Cuatro desenlaces ordinarios de un servicio de urgencias:
1. El paciente **fallece** en urgencias.
2. El paciente **se va contra la indicación médica** (alta voluntaria).
3. El paciente **se va sin avisar** antes de ser atendido, que es un indicador de calidad que toda urgencia mide.
4. El paciente se **traslada** a otra unidad porque la clínica no resuelve su padecimiento.

Los cuatro se registran hoy como `'alta'`, indistinguibles de un egreso ordinario a domicilio.

**Consecuencia.** Legal y de calidad. Un fallecimiento registrado como alta es una falsedad en el expediente y una imposibilidad de reportar mortalidad.

**Fundamento (verificado 2026-08-22).** La NOM-004 numeral **8.9.11** exige, en caso de defunción, "señalar las causas de la muerte acorde a la información contenida en el certificado de defunción y en su caso, si se solicitó y se llevó a cabo estudio de necropsia hospitalaria". El numeral **10.2** regula la hoja de egreso voluntario como documento propio. El modelo no puede alcanzar ninguno de los dos porque el estado que los dispara no existe.

**Cambio propuesto.**

```ts
export type DesenlaceUrgencia =
  | { tipo: 'en_curso'; fase: 'esperando_triage' | 'esperando_atencion' | 'en_atencion' | 'en_observacion' }
  | { tipo: 'alta_medica'; destino: DestinoAlta; en: InstanteISO }
  | { tipo: 'alta_voluntaria'; en: InstanteISO; hojaEgresoVoluntarioId: string }
  | { tipo: 'traslado'; en: InstanteISO; referenciaId: string; establecimientoDestino: string }
  | { tipo: 'defuncion'; en: InstanteISO; certificadoDefuncion: string | null; causasDeMuerte: string | null; necropsia: 'no_solicitada' | 'solicitada' | 'realizada' }
  | { tipo: 'abandono'; en: InstanteISO; momento: 'antes_de_triage' | 'antes_de_atencion' | 'durante_atencion' };
```

---

### BM-URG-07 · Alta · INV — `DestinoAlta` no contempla defunción ni alta voluntaria

**Evidencia.** `mocks/urgencias.ts:5`: `'domicilio' | 'hospitalizacion' | 'consulta_externa' | 'referencia' | 'quirofano'`. La enumeración de egresos (`mocks/egresos.ts:18`) sí incluye `'defuncion'`, con lo que las dos enumeraciones del mismo concepto discrepan entre módulos.

**Cambio propuesto.** Se unifican en un solo tipo, consumido por `Urgencia` y por `HojaEgreso`. El desenlace de defunción y de alta voluntaria pasa a `DesenlaceUrgencia` (BM-URG-06), y `DestinoAlta` queda para el destino del paciente vivo egresado por indicación médica.

---

### BM-URG-10 · Alta · INV — No existe la nota de urgencias como documento

**Evidencia.** `mocks/urgencias.ts:23`: `notaMedica: string;`. Toda la nota inicial de urgencias es **un campo de texto**.

**Caso real que no se puede representar.** Producir la nota inicial de urgencias con el contenido que la norma exige, apartado por apartado. Un solo campo de texto no permite verificar que estén todos, no permite firmarlos, y no permite reportarlos.

**Fundamento (verificado 2026-08-22).** NOM-004-SSA3-2012 numeral **7.1** ("De las notas médicas en urgencias — Inicial"), que exige:

| Numeral | Contenido exigido | ¿Está en el modelo? |
|---|---|---|
| 7.1.1 | Fecha y hora en que se otorga el servicio | Parcial: `fecha` + `horaAtencion?` opcional |
| 7.1.2 | Signos vitales | Sí, vía `signosVitales: TriageRecord \| null` (nulo permitido) |
| 7.1.3 | Motivo de la atención | Sí, `motivo` |
| 7.1.4 | Resumen del interrogatorio, exploración física y estado mental, en su caso | **No** — sólo `notaMedica: string` |
| 7.1.5 | Resultados relevantes de estudios previos | **No** |
| 7.1.6 | Diagnósticos o problemas clínicos | **No** |
| 7.1.7 | Tratamiento y pronóstico | **No** |
| 5.10 | Fecha, hora, nombre completo de quien la elabora y firma | **No** |

**Cambio propuesto.** `NotaUrgencias` como entidad propia, con un campo por numeral, `Fechado`, `Autoria` y `Firmable`. `Urgencia` conserva el episodio (llegada, triage, desenlace) y referencia las notas; `notaMedica: string` se elimina.

---

### BM-URG-11 · Alta · RSC — La talla no lleva unidad y el modelo asume metros

**Evidencia.** `mocks/triage.ts:7`: `talla: number`, con valores como `1.62` (`:42`). El cálculo de IMC de `pages/triage/page.tsx:244` asume metros. Pero `mocks/notasEnfermeria.ts:39` declara `talla: string` y `mocks/notasEvolucion.ts:18` también, admitiendo `'162'`.

**Caso real.** Una enfermera captura la talla de un paciente en centímetros, como se hace en la práctica. Si el campo la interpreta en metros, el IMC resultante es absurdo por un factor de diez mil. Si otro módulo la interpreta en centímetros, dos módulos discrepan sobre la misma persona.

**Cambio propuesto.** `Medicion<UnidadTalla>` con `'cm' | 'm'` explícita (BM-TRA-09). Se recomienda `'cm'` como unidad canónica de almacenamiento, por ser la de uso clínico en México y evitar decimales en pediatría, y convertir al calcular.

---

### BM-URG-08 · Media · INV — `viaAcceso` es una enumeración cerrada de cuatro valores

**Evidencia.** `mocks/urgencias.ts:28`: `viaAcceso: 'caminando' | 'ambulancia' | 'referencia' | 'policia';`

**Casos reales que no se pueden representar.** Traslado por protección civil o bomberos; llegada en vehículo particular cargado por familiares; paciente bajo custodia de una autoridad penitenciaria, que es distinto de "policía" y tiene implicaciones de consentimiento y de aviso; traslado desde otra unidad de la misma clínica; paciente que llega ya sin vida.

Además, `'policia'` está haciendo el trabajo de dos conceptos: el medio de traslado y la existencia de una autoridad involucrada. Cuando hay autoridad, se dispara la obligación de aviso al Ministerio Público, y el modelo no tiene dónde registrar ni el aviso ni la autoridad.

**Fundamento.** El documento 01 verificó la obligación de aviso al Ministerio Público (Reglamento de la LGS en materia de prestación de servicios de atención médica, artículo 19 fracción V) y el contenido del documento (NOM-004 numeral **10.3**). El modelo no tiene la entidad; ver BM-NOR-06.

**Cambio propuesto.**

```ts
export interface LlegadaAUrgencias {
  medio: 'por_su_propio_pie' | 'ambulancia' | 'vehiculo_particular' | 'traslado_interinstitucional' | 'proteccion_civil' | 'otro';
  medioOtro: string | null;
  /** Independiente del medio: puede llegar en ambulancia y con custodia. */
  bajoCustodia: { autoridad: string; identificacionOficial: string | null } | null;
  procedeDeReferencia: { referenciaId: string } | null;
  llegaSinSignosVitales: boolean;
  acompanantes: readonly { nombre: string; parentesco: Parentesco | null }[];
}
```

---

### BM-URG-09 · Media · DD — El campo se llama `genero` y contiene sexo, y la edad está duplicada

**Evidencia.** `mocks/urgencias.ts:26-27`: `genero: 'M' | 'F'; edad: number;`. Igual en `mocks/triage.ts:26-27`. Ambos son copias de datos que ya viven en `Patient`.

**Consecuencia.** El nombre `genero` sobre un dato que es sexo biológico induce al error de usarlo para dirigirse al paciente y de usarlo para calcular rangos de referencia, que son usos incompatibles (BM-PAC-03). La duplicación de `edad` multiplica el defecto de BM-PAC-02 y BM-TRA-10.

**Cambio propuesto.** Se eliminan ambos campos de `Urgencia` y de `TriagePatient`. Se resuelven desde `Patient` al presentar. Los documentos firmados conservan el `snapshot` de identidad de BM-TRA-11.

---

## 5. Consulta y notas clínicas

---

### BM-CON-01 · Crítica · INV — La nota de evolución no se puede firmar ni cerrar

**Evidencia.** `mocks/notasEvolucion.ts:22-39`. `NotaEvolucion` tiene `medico: string` y `medicoCedula: string`, pero **no tiene firma, ni estado documental, ni marca de cierre**. No hay diferencia de tipo entre una nota en borrador y una nota asentada definitivamente.

**Caso real que no se puede representar.** Cerrar una nota. Cualquier proceso puede modificar el contenido de una nota de hace tres meses, y no hay dónde constatar que estaba firmada.

**Consecuencia.** Legal. Es el documento más frecuente del expediente y el que menos garantías tiene.

**Fundamento (verificado 2026-08-22).** NOM-004-SSA3-2012 numeral **5.10**, contenido obligatorio de toda nota: "fecha, hora y nombre completo de quien la elabora, así como la firma autógrafa, electrónica o digital".

**Cambio propuesto.** `NotaEvolucion extends Fechado, Autoria, Firmable` (BM-TRA-04, BM-TRA-05, BM-TRA-07). Los campos `medico` y `medicoCedula` se sustituyen por `Autoria.registradoPorSnapshot`. Las correcciones posteriores a la firma son `Addendum` (BM-TRA-06).

---

### BM-CON-06 · Alta · INV — La consulta no registra la cédula del médico

**Evidencia.** `mocks/consultas.ts:9-10`: `Consultation` tiene `doctorId` y `doctorName` y **no tiene cédula**. Tampoco firma. `TriageRecord` (`mocks/triage.ts:18`) tiene `realizadoPor: string` sin cédula. `EstudioSolicitado` (`mocks/estudios.ts:26-27`) tiene `doctorId` y `doctorName` sin cédula. `DispensacionFarmacia` (`mocks/farmacia.ts:46,59`) tiene `doctorName` y `usuario` sin cédula. `ConsentimientoInformado` no tiene médico en absoluto (BM-NOR-01).

**Fundamento (verificado 2026-08-22).** LGS artículo **83**: las menciones de cédula profesional y, en su caso, Certificado de Especialidad vigente, "deberán consignarse en los documentos y papelería que utilicen en el ejercicio de tales actividades". NOM-004 numeral **5.10** sobre el nombre completo de quien elabora.

**Cambio propuesto.** Todas las entidades citadas adoptan `Autoria` (BM-TRA-07), cuyo `registradoPorSnapshot` incluye cédula y certificado de especialidad. Con ello, el requisito se satisface por construcción y no entidad por entidad.

---

### BM-CON-05 · Alta · INV — No existe la nota de interconsulta

**Evidencia.** No hay entidad de interconsulta en `mocks/`. La referencia entre establecimientos existe (`mocks/referencias.ts`), pero la interconsulta **dentro** del mismo establecimiento no.

**Caso real que no se puede representar.** El médico general solicita valoración al cardiólogo de la misma clínica. La norma exige que consten por escrito **dos** documentos: la solicitud del médico solicitante y la nota del especialista. Hoy no hay dónde asentar ninguno de los dos.

**Fundamento (verificado 2026-08-22).**
- NOM-004-SSA3-2012 numeral **6.3** (Nota de interconsulta), que exige: 6.3.1 criterios diagnósticos; 6.3.2 plan de estudios; 6.3.3 sugerencias diagnósticas y tratamiento; 6.3.4 "los demás que marca el numeral 7.1 de esta norma".
- Numeral **7.2.1**: "En los casos en que el paciente requiera interconsulta por médico especialista, deberá quedar por escrito, tanto la solicitud, que deberá realizar el médico solicitante, como la nota de interconsulta que deberá realizar el médico especialista."

**Cambio propuesto.** Dos entidades, `SolicitudInterconsulta` y `NotaInterconsulta`, ambas con `ActoEnSucursal`, `Fechado`, `Autoria` y `Firmable`, y con los campos de los numerales 6.3.1 a 6.3.3 más los de 7.1.

---

### BM-CON-03 · Alta · RSC — Los signos vitales de la nota de evolución son texto libre obligatorio

**Evidencia.** `mocks/notasEvolucion.ts:10-20`: los nueve campos de `SignosVitalesEvolucion` son `string` y ninguno es opcional. La ausencia se expresa con cadena vacía, indistinguible de un error de captura.

**Fundamento (verificado 2026-08-22).** NOM-004 numeral **6.2.2**: la nota de evolución deberá contener "Signos vitales, **según se considere necesario**". El "según se considere necesario" es precisamente lo que el modelo no puede expresar: hoy o hay cadena vacía o hay valor, sin decir si se consideró innecesario o si no se tomó.

**Cambio propuesto.** `signosVitales: SignosVitales | { estado: 'no_requeridos'; justificacion: string }` con el tipo de BM-TRA-09.

---

### BM-CON-02 · Media · INV — El pronóstico es obligatorio y tiene tres valores

**Evidencia.** `mocks/notasEvolucion.ts:1`: `export type Pronostico = 'bueno' | 'reservado' | 'malo';`, obligatorio en `:37`.

**Casos reales que no se pueden representar.** "Reservado a evolución en las próximas 24 horas", que es la formulación clínica habitual y no es lo mismo que "reservado" a secas; "no valorable con la información disponible" en una primera valoración; y "no aplica" en una consulta de control sin padecimiento activo.

**Fundamento (verificado 2026-08-22).** NOM-004 numeral **6.2.5** exige pronóstico en la nota de evolución, y numeral **6.1.5** en la historia clínica. La norma lo exige; no prescribe una escala de tres valores.

**Cambio propuesto.**

```ts
export type Pronostico =
  | { juicio: 'bueno' | 'reservado' | 'malo' | 'grave'; plazo?: 'inmediato' | '24h' | '48h' | 'corto_plazo' | 'largo_plazo'; comentario: string | null }
  | { juicio: 'no_valorable'; razon: string };
```

Nota: `HojaEgreso` **no tiene pronóstico en absoluto**, y el numeral 8.9.10 lo exige. Ver BM-NOR-03.

---

### BM-CON-04 · Media · DD — La consulta reutiliza el tipo del registro de triage

**Evidencia.** `mocks/consultas.ts:23`: `signosVitales: TriageRecord | null;`. Lo mismo en `mocks/urgencias.ts:22`.

**Consecuencia.** Los signos vitales de una consulta arrastran `nivelUrgencia` y `realizadoPor` (`mocks/triage.ts:18-19`), que no tienen sentido en una consulta externa, y arrastran el `patientId` y el `id` de otro registro. Además impide que el médico registre una segunda toma de signos durante la consulta, porque el campo espera un registro de triage y no una toma.

**Cambio propuesto.** Se separa la **toma** de signos vitales del **registro de triage**. `TriageRecord` contiene una toma más la clasificación; `Consultation` y `NotaEvolucion` contienen tomas. El tipo compartido es `SignosVitales` (BM-TRA-09), no `TriageRecord`.

---

### BM-CON-07 · Media · INV — La exploración física es un campo de texto y el interrogatorio no admite "no interrogado"

**Evidencia.** `mocks/consultas.ts:18`: `exploracionFisica: string;`. `mocks/historiaClinica.ts:46-51`: `InterrogatorioSistema` con `estado` que por omisión es `'normal'` (ver BM-PAC-14).

**Fundamento (verificado 2026-08-22).** NOM-004 numeral **6.1.2**: la exploración física "deberá tener como mínimo: habitus exterior, signos vitales (temperatura, tensión arterial, frecuencia cardiaca y respiratoria), peso y talla, así como, datos de la cabeza, cuello, tórax, abdomen, miembros y genitales o específicamente la información que corresponda a la materia del odontólogo, psicólogo, nutriólogo y otros profesionales de la salud".

Un solo campo de texto no permite acreditar que los siete grupos anatómicos y el habitus exterior fueron asentados.

**Cambio propuesto.** `ExploracionFisica` estructurada por región, cada región con `RespuestaSistema` (BM-PAC-14), más `habitusExterior` y `signosVitales`. El texto libre se conserva por región, no en lugar de la estructura.

---

## 6. Recetas y farmacia

---

### BM-FAR-01 · Crítica · INV — No hay recetario especial ni código de barras: los estupefacientes no se pueden prescribir

**Evidencia.** `mocks/recetas.ts:23-40`. `Receta` no tiene tipo de receta, no tiene folio de recetario, no tiene código de barras, no tiene número de permiso, y no distingue el grupo al que pertenece el medicamento. `Medicamento` (`:1-8`) tiene `categoria: string` con valores como `'Analgésico/Antipirético'` y `'AINE'` (`:43-45`), que es una clasificación farmacológica y no la clasificación legal de venta y suministro.

**Caso real que no se puede representar.** Prescribir morfina a un paciente con dolor oncológico. O tramadol. O clonazepam. La prescripción de estupefacientes debe hacerse en recetario especial con código de barras asignado por la autoridad, y el modelo no tiene dónde poner ni el folio ni el código.

Tampoco se puede representar el resto de la clasificación legal: qué recetas debe retener la farmacia, cuáles se pueden resurtir y cuántas veces, y cuál es la vigencia de cada una.

**Consecuencia.** Legal, y clínica por omisión: una clínica con urgencias que no puede prescribir analgésicos potentes tiene un problema asistencial, y si los prescribe fuera del cauce legal, un problema regulatorio.

**Fundamento (verificado 2026-08-22, Cámara de Diputados, Ley General de Salud, últimas reformas DOF 15-01-2026).**

- **Artículo 226.** "Los medicamentos, para su venta y suministro al público, se consideran: **I.** Medicamentos que sólo pueden adquirirse con receta o permiso especial, expedido por la Secretaría de Salud […]; **II.** Medicamentos que requieren para su adquisición receta médica que deberá **retenerse en la farmacia** que la surta y ser **registrada en los libros de control** […]. El médico tratante podrá prescribir dos presentaciones del mismo producto como máximo, especificando su contenido. **Esta prescripción tendrá vigencia de treinta días** a partir de la fecha de elaboración de la misma; **III.** Medicamentos que solamente pueden adquirirse con receta médica que **se podrá surtir hasta tres veces**, la cual debe **sellarse y registrarse cada vez** en los libros de control […]; se deberá retener por el establecimiento que la surta en la tercera ocasión […]; **IV.** Medicamentos que para adquirirse requieren receta médica, pero que pueden **resurtirse tantas veces como lo indique el médico**; **V.** Medicamentos sin receta, autorizados para su venta exclusivamente en farmacias, y **VI.** Medicamentos que para adquirirse no requieren receta médica […]".

- **Artículo 240.** "Sólo podrán prescribir estupefacientes los profesionales que a continuación se mencionan, siempre que tengan **título registrado** por las autoridades educativas competentes […]: I. Los médicos cirujanos; II. Los médicos veterinarios […]; III. Los cirujanos dentistas, para casos odontológicos."

- **Artículo 241.** "La prescripción de estupefacientes se hará en **recetarios especiales**, que contendrán, para su control, un **código de barras asignado por la Secretaría de Salud**, o por las autoridades sanitarias estatales, en los siguientes términos: **I.** Las recetas especiales serán formuladas por los profesionales autorizados en los términos del artículo 240 de esta ley, para tratamientos **no mayores de treinta días**, y **II.** La **cantidad máxima de unidades prescritas por día** deberá ajustarse a las indicaciones terapéuticas del producto."

Nota de verificación: el **Reglamento de Insumos para la Salud**, que desarrolla el contenido de la receta y los recetarios especiales en sus artículos 28 a 31 y 50 a 52, **no se pudo verificar en fuente oficial el 2026-08-22**. No está en la compilación de reglamentos de la Cámara de Diputados y la descarga directa falló. Los requisitos que aquí se afirman se sostienen **exclusivamente** en el texto de la Ley General de Salud transcrito arriba. Los artículos de la LGS quedaron asentados en el documento 01 §11, y el pendiente del reglamento en el documento 01 §8.

**Cambio propuesto.**

```ts
/** Clasificación legal de venta y suministro. LGS art. 226. */
export type GrupoLegalMedicamento =
  | 'I_receta_o_permiso_especial'
  | 'II_receta_retenida'
  | 'III_receta_surtible_tres_veces'
  | 'IV_receta_resurtible'
  | 'V_venta_libre_en_farmacia'
  | 'VI_venta_libre';

export type ClaseControlada = 'estupefaciente' | 'psicotropico_grupo_II' | 'psicotropico_grupo_III' | 'psicotropico_grupo_IV' | 'ninguna';

export interface Medicamento {
  id: string;
  /** LGS art. 225 y 226 último párrafo: la identificación genérica es obligatoria. */
  denominacionGenerica: string;
  denominacionDistintiva: string | null;
  formaFarmaceutica: string;
  concentracion: { valor: number; unidad: string; por?: { valor: number; unidad: string } };
  presentacion: { contenido: number; unidadContenido: string };
  viaAdministracion: readonly string[];
  grupoLegal: GrupoLegalMedicamento;
  claseControlada: ClaseControlada;
  registroSanitario: string | null;
}

export type TipoReceta =
  | { tipo: 'ordinaria' }
  | { tipo: 'especial_estupefacientes'; folioRecetario: string; codigoBarras: string; asignadoPor: 'federal' | 'estatal' }
  | { tipo: 'psicotropicos'; folioRecetario: string };

export interface Receta extends ActoEnSucursal, Fechado, Autoria, Firmable {
  id: string;
  folio: FolioDocumento;
  pacienteId: PacienteId;
  tipoReceta: TipoReceta;
  medicamentos: readonly MedicamentoPrescrito[];
  /** Derivado del grupo legal más restrictivo. LGS 226 fr. II y 241 fr. I: 30 días. */
  vigenciaHasta: FechaISO;
  /** LGS 226 fr. III y IV. */
  resurtidoAutorizado: { veces: number | 'las_que_indique_el_medico' } | null;
  surtidos: readonly { dispensacionId: string; en: InstanteISO; selloFarmacia: string }[];
  /** LGS 226 fr. II y III: retención por la farmacia. */
  retenidaPorFarmacia: { en: InstanteISO; establecimiento: string } | null;
  diagnosticos: readonly DiagnosticoAsentado[];
  indicacionesGenerales: string;
}
```

Regla de implementación: el sistema no permite emitir una receta con un medicamento de `claseControlada !== 'ninguna'` si `tipoReceta.tipo === 'ordinaria'`, y no permite emitirla si el prescriptor no es de los autorizados por el artículo 240.

---

### BM-FAR-02 · Crítica · RSC — Dosis, frecuencia y duración son texto libre

**Evidencia.** `mocks/recetas.ts:16-19`: `dosis: string; frecuencia: string; via: string; duracion: string;`.

**Caso real que no se puede representar.** Verificar una dosis. Con `dosis: '500mg'` como texto, el sistema no puede comparar contra la dosis máxima, no puede calcular miligramos por kilogramo en un paciente pediátrico, no puede detectar una duplicidad terapéutica ni una interacción, y no puede calcular la cantidad total a dispensar.

El caso peligroso: `dosis: '1 tableta'` en un medicamento que existe en dos concentraciones. La receta es ambigua y la farmacia decide.

**Consecuencia.** Seguridad clínica. En pediatría, donde la dosis se calcula por kilogramo, la imposibilidad de verificar es la causa más frecuente de error de medicación grave.

**Cambio propuesto.**

```ts
export interface Dosis {
  cantidad: number;
  unidad: 'mg' | 'g' | 'mcg' | 'mL' | 'UI' | 'tableta' | 'capsula' | 'gota' | 'aplicacion' | 'sobre';
  /** Cuando la dosis es por peso o superficie corporal. */
  base: 'absoluta' | 'por_kg' | 'por_m2';
}

export interface Frecuencia {
  tipo: 'cada_x_horas' | 'veces_al_dia' | 'dosis_unica' | 'por_razon_necesaria' | 'esquema_libre';
  cadaHoras?: number;
  vecesAlDia?: number;
  /** 'por razón necesaria' exige condición y dosis máxima diaria. */
  condicion?: string;
  dosisMaximaDiaria?: Dosis;
  esquemaLibre?: string;
}

export interface MedicamentoPrescrito {
  medicamentoId: string;
  /** Copia inmutable al momento de prescribir. */
  denominacionGenerica: string;
  denominacionDistintiva: string | null;
  formaFarmaceutica: string;
  concentracion: string;
  dosis: Dosis;
  frecuencia: Frecuencia;
  via: string;
  duracion: { tipo: 'dias' | 'semanas' | 'meses'; valor: number } | { tipo: 'indefinida' } | { tipo: 'dosis_unica' };
  /** Unidades totales a dispensar. Derivable de dosis × frecuencia × duración, confirmada por el médico. */
  cantidadTotal: { valor: number; unidad: string };
  indicaciones: string;
  /** Si el prescriptor decidió apartarse de una alerta, queda registrado. */
  alertasOmitidas: readonly { tipo: 'alergia' | 'interaccion' | 'dosis_maxima' | 'embarazo' | 'duplicidad'; justificacion: string }[];
}
```

`esquemaLibre` existe deliberadamente, porque hay esquemas reales (reducción gradual de esteroides, insulina por escala) que no caben en una frecuencia estructurada. La diferencia con el estado actual es que el texto libre pasa de ser la única opción a ser la excepción declarada.

---

### BM-FAR-05 · Crítica · RSC — La prescripción no consulta el estado alérgico

**Evidencia.** `Receta` (`mocks/recetas.ts:23-40`) no tiene ninguna referencia al estado alérgico del paciente, ni campo de alertas, ni registro de verificación. Y el estado alérgico que consultaría es el de BM-PAC-01, que por omisión afirma la ausencia de alergias.

**Caso real.** Se prescribe amoxicilina a un paciente con alergia a la penicilina registrada en su expediente. El sistema no advierte, porque nada conecta la prescripción con las alergias, y el documento emitido no deja constancia de que se verificó.

**Consecuencia.** Seguridad clínica, en el punto exacto donde el defecto de BM-PAC-01 se convierte en daño.

**Cambio propuesto.** La emisión de la receta exige un paso de verificación cuyo resultado se persiste:

```ts
export interface VerificacionSeguridadPrescripcion {
  estadoAlergicoAlPrescribir: EstadoAlergico;
  estadoGestacionalAlPrescribir: EstadoGestacional;
  /** Si el estado alérgico era 'no_interrogado', queda constancia de quién asumió el riesgo. */
  prescritoSinInterrogatorioDeAlergias: { justificacion: string; usuarioId: UsuarioId } | null;
  alertasPresentadas: readonly { tipo: string; medicamentoId: string; severidad: 'informativa' | 'advertencia' | 'contraindicacion' } [];
  verificadoEn: InstanteISO;
}
```

Regla de implementación: una contraindicación absoluta (alergia confirmada a la sustancia prescrita) bloquea la emisión; el prescriptor puede continuar sólo declarando por escrito la justificación, que queda en el documento.

---

### BM-FAR-03 · Alta · INV — No hay cantidad prescrita, ni resurtido, ni vigencia

**Evidencia.** `MedicamentoPrescrito` (`mocks/recetas.ts:10-21`) no tiene cantidad. `MedicamentoDispensado` sí tiene `cantidad: number` (`mocks/farmacia.ts:21`), es decir la farmacia registra lo que entrega sin poder compararlo con lo prescrito. `Receta.estado` incluye `'vencida'` (`mocks/recetas.ts:37`) pero no hay fecha de vigencia que la determine. No hay contador de surtidos ni marca de sello.

**Caso real que no se puede representar.** Saber si la farmacia entregó lo prescrito. Saber si una receta resurtible ya se surtió tres veces. Saber si una receta está vencida.

**Fundamento (verificado 2026-08-22).** LGS artículo **226** fracciones II, III y IV, transcritas en BM-FAR-01: vigencia de treinta días, surtido hasta tres veces con sello y registro cada vez, retención en la tercera ocasión, y resurtido según indique el médico.

**Cambio propuesto.** `cantidadTotal` en `MedicamentoPrescrito`, y `vigenciaHasta`, `resurtidoAutorizado`, `surtidos` y `retenidaPorFarmacia` en `Receta`, como se define en BM-FAR-01 y BM-FAR-02.

---

### BM-FAR-04 · Alta · INV — No se distingue la denominación genérica de la distintiva

**Evidencia.** `mocks/recetas.ts:2` y `:13`: un único campo `nombre: string`. Los datos semilla usan el nombre genérico (`'Paracetamol'`, `mocks/recetas.ts:43`), pero nada en el tipo lo garantiza ni permite consignar la marca cuando el médico decide indicarla.

**Fundamento (verificado 2026-08-22).**
- LGS artículo **225** (párrafo reformado DOF 30-03-2022): "Los medicamentos, para su uso, prescripción médica y comercialización, serán identificados por sus denominaciones genérica y distintiva. **La identificación genérica será obligatoria.**"
- LGS artículo **226**, último párrafo (adicionado DOF 30-03-2022): "**El emisor de la receta médica prescribirá los medicamentos en su denominación genérica** y, si lo desea, podrá indicar la denominación distintiva de su preferencia informando al paciente sobre las opciones terapéuticas."

**Cambio propuesto.** `denominacionGenerica: string` obligatoria y `denominacionDistintiva: string | null` opcional, en `Medicamento` y en `MedicamentoPrescrito`, como en BM-FAR-01. El documento impreso muestra siempre la genérica y la distintiva sólo cuando el médico la indicó.

---

### BM-FAR-06 · Alta · INV — La receta no sabe en qué establecimiento se emitió

**Evidencia.** `Receta` no tiene `sucursalId`, y `pages/recetas/components/RecetaPrintModal.tsx:19` resuelve el establecimiento con `sucursales[0]`. Manifestación específica de BM-TRA-02 en el documento con mayor circulación externa del sistema: la receta es el documento que el paciente lleva a una farmacia de terceros.

**Fundamento (verificado 2026-08-22).** NOM-004 numeral **5.2.1**. Los requisitos específicos de la receta (nombre, domicilio y número de cédula del prescriptor) están en el Reglamento de Insumos para la Salud, **no verificado**; ver documento 01 §8.

**Cambio propuesto.** `Receta extends ActoEnSucursal` y el modal recibe el establecimiento resuelto como propiedad obligatoria.

---

### BM-FAR-08 · Alta · DD — La dispensación no identifica al responsable ni al lote entregado

**Evidencia.** `mocks/farmacia.ts:59`: `usuario: string` — nombre, no identificador. `MedicamentoDispensado` (`:16-25`) tiene `lote: string` pero **no** la caducidad del lote entregado, y `cantidad: number` **sin unidad**: ¿tabletas, cajas, mililitros?

**Caso real que no se puede representar.** Una alerta sanitaria obliga a retirar un lote. No se puede saber a qué pacientes se les entregó ese lote con su caducidad, ni quién lo entregó.

**Cambio propuesto.** `DispensacionFarmacia extends ActoEnSucursal, Fechado, Autoria`, y en `MedicamentoDispensado`: `cantidad: { valor: number; unidad: string }`, `lote: { numero: string; caducidad: FechaISO }`, y referencia al renglón de la receta que satisface.

---

### BM-FAR-09 · Alta · DD — El inventario es global y no tiene almacén

**Evidencia.** `mocks/farmacia.ts:3-14`: `InventarioFarmacia` no tiene `sucursalId` ni almacén. `stock: number` sin unidad. Un solo registro por medicamento y lote para toda la organización.

**Caso real que no se puede representar.** Que la sucursal de Guadalajara tenga existencias y la de la Ciudad de México no. Es la situación normal y el modelo la hace inexpresable.

**Cambio propuesto.** `InventarioFarmacia extends ActoEnSucursal` con `almacenId`, `existencia: { valor: number; unidad: string }`, y separación entre el catálogo (medicamento y lote) y la existencia por ubicación.

---

### BM-FAR-07 · Media · INV — No hay retención de receta ni libro de control en farmacia

**Evidencia.** `DispensacionFarmacia` (`mocks/farmacia.ts:39-60`) no tiene registro de retención de la receta ni referencia a libro de control.

**Fundamento (verificado 2026-08-22).** LGS artículo **226** fracción II: la receta "deberá retenerse en la farmacia que la surta y ser registrada en los libros de control que al efecto se lleven"; fracción III: "debe sellarse y registrarse cada vez en los libros de control".

**Cambio propuesto.** Los campos `retenidaPorFarmacia` y `surtidos[].selloFarmacia` de BM-FAR-01, más una vista de libro de control derivada de las dispensaciones de medicamentos de los grupos I, II y III. La equivalencia entre el libro electrónico y el libro físico que exige la ley **queda como decisión abierta**, porque depende del Reglamento de Insumos para la Salud, no verificado.

---

## 7. Estudios y resultados

---

### BM-EST-01 · Alta · INV — No se identifica a quien realizó el estudio ni a quien lo informa

**Evidencia.** `mocks/estudios.ts:21-43`. `EstudioSolicitado` tiene `doctorId` y `doctorName` del **solicitante**. No tiene ningún campo para quien realizó el estudio ni para quien firma el informe.

**Caso real que no se puede representar.** Un informe de laboratorio o de radiología sin responsable. El informe es el documento con valor clínico y legal, y hoy no tiene autor.

**Fundamento (verificado 2026-08-22).** NOM-004-SSA3-2012 numeral **9.2**, reportes de los servicios auxiliares de diagnóstico y tratamiento:

| Numeral | Contenido exigido | ¿Está? |
|---|---|---|
| 9.2.1 | Fecha y hora del estudio | **No** (sólo de la solicitud, y `fechaResultado` sin hora) |
| 9.2.2 | Identificación del solicitante | Parcial (`doctorId`, `doctorName`, sin cédula) |
| 9.2.3 | Estudio solicitado | Sí |
| 9.2.4 | Problema clínico en estudio | Parcial (`diagnosticoRelacionado: string`) |
| 9.2.5 | Resultados del estudio | Sí (`resultado`, `parametros`) |
| 9.2.6 | Incidentes y accidentes, si los hubo | **No** |
| 9.2.7 | Identificación del personal que realizó el estudio | **No** |
| 9.2.8 | Nombre completo y firma del personal que informa | **No** |

**Cambio propuesto.**

```ts
export interface EstudioSolicitado extends ActoEnSucursal, Fechado {
  // … solicitud
  solicitante: Autoria;                                  // 9.2.2
  problemaClinico: readonly DiagnosticoAsentado[];       // 9.2.4
  realizacion: {
    ocurrioEn: InstanteISO;                              // 9.2.1
    realizadoPor: Autoria;                               // 9.2.7
    lugar: { tipo: 'propio'; sucursalId: SucursalId } | { tipo: 'externo'; laboratorio: string; folioExterno: string };
    incidentes: string | null;                           // 9.2.6
  } | null;
  informe: {
    parametros: readonly ParametroResultado[];
    interpretacion: string;
    informadoPor: Autoria;                               // 9.2.8
    firmas: readonly Firma[];
  } | null;
}
```

---

### BM-EST-05 · Alta · RSC — El valor del resultado es texto y el rango de referencia no depende del paciente

**Evidencia.** `mocks/estudios.ts:12-19`: `valor: string`, `rangoReferencia: string`, `fueraRango?: boolean`. La unidad sí existe (`:15`), y es el único acierto de unidades del modelo.

**Caso real que no se puede representar.** Graficar la evolución de la creatinina de un paciente. `valor` es texto, así que `'1.2'`, `'1,2'` y `'<0.2'` conviven. Y el rango de referencia es una cadena fija: la hemoglobina normal de un hombre adulto, de una mujer adulta y de un lactante son tres rangos distintos, y el modelo tiene uno.

Y `fueraRango?: boolean` es opcional: cuando falta, no se sabe si el valor está dentro del rango o si nadie lo evaluó.

**Cambio propuesto.**

```ts
export type ValorResultado =
  | { tipo: 'numerico'; valor: number; unidad: string }
  | { tipo: 'numerico_censurado'; operador: '<' | '>'; valor: number; unidad: string }
  | { tipo: 'cualitativo'; valor: string; codificacion?: string }
  | { tipo: 'texto'; valor: string }
  | { tipo: 'no_realizado'; razon: 'muestra_insuficiente' | 'muestra_hemolizada' | 'muestra_rechazada' | 'equipo_fuera_de_servicio' };

export interface ParametroResultado {
  nombre: string;
  codigoLoinc: string | null;
  valor: ValorResultado;
  /** Rango aplicado a este paciente, con la razón de su elección. */
  rangoAplicado: { min: number | null; max: number | null; unidad: string; criterio: string } | null;
  interpretacion: 'normal' | 'bajo' | 'alto' | 'critico' | 'no_evaluado';
  nota: string | null;
}
```

`interpretacion` sustituye a `fueraRango?: boolean` y agrega `'no_evaluado'`, que es lo que el booleano opcional no puede decir.

---

### BM-EST-07 · Alta · RSC — No hay valor crítico ni acuse de lectura del resultado

**Evidencia.** No hay campo de valor crítico ni de notificación ni de lectura en `EstudioSolicitado`. El estado (`mocks/estudios.ts:36`) llega hasta `'completado'`, que describe al laboratorio y no al circuito clínico.

**Caso real que no se puede representar.** Un potasio de 7.2 mEq/L, que es una urgencia con riesgo de arritmia letal. El resultado se registra como "completado" y nadie sabe si el médico lo vio. El resultado crítico no leído es una de las causas de daño evitable mejor documentadas en seguridad del paciente.

**Cambio propuesto.**

```ts
export interface CircuitoResultado {
  esCritico: boolean;
  notificacion: { a: UsuarioId; en: InstanteISO; medio: 'sistema' | 'telefono' | 'presencial'; recibidoPor: string } | null;
  acuse: { porUsuarioId: UsuarioId; en: InstanteISO } | null;
  conducta: { descripcion: string; porUsuarioId: UsuarioId; en: InstanteISO } | null;
}
```

Regla de implementación: un resultado crítico sin acuse permanece visible y escalando; no se puede archivar.

---

### BM-EST-04 · Alta · DD — Los archivos adjuntos son un número

**Evidencia.** `mocks/estudios.ts:39`: `archivosAdjuntos: number;`.

**Caso real que no se puede representar.** Guardar el informe de radiología en PDF, o la imagen. El modelo guarda **cuántos hay**, no cuáles. En imagenología, el informe firmado *es* el resultado; el campo `resultado: string | null` no lo sustituye.

**Cambio propuesto.**

```ts
export interface DocumentoAdjunto {
  id: string;
  nombre: string;
  tipoMime: string;
  tamanoBytes: number;
  /** Integridad: permite detectar alteración del adjunto. */
  hashSha256: string;
  subidoPor: Autoria;
  subidoEn: InstanteISO;
  clasificacion: 'informe' | 'imagen' | 'consentimiento_firmado' | 'identificacion' | 'documento_externo' | 'otro';
  esResultadoOficial: boolean;
}
```

Aplica también a `ConsentimientoInformado.documentoUrl?: string` (`mocks/consentimientos.ts:18`) y a `SolicitudARCO.documentoAdjunto?: string` (`mocks/derechosARCO.ts:14`), que hoy son cadenas sueltas.

---

### BM-EST-02 · Media · INV — Falta la fecha y hora del estudio

**Evidencia.** `mocks/estudios.ts:33-35`: `fechaSolicitud`, `horaSolicitud`, y `fechaResultado: string | null` **sin hora**. No hay fecha ni hora de realización.

**Fundamento (verificado 2026-08-22).** NOM-004 numeral **9.2.1**: "Fecha y hora del estudio". La fecha de la solicitud no es la del estudio, y la del resultado tampoco.

**Cambio propuesto.** El campo `realizacion.ocurrioEn` de BM-EST-01, y `informe.emitidoEn` como instante completo.

---

### BM-EST-03 · Media · INV — No hay registro de incidentes y accidentes

**Evidencia.** `EstudioSolicitado` tiene `notas: string` genérico y ningún campo de incidentes.

**Fundamento (verificado 2026-08-22).** NOM-004 numeral **9.2.6**: "Incidentes y accidentes, si los hubo".

Precisión de alcance: se dijo que el mismo requisito aparece en el numeral **8.8.8** para la nota postoperatoria. Ese inciso **no está en la lista de numerales que se leyeron literalmente** (documento 01 §2), de modo que **queda pendiente de verificación** y no se invoca como fundamento. Lo que sí está verificado es que el numeral 8.8 corresponde a la nota postoperatoria y el 8.9 a la nota de egreso. El hallazgo se sostiene por sí solo en el numeral 9.2.6.

**Cambio propuesto.** El campo `realizacion.incidentes` de BM-EST-01. Un campo dedicado, no una nota genérica, porque un incidente es un evento reportable con su propio circuito.

---

### BM-EST-06 · Media · DD — No hay muestra rechazada ni laboratorio externo

**Evidencia.** `mocks/estudios.ts:36`: `'solicitado' | 'en_proceso' | 'completado' | 'cancelado'`. No hay `sucursalId` ni identificación del laboratorio.

**Casos reales que no se pueden representar.** Muestra hemolizada que obliga a repetir la toma; estudio enviado a un laboratorio de referencia, que es la práctica normal en una clínica ambulatoria; estudio al que el paciente no acudió; estudio que requiere preparación no cumplida (ayuno).

**Cambio propuesto.** El estado se amplía con `'muestra_rechazada'`, `'requiere_repeticion'`, `'paciente_no_acudio'` y `'preparacion_no_cumplida'`, y se agrega `realizacion.lugar` de BM-EST-01 para el laboratorio externo con su folio.

---

## 8. Agenda y citas

Este es el dominio con menos brechas, porque `Appointment` es una de las tres entidades que sí lleva `sucursalId` y su enumeración de estados es la más completa del modelo (`mocks/appointments.ts:12`, doce estados incluido `'no_acudio'`).

---

### BM-AGE-01 · Media · DD — La cancelación no registra motivo, autor ni historial

**Evidencia.** `mocks/appointments.ts:12`: `estado` incluye `'cancelada'` y `'no_acudio'`, pero no hay `motivoCancelacion`, `canceladaPor`, `canceladaEn` ni referencia a la cita que sustituye a una reprogramada.

**Caso real que no se puede representar.** Distinguir la cancelación por el paciente de la cancelación por la clínica. Es la distinción que gobierna la política de penalización, el indicador de calidad y la conversación con el paciente. También: reconstruir que una cita se reprogramó tres veces.

**Cambio propuesto.**

```ts
export type DesenlaceCita =
  | { tipo: 'programada' }
  | { tipo: 'atendida'; consultaId: string }
  | { tipo: 'cancelada'; por: 'paciente' | 'clinica' | 'medico' | 'sistema'; motivo: string; en: InstanteISO; usuarioId: UsuarioId | null; reprogramadaComo: string | null }
  | { tipo: 'no_acudio'; registradoEn: InstanteISO };
```

---

### BM-AGE-02 · Baja · DD — El consultorio se guarda por nombre

**Evidencia.** `mocks/appointments.ts:14`: `consultorio: string`, con valores como `'Consultorio 101'` (`:35`), mientras `Consultorio` tiene `id` (`mocks/branches.ts:1-7`).

**Cambio propuesto.** `consultorioId: ConsultorioId`.

---

### BM-AGE-03 · Baja · DD — No se puede agendar a quien no tiene expediente

**Evidencia.** `mocks/appointments.ts:4-5`: `patientId` y `patientName` obligatorios.

**Caso real.** Una persona llama para pedir cita y no es paciente todavía. Hoy hay que crear un expediente completo —con CURP obligatoria— para poder apuntarla.

**Cambio propuesto.** `sujeto: { tipo: 'paciente'; pacienteId: PacienteId } | { tipo: 'prospecto'; nombre: string; telefono: Telefono }`, y la conversión del prospecto en paciente al momento de la llegada.

---

## 9. Caja, cobros y CFDI

Aviso de método: los hallazgos fiscales de esta sección se marcan **IPV** y no INV. El documento 01 §7 verificó que CFDI 4.0 es la única versión válida y que los catálogos del SAT son volátiles, pero **el Anexo 20 no se verificó a nivel de campo el 2026-08-22**. Las carencias que se señalan son las que se desprenden de la estructura del comprobante tal como se usa en la práctica, y deben confirmarse contra el Anexo 20 y la Guía de llenado antes de tratarse como incumplimiento. La verificación pendiente está registrada en el documento 01 §8.

---

### BM-CAJ-01 · Alta · DD — La caja no tiene sucursal

**Evidencia.** `mocks/caja.ts:1-15`: `CashSession` no tiene `sucursalId`. `CashTransaction` (`:17-42`) tampoco. `CorteCaja` (`:44-60`) tampoco.

**Caso real que no se puede representar.** Dos sucursales abren caja el mismo día. Son dos sesiones indistinguibles, con un solo corte agregado. El arqueo no se puede hacer, la diferencia no se puede imputar y el responsable no se puede determinar.

**Cambio propuesto.** Las tres entidades extienden `ActoEnSucursal`, y `CashSession` agrega `cajaId` porque una sucursal puede tener más de un punto de cobro.

---

### BM-CAJ-02 · Alta · IPV — El comprobante no tiene varios atributos que CFDI 4.0 requiere

**Evidencia.** `mocks/facturacion.ts:25-70`. `FacturaCFDI` tiene emisor, receptor, importes, impuestos, conceptos y sellos. **No tiene**: lugar de expedición, tipo de comprobante, atributo de exportación, versión, número de certificado, ni el código postal del domicilio fiscal del receptor. Tampoco tiene `sucursalId`, aunque el lugar de expedición depende de la sucursal.

`FacturaConcepto` (`:7-15`) tiene `claveProdServ` y `claveUnidad` pero no objeto de impuesto.

**Consecuencia.** Fiscal. Un comprobante sin lugar de expedición no se timbra. El riesgo real es el rechazo del PAC en producción.

**Fundamento.** Anexo 20 y Guía de llenado del CFDI 4.0. **No verificados a nivel de campo el 2026-08-22.** Se marca IPV. La verificación pendiente se registra en el documento 01 §8.

**Cambio propuesto (a confirmar contra el Anexo 20).**

```ts
export interface FacturaCFDI extends ActoEnSucursal {
  version: '4.0';
  tipoDeComprobante: 'I' | 'E' | 'T' | 'N' | 'P';
  /** Código postal del lugar de expedición. Depende de la sucursal. */
  lugarExpedicion: string;
  exportacion: '01' | '02' | '03' | '04';
  noCertificado: string;
  emisor: { rfc: string; nombre: string; regimenFiscal: string };
  receptor: { rfc: string; nombre: string; domicilioFiscalCP: string; regimenFiscal: string; usoCFDI: string };
  // … importes y conceptos
  conceptos: readonly (FacturaConcepto & { objetoImp: '01' | '02' | '03' | '04' })[];
  timbre: { uuid: string; fechaTimbrado: InstanteISO; selloCFD: string; selloSAT: string; noCertificadoSAT: string; cadenaOriginal: string } | null;
  cancelacion: CancelacionCFDI | null;
}
```

Y, siguiendo la conclusión del documento 01 §7: las claves de catálogo se tipan como `string` validado contra el catálogo vigente en base de datos, **no** como uniones de literales en el código.

---

### BM-CAJ-03 · Alta · IPV — La cancelación no tiene motivo ni comprobante que la sustituye

**Evidencia.** `mocks/facturacion.ts:5`: `export type FacturaEstado = 'vigente' | 'cancelada';`. No hay motivo, ni fecha de cancelación, ni UUID del comprobante que sustituye, ni estado de aceptación de la solicitud.

**Caso real que no se puede representar.** Cancelar un CFDI. Desde 2022 la cancelación requiere señalar el motivo, y el motivo "comprobante emitido con errores con relación" exige el folio fiscal del que lo sustituye. Además la cancelación puede quedar en espera de la aceptación del receptor.

**Fundamento.** Reglas de cancelación del CFDI. **No verificadas en fuente oficial el 2026-08-22.** IPV; ver documento 01 §8.

**Cambio propuesto (a confirmar).**

```ts
export interface CancelacionCFDI {
  motivo: '01' | '02' | '03' | '04';
  /** Obligatorio con motivo 01: folio fiscal del comprobante que sustituye. */
  uuidSustitucion: string | null;
  solicitadaEn: InstanteISO;
  solicitadaPor: UsuarioId;
  estatus: 'en_proceso' | 'aceptada' | 'rechazada' | 'plazo_vencido';
  resueltaEn: InstanteISO | null;
}
```

---

### BM-CAJ-05 · Alta · DD — El dinero se representa en punto flotante

**Evidencia.** `mocks/caja.ts:28-30`, `mocks/facturacion.ts:52-54`, `mocks/farmacia.ts:22-23,48-50`, `mocks/estudios.ts:9`: todos los montos son `number`.

**Consecuencia.** Fiscal y contable. La aritmética de punto flotante produce discrepancias de centavos que, acumuladas en un corte de caja, generan diferencias que nadie puede explicar y que en un comprobante fiscal provocan que el sello no coincida.

**Cambio propuesto.**

```ts
/** Cantidad monetaria en la unidad mínima de la moneda (centavos). Entero, exacto. */
export interface Dinero {
  readonly centavos: number;   // entero
  readonly moneda: 'MXN' | 'USD';
}
```

Toda operación aritmética pasa por funciones del módulo de dinero, con la regla de redondeo declarada. `MedicalService.precio`, los importes de caja, farmacia y facturación adoptan `Dinero`.

---

### BM-CAJ-04 · Media · DD — El reembolso no referencia la transacción original ni su autorización

**Evidencia.** `mocks/caja.ts:37`: `estado: 'pagado' | 'cancelado' | 'reembolsado'`. No hay referencia a la transacción original, ni motivo, ni quién autorizó.

**Consecuencia.** Control interno. Un reembolso sin autorización trazable es el hueco clásico de un punto de cobro.

**Cambio propuesto.** El patrón correcto ya existe en el modelo, en `CertificadoMedico` (`mocks/certificados.ts:32-36`). Se replica:

```ts
export type EstadoTransaccion =
  | { estado: 'pagado' }
  | { estado: 'cancelado'; motivo: string; por: UsuarioId; en: InstanteISO; autorizadoPor: UsuarioId }
  | { estado: 'reembolsado'; motivo: string; por: UsuarioId; en: InstanteISO; autorizadoPor: UsuarioId; transaccionOriginalId: string; montoReembolsado: Dinero };
```

---

### BM-CAJ-06 · Media · IPV — No hay público en general ni vínculo entre el cobro y el acto clínico

**Evidencia.** `mocks/caja.ts:22-23`: `pacienteId` y `paciente` obligatorios. `mocks/facturacion.ts:62-63` igual. `CashTransaction.consultaId?` es opcional y `servicioId` es una cadena.

**Casos reales que no se pueden representar.** Un cobro a quien no es paciente (venta de insumo, cobro de copia de expediente). Una factura a público en general con RFC genérico. Y, del otro lado, la trazabilidad completa entre el acto clínico y su cobro, que es lo que permite auditar que se cobró lo que se hizo.

**Fundamento.** Requisitos del RFC genérico en CFDI 4.0. **No verificados el 2026-08-22.** IPV.

**Cambio propuesto.** `sujetoDeCobro: { tipo: 'paciente'; pacienteId: PacienteId } | { tipo: 'tercero'; nombre: string; rfc: string | null } | { tipo: 'publico_general' }`, y `conceptos` con referencia tipada al acto que origina el cobro (`consultaId`, `estudioId`, `dispensacionId`).

---

## 10. Normatividad

Esta sección concentra el mayor número de incumplimientos verificados, porque es donde el modelo se contrasta directamente contra los numerales de la NOM-004 que definen el contenido mínimo de cada documento.

---

### BM-NOR-01 · Crítica · INV — El consentimiento informado no tiene médico que informa y admite un solo testigo opcional

**Evidencia.** `mocks/consentimientos.ts:1-20`, tipo completo. Contraste contra el numeral 10.1.1 de la NOM-004:

| Numeral | Contenido exigido | ¿Está en `ConsentimientoInformado`? |
|---|---|---|
| 10.1.1.1 | Nombre de la institución a la que pertenezca el establecimiento, en su caso | **No** |
| 10.1.1.2 | Nombre, razón o denominación social del establecimiento | **No** (se resuelve con `sucursales[0]` al imprimir) |
| 10.1.1.3 | Título del documento | Sí (`titulo`) |
| 10.1.1.4 | Lugar y fecha en que se emite | Parcial: `fechaFirma`, `horaFirma`; **sin lugar** |
| 10.1.1.5 | Acto autorizado | **No** — `descripcion` es texto libre, no el acto |
| 10.1.1.6 | Señalamiento de los riesgos y beneficios esperados | Parcial: `riesgos?` y `beneficios?` son **opcionales** |
| 10.1.1.7 | Autorización para la atención de contingencias y urgencias derivadas del acto | **No** |
| 10.1.1.8 | Nombre completo y firma del paciente; si no puede firmar, del familiar más cercano presente, tutor o representante legal | Parcial: `firmadoPor: string`, **sin calidad jurídica** |
| 10.1.1.9 | Nombre completo y firma del médico que proporciona la información y recaba el consentimiento; en su caso, datos del médico tratante | **No existe ningún campo de médico** |
| 10.1.1.10 | Nombre completo y firma de **dos testigos** | **No** — `testigo?: string`, uno y opcional |

**Caso real que no se puede representar.** Un consentimiento informado válido. Faltan seis de los diez elementos obligatorios, incluidos los dos más importantes: el médico que informó y los dos testigos.

**Consecuencia.** Legal, máxima. El consentimiento informado es el documento cuya ausencia o invalidez determina la responsabilidad en la mayoría de las reclamaciones por acto médico. Un consentimiento sin médico identificable y sin testigos es un documento sin eficacia.

**Fundamento (verificado 2026-08-22, texto del DOF).** NOM-004-SSA3-2012 numeral **10.1.1** y sus diez incisos, transcritos en la tabla.

**Cambio propuesto.**

```ts
export interface ConsentimientoInformado extends ActoEnSucursal, Fechado, Firmable {
  id: string;
  pacienteId: PacienteId;
  /** 10.1.1.1 y 10.1.1.2 — se resuelven de sucursalId, no de sucursales[0]. */
  /** 10.1.1.3 */
  titulo: string;
  /** 10.1.1.4 — lugar, además de fecha y hora. */
  lugarEmision: string;
  /** 10.1.1.5 — el acto concreto que se autoriza, del catálogo del numeral 10.1.2. */
  actoAutorizado: ActoQueRequiereConsentimiento;
  /** 10.1.1.6 — obligatorios, no opcionales. */
  riesgos: string;
  beneficiosEsperados: string;
  alternativas: string | null;
  /** 10.1.1.7 */
  autorizaAtencionDeContingencias: boolean;
  /** 10.1.1.9 — quien informa y recaba. Obligatorio. */
  medicoQueInforma: Autoria;
  medicoTratante: Autoria | null;
  /** 10.1.1.8 — quién otorga y en qué calidad. */
  otorgante: { calidad: CalidadJuridica; nombreCompleto: string; representacionId: string | null; razonPorLaQueNoFirmaElPaciente: string | null };
  /** 10.1.1.10 — exactamente dos, obligatorios. */
  testigos: readonly [Testigo, Testigo];
  /** Comprensión: sostiene la validez del consentimiento. Ver BM-PAC-09. */
  otorgadoConInterprete: { nombre: string; lengua: string } | null;
  revocacion: { en: InstanteISO; motivo: string; recibidaPor: UsuarioId } | null;
}

export interface Testigo { nombreCompleto: string; identificacion: string | null; firma: Firma; }
```

El tipo `readonly [Testigo, Testigo]` es deliberado: una tupla de dos hace que el compilador exija los dos testigos, lo que un arreglo no logra.

---

### BM-NOR-03 · Crítica · INV — La hoja de egreso no tiene pronóstico, problemas pendientes, causas de muerte ni dos testigos

**Evidencia.** `mocks/egresos.ts:1-28`, contraste contra el numeral 8.9 de la NOM-004:

| Numeral | Contenido exigido | ¿Está en `HojaEgreso`? |
|---|---|---|
| 8.9.1 | Fecha de ingreso/egreso | Sí (`fechaIngreso`, `fechaEgreso`, con horas) |
| 8.9.2 | Motivo del egreso | Parcial: `estadoAlta` y `destinoAlta`, no el motivo |
| 8.9.3 | Diagnósticos finales | Sí (`diagnosticoEgreso`, `diagnosticosSecundarios`) |
| 8.9.4 | Resumen de la evolución y el estado actual | Sí (`resumenEvolucion`) |
| 8.9.5 | Manejo durante la estancia | Sí (`tratamientoRecibido`) |
| 8.9.6 | **Problemas clínicos pendientes** | **No** |
| 8.9.7 | Plan de manejo y tratamiento | Parcial (`medicamentosAlta`, `recomendaciones`) |
| 8.9.8 | Recomendaciones para vigilancia ambulatoria | Parcial (`recomendaciones`, `citaControl?`) |
| 8.9.9 | **Atención de factores de riesgo (incluido abuso y dependencia del tabaco, del alcohol y de otras sustancias psicoactivas)** | **No** |
| 8.9.10 | **Pronóstico** | **No** |
| 8.9.11 | **En caso de defunción, causas de la muerte conforme al certificado de defunción y, en su caso, si se solicitó y se llevó a cabo necropsia** | **No** — existe `estadoAlta: 'fallecimiento'` y `destinoAlta: 'defuncion'`, y ningún campo para las causas ni la necropsia |
| 5.10 | Firma | **No** — `firmaPaciente: boolean`, `firmaMedico: boolean` |
| 10.2.3.1 | Nombre y domicilio del establecimiento | **No** (`sucursales[0]` al imprimir) |
| 10.2.3.8 | Nombre completo y firma de **dos testigos** | **No** — no hay testigos |

**Caso real que no se puede representar.** El egreso por defunción. El modelo permite marcar `estadoAlta: 'fallecimiento'` y no tiene dónde asentar las causas de la muerte ni si se realizó necropsia, que es exactamente lo que el numeral 8.9.11 exige.

**Consecuencia.** Legal. El documento que cierra el episodio asistencial carece de cuatro elementos obligatorios, uno de ellos aplicable al desenlace más grave posible.

**Fundamento (verificado 2026-08-22).** NOM-004-SSA3-2012 numerales **8.9.1** a **8.9.11**, y **10.2.3** para la hoja de egreso voluntario.

**Cambio propuesto.** `HojaEgreso` se completa con los cuatro campos faltantes y adopta `ActoEnSucursal`, `Fechado`, `Autoria` y `Firmable`:

```ts
export interface HojaEgreso extends ActoEnSucursal, Fechado, Autoria, Firmable {
  // … campos existentes
  motivoEgreso: string;                                    // 8.9.2
  problemasClinicosPendientes: readonly string[];           // 8.9.6
  factoresDeRiesgoAtendidos: readonly {                     // 8.9.9
    factor: 'tabaco' | 'alcohol' | 'sustancias_psicoactivas' | 'otro';
    intervencion: string;
  }[];
  pronostico: Pronostico;                                   // 8.9.10
  defuncion: {                                              // 8.9.11
    ocurrioEn: InstanteISO;
    causasDeMuerte: { directa: string; antecedentes: readonly string[]; otras: readonly string[] };
    folioCertificadoDefuncion: string | null;
    necropsia: 'no_solicitada' | 'solicitada_no_realizada' | 'realizada';
  } | null;
  testigos: readonly [Testigo, Testigo] | null;             // 10.2.3.8, en egreso voluntario
}
```

---

### BM-NOR-02 · Alta · INV — Los tipos de consentimiento no corresponden a los eventos que la norma exige

**Evidencia.** `mocks/consentimientos.ts:6`: `tipo: 'general' | 'procedimiento' | 'datos_personales' | 'imagenes' | 'menor_edad'`. Ninguno de los cinco corresponde a los nueve eventos mínimos de la norma; y `'menor_edad'` no es un tipo de acto sino una condición del otorgante, es decir la enumeración mezcla dos dimensiones.

**Fundamento (verificado 2026-08-22).** NOM-004-SSA3-2012 numeral **10.1.2**: "Los eventos mínimos que requieren de cartas de consentimiento informado serán: 10.1.2.1 Ingreso hospitalario; 10.1.2.2 Procedimientos de cirugía mayor; 10.1.2.3 Procedimientos que requieren anestesia general o regional; 10.1.2.4 Salpingoclasia y vasectomía; 10.1.2.5 Donación de órganos, tejidos y trasplantes; 10.1.2.6 Investigación clínica en seres humanos; 10.1.2.7 Necropsia hospitalaria; 10.1.2.8 Procedimientos diagnósticos y terapéuticos considerados por el médico como de alto riesgo; 10.1.2.9 Cualquier procedimiento que entrañe mutilación." Y numeral **10.1.3**: se pueden obtener consentimientos adicionales a los previstos, "sin que, para ello sea obligatorio el empleo de formatos impresos".

**Cambio propuesto.**

```ts
export type ActoQueRequiereConsentimiento =
  | { catalogo: 'nom004'; evento: '10.1.2.1_ingreso_hospitalario' | '10.1.2.2_cirugia_mayor' | '10.1.2.3_anestesia_general_o_regional' | '10.1.2.4_salpingoclasia_o_vasectomia' | '10.1.2.5_donacion_o_trasplante' | '10.1.2.6_investigacion_clinica' | '10.1.2.7_necropsia_hospitalaria' | '10.1.2.8_procedimiento_de_alto_riesgo' | '10.1.2.9_procedimiento_con_mutilacion'; descripcionEspecifica: string }
  | { catalogo: 'adicional'; descripcion: string }   // NOM-004 10.1.3
  | { catalogo: 'privacidad'; finalidad: 'tratamiento_de_datos' | 'uso_de_imagenes' | 'finalidad_secundaria' };
```

La condición del otorgante (menor de edad, incapacidad) sale de esta enumeración y vive en `otorgante.calidad` (BM-NOR-01, BM-PAC-08). El consentimiento de privacidad se mantiene separado porque su fundamento es la LFPDPPP y no la NOM-004; el documento 01 §4 ya verificó la base de licitud aplicable.

---

### BM-NOR-04 · Alta · INV — No existe la hoja de egreso voluntario

**Evidencia.** `HojaEgreso.destinoAlta` (`mocks/egresos.ts:18`) no incluye alta voluntaria, y `estadoAlta` (`:17`) tampoco. `EstadoUrgencia` tampoco (BM-URG-06). No hay entidad separada.

**Caso real que no se puede representar.** El paciente decide irse contra la indicación médica. Es un evento cotidiano en urgencias, y la norma le dedica un documento propio con contenido propio, porque su función jurídica es relevar de responsabilidad al establecimiento y al médico tratante.

**Fundamento (verificado 2026-08-22).** NOM-004-SSA3-2012 numeral **10.2**, y sus incisos 10.2.3.1 a 10.2.3.8: nombre y domicilio del establecimiento; fecha y hora del egreso; nombre completo del paciente o del representante legal, edad, parentesco, nombre y firma de quien solicita el egreso; resumen clínico conforme al numeral 6.4.3; medidas recomendadas; en su caso, nombre y firma del médico que otorgue la responsiva; nombre completo y firma del médico que emite la hoja; y nombre completo y firma de dos testigos.

El numeral 10.2.2 remite además al artículo 79 del Reglamento de la LGS en materia de prestación de servicios de atención médica. Ese artículo **no se verificó**: el documento 01 §8 registra el reglamento como parcialmente verificado (artículos 77, 80, 81 y 82). Ya está agregado a la lista de pendientes puntuales de ese §8.

**Cambio propuesto.** Entidad `HojaEgresoVoluntario` con un campo por inciso del numeral 10.2.3, `testigos: readonly [Testigo, Testigo]`, `solicitante: { nombreCompleto: string; edad: EdadClinica; parentesco: Parentesco; calidad: CalidadJuridica }`, `medicoQueOtorgaResponsiva: Autoria | null` y `resumenClinico` con la estructura del numeral 6.4.3.

---

### BM-NOR-05 · Alta · INV — La nota de enfermería no tiene habitus exterior y la ministración no tiene fecha ni cantidad

**Evidencia.** `mocks/notasEnfermeria.ts`. Contraste contra el numeral 9.1:

| Numeral | Contenido exigido | ¿Está? |
|---|---|---|
| 9.1.1 | Habitus exterior | **No** — hay `estadoInicio`/`estadoFin` con cinco valores, que no es habitus exterior |
| 9.1.2 | Gráfica de signos vitales | Parcial: hay nueve campos `string` sin unidad, incompatibles con los de otros módulos, con los que no se puede graficar (BM-TRA-09) |
| 9.1.3 | Ministración de medicamentos, **fecha, hora, cantidad** y vía prescrita | Parcial: `MedicamentoAdministrado` (`:1-7`) tiene `dosis`, `via`, `hora`; **sin fecha y sin cantidad** |
| 9.1.4 | Procedimientos realizados | Sí (`actividades`) |
| 9.1.5 | Observaciones | Sí |
| 5.10 | Firma | **No** — `firmaEnfermera: boolean` (`:56`) |

**Caso real que no se puede representar.** Una ministración en un turno nocturno que cruza la medianoche: `hora: '23:50'` y `hora: '00:20'` sin fecha son ambiguas respecto al día. Y `dosis: '500mg'` no es la cantidad ministrada: si se administró media tableta de 500 mg, la cantidad es otra.

Tampoco hay vínculo entre la ministración y la prescripción que la ordena, con lo que no se puede cerrar el circuito prescripción-administración, que es el control básico de seguridad en la medicación.

**Fundamento (verificado 2026-08-22).** NOM-004-SSA3-2012 numeral **9.1** y sus incisos. Nota: la NOM-011-SSA3-2014 sobre atención de enfermería está registrada como **no verificada** en el documento 01 §8, y podría añadir requisitos; no se invoca aquí.

**Cambio propuesto.**

```ts
export interface MedicamentoAdministrado {
  /** Cierra el circuito con la prescripción. */
  recetaId: string | null;
  renglonPrescripcionId: string | null;
  denominacionGenerica: string;
  dosisPrescrita: Dosis;
  /** 9.1.3 — cantidad efectivamente ministrada, con unidad. */
  cantidadMinistrada: { valor: number; unidad: string };
  via: string;
  /** 9.1.3 — fecha y hora, no sólo hora. */
  ministradoEn: InstanteISO;
  ministradoPor: Autoria;
  /** La no administración es información clínica, no ausencia de registro. */
  noAdministrado: { razon: 'paciente_ausente' | 'paciente_rechaza' | 'suspendido_por_medico' | 'no_disponible'; nota: string } | null;
  observacion: string | null;
}

/** 9.1.1 */
habitusExterior: string;
```

Y `firmaEnfermera: boolean` se sustituye por `Firmable`.

---

### BM-NOR-06 · Alta · INV — No existe la hoja de notificación al Ministerio Público

**Evidencia.** No hay entidad de notificación al Ministerio Público en `mocks/`. `Urgencia.viaAcceso` incluye `'policia'` (`mocks/urgencias.ts:28`), lo que evidencia que el escenario está contemplado en el flujo y no en los datos.

**Caso real que no se puede representar.** Llega un paciente con herida por proyectil de arma de fuego. La clínica está obligada a dar aviso al Ministerio Público, y no hay dónde registrar que se dio, a qué agencia, quién lo hizo ni qué se reportó.

**Fundamento.** El documento 01 §2 ya verificó **la obligación** (Reglamento de la LGS en materia de prestación de servicios de atención médica, artículo 19 fracción V) y **la forma del documento** (NOM-004-SSA3-2012 numeral **10.3**). Reverificado hoy en el texto del DOF, el numeral 10.3 exige: 10.3.1 nombre, razón o denominación social del establecimiento notificador; 10.3.2 fecha de elaboración; 10.3.3 identificación del paciente; 10.3.4 acto notificado; 10.3.5 reporte de lesiones del paciente, en su caso; 10.3.6 agencia del Ministerio Público a la que se notifica; y 10.3.7 nombre completo y firma del médico que realiza la notificación.

Este hallazgo es la contraparte de modelo de una obligación que el proyecto ya tiene verificada: la norma y el reglamento están confirmados, y el modelo no tiene la entidad.

**Cambio propuesto.**

```ts
export interface NotificacionMinisterioPublico extends ActoEnSucursal, Fechado, Autoria, Firmable {
  id: string;
  folio: FolioDocumento;
  pacienteId: PacienteId | null;              // puede ser paciente no identificado
  urgenciaId: string;
  actoNotificado: string;                     // 10.3.4
  reporteDeLesiones: string | null;           // 10.3.5
  agenciaMinisterioPublico: string;           // 10.3.6
  medioDeNotificacion: 'oficio' | 'telefonica' | 'presencial' | 'sistema_electronico';
  acuseDeRecibo: { recibidoPor: string; en: InstanteISO; folioAcuse: string | null } | null;
}
```

---

### BM-NOR-10 · Alta · INV — El reloj de retención se ancla en la última consulta y no en el último acto médico

**Evidencia.** `mocks/retencion.ts:143-152`: `RegistroRetencionPaciente` tiene `fechaUltimaConsulta` y calcula `fechaVencimientoRetencion` a partir de ella.

**Caso real.** Un paciente tiene su última consulta en enero de 2021, y en marzo de 2024 se le entrega un resultado de laboratorio, se le dispensa medicamento y se le emite un certificado. Los tres son actos médicos. Con el reloj anclado en la consulta, el expediente vence en enero de 2026; con el reloj correcto, en marzo de 2029. **El modelo autoriza la supresión de un expediente que legalmente debe conservarse tres años más.**

**Consecuencia.** Legal, con daño irreversible: la destrucción prematura de un expediente no se puede deshacer, y es precisamente la prueba que se necesitaría en un litigio.

**Fundamento (verificado 2026-08-22, y ya asentado en el documento 01 §5).** NOM-004-SSA3-2012 numeral **5.4**: los documentos del expediente "deberán ser conservados por un periodo mínimo de 5 años, contados a partir de la fecha del **último acto médico**". La norma dice acto médico, no consulta.

**Cambio propuesto.**

```ts
export type TipoActoMedico = 'consulta' | 'urgencia' | 'triage' | 'nota_evolucion' | 'nota_enfermeria' | 'prescripcion' | 'dispensacion' | 'estudio' | 'certificado' | 'referencia' | 'consentimiento' | 'egreso';

export interface RegistroRetencionPaciente {
  pacienteId: PacienteId;
  /** El reloj de la NOM-004 5.4. Se recalcula al registrarse cualquier acto médico. */
  ultimoActoMedico: { tipo: TipoActoMedico; entidadId: string; ocurrioEn: InstanteISO } | null;
  /** Derivado, no almacenado. Ver BM-TRA-10. */
  // vencimientoRetencion(politicas, ultimoActoMedico): FechaISO
  retencionLegalActiva: { motivo: 'litigio' | 'requerimiento_de_autoridad' | 'queja_conamed'; desde: FechaISO; expediente: string }[] ;
}
```

Los campos `aniosTranscurridos` y `diasRestantes` se eliminan (BM-TRA-10). El campo de retención legal por litigio se agrega porque un requerimiento judicial suspende el vencimiento, y hoy no hay dónde asentarlo.

---

### BM-NOR-08 · Alta · IPV — La solicitud ARCO no acredita identidad, no admite representante y su plazo está congelado

**Evidencia.** `mocks/derechosARCO.ts:1-17`. `SolicitudARCO` tiene `patientId` obligatorio, `plazoDias: number` y `diasRestantes: number` (ver BM-TRA-10), `atendidoPor?: string` como nombre, y `fechaSolicitud` sin hora.

**Casos reales que no se pueden representar.**
1. Acreditar la identidad del titular, que es el requisito previo de toda solicitud ARCO. Sin acreditación, atender la solicitud es en sí mismo una vulneración: se entregan datos de salud a quien no se verificó.
2. Una solicitud presentada por el representante legal, el tutor, o los familiares de una persona fallecida.
3. Una solicitud de quien no es paciente registrado.
4. El cómputo real del plazo, porque `diasRestantes` está congelado y `fechaSolicitud` no tiene hora.
5. La resolución fundada de una supresión que no procede por retención legal vigente, que es el diseño que el documento 01 §5 ya definió.

**Consecuencia.** Legal y de privacidad.

**Fundamento.** LFPDPPP vigente (2025). El documento 01 §4 verificó la base de licitud del artículo 9 fracciones V y VI. **Los numerales relativos a plazos, acreditación de identidad y contenido de la respuesta no se verificaron el 2026-08-22**: IPV. El pendiente está registrado en el documento 01 §8.

**Cambio propuesto.**

```ts
export interface SolicitudARCO extends EntidadDeTenant, Fechado {
  id: string;
  folio: FolioDocumento;
  derecho: 'acceso' | 'rectificacion' | 'cancelacion' | 'oposicion' | 'portabilidad' | 'revocacion_de_consentimiento';
  solicitante: { calidad: CalidadJuridica; nombreCompleto: string; pacienteId: PacienteId | null; contacto: { correo: string | null; telefono: Telefono | null; domicilio: Domicilio | null } };
  /** Requisito previo. Sin esto no se atiende. */
  acreditacionDeIdentidad: { medio: 'identificacion_oficial' | 'comparecencia' | 'firma_electronica' | 'otro'; documento: string; verificadaPor: UsuarioId; verificadaEn: InstanteISO } | null;
  peticion: string;
  /** Plazo derivado, nunca almacenado como días restantes. */
  plazoDias: number;
  resolucion: {
    sentido: 'procede' | 'procede_parcialmente' | 'no_procede' | 'procede_con_anonimizacion' | 'no_procede_por_retencion_legal';
    fundamento: string;
    /** Cuando la retención legal impide la supresión: cuándo sí procederá. */
    procederaEl: FechaISO | null;
    resueltaPor: Autoria;
    notificadaEn: InstanteISO | null;
    medioDeNotificacion: string | null;
  } | null;
  adjuntos: readonly DocumentoAdjunto[];
}
```

Los sentidos de resolución corresponden exactamente al diseño del motor de retención del documento 01 §5, para que ambos documentos sean implementables en conjunto.

---

### BM-NOR-07 · Media · IPV — La notificación epidemiológica no tiene hora, folio ni establecimiento identificable

**Evidencia.** `mocks/vigilancia.ts:1-20`. `fechaNotificacion` sin hora (`:9`), aunque `tipoNotificacion` puede ser `'inmediata'` (`:11`). `institucionNotificante` y `jurisdiccionSanitaria` son cadenas libres (`:15,18`), sin CLUES. `semanaEpidemiologica: number` es un derivado almacenado (`:10`). No hay folio, ni acuse de recibo, ni identificación de quién recibió.

**Caso real que no se puede representar.** Acreditar que un caso de notificación inmediata se notificó dentro del plazo. Sin hora, el plazo de 24 horas no se puede medir; sin acuse, no se puede probar que se notificó.

**Fundamento.** La NOM-017-SSA2-2012 sobre vigilancia epidemiológica está registrada como **no verificada** en el documento 01 §8. No se afirma incumplimiento: IPV.

**Cambio propuesto.** `notificadoEn: InstanteISO`, `folio: FolioDocumento`, `establecimientoNotificante` derivado de `sucursalId` con su CLUES, `acuse: { recibidoPor: string; en: InstanteISO; folio: string } | null`, y `semanaEpidemiologica` derivada de la fecha de inicio de síntomas conforme al calendario epidemiológico vigente.

---

### BM-NOR-09 · Media · DD — La referencia no identifica los establecimientos ni se firma

**Evidencia.** `mocks/referencias.ts:9-10`: `origen: string; destino: string;` como texto libre. No hay `sucursalId`, ni CLUES, ni firma, ni estado del paciente al momento del traslado.

**Nota de justicia con el prototipo:** el contenido clínico de la referencia **sí cumple** el numeral 6.4 de la NOM-004, verificado hoy: 6.4.1 establecimiento que envía (`origen`), 6.4.2 establecimiento receptor (`destino`), 6.4.3.1 motivo de envío (`motivo`), 6.4.3.2 impresión diagnóstica (`diagnosticoResumen`) y 6.4.3.3 terapéutica empleada (`tratamientoPrevio`). Es una de las entidades mejor construidas del modelo. Lo que falta es la identificabilidad y la firma.

**Caso real que no se puede representar.** Recibir una contrarreferencia y vincularla automáticamente, o reportar referencias por establecimiento, porque el destino es texto y `'Hospital General'` puede ser cualquiera de decenas.

**Cambio propuesto.** `origen: { sucursalId: SucursalId }` y `destino: { tipo: 'interno'; sucursalId: SucursalId } | { tipo: 'externo'; nombre: string; clues: string | null; contacto: string }`, más `Firmable`, más `estadoAlTraslado: { signosVitales: SignosVitales; conciencia: string; acompanadoPor: string }`.

---

## 11. Seguridad, usuarios y roles

---

### BM-SEG-03 · Alta · INV — La cédula es opcional para el rol médico y la vigencia no bloquea

**Evidencia.** `mocks/users.ts:15`: `cedulaProfesional?: string;` opcional, para un tipo cuyo `rol` puede ser `'medico'` (`:1`). `UserStatus` (`:2`) es `'activo' | 'inactivo' | 'bloqueado'`, sin estado por credencial vencida. La vigencia existe en `ProfesionalSalud.vigenciaCedula` (`mocks/profesionales.ts:5`), en una entidad desconectada (BM-TRA-08).

**Caso real que no se puede representar.** Impedir que un médico con cédula vencida emita una receta o firme una nota. El dato existe en el sistema, en otra entidad, y nada lo conecta con la autorización.

**Fundamento (verificado 2026-08-22).** LGS artículo **83**, transcrito en BM-TRA-08: las menciones de cédula y, en su caso, Certificado de Especialidad **vigente**, deben consignarse en los documentos. Y NOM-004 numeral **5.1**: los establecimientos "serán solidariamente responsables respecto del cumplimiento de esta obligación, por parte del personal que preste sus servicios en los mismos, independientemente de la forma en que fuere contratado dicho personal".

**Cambio propuesto.** La unión discriminada de `User` en BM-TRA-08, más:

```ts
export type EstadoUsuario =
  | { estado: 'activo' }
  | { estado: 'inactivo'; desde: FechaISO; motivo: string }
  | { estado: 'bloqueado'; desde: InstanteISO; motivo: 'intentos_fallidos' | 'decision_administrativa' | 'credencial_vencida'; por: UsuarioId | null };
```

Regla de implementación: la emisión de cualquier documento clínico verifica la vigencia de la credencial del autor al momento de firmar, y el `registradoPorSnapshot` (BM-TRA-07) conserva la credencial tal como estaba.

---

### BM-SEG-02 · Alta · INV — No hay registro de acceso al expediente

**Evidencia.** No existe entidad de acceso a datos. La bitácora que existe es un arreglo literal dentro de una página (`pages/seguridad/auditoria/page.tsx:21-43`), con `usuario` como nombre de persona, sin `tenantId`, sin `sucursalId` y sin identificador de usuario.

**Caso real que no se puede representar.** Responder a la pregunta "¿quién consultó el expediente de este paciente?". Es la pregunta que llega cuando un paciente sospecha que alguien vio su información sin necesidad, y es exactamente el escenario que el deber de confidencialidad busca prevenir.

**Consecuencia.** Legal y de privacidad. Sin registro de acceso, el establecimiento no puede acreditar que controla quién ve qué, ni detectar el acceso indebido.

**Fundamento (verificado 2026-08-22).** NOM-004-SSA3-2012 numeral **5.7**: "En los establecimientos para la atención médica, la información contenida en el expediente clínico será manejada con discreción y confidencialidad, por todo el personal del establecimiento". Numeral **5.5.1**: los datos "únicamente podrán ser proporcionados a terceros cuando medie la solicitud escrita del paciente, el tutor, representante legal o de un médico debidamente autorizado". Sin bitácora de acceso, ninguna de las dos obligaciones es verificable.

**Cambio propuesto.**

```ts
export interface EventoDeAcceso extends EntidadDeTenant {
  readonly id: string;
  readonly ocurrioEn: InstanteISO;
  readonly usuarioId: UsuarioId;
  readonly sucursalId: SucursalId | null;
  readonly accion: 'consulta' | 'creacion' | 'modificacion' | 'impresion' | 'exportacion' | 'firma' | 'anulacion' | 'acceso_denegado';
  readonly recurso: { tipo: string; id: string; pacienteId: PacienteId | null };
  /** Sostiene la evaluación de necesidad del acceso. */
  readonly contexto: { motivo: 'atencion_en_curso' | 'consulta_administrativa' | 'solicitud_arco' | 'auditoria' | 'no_declarado'; episodioId: string | null };
  readonly origen: { ip: string; agente: string };
  readonly resultado: 'permitido' | 'denegado';
}
```

La bitácora es append-only y, conforme al diseño del documento 01 §5, se **pseudonimiza** al vencer la retención del dato personal, para no convertirla en la puerta trasera que revive datos suprimidos.

---

### BM-SEG-01 · Alta · IPV — La bitácora de auditoría no es una entidad del modelo

**Evidencia.** `pages/seguridad/auditoria/page.tsx:21-43`: los registros de auditoría son un arreglo literal dentro del componente de la pantalla, con campos `usuario`, `rol`, `accion`, `modulo`, `detalle`, `resultado`, `ip`, `fecha`. No hay tipo en `mocks/`, no hay identificador de usuario, no hay ámbito de tenant ni de sucursal, y `detalle` es una cadena que embebe el nombre y el expediente del paciente (`'Generó receta para María Fernanda López (EXP-2024-0001)'`).

**Consecuencia.** Privacidad. Ese `detalle` en texto libre convierte la bitácora en un almacén paralelo de datos personales de salud, sin estructura, sin política de retención propia y sin posibilidad de pseudonimizar. Es el problema que el documento 01 §5 anticipó.

**Fundamento.** Deber de seguridad de la LFPDPPP vigente; **numeral no verificado**: IPV.

**Cambio propuesto.** Se sustituye por `EventoDeAcceso` (BM-SEG-02), con referencias tipadas en vez de descripción en prosa. El texto legible para el humano se **compone al presentar**, resolviendo las referencias, y no se almacena.

---

### BM-SEG-04 · Media · DD — Los roles son una enumeración cerrada sin permisos ni ámbito

**Evidencia.** `mocks/users.ts:1`: ocho roles fijos. `sucursalIds: string[]` y `sucursales: string[]` (`:13-14`) duplican la misma información, una como identificadores y otra como nombres. No hay permisos, ni ámbito por sucursal por rol.

**Casos reales que no se pueden representar.** Un médico que además es director en una sucursal y sólo médico en otra. Un usuario temporal. La segregación de la función de anulación de cobros, que debería requerir autorización de otro rol (BM-CAJ-04).

**Cambio propuesto.**

```ts
export interface AsignacionDeRol {
  rol: UserRole;
  /** Ámbito: null significa todas las sucursales del tenant. */
  sucursalIds: readonly SucursalId[] | null;
  vigenteDesde: FechaISO;
  vigenteHasta: FechaISO | null;
  otorgadoPor: UsuarioId;
}
```

`User.asignaciones: readonly AsignacionDeRol[]` sustituye a `rol`, `rolLabel`, `sucursalIds` y `sucursales`. Los permisos se derivan del rol mediante un catálogo versionado, no se codifican en el tipo.

---

### BM-SEG-05 · Media · IPV — No hay segundo factor ni política de contraseña en el modelo

**Evidencia.** `mocks/users.ts:4-22` no tiene segundo factor, ni fecha de último cambio de contraseña, ni intentos fallidos, ni sesiones activas. `ultimoAcceso: string` (`:19`) es el único rastro de sesión.

**Fundamento.** Deber de seguridad de la LFPDPPP vigente sobre datos sensibles; **numeral no verificado**: IPV. El documento 02 §2.1 ya trató la autenticación a nivel de prototipo; aquí se cierra el hueco del modelo.

**Cambio propuesto.** El tipo `CredencialUsuario` de BM-TRA-12, más `SesionActiva` con identificador de dispositivo, instante de inicio, último uso y posibilidad de revocación individual.

---

## 12. Aportaciones al marco normativo — **integradas en el documento 01**

Esta sección contenía las entradas normativas redactadas por este barrido, pendientes de integrar. **Ya están integradas** y aquí no se duplican:

- Los **numerales de la NOM-004-SSA3-2012 verificados literalmente el 2026-08-22** —5.5.1, 5.7, 6.1.2, 6.1.5, 6.2.2, 6.2.5, 6.2.6, 6.3 y sus incisos, 6.4 y sus incisos, 7.2.1, 8.9.1 a 8.9.11, 9.1.1 a 9.1.5, 9.2.1 a 9.2.8, 10.1.1.1 a 10.1.1.10, 10.2 y 10.2.3.1 a 10.2.3.8—, junto con la precisión de que **la nota de egreso es el numeral 8.9 y no el 8.8**, están en [`01-marco-normativo-verificado.md`](01-marco-normativo-verificado.md) §2.
- El **artículo 83 de la Ley General de Salud** —cédula profesional y, en su caso, Certificado de Especialidad vigente en los documentos y papelería del ejercicio profesional— y los **artículos 225, 226, 226 Bis, 240 y 241**, que sostienen el módulo de recetas, están en el §11 **nuevo** de ese documento.
- Los **instrumentos y puntos que quedaron sin verificar** —Reglamento de Insumos para la Salud, artículo 79 del Reglamento de la LGS en materia de prestación de servicios de atención médica, Anexo 20 del SAT a nivel de campo, régimen de solicitudes ARCO y principio de minimización de la LFPDPPP de 2025, calendario epidemiológico y escalas de triage— están en el §8 de ese documento, que es donde vive la separación entre verificado y pendiente.

Los fundamentos citados en cada hallazgo de este documento **no se movieron**: siguen junto al hallazgo que sostienen.

<!-- Contenido histórico de esta sección, conservado por trazabilidad. -->
<details>
<summary>Redacción original de la sección 12, previa a la integración</summary>

### 12.1 Para la sección de NOM-004-SSA3-2012 — numerales verificados el 2026-08-22

Se verificó el texto íntegro de la NOM-004-SSA3-2012 en la publicación del Diario Oficial de la Federación. Los siguientes numerales se leyeron literalmente y sostienen los hallazgos del documento 09:

| Numeral | Contenido verificado | Uso en el documento 09 |
|---|---|---|
| 5.1 | Obligación de integrar y conservar el expediente; los establecimientos son **solidariamente responsables** del cumplimiento por parte del personal, "independientemente de la forma en que fuere contratado" | BM-SEG-03 |
| 5.2.1 | "Tipo, nombre y domicilio del establecimiento y en su caso, nombre de la institución a la que pertenece" | BM-TRA-02, BM-TRA-03 |
| 5.2.2 | "En su caso, la razón y denominación social del propietario o concesionario" | BM-TRA-03 |
| 5.2.3 | "Nombre, sexo, edad y domicilio del paciente" | BM-PAC-02, BM-PAC-03 |
| 5.4 | Conservación mínima de 5 años "contados a partir de la fecha del **último acto médico**" (ya asentado en §5 del documento 01; se confirma la expresión exacta) | BM-NOR-10 |
| 5.5.1 | Los datos sólo se proporcionan a terceros con solicitud escrita del paciente, tutor, representante legal o médico autorizado | BM-PAC-08, BM-SEG-02 |
| 5.6 | Obligación de informar a quien ejerza la patria potestad, la tutela o la representación legal | BM-PAC-08 |
| 5.7 | La información será manejada con discreción y confidencialidad por todo el personal | BM-SEG-02, BM-TRA-01 |
| 5.9 | Las notas médicas y reportes deberán contener nombre completo del paciente, edad, sexo y en su caso número de cama o expediente | BM-PAC-03 |
| 5.10 | Todas las notas deberán contener **fecha, hora** y nombre completo de quien la elabora, "así como la firma autógrafa, electrónica o digital" | BM-TRA-04, BM-TRA-05, BM-TRA-07, BM-CON-01 |
| 5.11 | Lenguaje técnico-médico, sin abreviaturas, "sin enmendaduras ni tachaduras" | BM-TRA-06, BM-PAC-14 |
| 6.1.1 | Interrogatorio de la historia clínica: ficha de identificación, **en su caso grupo étnico**, antecedentes heredo-familiares, personales patológicos **incluido uso y dependencia de tabaco, alcohol y otras sustancias psicoactivas**, y no patológicos, padecimiento actual e **interrogatorio por aparatos y sistemas** | BM-PAC-09, BM-PAC-14, BM-PAC-15 |
| 6.1.2 | Exploración física: habitus exterior, signos vitales (temperatura, tensión arterial, frecuencia cardiaca y respiratoria), peso y talla, y datos por región anatómica | BM-CON-07, BM-TRA-09 |
| 6.1.5 / 6.2.5 | Pronóstico en la historia clínica y en la nota de evolución | BM-CON-02 |
| 6.2.2 | Signos vitales en la nota de evolución "**según se considere necesario**" | BM-CON-03 |
| 6.2.6 | Tratamiento e indicaciones; en medicamentos, "señalando como mínimo la dosis, vía de administración y periodicidad" | BM-FAR-02 |
| 6.3 y 6.3.1-6.3.4 | Nota de interconsulta: criterios diagnósticos, plan de estudios, sugerencias diagnósticas y tratamiento, y los del numeral 7.1 | BM-CON-05 |
| 6.4 y 6.4.1-6.4.3.3 | Nota de referencia/traslado: establecimiento que envía, receptor, y resumen clínico con motivo de envío, impresión diagnóstica y terapéutica empleada | BM-NOR-09 |
| 7.1 y 7.1.1-7.1.7 | Nota inicial de urgencias: fecha y hora, signos vitales, motivo, resumen de interrogatorio, exploración física y estado mental, resultados relevantes, diagnósticos, tratamiento y pronóstico | BM-URG-10 |
| 7.2.1 | La interconsulta por especialista debe quedar por escrito, tanto la solicitud como la nota | BM-CON-05 |
| 8.9.1-8.9.11 | Nota de egreso, once incisos, incluidos **8.9.6 problemas clínicos pendientes**, **8.9.9 atención de factores de riesgo**, **8.9.10 pronóstico** y **8.9.11 causas de la muerte y necropsia en caso de defunción** | BM-NOR-03, BM-URG-06 |
| 9.1.1-9.1.5 | Hoja de enfermería: **habitus exterior**, gráfica de signos vitales, **ministración de medicamentos con fecha, hora, cantidad y vía prescrita**, procedimientos y observaciones | BM-NOR-05, BM-TRA-09 |
| 9.2.1-9.2.8 | Reportes de servicios auxiliares: **fecha y hora del estudio**, identificación del solicitante, estudio, problema clínico, resultados, **incidentes y accidentes**, **identificación de quien realizó** y **nombre completo y firma de quien informa** | BM-EST-01, BM-EST-02, BM-EST-03 |
| 10.1.1.1-10.1.1.10 | Consentimiento informado, diez incisos, incluidos **10.1.1.9 nombre y firma del médico que informa y recaba** y **10.1.1.10 nombre completo y firma de dos testigos** | BM-NOR-01 |
| 10.1.2.1-10.1.2.9 | Los nueve eventos mínimos que requieren consentimiento informado | BM-NOR-02 |
| 10.1.3 | Se pueden obtener consentimientos adicionales, sin que sea obligatorio el empleo de formatos impresos | BM-NOR-02 |
| 10.2 y 10.2.3.1-10.2.3.8 | Hoja de egreso voluntario, ocho incisos, incluidos el establecimiento, la calidad y parentesco de quien solicita el egreso, y **dos testigos** | BM-NOR-04 |
| 10.3.1-10.3.7 | Hoja de notificación al Ministerio Público, siete incisos (ya asentado en §2 del documento 01; se confirma el desglose) | BM-NOR-06 |

Nota de precisión sobre la numeración: la nota de egreso es el numeral **8.9** y no 8.8; el numeral 8.8 corresponde a la nota postoperatoria. Conviene revisar cualquier cita previa que use 8.8 para la nota de egreso.

### 12.2 Nueva entrada verificada: Ley General de Salud, prescripción de medicamentos

**Fuente:** Cámara de Diputados, compilación oficial de la Ley General de Salud, últimas reformas **DOF 15-01-2026**. **Verificado el 2026-08-22.**

| Artículo | Contenido verificado | Consecuencia de diseño |
|---|---|---|
| **83** | Quienes ejerzan actividades profesionales, técnicas y auxiliares y las especialidades médicas deberán poner a la vista del público un anuncio con la institución que expidió el Título, el número de cédula profesional y, en su caso, el Certificado de Especialidad vigente. "**Iguales menciones deberán consignarse en los documentos y papelería que utilicen en el ejercicio de tales actividades**". (Reformado DOF 01-09-2011) | Fundamento **legal** —no sólo normativo— para exigir cédula y certificado de especialidad en todo documento clínico. Refuerza la NOM-004 5.10 y sostiene BM-TRA-08, BM-CON-06 y BM-SEG-03 |
| **225** | Los medicamentos serán identificados por sus denominaciones genérica y distintiva. "**La identificación genérica será obligatoria**". (Reformado DOF 30-03-2022) | BM-FAR-04 |
| **226** fr. I-VI | Clasificación de venta y suministro en seis grupos. Fr. II: receta **retenida** en la farmacia y **registrada en libros de control**; máximo dos presentaciones; **vigencia de treinta días**. Fr. III: surtido **hasta tres veces**, con **sello y registro cada vez**, retención en la tercera ocasión. Fr. IV: resurtible tantas veces como indique el médico | BM-FAR-01, BM-FAR-03, BM-FAR-07 |
| **226**, último párrafo | "**El emisor de la receta médica prescribirá los medicamentos en su denominación genérica** y, si lo desea, podrá indicar la denominación distintiva de su preferencia informando al paciente sobre las opciones terapéuticas". (Adicionado DOF 30-03-2022) | BM-FAR-04 |
| **226 Bis** | En atención intrahospitalaria se podrán prescribir dosis unitarias conforme a los Lineamientos que expida la Secretaría de Salud. (Adicionado DOF 29-11-2019) | Se registra por completitud; los Lineamientos **no se verificaron** |
| **240** | Sólo podrán prescribir estupefacientes los médicos cirujanos, los médicos veterinarios (en animales) y los cirujanos dentistas (casos odontológicos), siempre que tengan **título registrado** por las autoridades educativas competentes | BM-FAR-01 |
| **241** | "La prescripción de estupefacientes se hará en **recetarios especiales**, que contendrán, para su control, un **código de barras asignado por la Secretaría de Salud**, o por las autoridades sanitarias estatales": fr. I, tratamientos **no mayores de treinta días**; fr. II, la **cantidad máxima de unidades prescritas por día** deberá ajustarse a las indicaciones terapéuticas del producto | BM-FAR-01 |

### 12.3 Para la sección de instrumentos NO verificados — altas y precisiones

Se propone agregar a la tabla del §8 del documento 01:

| Instrumento | Relevancia para MediCore | Estado propuesto |
|---|---|---|
| **Reglamento de Insumos para la Salud** (artículos 28 a 31 y 50 a 52) | Contenido obligatorio de la receta médica —incluidos nombre, domicilio y número de cédula del prescriptor, y la dosis, presentación, vía, frecuencia y duración— y régimen de los recetarios especiales para estupefacientes y psicotrópicos. Es el instrumento que **cierra** el módulo de recetas | **NO VERIFICADO (2026-08-22).** Se intentó y no se obtuvo el texto oficial: el reglamento **no aparece** en la compilación de reglamentos federales de la Cámara de Diputados (`LeyesBiblio/regla.htm`, revisada hoy) y la descarga directa del archivo esperado devolvió 404. Los requisitos de receta afirmados en el documento 09 se sostienen **exclusivamente** en la LGS (§12.2). **Falta:** obtener el texto vigente en el DOF o en el portal de COFEPRIS y verificar los artículos citados |
| **Reglamento de la LGS en Materia de Prestación de Servicios de Atención Médica, artículo 79** | Es el artículo al que remite el numeral 10.2.2 de la NOM-004 para la elaboración de la hoja de egreso voluntario | **NO VERIFICADO (2026-08-22).** El §8 del documento 01 registra este reglamento como parcialmente verificado (artículos 77, 80, 81 y 82). Se propone **agregar el artículo 79 a la lista de pendientes puntuales**, porque condiciona el diseño de BM-NOR-04 |
| **SAT, Anexo 20 y Guía de llenado del CFDI 4.0, a nivel de campo** | El §7 del documento 01 verificó la vigencia de la versión 4.0 y la volatilidad de los catálogos, pero no los **atributos obligatorios** del comprobante | **NO VERIFICADO A NIVEL DE CAMPO (2026-08-22).** Los hallazgos BM-CAJ-02, BM-CAJ-03 y BM-CAJ-06 se marcaron **IPV** por esta razón. **Falta:** verificar los atributos obligatorios del nodo Comprobante (entre ellos LugarExpedicion, Exportacion, TipoDeComprobante, Version, NoCertificado), el domicilio fiscal del receptor, el objeto de impuesto en conceptos, y las reglas de cancelación con motivo y UUID de sustitución |
| **LFPDPPP vigente (2025): plazos y requisitos de las solicitudes ARCO** | Sostiene BM-NOR-08. El §4 del documento 01 verificó la base de licitud del artículo 9 fracciones V y VI, no el régimen de ejercicio de derechos | **NO VERIFICADO (2026-08-22).** **Falta:** plazo de respuesta, requisitos de acreditación de identidad del titular y de su representante, contenido mínimo de la respuesta, y régimen aplicable a los datos de personas fallecidas |
| **LFPDPPP vigente (2025): principio de minimización y deber de seguridad** | Sostiene BM-TRA-01, BM-TRA-11, BM-TRA-12, BM-PAC-13, BM-SEG-01 y BM-SEG-05, todos marcados IPV | **NO VERIFICADO A NIVEL DE ARTÍCULO (2026-08-22).** **Falta:** identificar los artículos que consagran minimización y seguridad en la ley de 2025, para poder fundar o retirar esos seis hallazgos |
| **Calendario epidemiológico vigente (semanas epidemiológicas)** | Sostiene el cálculo de `semanaEpidemiologica` en BM-NOR-07 | **NO VERIFICADO (2026-08-22).** Debe provenir de fuente oficial y no calcularse por aproximación |
| **Escalas de triage** | El prototipo usa cuatro niveles de color que no corresponden a ninguna escala documentada. Sostiene BM-URG-05 | **NO VERIFICADO (2026-08-22).** **Falta:** determinar si alguna norma mexicana prescribe una escala de triage para establecimientos con urgencias, o si es decisión del establecimiento. La NOM-027-SSA3-2013 está verificada (documento 01 §2); **falta revisar si prescribe escala** |

---

## 13. Decisiones abiertas propuestas para el documento 06

Redactadas para integrarse directamente. **No se editó el documento 06.** La numeración es relativa; se ajustará al integrar.

---

**DA-A · Qué se hace con los expedientes existentes cuyos antecedentes fueron prellenados.**
`createEmptyHistoriaClinica` inicializa antecedentes en `'negado'` y todos los aparatos y sistemas en `'normal'` (BM-PAC-14). Al corregir el tipo, los registros ya creados con esos valores son indistinguibles de los asentados por un clínico. **Decisión requerida:** ¿se migran todos a `no_interrogado`, aceptando que se pierde información realmente asentada, o se migran sólo los que nunca fueron editados, o se marcan todos como "origen: prellenado por el sistema" y se deja que el clínico los confirme al siguiente contacto? Recomendación técnica: la tercera, por ser la única que no destruye ni afirma. Requiere criterio clínico del cliente.

**DA-B · Escala de triage: cuatro colores o cinco niveles con escala declarada.**
El prototipo usa `'rojo' | 'naranja' | 'amarillo' | 'verde'`, cuatro niveles que no corresponden a ninguna escala documentada (BM-URG-05). Las escalas de uso internacional son de cinco niveles. **Decisión requerida:** conservar los cuatro colores como escala institucional propia, documentándola como tal, o adoptar una escala de cinco niveles. Bloqueante para el tipo `NivelTriage`. Pendiente normativo asociado en §12.3.

**DA-C · Qué se registra como sexo biológico cuando el paciente declara identidad de género distinta.**
La propuesta de BM-PAC-03 separa sexo biológico, identidad de género y sexo documental. **Decisión requerida:** qué campo alimenta los rangos de referencia y el cálculo de dosis cuando difieren, y qué campo se imprime en cada documento. Recomendación técnica: sexo biológico para lo clínico, nombre de uso e identidad para el trato y la presentación, sexo documental para lo fiscal y los trámites. Requiere validación clínica y legal. Se relaciona con la decisión abierta ya registrada sobre el sexo no determinable (documento 01 §8).

**DA-D · Cuántos signos vitales se exigen para poder guardar un triage.**
BM-URG-02 propone que el triage siempre se pueda guardar, exigiendo respuesta explícita y no valor. **Decisión requerida:** ¿hay algún signo vital cuya ausencia deba impedir el guardado, o basta con la razón de no medición en todos? Recomendación técnica: ninguno debe impedirlo, y la ausencia de todos con razón "paciente en reanimación" debe ser un registro válido y visible. Requiere criterio de enfermería y dirección médica.

**DA-E · Qué se hace cuando se prescribe sin haber interrogado alergias.**
BM-FAR-05 propone que el sistema exija que el estado alérgico no sea `no_interrogado` para emitir una receta, con posibilidad de continuar declarando justificación. **Decisión requerida:** ¿bloqueo duro, bloqueo con justificación registrada, o advertencia sin bloqueo? Recomendación técnica: bloqueo con justificación registrada, porque el bloqueo duro en urgencias produce el mismo daño que el campo obligatorio del caso original. Requiere decisión de dirección médica.

**DA-F · Equivalencia del libro de control de farmacia electrónico con el libro físico.**
La LGS artículo 226 fracciones II y III exige registro en libros de control y retención física de la receta (BM-FAR-07). **Decisión requerida:** si el sistema produce el libro de control electrónico, ¿sustituye al físico o lo complementa? Depende del Reglamento de Insumos para la Salud, **no verificado**. Bloqueante para el alcance del módulo de farmacia. No decidir por analogía.

**DA-G · Si la clínica prescribirá estupefacientes y psicotrópicos.**
BM-FAR-01 propone el tipo completo de recetario especial. **Decisión requerida:** ¿está en el alcance? Si lo está, se requiere el trámite de recetarios con código de barras ante la autoridad sanitaria, y el diseño debe contemplar la administración de esos folios. Si no lo está, el sistema debe **impedir** la prescripción de esos medicamentos, no simplemente no soportarla. Decisión de producto con implicación regulatoria.

**DA-H · Cuál es el reloj del último acto médico.**
BM-NOR-10 propone que la retención se cuente desde cualquier acto médico y enumera doce tipos. **Decisión requerida:** ratificar la lista. ¿Una dispensación de farmacia es acto médico para efectos del artículo 5.4? ¿Una cita a la que el paciente no acudió? Recomendación técnica: todo acto que genere un documento en el expediente. Requiere criterio legal.

**DA-I · Tratamiento fiscal del IVA en servicios médicos.**
Ya registrada en el documento 01 §7 como alerta a resolver por el asesor fiscal del cliente. Se reitera aquí porque BM-CAJ-02 y BM-CAJ-05 no se pueden cerrar sin ella: el objeto de impuesto por concepto y la regla de cálculo dependen de esa definición.

**DA-J · Alcance del multi-tenant en la primera versión.**
BM-TRA-01 propone `tenantId` en toda entidad. **Decisión requerida:** ¿la primera versión es realmente multi-tenant, o es una instalación por cliente? La respuesta no cambia la recomendación —el campo debe existir desde el inicio, porque agregarlo después obliga a migrar todo— pero sí cambia el alcance del trabajo de aislamiento, autorización y pruebas. Decisión de arquitectura y de negocio.

**DA-K · Unidad canónica de almacenamiento de peso y talla.**
BM-TRA-09 y BM-URG-11 proponen unidad explícita en el tipo. **Decisión requerida:** ¿se almacena en la unidad capturada, conservando el dato original, o se normaliza a una unidad canónica al guardar? Recomendación técnica: almacenar lo capturado con su unidad y convertir al calcular, porque normalizar al guardar pierde la información de cómo se midió y reintroduce el error de conversión en el punto de escritura. Requiere validación clínica.

**DA-L · Qué campos se retiran por minimización.**
BM-TRA-11 y BM-PAC-13 señalan datos posiblemente innecesarios: aseguradora y póliza obligatorias para todo paciente, `email` obligatorio, y la denominación del paciente copiada en catorce entidades. **Decisión requerida:** qué se conserva. Bloqueada por la verificación pendiente del principio de minimización en la LFPDPPP 2025 (§12.3).

---

## 14. Orden de atención propuesto

El catálogo tiene 87 hallazgos, y varios se resuelven con un solo tipo base. Este orden minimiza el retrabajo:

**Primero, los tipos base transversales.** `TenantId`, `SucursalId`, `InstanteISO`, `Fechado`, `Autoria`, `Firma`, `Firmable`, `Medicion<U>`, `SignosVitales`, `EstadoInterrogatorio<T>`, `Dinero` y `DocumentoAdjunto`, más los identificadores marcados. Son doce tipos, y de ellos dependen la mayoría de los hallazgos del catálogo, incluidos ocho de los diecinueve críticos: BM-TRA-01, BM-TRA-02, BM-TRA-05, BM-TRA-07, BM-TRA-09, BM-PAC-01, BM-URG-02 y BM-CON-01. Definirlos primero evita reabrir cada entidad dos veces.

**Segundo, los cuatro defectos que fabrican datos clínicos**, que no dependen de nada y se pueden atender de inmediato: eliminar `normalValues` y el botón de autocompletar (BM-URG-01), corregir `createEmptyHistoriaClinica` (BM-PAC-14), eliminar los cuatro sustitutos de sexo (BM-PAC-03) y eliminar los `|| 0` sobre magnitudes clínicas (BM-URG-04). Son cambios pequeños, localizados, sin dependencias, y son los cuatro con mayor riesgo de daño al paciente.

**Tercero, el estado alérgico y la prescripción** (BM-PAC-01, BM-FAR-05, BM-FAR-02), que forman una cadena y no tienen sentido por separado.

**Cuarto, el contenido mínimo de los documentos** contra los numerales de la NOM-004 (BM-NOR-01 a BM-NOR-06, BM-URG-10, BM-CON-05, BM-EST-01), que es trabajo de completar campos una vez que existen `Firmable` y `Autoria`.

**Quinto, el resto,** por severidad.
