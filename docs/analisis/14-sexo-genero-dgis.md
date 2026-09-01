# 14 — Sexo vs género ante la DGIS/SINBA (análisis para decisión)

Fecha de consulta de fuentes oficiales: **2026-08-28**  
Estado: **decisión tomada 2026-08-28 — Opción B.**  
Pregunta de producto asociada: **M** del plan Fase 1 / decisión **62** (hueco **54** sobre sexo no determinable en reporte sigue abierto).  
Relacionado: [`01-marco-normativo-verificado.md`](01-marco-normativo-verificado.md) §3 y §8; [`08-identidad-y-paciente-no-identificado.md`](08-identidad-y-paciente-no-identificado.md) §5.2.

> **Regla de este documento:** no se afirma cumplimiento de NOM ni de obligación de reporte. Se describe lo que las fuentes oficiales **dicen** (con URL y fecha) y lo que **no** dicen.

---

## Decisión de producto (2026-08-28)

**Opción B adoptada:** sexo biológico (`BiologicalSex` + `SexSource`) para clínica y mapeo a reporte Urgencias DGIS (SEUL 1/2/3); **identidad de género opcional** (`GenderIdentity`, códigos GIIS `0…6, 88`, NULL = no capturado) para trato en UI / impresión y, si aplica en Fase 4, variable `genero` de GIIS Consulta Externa.

| Uso | Campo | Regla |
|---|---|---|
| Dosis, rangos de referencia, triage, alertas clínicas | Solo `BiologicalSex` | Prohibido usar `GenderIdentity` |
| Trato en UI / impresión | `PreferredName` + `GenderIdentity` si existe | Si falta género, **no inventar** |
| Reporte Urgencias DGIS (SEUL-16-P) | Solo sexo biológico → 1/2/3 | Género **no** va a ese reporte |
| GIIS Consulta Externa (si aplica) | `sexo` + opcionalmente `genero` | Fase 4 / alcance de intercambio |

Implementación: migración `0013_sujeto_identidad_genero.sql` (aditiva a M3; `0008` reservado a triage). Semántica de `BiologicalSex` / `SexSource` **sin cambio**.

Pendiente relacionado: **qué emitir** cuando el sexo interno es `no_determinado` (decisión 54).

---

## 1. Qué pide / reporta la DGIS-SINBA

### 1.1 Hoja Diaria del Servicio de Urgencias (SINBA-SEUL-16-P) — lo más relevante para MediCore

**Página oficial del subsistema** (enlaza formato e instructivo 2024; última modificación publicada en la página: 30-dic-2024):  
http://www.dgis.salud.gob.mx/contenidos/sinais/s_urgencias.html  

**Instructivo de llenado 2024** (PDF oficial DGIS, consultado 2026-08-28):  
http://www.dgis.salud.gob.mx/descargas/urgencias/pdf/Instructivo_Urgencias_2024_V2.pdf  

Hallazgos verificados en ese instructivo (versión del documento en el PDF: **1.8 / Octubre 2024**; clave **SINBA-SEUL-16-P DGIS**):

| Tema | Lo que dice el instructivo |
|---|---|
| Definición de **sexo** | Características **biológicas** que definen a un ser humano como hombre o mujer (cita OMS en el glosario del propio instructivo). |
| Valores del campo **Sexo** | **1. Hombre** · **2. Mujer** · **3. Intersexual** |
| Cómo llenarlo | (1) Conforme a identificación oficial / comprobante / Acta de Nacimiento (mayores de edad). (2) Si hay **duda**, registrar el sexo resultado de la **exploración física**. (3) En clínica de intersexo con anomalías de cromosomas sexuales, anotar el **fenotipo**. |
| Identidad de género | **No aparece** como variable de la Hoja Diaria de Urgencias en este instructivo. |
| Centinela de desconocimiento para sexo | **No se localizó** instrucción del tipo «anotar X cuando se desconoce el sexo» (a diferencia de nombre `Desconocido`, fecha `09/09/9999`, edad `999`, ya documentados en doc 01 §3). |

El mismo esquema **1/2/3** y la misma lógica de llenado aparecen en instructivos oficiales afines de la DGIS (consultados 2026-08-28):

- Egresos hospitalarios 2024: http://www.dgis.salud.gob.mx/descargas/egresos/pdf/Instructivo_Egresos_Hospitalarios_2024_V2.pdf  
- Lesiones (formato 2024 con «SEXO: 1 Hombre 2 Mujer 3 Intersexual»): http://www.dgis.salud.gob.mx/descargas/lesiones/pdf/Formato_Lesiones_2024_V2.pdf  

### 1.2 NOM-024-SSA3-2012 — datos mínimos de identificación (intercambio SIRES)

Texto normativo (DOF 30-nov-2012; PDF en sitio DGIS, consultado 2026-08-28):  
http://www.dgis.salud.gob.mx/descargas/normatividad/normas/DOF-30NOV12-NOM-024-SSA3-2012.pdf  

En la **Tabla 1** «Datos mínimos para la identificación de personas», el atributo **SEXO**:

- Descripción: sexo del beneficiario **asentado en el documento probatorio** presentado ante el prestador.
- Valores: catálogo RENAPO — **M** (mujer) · **H** (hombre).
- **No** incluye intersexual ni identidad de género en esa tabla.

Catálogos fundamentales (página DGIS, consultada 2026-08-28):  
http://www.dgis.salud.gob.mx/contenidos/intercambio/iis_catalogos_gobmx.html  

### 1.3 GIIS de Consulta Externa — el único lugar oficial encontrado que **sí** separa sexo y género

**GIIS-B015-02-09** (reporte SIS – Consulta Externa), versión **2.9**, fecha del documento **29 de octubre de 2021**, hospedada en gobi.salud.gob.mx (consultada 2026-08-28):  
https://gobi.salud.gob.mx/gobi/guias/sis/consultaexterna/GIIS-B015-02-09.pdf?v=2021.12.08  

| Variable | Descripción (síntesis fiel) | Valores |
|---|---|---|
| **`sexo`** | Condición **biológica y fisiológica de nacimiento** | Catálogo SEXO; con CURP válida no genérica solo **1–HOMBRE** o **2–MUJER**; con CURP genérica se acepta el catálogo (incluye **3–INTERSEXUAL**, con confirmación en SIRES). |
| **`genero`** | **Identidad de género** del paciente o atributos sociales aprendidos/adoptados | **0** No especificado · **1** Masculino · **2** Femenino · **3** Transgénero · **4** Transexual · **5** Travesti · **6** Intersexual · **88** Otro. Si se desconoce: **0**. |

**Importancia para MediCore:** esta GIIS demuestra que, en al menos un canal de intercambio SIS (consulta externa), la DGIS **distingue** sexo biológico e identidad de género. **No** se encontró la misma variable `genero` en el instructivo 2024 de Urgencias (SEUL-16-P).

### 1.4 NOM-004 (expediente) — recordatorio ya verificado en doc 01

El numeral **5.9** exige **sexo** (junto con nombre y edad) en notas médicas. **No** habla de identidad de género. Verificado en doc 01 §2 (2026-08-22). No se re-verifica aquí el texto íntegro del DOF.

---

## 2. Qué NO dice (huecos)

1. **Urgencias (SEUL-16-P 2024):** no prescribe campo de **identidad de género**; no da centinela oficial cuando el sexo **no es determinable** (hueco ya registrado como decisión 54 / doc 01 §8).
2. **NOM-024 Tabla 1:** solo **H/M**; no alinea explícitamente el valor **Intersexual (3)** de los instructivos SEUL/SIS con el atributo de identificación mínima.
3. **No se localizó** (consulta 2026-08-28) un instructivo oficial de Urgencias 2024 que diga qué valor emitir cuando el paciente declara identidad de género distinta del sexo biológico: el instructivo pide documento / exploración / fenotipo, no «usar el género declarado».
4. **Aplicabilidad al sector privado:** los instructivos SINBA/SEUL están orientados al acopio estadístico del SNS. Que MediCore **genere** hechos reportables es decisión de producto (doc 12: DGIS capacidad fija); **no** se afirma aquí que una clínica privada esté obligada a enviar la Hoja Diaria con la misma periodicidad que una unidad SS.
5. **Vigencia de GIIS-B015-02-09 (2021):** se citó el PDF oficial disponible; **no** se verificó si existe versión posterior del mismo GIIS que retire o cambie `genero`. Si el cliente elige modelar género por esa guía, conviene reconsultar el portal GOBI/DGIS antes de Fase 4.

---

## 3. Implicación clínica en MediCore vs documental / trato

| Uso | Qué campo debe alimentar | Por qué |
|---|---|---|
| Rangos de signos vitales, umbrales ligados a sexo, cálculo de dosis, restricciones CIE por sexo en reporte | **Sexo biológico** (o `no_determinado` / ausencia explícita; **nunca** inventar H/M) | Un valor inventado o un género usado como sexo es riesgo clínico (doc 08 §5.2; SC-15). |
| Trato verbal, nombre de uso, preferencia de tratamiento | Nombre preferido + (si se captura) identidad de género / preferencia de trato | No alimentan dosis. |
| Impresión en notas (NOM-004 5.9) | Campo de **sexo** poblado; si no se conoce, valor explícito interno + política de emisión a reporte (54 pendiente) | La norma exige el campo; no autoriza fabricarlo. |
| Capa de reporte DGIS Urgencias | Mapear a **1 / 2 / 3** según instructivo SEUL; **no** almacenar centinelas de reporte en el modelo clínico | Misma regla que `Desconocido` / `999` (doc 01 §3). |
| Capa de reporte SIS Consulta Externa (si aplica GIIS) | `sexo` + opcionalmente `genero` | Solo si el alcance de intercambio incluye esa GIIS. |

---

## 4. Tres opciones concretas para MediCore

### Opción A — Solo sexo biológico (como hoy en M3)

**Qué es:** Mantener `BiologicalSex` (`masculino | femenino | no_determinado | no_especificado`) + `SexSource`. Sin campo de género. En reporte Urgencias: mapear masculino→1, femenino→2; `intersexual` habría que agregarlo al dominio interno o mapear desde un valor explícito futuro; `no_determinado` **no** tiene centinela DGIS verificado.

| Pros | Contras | Encaje DGIS Urgencias | Encaje GIIS Consulta Externa |
|---|---|---|---|
| Mínimo cambio; alineado a lo clínico; evita PHI adicional | No soporta trato/identidad cuando difieren; no puede llenar `genero` de la GIIS | Compatible con el campo **Sexo** (1/2/3) si se añade `intersexual` al dominio de reporte | **No** cubre variable `genero` |

### Opción B — Dos campos: sexo biológico (clínico + reporte) + identidad de género (opcional, documental) — **ELEGIDA 2026-08-28**

**Qué es:** Conservar sexo biológico para clínica y para mapear SEUL/SIS `sexo`. Agregar `GenderIdentity` (o equivalente) **opcional**, con catálogo alineable a GIIS (`0…6, 88`) o un subconjunto acordado, **sin** valor por omisión y **sin** usarlo en dosis/rangos. Nombre preferido ya cubre trato en pantalla.

| Pros | Contras | Encaje DGIS Urgencias | Encaje GIIS Consulta Externa |
|---|---|---|---|
| Separa usos clínicos y de trato/reporte; lista para Fase 4 si aplica GIIS; no fuerza captura en urgencias | Más superficie de dato sensible; hace falta AuthZ y aviso de privacidad; catálogo GIIS 2021 puede evolucionar | Sexo → 1/2/3; género **no** se envía en SEUL-16-P (el instructivo no lo pide) | Encaja: `sexo` + `genero` |

### Opción C — Un solo campo «sexo/género» libre o unificado

**Qué es:** Un único campo que el usuario elige (incl. valores de identidad) y se usa indistintamente en clínica y documentos.

| Pros | Contras | Encaje DGIS | Encaje clínico |
|---|---|---|---|
| UI simple | Contamina rangos/dosis; rompe mapeo limpio a 1/2/3; mezcla conceptos que la propia DGIS separa en GIIS | Frágil / propenso a rechazo o mal reporte | **No recomendable** bajo `medicore-clinical-safety` |

---

## 5. Recomendación (histórica; supersedida por la decisión)

Antes de la elección del usuario, el análisis **recomendaba** la Opción B. El 2026-08-28 el usuario **ratificó la Opción B**; ver sección «Decisión de producto» al inicio.

Queda pendiente (decisión 54): **qué emitir** cuando el sexo interno es `no_determinado`.

---

## 6. Pregunta final (cerrada)

¿Elige la opción A (solo sexo biológico), la B (sexo biológico + identidad de género opcional, sin usarla en clínica), u otra variante que quiera precisar por escrito?

**Respuesta del usuario (2026-08-28):** Opción B.
