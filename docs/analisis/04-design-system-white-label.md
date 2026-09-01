# 04 — Design system, white-label y accesibilidad

Requisito atendido: *"El sistema debe ser totalmente configurable — logo, estilos, colores — para que un cliente pueda configurar a su gusto en sus sucursales"*, sin sacrificar la prioridad dada al diseño existente ni la seguridad del paciente.

## 1. Punto de partida: el prototipo ya resolvió lo difícil

`docs/frontend/src/index.css` y `tailwind.config.ts` implementan un sistema de **tokens OKLCH expuestos como variables CSS**: cinco familias (`background`, `primary`, `accent`, `secondary`, `foreground`) × 11 pasos (50–950), consumidas por Tailwind como `oklch(var(--primary-500) / <alpha-value>)`.

Esto tiene tres propiedades que lo vuelven la base ideal para white-label, y conviene dejarlas explícitas porque no son obvias:

1. **Ningún componente conoce un color.** Los ~182 archivos de `src/` referencian `bg-primary-600`, no un hex. Reemplazar la paleta completa de un cliente **no requiere tocar un solo componente**.
2. **OKLCH separa luminosidad de tono y croma.** La luminosidad (`L`) es lo que gobierna el contraste percibido. Si se mantiene fija la rampa de `L` y sólo se varían `C` y `H`, se puede cambiar el color de marca **conservando las relaciones de contraste**. Con HEX o HSL esto no es posible: `#0000FF` y `#FFFF00` tienen la misma "luminosidad" en HSL y contrastes radicalmente distintos.
3. **La variable ya está en el formato correcto:** se almacena `L C H` sin el envoltorio `oklch()` (p. ej. `--primary-500: 0.55 0.195 250`), lo que permite reemplazarla en tiempo de ejecución con una sola inyección de CSS.

**Decisión: se conserva íntegro este contrato de tokens.** El trabajo consiste en pasar de tres temas estáticos escritos a mano a una paleta generada y validada por tenant/sucursal.

---

## 2. Arquitectura de theming por tenant y sucursal

### Capas de tokens

Se introduce una separación que el prototipo no tiene y que es indispensable para que la configurabilidad no rompa el sistema:

| Capa | Ejemplos | ¿Configurable por el cliente? |
|---|---|---|
| **1. Tokens de marca** | `--primary-*`, `--accent-*`, logo, tipografía, densidad, radios | **Sí** |
| **2. Tokens de superficie** | `--background-*`, `--secondary-*`, `--foreground-*` | Sí, derivados del tema base (claro/oscuro) y del color semilla |
| **3. Tokens semánticos de estado** | `--state-success`, `--state-warning`, `--state-danger`, `--state-info` | Ajuste limitado, con validación obligatoria |
| **4. Tokens clínicos** | `--triage-rojo`, `--triage-naranja`, `--triage-amarillo`, `--triage-verde`, `--vital-normal`, `--vital-alerta`, `--vital-critico` | **NO. Bloqueados.** |

### Por qué los tokens clínicos están bloqueados

Esta es la decisión de diseño más importante del documento, y va en contra de una lectura ingenua de "totalmente configurable".

Los colores de triage **no son estética: son semántica clínica**. El nivel Manchester rojo/naranja/amarillo/verde es un código compartido por todo el personal de salud y por la formación clínica. Si una sucursal decide que su rojo institucional es un naranja corporativo, o si el "verde" de marca se aplica al nivel crítico, se introduce un riesgo de error de clasificación en el punto exacto donde el error cuesta vidas.

**Regla:** el cliente configura su marca; **no** configura el código clínico. La UI puede alojar ambos sin conflicto visual porque los colores clínicos se usan sólo en el contexto de clasificación (badges de nivel, filas de cola, rangos de signos vitales), no en la cromática general de la aplicación.

Complemento obligatorio (**WCAG 2.2 criterio 1.4.1 Uso del color**): el nivel de urgencia y el estado de un signo vital **nunca** se comunican sólo por color. Siempre color + **etiqueta de texto** + **icono/patrón**. Alrededor del 8% de los hombres tiene deficiencia en la visión rojo-verde; en México eso significa que en cualquier plantilla clínica hay personal para quien un triage codificado sólo por color es ambiguo.

### Flujo de configuración

```
Cliente elige: logo + color semilla + tema base (claro/oscuro) + tipografía + densidad
          ↓
Generador de paleta (servidor): rampa L fija por tema, C y H derivados de la semilla
          ↓
Validador de contraste: WCAG 2.2 AA sobre todos los pares texto/fondo y UI/fondo
          ↓
   ¿Pasa?  ── No ──→ Autocorrección de L + informe de qué se ajustó y por qué
      │                 (nunca se rechaza en silencio, nunca se publica algo ilegible)
     Sí
      ↓
Se persiste el conjunto de tokens versionado (tenant + sucursal) + previsualización aprobada
          ↓
Entrega al cliente: inyección de variables CSS en :root antes del primer render
```

### Detalles de implementación

- **Generación en servidor, no en el navegador.** El cálculo de paleta y la validación de contraste ocurren una vez al guardar la configuración, no en cada carga. El cliente recibe tokens ya resueltos.
- **Inyección antes del primer pintado**, mediante un bloque `<style>` en el documento inicial o un script bloqueante mínimo, para evitar el destello de tema incorrecto (FOUC). En una app que el personal abre docenas de veces al día, el destello se percibe como falta de calidad.
- **Caché en el service worker**: los tokens y el logo forman parte del precache. En modo contingencia (N2) la aplicación conserva la identidad visual del cliente; no "se vuelve genérica" justo cuando más confianza se necesita.
- **Assets en el servidor** referenciados por `FileId` GUID, como manda el doc 2. Se elimina el base64 en `localStorage` del prototipo. El logo se sirve en varios tamaños (sidebar, login, encabezado de documento impreso, favicon), generados en servidor a partir de una carga única.
- **Versionado**: cada configuración visual tiene versión y vigencia. Un documento clínico impreso hace un año debe poder reimprimirse con el encabezado que tenía entonces. Este detalle importa para auditoría documental.
- **Tipografía de un conjunto curado**, no carga libre. Motivos: legibilidad clínica (distinción entre `1/l/I`, `0/O`, y el signo decimal — crítico en dosis), disponibilidad offline (autoalojada, con subsetting) y consistencia de métricas. El prototipo usa Inter + Plus Jakarta Sans, que son buenas elecciones; se conservan como opción por defecto.

### Modo de alto contraste y accesibilidad visual

Además de claro/oscuro (y el tema `futurist` que el prototipo ya trae), se añade:

- **Alto contraste** (cumple 1.4.6 AAA en texto), pensado para consultorios con iluminación deficiente o personal con baja visión.
- Respeto a `prefers-reduced-motion` (2.3.3) y a `prefers-contrast`.
- **Densidad seleccionable** (compacta / cómoda): la escala compacta del prototipo (`base: 0.875rem`) es excelente para densidad de información, pero debe existir una alternativa cómoda que garantice el objetivo mínimo de 24×24 px (**2.5.8**, nuevo en WCAG 2.2) y sea usable por personal con dificultades motrices.
- **Zoom hasta 200%** sin pérdida de funcionalidad (1.4.4) y reflujo a 320 px (1.4.10).

---

## 3. Objetivo de accesibilidad: WCAG 2.2 nivel AA

Estado verificado (doc 01 §9): WCAG 2.2 es W3C Recommendation desde el 05-10-2023, con actualización editorial del 12-12-2024, y equivale a **ISO/IEC 40500:2025**. WCAG 3.0 sigue siendo únicamente Working Draft, por lo que **no** se adopta como objetivo.

Se declara explícitamente: **WCAG no es una obligación legal mexicana para clínicas privadas.** Se adopta como estándar de calidad y como buena práctica de diseño, conforme al principio 2 de `CLAUDE.md`. No se presentará al cliente como requisito normativo.

### Criterios con impacto específico en este producto

| Criterio | Por qué importa aquí |
|---|---|
| **1.4.1 Uso del color** | Triage, estados de cita, rangos de signos vitales, stock bajo, caducidad. El hallazgo de accesibilidad de mayor consecuencia clínica. |
| **1.4.3 / 1.4.11 Contraste** | Se garantiza por construcción con el validador de paleta. Debe cubrir también los componentes no textuales (bordes de campo, iconos de estado). |
| **1.3.1 Información y relaciones** | Tablas clínicas con encabezados asociados; formularios con etiquetas reales, no *placeholders*. |
| **2.1.1 Teclado** | El personal de recepción y enfermería trabaja a alta velocidad. Es simultáneamente accesibilidad y productividad. Corrige el `Dropdown` del prototipo. |
| **2.4.11 Foco no oscurecido** (nuevo en 2.2) | Con sidebar y header fijos, el elemento enfocado puede quedar tapado al tabular. Riesgo real en este layout. |
| **2.5.7 Movimiento de arrastre** (nuevo en 2.2) | La agenda usa `@dnd-kit` y `useDragToScroll`. Debe existir alternativa sin arrastre para mover una cita. |
| **2.5.8 Tamaño mínimo del objetivo** (nuevo en 2.2) | Directamente en tensión con la densidad compacta. Se resuelve con el selector de densidad. |
| **3.3.1 / 3.3.3 Errores** | Mensajes que digan qué corregir y cómo; ya presente en los componentes base, hay que extenderlo. |
| **3.3.4 Prevención de errores** | Confirmación y reversibilidad en acciones irreversibles: corte de caja, cancelación de CFDI, alta con recetas pendientes, fusión de pacientes. El `.docx` ya define doble confirmación para el corte; se generaliza. |
| **3.3.7 Entrada redundante** (nuevo en 2.2) | No volver a pedir datos ya capturados en el mismo flujo. Aplica al wizard de alta de 4 pasos. |
| **3.3.8 Autenticación accesible** (nuevo en 2.2) | Permitir pegar la contraseña y el uso de gestores de credenciales; no imponer pruebas cognitivas. |
| **4.1.3 Mensajes de estado** | Los avisos de sincronización, "guardado", "modo contingencia" deben anunciarse con `role="status"` / `aria-live`, o el usuario de lector de pantalla no sabe si su nota se guardó. |
| **3.1.1 Idioma** | Corrige el `lang="en"` del `index.html` actual. |

### Cómo se sostiene en el tiempo

- **`axe-core` en CI** sobre todas las rutas: falla el build ante violaciones nuevas.
- **Pruebas manuales de teclado y lector de pantalla** (NVDA en Windows, que es el entorno del cliente) en los 12 recorridos clínicos críticos, cada release.
- **Validador de contraste como prueba unitaria**: se generan N paletas de prueba a partir de colores semilla adversos y se verifica que ninguna produzca un par por debajo del umbral. Así la configurabilidad no puede degradar la accesibilidad.

---

## 4. Trabajo pendiente en el design system

Componentes que el prototipo no tiene y que un sistema clínico de este alcance requiere:

| Componente | Motivo |
|---|---|
| **DataTable virtualizada** | Padrón de pacientes, auditoría y agenda con miles de filas. Hoy se renderiza todo. |
| **Combobox / autocompletado accesible** | Búsqueda CIE-10, medicamentos, pacientes. Hoy hay implementaciones ad hoc por pantalla. Debe ser un único componente con patrón ARIA correcto. |
| **Dropdown / Menu accesible** | Reemplaza el `<div onClick>` actual. |
| **DatePicker / TimePicker** | Con entrada por teclado y formato mexicano. |
| **NumericField clínico** | Unidad, rango duro, rango de referencia y estado (normal/alerta/crítico) integrados. Concentra la lógica hoy dispersa. |
| **AllergyBanner** | Componente de seguridad clínica: presenta alergias y alertas de forma imposible de ignorar antes de prescribir. El `.docx` lo exige como regla; merece ser un componente con pruebas propias. |
| **SyncStatusIndicator** | Estado de conectividad y de la cola de salida. |
| **PatientHeader** | Cabecera de identidad persistente (nombre, expediente, edad, sexo, alergias) siempre visible durante la atención. Previene errores de paciente equivocado — uno de los errores más frecuentes en sistemas clínicos. |
| **Command palette** | Ctrl/Cmd+K, navegación y acciones por teclado. |
| **Toast / status region** | Con `aria-live`, no notificaciones puramente visuales. |
| **EmptyState / ErrorState / OfflineState** | El doc 2 exige *empty states* reales. Falta el estado offline. |
| **PrintLayout** | Plantilla de documento con encabezado del establecimiento (NOM-004 numeral 5.2), datos de firma y hash. |
| **ConfirmDialog con motivo** | Para excepciones que requieren justificación auditable (alta con recetas pendientes, break-glass, descuadre de caja). |

### Fundación técnica

- **Storybook** con un caso por componente y por estado, incluyendo estados de error, carga, offline y las tres densidades. Es la única forma de mantener consistencia con este volumen de pantallas.
- **Tokens como fuente única**, exportados también a los PDF generados en servidor, para que un documento impreso conserve la identidad del cliente.
- **Pruebas de regresión visual** en los componentes base y en las plantillas de documento impreso (un documento clínico debe ser estable byte a byte entre versiones).
