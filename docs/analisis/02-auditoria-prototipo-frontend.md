# 02 — Auditoría del prototipo `docs/frontend`

Instrucción atendida: **el diseño UI/UX no arranca de cero; el prototipo tiene prioridad.** Este documento separa con precisión lo que se conserva, lo que se refactoriza y lo que debe corregirse por razones de seguridad clínica, legales o de accesibilidad. Cada afirmación es un hecho observado en el código, con ruta de archivo.

## Veredicto general

El prototipo es un **activo real y una base sólida**, no un desechable. Aporta 39 pantallas, 8 roles, 34 archivos de dominio tipado y un sistema de tokens de color bien pensado. Se conserva la totalidad del lenguaje visual, la estructura de navegación, el shell de aplicación y el modelo de dominio. Lo que cambia es la **capa de verdad**: hoy la verdad vive en el navegador (mocks, `localStorage`, listas mutables en memoria); debe vivir en el servidor. Ese cambio no obliga a rediseñar pantallas.

Estimación cualitativa: **se preserva del orden del 70–80% del trabajo de UI/UX y del modelo de dominio.** El esfuerzo se concentra en integración, endurecimiento y las correcciones listadas abajo.

**Alcance de este documento, precisado el 2026-08-22.** Esta auditoría recorre el prototipo como aplicación: autenticación, privacidad, documentos, accesibilidad, arquitectura frontend y consistencia con las reglas de negocio. **No** es el catálogo del modelo de datos. El barrido exhaustivo de los 34 archivos de tipos y de los formularios de captura está en [`09-brechas-del-modelo-de-datos.md`](09-brechas-del-modelo-de-datos.md), con 87 hallazgos clasificados por severidad y por clase. Donde ese barrido precisó o corrigió una afirmación de este documento, aquí queda la corrección y el puntero, y **no se repite su catálogo**.

---

## 1. Lo que se conserva tal cual (decisiones acertadas del prototipo)

| Elemento | Archivo | Por qué se conserva |
|---|---|---|
| **Sistema de tokens OKLCH con variables CSS** | `src/index.css`, `tailwind.config.ts` | Es exactamente la arquitectura correcta para white-label. OKLCH es perceptualmente uniforme: permite variar tono y croma manteniendo la luminosidad, que es lo que gobierna el contraste. Los 5 grupos (`background`, `primary`, `accent`, `secondary`, `foreground`) × 11 pasos, consumidos vía `oklch(var(--token) / <alpha-value>)`, permiten reemplazar la paleta en tiempo de ejecución **sin tocar ninguno de los ~182 archivos de `src/`**. Ver documento 04. |
| **Shell de aplicación** | `src/components/feature/AppLayout.tsx` (550 líneas) | Sidebar colapsable con flyouts, header con selector de sucursal, tema y perfil, drawer móvil. Es el patrón correcto para una app tipo escritorio. |
| Escala tipográfica compacta y radios | `tailwind.config.ts` | `base: 0.875rem` y radios de 6–16 px producen densidad de información propia de software profesional, no de landing page. Correcto para uso intensivo por turno completo. |
| Modelo de dominio tipado | `src/mocks/*.ts` (34 archivos) | Las interfaces (`Patient`, `Appointment`, `Consultation`, `TriageRecord`, `Urgencia`, `CashSession`, `FacturaCFDI`, `HojaEgreso`, `SolicitudARCO`, `CasoVigilancia`…) son un punto de partida legítimo para el modelo canónico y los contratos de API. **Precisión del 2026-08-22:** se conserva el inventario de entidades y la decisión de tipar el dominio, no la forma actual de los tipos. El barrido del doc 09 encontró 87 brechas, 19 de ellas críticas, y varias no se pueden dejar como están porque el modelo fabrica datos clínicos. Lo que se conserva es el mapa; los tipos se endurecen. |
| Máquinas de estado explícitas | `docx` §2.3 (agenda, 11 estados) y §1.2 urgencias (4 estados) | Estados como uniones de TypeScript en lugar de texto libre. Se conserva y se eleva a validación en servidor. |
| Validación clínica | `src/utils/vitalValidation.ts` | Rangos duros de captura, validaciones cruzadas (PAD < PAS, diferencial ≥ 20 mmHg, IMC clínico 5–80). Se conserva la lógica y se **duplica en servidor como autoridad**. **Precisión del 2026-08-22:** se conserva la validación de los valores que **sí** se capturan; lo que no se conserva es la obligatoriedad de capturarlos todos. Hoy nueve signos vitales son obligatorios y no nulos, y por eso el triage del paciente en reanimación no se puede guardar (doc 09, BM-URG-02). La validación debe exigir **respuesta explícita** por signo —valor o razón de no medición—, no valor. |
| Accesibilidad ya presente en componentes base | `Input`, `Select`, `Modal`, `Tabs`, `SortableTh`, `Card`, `PaginationControls` | `label htmlFor`, `aria-invalid`, `aria-describedby`, `role="alert"`, `role="dialog"` con trampa de foco y restauración, `role="tablist"` con navegación por flechas, `aria-sort`. Es un punto de partida por encima del promedio. |
| Ausencia de `alert()` / `confirm()` | verificado en todo `src/` | Cero ocurrencias. Se usan modales propios. Correcto para una app tipo escritorio. |
| Protección de cambios sin guardar | Triage, urgencias | Patrón `hasUnsaved` antes de salir. Crítico en captura clínica. Se conserva y se extiende a todos los formularios clínicos. |
| Persistencia de adjuntos en IndexedDB | `src/utils/documentStore.ts` | La elección de IndexedDB para blobs (no `localStorage`) es correcta. Se reutiliza como base de la capa offline. |

---

## 2. Correcciones obligatorias — seguridad, legal, o seguridad del paciente

Estas no son mejoras opcionales.

### 2.1 Autenticación y sesión

| Hallazgo | Archivo | Riesgo | Corrección |
|---|---|---|---|
| Contraseñas en texto claro comparadas en el cliente: `found.password === password` | `src/hooks/useAuth.tsx`, `src/mocks/users.ts` | Crítico | Autenticación en servidor; hash con Argon2id; lockout configurable por sucursal (ya previsto en doc 2). |
| Contraseña inicial fija `Temp123!` para todo usuario nuevo | `docx` §1.2 | Crítico | Invitación por correo con token de un solo uso y expiración; cambio obligatorio en primer acceso; nunca una contraseña predecible. |
| Sesión completa persistida en `localStorage` (`medicore_auth_user`) | `useAuth.tsx` | Alto (XSS) | Refresh token en cookie `httpOnly` + `Secure` + `SameSite`; access token sólo en memoria. **Esto es una desviación consciente del doc 2**, justificada en el documento 03. |
| `loginAs(userId)` permite cambiar de usuario sin credenciales | `useAuth.tsx` | Crítico si llega a producción | Eliminar del build de producción; si se requiere impersonación para soporte, debe ser una función server-side con doble autorización y evento de auditoría `IMPERSONATE`. |
| Permisos evaluados sólo en el frontend | `src/utils/permissions.ts` | Crítico | El API es la fuente de verdad (ya lo exige el doc 2). El frontend sólo oculta UI. |
| Dos sistemas de permisos desconectados | `permissions.ts` (runtime) vs `src/pages/seguridad/roles/page.tsx` (784 líneas, editor con su propio `RoleData[]`) | Alto | Un solo modelo, persistido en BD, editable, y el editor opera sobre él. |

### 2.2 Privacidad — el Monitor de Turnos es el hallazgo más delicado

`src/pages/monitor-turnos/page.tsx` está registrado en `src/router/config.tsx` **fuera de `AppLayout`**, por lo que **no pasa por el guard de autenticación**, y muestra nombres de pacientes en una **pantalla pública de sala de espera**.

Combinado con lo verificado en el documento 01 (NOM-004 numeral 5.5: los datos que permitan identificar al paciente no deben divulgarse; y los datos de salud son datos personales sensibles bajo la LFPDPPP vigente), esto es una fuga de datos sensibles por diseño, agravada por ser accesible sin sesión.

**Corrección:**
- El monitor se autentica como **dispositivo** (token de kiosco por sucursal, revocable), no como usuario.
- **Enmascaramiento configurable por sucursal**, con opciones: número de turno únicamente / iniciales / `APELLIDO, Nombre inicial.` / nombre completo. El valor por defecto debe ser el más restrictivo, no el más cómodo.
- El nivel de urgencia y el motivo de consulta **nunca** se muestran en pantalla pública.
- Se audita la asociación del dispositivo, no cada refresco.

### 2.3 Documentos clínicos y firma

| Hallazgo | Archivo | Riesgo | Corrección |
|---|---|---|---|
| "Firma digital" = imagen en `localStorage` (`medicore_settings_firma_{doctorId}`) | `src/utils/appSettings.ts` | Alto (valor probatorio) | Firma en servidor sobre el hash del contenido canónico + sello de tiempo; soporte e.firma/FIEL. Ver doc 01 §6 y doc 03. |
| PDF clínico generado con `html2canvas` + `jsPDF` (rasterizado) | `src/utils/exportUtils.ts` (497 líneas) | Alto | El PDF de un documento clínico no tiene capa de texto: no es buscable, no es accesible, no es verificable y pesa de más. Generación en servidor, con plantilla versionada, capa de texto, metadatos de firma y hash impreso. Se conserva el diseño visual del documento; cambia el motor. |
| Logo institucional como base64 en `localStorage` | `appSettings.ts` | Medio | El doc 2 lo prohíbe explícitamente ("nunca data-URL ni path libre del cliente"). Assets en almacenamiento del servidor, referenciados por `FileId` GUID; cacheados en el service worker para offline. |
| Documentos con marca de agua/parche OKLCH→RGB en export | `exportUtils.ts` | Bajo | Deja de ser necesario con generación en servidor. |

### 2.4 Identidad del paciente — bloqueo operativo en urgencias

El `.docx` establece: **CURP obligatoria** en el alta, 18 caracteres, estructura oficial con dígito verificador, y **unicidad nacional** ("no puede haber dos pacientes activos con la misma CURP").

Esto entra en conflicto con la naturaleza de misión crítica del sistema y con el skill `interop-health-mx` ("*support CURP where applicable but do not make CURP the only possible patient identifier*"). Casos reales en los que la CURP no está disponible en el momento de la atención:

- Paciente inconsciente o no identificado que llega en ambulancia.
- Recién nacido antes del registro civil.
- Extranjero o paciente sin documentación.
- Urgencia en la que exigir la CURP retrasa la atención.

Exigir CURP para crear el paciente convierte un requisito administrativo en un **obstáculo a la atención médica**, justo lo que el usuario definió como prioridad máxima.

**Diseño propuesto:**
1. **Identificador interno inmutable** (ULID) como clave real. La CURP es un identificador *externo*, validado y con índice único **parcial** (sólo cuando está presente y el paciente está activo).
2. Flujo de **paciente no identificado (NN)**: alta inmediata con `identificacion_pendiente = true`, sexo/edad estimados, expediente provisional, y bloqueo de cierre administrativo hasta identificar.
3. **Cola de identificación** para recepción, con SLA visible.
4. **Fusión de expedientes** (`MERGE_PATIENT`) con coincidencia determinística + probabilística, revisión humana obligatoria, y reversibilidad auditada. Nunca fusión automática silenciosa.
5. El folio `EXP-{año}-{4 dígitos}` del `.docx` **se agota en 10 000 pacientes por año y no contempla sucursal**. Se propone `EXP-{sucursal}-{año}-{secuencial}` con ancho suficiente, o mantener la presentación amigable y desacoplarla del identificador.

### 2.5 El bloqueo no está sólo en la CURP: está en el modelo y en el código

Revisión completa de la ruta de ingreso, hecha a raíz de la pregunta sobre cómo registrar a un paciente como *"Desconocido 1, accidente de auto, tatuaje mano izquierda"*. El hallazgo de §2.4 es correcto pero **insuficiente**: corregir la CURP no habilita el caso. El modelo de datos y las validaciones del prototipo asumen que **la identidad existe antes de la atención**.

Lo verificado en el código, no inferido:

| Archivo y línea | Hallazgo | Gravedad |
|---|---|---|
| `src/mocks/patients.ts` — `interface Patient` | `nombre`, `apellidos`, `fechaNacimiento`, `edad`, `sexo` y `curp` son **todos obligatorios**, sin posibilidad de ausencia. **No existe ningún campo de señas particulares** | Bloquea el caso por completo |
| `src/mocks/urgencias.ts` — `interface Urgencia` | Exige `patientId`, `patientName` y `patientExpediente` desde el ingreso, más `genero: 'M' \| 'F'` y `edad: number` obligatorios | Bloquea el caso por completo |
| `src/pages/urgencias/components/NuevoIngresoModal.tsx` L226 | La condición de envío es `nombreNuevo.trim().length >= 2 && apellidoNuevo.trim().length >= 2 && edadNuevo > 0 && edadNuevo <= 120`. **El botón de guardar está deshabilitado si no hay nombre, apellido y edad.** No es una advertencia: es un bloqueo | **Crítica.** Es exactamente la pantalla del paciente inconsciente |
| `NuevoIngresoModal.tsx` L41 | `useState<'M' \| 'F'>('M')` — el sexo **arranca en masculino por omisión** y se envía así si nadie lo cambia | **Crítica, y por un motivo distinto:** no bloquea, **fabrica un dato clínico falso en silencio**. El sexo influye en rangos de referencia y dosificación |
| `NuevoIngresoModal.tsx` L316 | El reinicio deja `edadNuevo = 0`, valor que `validateEdad` rechaza | Fuerza a capturar una edad aunque se desconozca |
| `src/pages/pacientes/nuevo/page.tsx` L71 | `if (!valor) return 'La CURP es obligatoria'` | Ya registrado en §2.4 |
| `pacientes/nuevo/page.tsx` L197 | `if (!form.sexo) e.sexo = 'Selecciona el sexo'` — impide avanzar de paso sin sexo | Bloqueo |
| `pacientes/nuevo/page.tsx` L258 | El avance del paso 1 se bloquea si falta `nombre`, `apellidoPaterno`, **`apellidoMaterno`**, `fechaNacimiento`, `sexo` o `curp` | Bloqueo. Y **`apellidoMaterno` obligatorio** es además incorrecto para extranjeros, con independencia del caso de urgencias |

**Conclusión:** el patrón de fondo es que el prototipo **no distingue entre un dato ausente y un dato inválido**. Todo lo que falta se trata como error del capturista, cuando en urgencias lo que falta suele ser simplemente lo que no se sabe todavía.

**Precisión del 2026-08-22, y es la que cambia el tamaño del problema.** El patrón no está acotado a la ruta de ingreso: recorre el modelo completo, y el barrido del doc 09 lo documentó en 87 hallazgos. Dos correcciones concretas a lo asentado en esta sección:

- El sustituto de sexo de `NuevoIngresoModal.tsx` L41 **no es el único**. Hay cuatro sustitutos silenciosos dispersos y **discrepan entre sí**: en urgencias y en sala de espera el paciente sin sexo conocido es hombre, y en la historia clínica es mujer (`HistoriaClinicaForm.tsx:162`, `HistoriaClinicaReadOnly.tsx:55`, `sala-espera/page.tsx:198`). Peor: el sustituto de la historia clínica **imprime "Femenino"** y **habilita el apartado de antecedentes gineco-obstétricos** sobre una persona de la que no se sabe el sexo (doc 09, BM-PAC-03). Corregir el tipo `Patient.sexo` no elimina ninguno de los cuatro.
- El defecto más grave del prototipo **no está en la ruta de ingreso**: es que la historia clínica recién creada afirma antecedentes negados y **todos** los aparatos y sistemas normales, y ese documento se imprime para firmarse (`mocks/historiaClinica.ts:570-601`; doc 09, BM-PAC-14). Esta auditoría no lo detectó porque no revisó los inicializadores del modelo.

El catálogo completo, con evidencia por archivo y línea y el tipo propuesto para cada caso, está en el doc 09. Aquí no se reproduce.

### 2.6 Cambios concretos que se derivan

El modelo propuesto está en [`08-identidad-y-paciente-no-identificado.md`](08-identidad-y-paciente-no-identificado.md); aquí queda sólo su traducción al prototipo, sin repetir el análisis.

**Tipos:**

| Tipo | Cambio |
|---|---|
| `Patient` → `Subject` | Todos los atributos de identidad pasan a **opcionales**. Se agrega `estado_identificacion`, `etiqueta_temporal`, `senia_particular[]`, `pertenencia[]` |
| `sexo` | De `'M' \| 'F'` a `'masculino' \| 'femenino' \| 'no_determinado' \| 'no_especificado'`, más `origen`. **Sin valor por omisión** en el formulario |
| `edad` | De `number` obligatorio a `edad_estimada { valor, unidad: 'años' \| 'meses' \| 'días', rango_min, rango_max, origen }`. Se agrega `peso_estimado` |
| `Urgencia` | `patientId` deja de exigir un paciente del padrón; referencia a `subject_id`, que siempre existe. `patientName` sale de la interfaz: el nombre se resuelve al presentar, no se copia en el episodio. Se agrega `circunstancia_ingreso`, distinta de `viaAcceso`, que se conserva |

**Pantallas:**

- **`NuevoIngresoModal.tsx`** — es el cambio de mayor impacto. Se elimina la condición de envío de L226; el registro se puede guardar **sin ningún dato de identidad**. Se quita el valor por omisión de sexo de L41. Se agregan etiqueta temporal generada localmente, descriptor discriminante, un campo único de texto libre para señas particulares, y `circunstancia_ingreso`. Los datos administrativos pasan a una **lista de pendientes del episodio**, no a validaciones de entrada.
- **`pacientes/nuevo/page.tsx`** — CURP, sexo, fecha de nacimiento y `apellidoMaterno` dejan de ser obligatorios. La validación estructural de CURP con dígito verificador **se conserva tal cual y es un acierto del prototipo**: sigue aplicando cuando el valor está presente, y deja de aplicar cuando está ausente. El paso 1 deja de ser una barrera de avance.
- **Página de triage** — debe operar sobre un `Subject` sin identidad. La cabecera de identidad muestra etiqueta y descriptor en lugar de nombre, y se agrega la confirmación explícita de correspondencia antes de actos de riesgo.
- **Cabecera de paciente y listados** — deben resolver qué mostrar cuando no hay nombre. Hoy varios lugares construyen la presentación con `p.nombre.charAt(0)}{p.apellidos.charAt(0)`, que **falla con nombre ausente**; es una revisión transversal, no local.
- **Nueva pantalla: búsqueda por descripción** para atender a familiares, con los controles de privacidad del doc 08 §7.
- **Nuevo documento: hoja de notificación al Ministerio Público**, con los siete campos del numeral 10.3 de la NOM-004 (doc 01 §2), generable fuera de línea, sugerida por la circunstancia de ingreso y **nunca bloqueante**.

---

## 3. Correcciones de accesibilidad (WCAG 2.2 AA)

WCAG 2.2 AA es el objetivo declarado (ver doc 01 §9). Hallazgos que hoy lo incumplen:

| Hallazgo | Archivo | Criterio afectado | Impacto real |
|---|---|---|---|
| `<html lang="en">` con contenido íntegramente en español | `index.html` | 3.1.1 Idioma de la página | Un lector de pantalla pronuncia el español con fonética inglesa: la interfaz se vuelve inutilizable para personal con discapacidad visual. |
| `Dropdown` construido con `<div onClick>`, sin semántica de menú ni navegación por teclado | `src/components/base/Dropdown.tsx` | 2.1.1 Teclado, 4.1.2 Nombre/rol/valor | El menú de usuario, el selector de sucursal y el de tema del header **no son operables por teclado**. En un sistema donde el personal trabaja a alta velocidad, esto también es un problema de productividad, no sólo de accesibilidad. |
| `Modal` sin manejador de `Escape` y sin cierre por clic en backdrop | `src/components/base/Modal.tsx` | 2.1.2 Sin trampas de teclado (interacción) | Trampa de foco sin salida por teclado. La trampa de foco está bien implementada; falta la vía de escape. |
| Navegación del sidebar sin `aria-current` en la ruta activa | `AppLayout.tsx` | 4.1.2 | El usuario de lector de pantalla no percibe dónde está. |
| Nivel de urgencia comunicado principalmente por color (rojo/naranja/amarillo/verde) | triage, urgencias, sala de espera | **1.4.1 Uso del color** | Es el hallazgo de accesibilidad con mayor consecuencia clínica: ~8% de los hombres tiene deficiencia en la visión del color rojo-verde. Un triage que sólo se distingue por color puede leerse mal. Requiere **texto + icono + patrón**, no sólo color. |
| Tablas y formularios en páginas que no usan los componentes base | varias páginas grandes | 1.3.1, 3.3.2 | Etiquetado inconsistente. Se resuelve consolidando en los componentes base. |
| Página 404 en inglés | `src/pages/NotFound.tsx` | 3.1.1 + consistencia | Texto residual del generador. |
| Colores fijos (`red-500`, `emerald-500`, `#1a1a2e`…) fuera del sistema de tokens | `Button`, `Badge`, `Avatar`, `NotFound`, `firmaEjemplo.ts`, CSS de impresión | 1.4.3, 1.4.11 | Rompen el white-label y escapan a la validación de contraste. |

Adicionalmente, WCAG 2.2 añade criterios que aplican directamente a este producto y que hoy no están contemplados: **2.4.11 Foco no oscurecido** (con sidebar sticky y headers fijos es un riesgo concreto), **2.5.7 Movimiento de arrastre** (hay `@dnd-kit` y `useDragToScroll` en la agenda: debe existir alternativa sin arrastre), **2.5.8 Tamaño del objetivo mínimo** (24×24 px, revisar la densidad compacta), **3.3.7 Entrada redundante** y **3.3.8 Autenticación accesible**.

---

## 4. Correcciones de arquitectura frontend

| Hallazgo | Evidencia | Corrección |
|---|---|---|
| `strict: false` con **todos** los sub-flags de estricto desactivados | `tsconfig.app.json` | `strict: true` con `noUncheckedIndexedAccess` y `exactOptionalPropertyTypes`. En un sistema que maneja dosis, alergias y signos vitales, un `undefined` silencioso es un riesgo clínico. Migración progresiva por módulo. |
| Cero pruebas en el repositorio | ausencia de `*.test.*` / `*.spec.*` | Ver plan de QA (doc 05). |
| Cero *error boundaries* | verificado | Una excepción de render en un componente tumba la pantalla completa. En misión crítica se requiere aislamiento por módulo + pantalla de degradación que preserve el trabajo no guardado. |
| Sin *code splitting*: 39 rutas importadas estáticamente | `src/router/config.tsx` | Splitting por módulo, con **precarga explícita de las rutas clínicas críticas** (no lazy puro: en modo contingencia el chunk debe estar ya en caché). |
| Estado compartido como listas mutables de módulo + `Set` de listeners, con re-render vía contador `tick` | `useAppointmentsState.ts`, `useUrgenciasState.ts`, `useEstudiosState.ts` | Funciona para una demo; no sobrevive a datos de servidor, invalidación por sucursal, reintentos ni sincronización. Se reemplaza por TanStack Query (ya previsto en doc 2) con caché persistida y estado de sincronización explícito. Se **conserva la semántica** de "Triage ↔ Urgencias ↔ Sala de Espera comparten la misma lista". |
| `agenda/page.tsx` mantiene estado local **y** usa el hook compartido | `src/pages/agenda/page.tsx` | Fuente de verdad única. |
| `pendientesCount` fijo en `0` | `useCajaContext.tsx` | Dato del servidor. |
| Sin `.env`; sin lockfile; sin Prettier | raíz de `docs/frontend` | Configuración por ambiente, lockfile comprometido y formateo automático son requisitos de build reproducible (y de SDLC seguro). |
| Dependencias declaradas sin usar: `firebase`, `@supabase/supabase-js`, `@stripe/react-stripe-js`, y `lucide-react` (los iconos vienen de CDN) | `package.json` | Eliminar. Superficie de ataque y peso innecesarios. |
| Iconos y CSS desde CDN (Font Awesome, Remix Icon, Google Fonts) | `index.html` | **Incompatible con operación offline** y dependencia de terceros en un sistema de misión crítica. Autoalojar fuentes e iconos, con subsetting. |
| i18n inicializado pero vacío: `import.meta.glob('./*/*.ts')` sin carpetas de idioma, `lng: 'en'`, cero llamadas a `useTranslation` | `src/i18n/index.ts`, `src/i18n/local/index.ts` | Decidir: o se extraen las cadenas de verdad, o se retira el andamiaje. Ver doc 06. |
| Artefactos del generador (`__READDY_*`, proxy comentado, texto en inglés) | `vite.config.ts`, `NotFound.tsx` | Limpieza. |
| Ausencia total de capacidad offline: sin service worker, sin cola de escritura | verificado | Es el trabajo central de la propuesta. Ver doc 03. |

Nota positiva verificada: **cero ocurrencias** de `TODO`, `FIXME`, `: any` y `@ts-ignore` en `src/`. El código está limpio en ese aspecto.

---

## 5. Inconsistencias funcionales entre el prototipo y las reglas de negocio

Detectadas al cruzar el código con el `.docx` y el documento técnico:

| # | Inconsistencia | Resolución propuesta |
|---|---|---|
| 1 | El `.docx` define 8 roles como **catálogo cerrado**, con reglas rígidas (`SINGLE_BRANCH_ROLES`) hardcodeadas. El requisito 5 del cliente pide un sistema **totalmente configurable** por cliente. | Roles **dinámicos** en BD por tenant, con los 8 actuales como plantilla precargada. La restricción "una sola sucursal" pasa a ser un atributo del rol, no una constante del código. |
| 2 | `/app` y `/app/agenda` renderizan ambos `Agenda`. | Ruta raíz de la app configurable por rol (el dashboard del médico no es el de caja). |
| 3 | El `.docx` fija `sucursalId` en todo registro clínico, pero también dice que "un paciente puede atenderse en varias sucursales". El paciente es de tenant; el encuentro es de sucursal. | Modelar explícitamente: `Patient` a nivel tenant, `Encounter`/documentos a nivel sucursal. Evita duplicar pacientes por sucursal. |
| 4 | Umbrales clínicos de triage y tiempos de espera por nivel están fijos en código/reglas. | Parámetros clínicos **configurables bajo control de cambios**: versionados, con vigencia, aprobados por un rol responsable, y **cada registro clínico guarda la versión de la regla aplicada**. Sin esto no se puede auditar por qué un paciente se clasificó así hace dos años. |
| 5 | La regla "Caducidad: si `fechaCaducidad < 2026-12-01` se marca alerta" tiene una **fecha absoluta escrita en la regla**. | Ventana relativa configurable (p. ej. "alerta a N días de caducar"). |
| 6 | Folios (`REC-`, `FAR-`, `EXP-`, `CM-`, `FAC-`) se calculan como "conteo de registros existentes + 1". | Secuencias transaccionales **por tenant y por sucursal**. El conteo genera duplicados con concurrencia y hace imposible la emisión offline. Ver doc 03. |
| 7 | El emisor fiscal está fijo en un catálogo (`RFC MCO240101ABC`, régimen 601). | Datos fiscales por tenant/sucursal, configurables. |
| 8 | "Cobro automático al alta de urgencias" con método de pago **efectivo por defecto**. | Un cargo no debe presumir la forma de pago. Generar cuenta por cobrar; el método se captura al cobrar. |
| 9 | Auditoría con `id: number` e interfaz declarada **dentro** de la página. | Entidad de primer nivel, append-only, con cadena de integridad. |
| 10 | "Alta de todas formas" para forzar el alta con recetas pendientes. | Se conserva (es correcto no bloquear al médico), pero **exige motivo obligatorio y genera evento de auditoría de excepción clínica**. Una anulación de control de seguridad sin justificación registrada no es trazable. |
| 11 | Aseguradoras y alergias descritas a veces como catálogo y a veces como texto libre. | Catálogos gobernados. Las **alergias** son dato de seguridad clínica: deben ser codificadas (y con campo de texto complementario), nunca sólo texto libre, para que la alerta ante prescripción sea confiable. **Precisión del 2026-08-22:** codificarlas es necesario y no suficiente. El tipo actual es `alergias: string[]`, y el arreglo vacío no distingue "se interrogó y niega alergias" de "no se interrogó" ni de "no se pudo interrogar" — y la interfaz muestra el arreglo vacío como **"Sin alergias registradas"** (`pages/pacientes/detalle/page.tsx:312-313`). El estado alérgico debe ser un estado explícito, no un arreglo. Ver doc 09, BM-PAC-01 y BM-FAR-05. |

---

## 6. Resumen de esfuerzo por área

| Área | Estado del prototipo | Trabajo requerido |
|---|---|---|
| Lenguaje visual y layout | Muy bueno | Bajo — conservar |
| Tokens y theming | Muy bueno (base ideal para white-label) | Medio — generación dinámica y validación de contraste |
| Componentes base | Bueno con huecos concretos | Medio — accesibilidad, `Dropdown`, `Modal`, tabla de datos, virtualización |
| Modelo de dominio | Bueno como inventario de entidades; **los tipos no son aptos como están** | Alto — canonizar, versionar, ligar a terminologías, y **endurecer**: 87 brechas, 19 críticas, catalogadas en el doc 09 |
| Cobertura funcional de pantallas | Muy amplia | Bajo-medio — conectar a API |
| Seguridad | No apto para producción (por diseño de prototipo) | Alto — rehacer completo |
| Persistencia / backend | Inexistente | Alto — es el proyecto |
| Offline / resiliencia | Inexistente | Alto — es el diferenciador |
| Accesibilidad | Base por encima del promedio | Medio |
| Pruebas | Inexistentes | Alto |
| Documentos clínicos / PDF / firma | Funcional como demo, inadecuado legalmente | Alto |
