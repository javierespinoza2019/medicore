Reglas de Negocio — MediCore
Configuración y Alta de Pacientes
Convenciones transversales

| Convención | Regla |
| Identificadores | Usuario u{n}, sucursal suc{n}, consultorio c{n}, médico d{n}, especialidad s{n}, servicio sv{n}, medicamento m{n}, estudio e{n}. Internos, no visibles como clave. |
| Folio de expediente | EXP-{año}-{4 dígitos} secuencial, autogenerado al registrar paciente. |
| Catálogos cerrados | Roles, estados, tipos, vías de administración, categorías CIE-10, colores e iconos son listas cerradas; no hay texto libre en campos de clasificación. |
| Multisucursal | Todo elemento de configuración (usuario, médico, consultorio, paciente) referencia sucursalId. |
| Persistencia de assets | Logo institucional y firmas digitales se guardan en localStorage (imágenes en base64); los adjuntos de pacientes en IndexedDB. |
| Sin borrado en auditoría | Al eliminar un usuario, su registro en auditoría se conserva (trazabilidad no se pierde). |

1. Usuarios (Administración)
1.1 Roles (8 catálogo cerrado)

| Rol | Código | Nota |
| Administrador | admin | Acceso total |
| Médico | medico | Requiere cédula + especialidad |
| Recepción | recepcion | 1 sola sucursal |
| Enfermería | enfermeria | 1 sola sucursal |
| Caja y Cobros | caja | 1 sola sucursal |
| Farmacia | farmacia | 1 sola sucursal |
| Laboratorio | laboratorio | 1 sola sucursal |
| Directivo | directivo | Multisucursal |

1.2 Reglas de negocio
Estados (3 cerrados): activo, inactivo, bloqueado. Solo los activo pueden iniciar sesión (regla ya documentada en Fase 4, §1.4).
Regla de sucursal única: los roles recepcion, enfermeria, farmacia, laboratorio y caja solo pueden tener una sucursal asignada (SINGLE_BRANCH_ROLES). admin, medico y directivo pueden ser multisucursal.
Al cambiar a un rol de sucursal única, el sistema recorta la selección a máximo 1 sucursal (sucursalIds.slice(0,1)).
En el selector de sucursales, las opciones no seleccionadas se deshabilitan si el rol es de sucursal única y ya hay una elegida.
Rol médico: muestra campos adicionales obligatorios condicionales — cédula profesional y especialidad (seleccionada de catálogo). El campo doctorId se liga al médico correspondiente.
Contraseña inicial: al crear un usuario se asigna automáticamente Temp123! (no se captura en el formulario).
ultimoAcceso en usuarios nuevos se inicializa en —; fechaCreacion se autocompleta con la fecha actual.
Eliminación con advertencia: el modal aclara “El usuario perderá acceso al sistema. Su registro en auditoría se conserva” — no hay borrado físico de la traza.
1.3 Validaciones por campo

| Campo | Obligatorio | Regla |
| nombre | Sí | ≤ 60 car.; sin números |
| apellidos | Sí | ≤ 60 car.; sin números |
| email | Sí | Formato válido; ≤ 100 car.; único (case-insensitive, excluye el usuario en edición) |
| telefono | No | Si se captura, 10 dígitos |
| rol | Sí | De catálogo de 8 roles |
| sucursalIds | Sí | ≥ 1; si rol de sucursal única, exactamente 1 |
| status | Sí | activo/inactivo/bloqueado |

2. Sucursales
2.1 Reglas de negocio
Estructura anidada: cada sucursal contiene sus consultorios (relación 1→N). No hay consultorio huérfano.
Estados: sucursal activa/inactiva; consultorio activo/inactivo.
Logo institucional: se sube una imagen (redimensionada a 400px) y se guarda localmente. Se muestra en inicio de sesión, menú lateral y reportes impresos. Se puede cambiar o quitar.
Días de operación: selección múltiple de los 7 días de la semana; default Lunes–Viernes.
Eliminación de sucursal: advertencia explícita — “Se eliminarán también todos sus consultorios. Médicos y citas asociadas quedarán sin sucursal.”
Eliminación de consultorio: advertencia — “Las citas programadas en este consultorio quedarán sin ubicación asignada.”
2.2 Reglas por campo (Sucursal)

| Campo | Obligatorio | Regla |
| nombre | Sí | ≤ 100 car. |
| direccion | Sí | ≤ 200 car. |
| ciudad | Sí | ≤ 60 car. |
| telefono | Sí | 10 dígitos |
| email | No | Formato válido; ≤ 100 car. |
| codigoPostal | No | ≤ 10 car. |
| estado | No | ≤ 30 car. |
| horarioApertura / horarioCierre | — | Formato hora (default 07:00 / 20:00) |
| diasOperacion | — | Subconjunto de los 7 días |

2.3 Reglas por campo (Consultorio)

| Campo | Obligatorio | Regla |
| nombre | Sí | ≤ 80 car.; único por sucursal (case-insensitive) |
| piso | — | 1–3 |
| tipo | Sí | 5 cerrados: consulta, procedimiento, urgencias, triage, estudio |
| activo | — | checkbox |

3. Médicos
3.1 Reglas de negocio
Estados (3 cerrados): activo, inactivo, vacaciones.
Asignación de firma digital: se sube una imagen (redimensionada a 400px) por médico. Se muestra un indicador (icono verde) junto al nombre si tiene firma cargada. Se guarda en localStorage por doctorId.
Especialidad y sucursal se seleccionan de catálogo (no texto libre).
Horario (horarioInicio/horarioFin), default 08:00–16:00.
Eliminación: advertencia — “Sus citas programadas no se eliminarán, pero quedarán sin médico asignado.”
3.2 Validaciones por campo

| Campo | Obligatorio | Regla |
| nombre | Sí | ≤ 100 car. |
| especialidadId | Sí | De catálogo de especialidades |
| cedula | Sí | ≤ 30 car. |
| email | Sí | Formato válido; ≤ 100 car. |
| telefono | Sí | 10 dígitos |
| consultorio | Sí | ≤ 50 car. |
| sucursalId | Sí | De catálogo de sucursales |

4. Especialidades
4.1 Reglas de negocio
Identidad visual: cada especialidad tiene icono (catálogo cerrado de iconos Remix) y color (8 opciones cerradas). Hay vista previa en vivo del resultado.
Nombre único (case-insensitive).
Eliminación con advertencia: “Los médicos y servicios asociados podrían quedar sin especialidad.”
4.2 Validaciones por campo

| Campo | Obligatorio | Regla |
| nombre | Sí | ≤ 80 car.; único |
| descripcion | Sí | ≤ 300 car. |
| icono | — | De catálogo cerrado (16 opciones) |
| color | — | De 8 colores cerrados |

5. Servicios
5.1 Reglas de negocio
Tipos (5 cerrados): consulta, procedimiento, estudio, terapia, otro.
Código único (case-insensitive), formato libre tipo CONS-MG-001.
Precio público sin IVA (coherente con Fase 2): precio > 0, máximo $999,999.
Duración: > 0 y ≤ 480 minutos (8 horas).
requiereCita y activo son banderas booleanas.
Eliminación: advertencia — “No podrá usarse en nuevas consultas. Las citas ya agendadas no se afectan.”
5.2 Validaciones por campo

| Campo | Obligatorio | Regla |
| codigo | Sí | ≤ 30 car.; único |
| nombre | Sí | ≤ 100 car. |
| especialidadId | Sí | De catálogo |
| precio | Sí | > 0 y ≤ 999,999 |
| duracionMin | Sí | > 0 y ≤ 480 |
| descripcion | No | ≤ 500 car. |

6. Catálogos (CIE-10, Medicamentos, Estudios)
6.1 Reglas de negocio
Tres catálogos independientes bajo pestañas: Medicamentos, CIE-10 y Estudios. Cada uno con su propio CRUD y conteo en cabecera.
Medicamentos: la vía de administración es catálogo cerrado (viasAdministracion). Nombre, presentación, concentración y categoría son texto con límites.
CIE-10: el código se fuerza a mayúsculas al guardar. La categoría es de 13 valores cerrados (Infecciosas, Neoplasias, Endocrinas, etc.). Los diagnósticos se agrupan por subcategoría para mostrar “relacionados”.
Estudios: el tipo es de 5 valores cerrados (laboratorio, imagen, gabinete, patologia, otro). La bandera requiereAyuno activa la alerta de ayuno 8–12 horas.
Eliminación: confirmación genérica “Esta acción no se puede deshacer” para los tres catálogos.
6.2 Validaciones por catálogo

| Catálogo | Campo | Obligatorio | Regla |
| Medicamento | nombre | Sí | ≤ 100 car. |
| Medicamento | presentacion | Sí | ≤ 50 car. |
| Medicamento | concentracion | Sí | ≤ 50 car. |
| Medicamento | categoria | Sí | ≤ 60 car. |
| Medicamento | viaAdministracion | Sí | De catálogo cerrado |
| CIE-10 | codigo | Sí | ≤ 10 car.; se guarda en mayúsculas |
| CIE-10 | descripcion | Sí | ≤ 500 car. |
| CIE-10 | categoria | Sí | 13 valores cerrados |
| CIE-10 | subcategoria | Sí | ≤ 100 car. |
| Estudio | nombre | Sí | ≤ 150 car. |
| Estudio | tipo | Sí | 5 valores cerrados |
| Estudio | categoria | Sí | ≤ 60 car. |
| Estudio | descripcion | Sí | ≤ 500 car. |
| Estudio | tiempoResultado | Sí | ≤ 50 car. |
| Estudio | requiereAyuno | — | checkbox |

7. Alta y Gestión de Pacientes
7.1 Flujo de alta (wizard de 4 pasos)
																Datos Personales → Contacto → Datos Adicionales → Confirmación → Registrado
																     (1)              (2)           (3)               (4)
Avance por pasos con validación por paso (no se avanza sin completar el paso actual).
La confirmación final revalida los 3 pasos juntos; si hay error, salta automáticamente al paso afectado.
7.2 Reglas de negocio
CURP con validación oficial RENAPO: exactamente 18 caracteres, estructura oficial y **dígito ver

Núcleo Clínico
Convenciones generales (aplican a toda la fase)

| Convención | Regla |
| Identificadores | Paciente p{n}, cita app-..., consulta con-..., receta rec-..., estudio est-.... Son internos, nunca se muestran al usuario como clave única. |
| Expediente | Formato EXP-{año}-{secuencial 4 dígitos}, p. ej. EXP-2024-0001. Es la clave pública visible del paciente. |
| Fechas | Siempre YYYY-MM-DD internamente; se muestran localizadas al usuario. |
| Horas | HH:mm en formato 24h. |
| Moneda | MXN; precios sin IVA en el catálogo (el CFDI lo calcula en la fase de facturación). |
| Estados | Todo estado es de tipo string tipado (union TypeScript), no texto libre. No hay estados “ad hoc”. |
| Integridad referencial | Toda consulta/receta/estudio referencia patientId y doctorId. Nunca se muestran datos huérfanos. |
| Multisucursal | Todo registro clínico lleva sucursalId. Un paciente puede atenderse en varias sucursales, pero una cita/consulta pertenece a una sola sucursal. |

1. Pacientes
1.1 Flujo
																Alta (wizard) → Padrón activo → Agenda/Consulta → Expediente Unificado
																                   ↓
																        Puede quedar "inactivo" (no elimina histórico)
1.2 Reglas de negocio
No se elimina el registro del paciente. Solo se cambia estado a inactivo. El histórico clínico es inalterable.
Expediente único y autoincremental. Se asigna al alta y nunca se reutiliza ni se renombra.
CURP es el identificador de unicidad nacional. No puede haber dos pacientes activos con la misma CURP.
Alergias y alertas son críticas de seguridad clínica. Se muestran destacadas en triage, consulta y receta. Un paciente con alerta (p. ej. “Alergia a penicilina”) debe ser visible para el médico antes de prescribir.
medicoAsignado es opcional (paciente puede no tener médico titular).
ultimaVisita se actualiza automáticamente al completar una consulta o atender una cita, nunca manual.
1.3 Reglas por campo

| Campo | Tipo | Obligatorio | Regla / validación |
| nombre | texto | Sí | 2–60 caracteres; solo letras, espacios, apóstrofos y guiones; sin números |
| apellidos | texto | Sí | Igual que nombre |
| fechaNacimiento | fecha | Sí | No puede ser futura; define edad automáticamente |
| edad | número | Sí (calc.) | 0–120 años; se calcula, no se captura |
| sexo | enum | Sí | M o F |
| telefono | texto | No | 7–15 dígitos (solo dígitos válidos) |
| celular | texto | No | Igual que telefono |
| email | texto | No | Formato de correo válido |
| direccion | texto | No | Texto libre |
| curp | texto | Sí | 18 caracteres, estructura CURP mexicana |
| contactoEmergencia | texto | No | Nombre + parentesco |
| parentescoEmergencia | texto | No | Texto libre |
| aseguradora | texto | No | Catálogo (AXA, GNP, Seguros Monterrey…) |
| poliza | texto | No | Solo si hay aseguradora |
| alergias | lista | No | Valores de catálogo de alérgenos |
| alertas | lista | No | Texto libre clínico (máx. 120 caracteres c/u) |
| estado | enum | Sí | activo o inactivo |

2. Agenda
2.1 Flujo
																Nueva cita (validación de colisiones) → Confirmada → Llegó → En espera → Llamando → En consulta → Atendida
																                                                                              ↘ Cancelada / No acudió
2.2 Reglas de negocio
Máquina de estados con 11 estados (ver §2.3). No todas las transiciones son válidas — ver matriz.
No puede haber dos citas solapadas en el mismo consultorio y horario.
La duración de la cita viene de la especialidad/tipo (default 30 min), generando horaFin.
Reglas de bloqueo impiden agendar en horarios no laborables, días festivos o consultorios bloqueados.
Un médico solo atiende en su(s) consultorio(s) asignado(s).
no_acudio y cancelada son estados terminales y no permiten reapertura; se agenda una nueva cita si el paciente regresa.
Reimpresión de ticket disponible en cualquier estado previo a atendida.
2.3 Matriz de transiciones de estado

| Desde ↓ / Hasta → | confirmada | llego | en_espera | en_triage | llamando | en_consulta | atendida | cancelada | no_acudio |
| reservada | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| confirmada | — | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| llego | ❌ | — | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| en_espera | ❌ | ❌ | — | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| en_triage | ❌ | ❌ | ✅ | — | ❌ | ✅ | ❌ | ❌ | ❌ |
| llamando | ❌ | ❌ | ❌ | ❌ | — | ✅ | ❌ | ✅ | ❌ |
| en_consulta | ❌ | ❌ | ❌ | ❌ | ❌ | — | ✅ | ❌ | ❌ |

2.4 Reglas por campo

| Campo | Tipo | Obligatorio | Regla |
| fecha | fecha | Sí | ≥ hoy para nuevas citas |
| horaInicio / horaFin | hora | Sí | horaFin > horaInicio; sin solape en el consultorio |
| estado | enum | Sí | Uno de los 11 estados |
| motivo | texto | Sí | ≥ 5 caracteres; no solo números; máx. 500 |
| consultorio | texto | Sí | Debe pertenecer a la sucursal |
| horaLlegada | hora | No | Se registra al marcar “Llegó” |

3. Sala de Espera
3.1 Reglas de negocio
La cola es en tiempo real (estado compartido reactivo); cualquier cambio en Agenda/Triage se refleja al instante.
Se ordena por hora de llegada y nivel de urgencia (un paciente derivado a urgencias sale de la cola ordinaria).
Timers en vivo muestran el tiempo de espera desde horaLlegada (o horaInicio si no ha llegado).
Derivaciones:
A triage → cambia estado a en_triage.
A consulta → cambia a en_consulta.
A urgencias → si el paciente no tiene triage previo, se asigna nivel amarillo por defecto y datos de respaldo (regla de seguridad, nunca se deriva sin clasificación).
Un paciente solo está en una cola a la vez.

4. Triage
4.1 Flujo
																Espera → En triage → Captura de signos vitales (validación en vivo) → Nivel de urgencia → Completado / Derivado
4.2 Reglas de negocio
IMC automático: se calcula peso / talla². No se captura manual.
Nivel de urgencia (Manchester simplificado) en 4 niveles: verde, amarillo, naranja, rojo.
Protección contra pérdida de cambios: si hay campos modificados sin guardar, se advierte antes de salir.
Cada triage genera un TriageRecord inmutable; el historialTriage acumula registros (nunca se sobrescribe el anterior).
Signos de alarma se resaltan visualmente según rango normal/alerta/crítico.
4.3 Rangos de referencia (regla de clasificación automática)

| Signo | Normal | Alerta | Crítico | Unidad |
| Temperatura | 36.0–37.5 | 35.5–38.5 | 34.0–42.0 | °C |
| FC | 60–100 | 50–120 | 30–200 | lpm |
| FR | 12–20 | 10–28 | 6–40 | rpm |
| SatO₂ | 95–100 | 90–94 | 70–89 | % |
| PAS | 90–139 | 80–159 | 60–200 | mmHg |
| PAD | 60–89 | 50–99 | 30–120 | mmHg |
| Glucosa | 70–110 | 50–180 | 30–400 | mg/dL |
| IMC | 18.5–24.9 | 17–29.9 | 14–40 | kg/m² |

4.4 Reglas por campo (límites duros de captura)

| Campo | Rango permitido | Unidad |
| temperatura | 30–44 | °C |
| presionSistolica | 40–250 | mmHg |
| presionDiastolica | 20–150 | mmHg |
| frecuenciaCardiaca | 20–220 | lpm |
| frecuenciaRespiratoria | 4–60 | rpm |
| saturacionOxigeno | 50–100 | % |
| glucosa | 20–600 | mg/dL |
| peso | 0.5–300 | kg |
| talla | 0.3–2.5 | m |
| dolor (EVA) | 0–10 | escala |

Validaciones cruzadas obligatorias:
PAD debe ser menor que PAS.
La diferencia PAS − PAD debe ser ≥ 20 mmHg.
IMC clínico válido entre 5 y 80 kg/m².
notas máximo 500 caracteres.

5. Consultas (Nota SOAP)
5.1 Flujo
																Pendiente → En curso (SOAP + CIE-10 + Historia Clínica) → Completada
																                                     ↘ Cancelada
5.2 Reglas de negocio
Estructura SOAP obligatoria para completar la consulta: motivo (S), padecimiento actual (S), exploración física (O), diagnóstico (A) y plan de tratamiento (P).
Diagnóstico principal usa código CIE-10 con búsqueda; los diagnósticos secundarios son una lista.
La consulta no puede marcarse completada sin diagnóstico principal ni plan de tratamiento (campos mínimos para cierre).
signosVitales se hereda del triage del paciente (opcional, puede ser null).
tipo condiciona el comportamiento: primera_vez abre historia clínica completa; control y subsecuente cargan histórico.
Recetas y estudios se generan inline y quedan ligados a la consulta vía consultaId.
Al finalizar, la consulta persiste en el estado global (no queda “en curso” fantasma al volver al listado).
Toda consulta de urgencia (tipo urgencia) hereda alertas del paciente y requiere mayor prioridad de atención.
5.3 Reglas por campo

| Campo | Tipo | Obligatorio | Regla |
| tipo | enum | Sí | primera_vez / subsecuente / urgencia / control |
| estado | enum | Sí | pendiente / en_curso / completada / cancelada |
| motivo | texto | Sí | ≥ 5 caracteres; máx. 500 |
| padecimientoActual | texto | Sí (cierre) | Texto libre clínico |
| exploracionFisica | texto | Sí (cierre) | Texto libre clínico |
| diagnosticoPrincipal | texto | Sí (cierre) | Código CIE-10 + descripción |
| diagnosticosSecundarios | lista | No | Códigos CIE-10 |
| planTratamiento | texto | Sí (cierre) | Texto libre |
| notas | texto | No | Máx. 500 caracteres |
| tieneReceta / tieneEstudios | boolean | No | Se calcula, no se captu |

Caja, Cortes y Facturación CFDI
Convenciones financieras (aplican a toda la fase)

| Convención | Regla |
| Moneda | MXN en todos los módulos. Los importes se almacenan como number y se formatean con toLocaleString('es-MX'). |
| Precios | Vienen del catálogo de servicios (medicalServices). Son precios públicos sin IVA. El IVA solo se calcula en Facturación cuando aplica (ver §3). |
| Montos | subtotal, descuento, total siempre como números; nunca strings ni texto libre. |
| Redondeo | El IVA se redondea a 2 decimales (Math.round(base * 0.16 * 100) / 100). |
| Recibos vs CFDI | Un recibo (REC-...) NO es comprobante fiscal. Solo el CFDI (con UUID y sello SAT) tiene validez fiscal. |
| Trazabilidad | Toda transacción lleva usuario (quién cobró) y sesionId (a qué caja pertenece). Toda factura referencia transaccionId (cobro de origen). |

1. Caja y Cobros
1.1 Flujo
																Apertura de sesión (fondo inicial) → Registro de cobros → Cierre de caja → Corte
																        ├── Pendientes de cobro (consultas atendidas sin cobrar)
																        └── Cobro manual (paciente + servicios + pago)
1.2 Sesión de Caja (CashSession)
Reglas de negocio:
Una sola sesión activa por caja. Mientras la sesión esté abierta, todos los cobros se registran en ella. No hay dos sesiones abiertas simultáneas.
Fondo inicial (montoApertura): dinero con el que arranca la caja para dar cambio. Por defecto $2,000.00 MXN.
Una sesión cerrada es inmutable. Tras el cierre, estado pasa a cerrada, cierre se llena con la hora y montoCierre con el total. No se pueden registrar más cobros en ella.
montoCierre se calcula, no se captura: montoApertura + totalIngresos.
Reglas por campo:

| Campo | Tipo | Obligatorio | Regla |
| montoApertura | número | Sí | > 0; default 2000 |
| estado | enum | Sí | abierta o cerrada |
| montoCierre | número | No | Solo cuando estado === 'cerrada'; = fondo + ingresos |
| totalIngresos | número | calc. | Suma de transacciones pagado |
| cantidadTransacciones | número | calc. | Conteo de transacciones pagado |
| usuario | texto | Sí | Caja/cajera responsable |

1.3 Transacción de Caja (CashTransaction)
Reglas de negocio:
Estados de transacción (3):pagado, cancelado, reembolsado.
pagado → el cobro fue exitoso y cuenta para ingresos.
cancelado → se anuló antes de cobrar; no cuenta para ingresos.
reembolsado → se devolvió el dinero al paciente; no cuenta para ingresos del día (sí se contabiliza aparte).
Solo las transacciones pagado se suman en totalIngresos, totalEfectivo, totalTarjeta y totalTransferencia.
Métodos de pago (4):efectivo, tarjeta, transferencia, mixto.
mixto requiere un detalle (detallePago) que desglosa cuánto va a cada método.
Recibo autogenerado y secuencial: formato REC-{año}-{secuencial 4 dígitos} (p. ej. REC-2026-0072). El secuencial se calcula con base en la cantidad de transacciones existentes.
origen identifica de dónde viene el cobro (estudio, urgencia, farmacia, o el id del servicio). Es clave para asignar la clave SAT correcta en facturación (ver §3.4).
Cobro vinculado a consulta: si viene de una consulta atendida, guarda consultaId y consultaDoctor para trazabilidad clínica-financiera.
Descuento reduce el subtotal; el total = subtotal - descuento. El descuento nunca puede ser negativo ni mayor al subtotal.
Reglas por campo:

| Campo | Tipo | Obligatorio | Regla |
| subtotal | número | Sí | Suma de precios de servicios; > 0 |
| descuento | número | Sí | 0 ≤ descuento ≤ subtotal |
| total | número | Sí | subtotal - descuento; > 0 |
| metodoPago | enum | Sí | Uno de los 4 métodos |
| detallePago | objeto | No | Obligatorio si mixto; suma debe = total |
| estado | enum | Sí | pagado / cancelado / reembolsado |
| recibo | texto | Sí | Único y secuencial |
| paciente | texto | Sí | Nombre completo del paciente |
| concepto | texto | Sí | Descripción del servicio(s) cobrado |
| notas | texto | No | Máx. 200 caracteres |

1.4 Métodos de pago — reglas de captura

| Método | Regla de validación |
| Efectivo | Se captura montoRecibido. Debe ser ≥ total. El cambio = montoRecibido - total se muestra y registra. |
| Tarjeta | No requiere monto recibido; el total se asigna directo a tarjeta. |
| Transferencia | El total se asigna directo a transferencia. |
| Mixto | Se captura desglose por efectivo/tarjeta/transferencia. La suma de las tres debe ser exactamente igual al total; si no cuadra, se muestra alerta y no se habilita el cobro. |

1.5 Cobros pendientes → cobro manual
Reglas de negocio:
Consultas atendidas sin cobrar aparecen en la pestaña “Pendientes de cobro” con estado pendiente_cobro o cobro_parcial.
Al hacer clic en “Cobrar”, se prellenan automáticamente: paciente, servicio, consulta y médico, y se salta al paso de pago (modo manual con contexto).
Al completar el cobro, la consulta se marca como pagada (paidConsultaIds) y desaparece de pendientes en tiempo real.
cobro_parcial indica que ya se hizo un abono; el campo cobrado registra lo pagado hasta el momento.
Reglas por campo (ConsultaPendienteCobro):

| Campo | Tipo | Obligatorio | Regla |
| precio | número | Sí | Precio del servicio, > 0 |
| estado | enum | Sí | pendiente_cobro / cobro_parcial |
| cobrado | número | No | Solo cuando cobro_parcial; 0 < cobrado < precio |

2. Cortes de Caja
2.1 Flujo
																Sesión abierta → Resumen del día → Cierre (doble confirmación) → Corte guardado → Historial
2.2 Reglas de negocio
Doble confirmación obligatoria. El cierre tiene dos pasos: “Iniciar Cierre” (advertencia) → “Confirmar Cierre Definitivo” (acción irreversible). No se puede cerrar con un solo clic.
Un corte es inmutable. Una vez cerrado, el CorteCaja se guarda en el historial y no se edita ni se reabre.
Los totales del corte se calculan a partir de las transacciones pagado, nunca se capturan manualmente:
totalEfectivo = suma de detallePago.efectivo
totalTarjeta = suma de detallePago.tarjeta
totalTransferencia = suma de detallePago.transferencia
totalIngresos = suma de total
cantidadTransacciones cuenta solo las pagado; canceladas y reembolsos se contabilizan aparte.
montoCierre = montoApertura + totalIngresos. Fórmula fija de conciliación.
Diferencia: en el MVP se registra como 0 por defecto, pero el sistema permite registrar discrepancias (positivas o negativas) con observaciones obligatorias para justificarlas.
2.3 Conciliación (verificación de cuadre)
El módulo de Cortes valida dos invariantes y muestra “Cuadra” o “Descuadre”:
Cuadre de ingresos por método:
																	totalEfectivo + totalTarjeta + totalTransferencia === totalIngresos
Cuadre de cierre:
																	montoApertura + totalIngresos + diferencia === montoCierre
Si ambas se cumplen → “Cuadra”. Si alguna falla → “Descuadre” (alerta visual roja).
Reglas por campo (CorteCaja):

| Campo | Tipo | Obligatorio | Regla |
| fecha | fecha | Sí | Día del corte |
| horaApertura / horaCierre | hora | Sí | horaCierre > horaApertura |
| montoApertura | número | Sí | Heredado de la sesión |
| montoCierre | número | Sí | fondo + ingresos |
| diferencia | número | Sí | Puede ser 0, positivo o negativo |
| observaciones | texto | No | Obligatorio si diferencia ≠ 0 (máx. 200 caracteres) |
| canceladas / reembolsos | número | Sí | Conteos independientes |

3. Facturación CFDI 4.0
3.1 Flujo
																Cobro pagado (Caja) → Seleccionar cobro → Datos receptor → Pago e impuestos → Timbrar → CFDI vigente
																                                                                                     ↘ Cancelar (motivo 01)
3.2 Reglas de negocio fiscales
Solo se puede facturar un cobro con estado pagado. Los cobros cancelado o reembolsado no aparecen en la lista de facturables.
Una factura referencia un único cobro (transaccionId). No se facturan conceptos sueltos sin cobro de respaldo.
Folio secuencial y autoincremental: formato {serie}-{folio} (p. ej. FAC-A-0001). El folio siguiente se calcula como máximo folio existente + 1, con padding a 4 dígitos.
UUID autogenerado en formato estándar de 36 caracteres (8-4-4-4-12 hexadecimal).
El emisor (clínica) es fijo y proviene del catálogo emisorFiscal (RFC MCO240101ABC, régimen 601).
Cancelación: una factura vigente puede pasar a cancelada, registrando el motivo “01 — Comprobante emitido con errores con relación”. La cancelación es irreversible en el MVP (no se puede “revivir” una cancelada).
3.3 Catálogos SAT (cerrados, CFDI 4.0)

| Catálogo | Valores clave | Nota |
| Uso CFDI | G01, G02, G03, D01, D02, D04, D10, P01 | Default clínico: D01 (Honorarios médicos) |
| Régimen fiscal | 601, 603, 606, 612, 614, 616, 625, 626 | Receptor default: 612 |
| Forma de pago | 01, 02, 03, 04, 28, 99 | Mapeada desde el método de pago de Caja |
| Método de pago | PUE, PPD | Default: PUE ( |

Urgencias y Hospitalización
Convenciones transversales (aplican a toda la fase)

| Convención | Regla |
| Identificadores | Urgencia urg-{n}, dispensación disp-{n}, egreso eg-{patientId}-{base36}, nota enfermería ne-{patientId}-{n}. Internos, nunca visibles como clave. |
| Folios públicos | Dispensación FAR-{año}-{4 dígitos}, receta urgencia RX-URG-{4 dígitos}. |
| Tiempos | Urgencias usa reloj en vivo (horaLlegada → minutos de espera calculados cada 60 s). |
| Niveles de urgencia | Manchester simplificado, 4 niveles cerrados: rojo, naranja, amarillo, verde. No hay niveles ad hoc. |
| Estado compartido reactivo | Urgencias ↔ Farmacia ↔ Caja comparten listas mutables con listeners (una receta de urgencia dispensada en Farmacia se refleja al instante en Urgencias). |
| Integridad referencial | Toda urgencia/receta/egreso/nota referencia patientId (y doctorId/urgenciaId donde aplica). Nunca datos huérfanos. |

1. Urgencias
1.1 Flujo
																Ingreso (Nuevo ingreso) → Esperando → En atención / Observación → Alta
																                              │               │
																                              └── nivel de urgencia (rojo/naranja/amarillo/verde)
																                              └── receta de urgencia → Farmacia
1.2 Reglas de negocio
Triage por nivel (Manchester simplificado, 4 niveles cerrados) con semántica clínica obligatoria:
rojo → Emergencia: atención inmediata, amenaza inminente para la vida.
naranja → Urgencia: atención < 15 min, riesgo de deterioro.
amarillo → Preferente: atención < 60 min, condición estable.
verde → No urgente: atención < 120 min, sin riesgo inminente.
Máquina de estados con 4 estados: esperando → en_atencion / observacion → alta.
observacion es un estado de atención diferida (paciente estabilizado en área de observación).
La hora de atención y la hora de alta se registran automáticamente al cambiar de estado (horaAtencion al pasar a en_atencion, horaAlta al dar alta). No se capturan manual.
Orden de la cola: por nivel de urgencia (rojo→naranja→amarillo→verde), luego por estado (en_atencion/observacion antes que esperando), luego por horaLlegada ascendente.
Tiempos de espera con umbrales de alerta por nivel (coloreado verde→ámbar→rojo):
rojo: alerta a los 5 min, crítico a los 10 min.
naranja: alerta 15 min, crítico 30 min.
amarillo: alerta 45 min, crítico 90 min.
verde: alerta 90 min, crítico 150 min.
Alta con verificación de recetas pendientes: si el paciente tiene recetas de urgencia en estado activa o parcial, el sistema bloquea el alta y muestra advertencia (“recetas pendientes de surtir”), ofreciendo: ir a Farmacia, volver, o “Alta de todas formas” (forzar). Regla de seguridad clínica.
Cobro automático al alta: al confirmar el alta se registra en Caja el cobro de la “Atención de Urgencias” (servicio sv13), con origen = urgencias, método de pago efectivo por defecto y concepto con el nivel (Atención de Urgencias — Urgencia).
Signos vitales se heredan del triage (signosVitales: TriageRecord | null). Si están fuera de rango clínico, se muestran errores en el panel (no bloquean, pero advierten).
Sin borrado físico: una urgencia con alta permanece en el listado como historial; no se elimina.
Nota médica: solo editable en estado en_atencion/observacion, con protección de cambios sin guardar (hasUnsaved) y límite de 1,000 caracteres.
1.3 Reglas por campo (Urgencia)

| Campo | Tipo | Obligatorio | Regla |
| patientId / patientName / patientExpediente | texto | Sí | Referencia a paciente del padrón |
| fecha / horaLlegada | fecha/hora | Sí | Momento de ingreso |
| horaAtencion / horaAlta | hora | No | Auto al cambiar estado |
| nivelUrgencia | enum | Sí | 4 niveles cerrados |
| estado | enum | Sí | 4 estados cerrados |
| motivo | texto | Sí | Texto clínico libre (padecimiento actual) |
| areaUrgencia | texto | Sí | Área de atención (Urgencias, Choque, Observación, Pediátrica, Obstétrica) |
| doctorId / doctorName | texto | No | Se asigna al iniciar atención |
| notaMedica | texto | No | Máx. 1,000 caracteres; editable solo en atención |
| destinoAlta | enum | No | Obligatorio al dar alta |
| contactoEmergencia | texto | Sí | Nombre + parentesco |
| genero / edad | enum/número | Sí | M/F; edad en años |
| viaAcceso | enum | Sí | caminando/ambulancia/referencia/policia |

1.4 Destino de alta (catálogo cerrado, 5 valores)

| Destino | Significado |
| domicilio | Alta a casa |
| hospitalizacion | Ingreso a piso |
| consulta_externa | Seguimiento ambulatorio |
| referencia | Traslado/contrarreferencia |
| quirofano | Derivación a cirugía |

2. Recetas de Urgencia
2.1 Reglas de negocio
Misma estructura que una receta normal (Receta), con urgenciaId que la liga a la urgencia y consultaId vacío.
Prioridad de dispensación (3 niveles cerrados): inmediata (rojo), urgente (ámbar), normal (azul). Default: inmediata.
Medicamentos solo desde catálogo (searchMedicamentos), nunca texto libre. Búsqueda activa a partir de 2 caracteres.
Cada medicamento requiere: dosis (≤50 car.), frecuencia (≤50 car.), vía (catálogo cerrado viasAdministracion) y duración (≤50 car.). Indicaciones opcionales (≤500 car.).
Frecuencias sugeridas de urgencia: “Dosis única inmediata”, “Dosis única”, “c/6h PRN”, “c/8h”, “c/12h”, “c/24h”.
No se emite receta vacía: el botón “Emitir” está deshabilitado hasta agregar ≥1 medicamento.
Estado inicial activa. Se propaga a la lista global para que Farmacia la vea en su pestaña “Urgencias” ordenada por nivel de urgencia del paciente (rojo primero).

3. Farmacia (Dispensación)
3.1 Flujo
																Receta activa (consulta o urgencia) → Verificar stock → Dispensar → Cobro en Caja
																                                          │
																                                          ├── completa (stock suficiente) → receta = surtida
																                                          └── parcial (stock insuficiente) → receta = parcial + pendientes
3.2 Inventario (InventarioFarmacia)
Reglas de negocio:
Cada medicamento tiene stock y stock mínimo. stock <= stockMinimo ⇒ stock bajo (alerta visual y contador en cabecera).
stock === 0 ⇒ agotado (no dispensable; la cantidad queda pendiente).
Caducidad: si fechaCaducidad < 2026-12-01 se marca alerta “Caduca” en la línea de dispensación. Regla de control de caducidad (NOM-005/016).
Lote es obligatorio por medicamento (trazabilidad de dispensación).
Precio de venta (precioVenta) es el que se cobra; precioCosto es interno (margen).
Reglas por campo:

| Campo | Tipo | Obligatorio | Regla |
| medicamentoId | ref | Sí | Debe existir en catálogo |
| stock | número | Sí | ≥ 0 |
| stockMinimo | número | Sí | > 0 |
| precioCosto / precioVenta | número | Sí | precioVenta > precioCosto |
| lote | texto | Sí | Identificador de lote |
| fechaCaducidad | fecha | Sí | Futura respecto a hoy |
| ubicacion | texto | Sí | Estante/refrigerador/almacén |
| ultimoMovimiento | fecha | No | Se actualiza al dispensar |

3.3 Dispensación (DispensacionFarmacia)
Reglas de negocio:
Estados de dispensación (3): completada, parcial, cancelada.
Dispensación parcial por stock: la cantidad dispensada es min(cantidad_deseada, stock). Si deseada > stock, el faltante se registra como pendientes[] con cantidadPendiente.
La receta pasa a parcial si quedan pendientes; surtida si se dispensó todo.
Completar dispensación anterior: si la receta está parcial, el formulario muestra solo los pendientes previos para completarlos.
Cobro automático a Caja al dispensar: origen = farmacia, concepto “Medicamentos — {nombres}”, recibo FAR-.... Si es parcial, se registra nota “Dispensación parcial”.
Descuento: 0 ≤ descuento ≤ subtotal; total = subtotal - descuento.
Métodos de pago (4) como en Caja: efectivo, tarjeta, transferencia, mixto. mixto exige que efectivo + tarjeta + transferencia === total (±0.01) para habilitar el cobro.
No se puede dispensar si total ≤ 0, descuento > subtotal, no hay medicamentos dispensables, o el desglose mixto no cuadra (canDispense).
Folio secuencial: FAR-2026-{secuencial 4 dígitos} calculado sobre el conteo de dispensaciones.
Actualización de inventario: al dispensar, stock -= cantidad por medicamento y se actualiza ultimoMovimiento.
Reglas por campo:

| Campo | Tipo | Obligatorio | Regla |
| recetaId / consultaId | ref | Sí | Referencia a receta/consulta origen |
| patientId / patientName / patientExpediente | texto | Sí | Heredados de la receta |
| doctorName | texto | Sí | Médico prescriptor |
| medicamentos[] | lista | Sí | ≥ 1, cada uno con cantidad, precio y subtotal |
| subtotal / descuento / total | número | Sí | total = subtotal - descuento |
| metodoPago / detallePago | enum/objeto | Sí | Como Caja |
| estado | enum | Sí | completada/parcial/cancelada |
| reciboFolio | texto | Sí | Único y secuencial |
| pendientes[] | lista | No | Solo si parcial |

4. Hojas de Egreso (NOM-004 · Art. 6.3.7)
Normatividad y Seguridad
Convenciones transversales (aplican a toda la fase)

| Convención | Regla |
| Marco legal | LFPDPPP + su Reglamento (privacidad/ARCO), NOM-004-SSA3-2012 (expediente), NOM-024-SSA3-2012 (expediente electrónico), NOM-016-SSA3-2012 (equipamiento), NOM-005-SSA3-2018 (infraestructura), NOM-017-SSA2-2012 (vigilancia), NOM-087-SEMARNAT (RPBI), Reglamento LGSS/COFEPRIS. |
| Identificadores | Consentimiento ci-{patientId}-{n}, solicitud ARCO arco-{patientId}-{n}, caso vigilancia ve-{patientId}-{n}, referencia ref/contra-{patientId}-{base36}, certificado cm-{n}. Internos. |
| Folios públicos | Certificado CM-{año}-{4 dígitos} (secuencial). |
| Firma | Toda firma es electrónica (FirmaDigital): imagen cargada por médico o, si no existe, línea de firma manual en el reporte. La firma del paciente en consentimientos/egresos queda pendiente hasta la firma física. |
| Sin borrado físico | Consentimientos, ARCO, referencias y vigilancia no se eliminan; cambian de estado (revocado, cancelada, descartado). |
| Trazabilidad | Todo acto sensible (consentir, ARCO, referir, notificar, dispensar) registra quién, cuándo y sobre qué paciente. |
| Persistencia de documentos | Adjuntos de pacientes se guardan en IndexedDB (local), no en backend. |

1. Control de Acceso (RBAC)
1.1 Roles del sistema (8 catálogo cerrado)

| Rol | Código | Descripción |
| Administrador | admin | Acceso total + seguridad + auditoría |
| Médico | medico | Clínico completo, prescripción, urgencias |
| Recepción | recepcion | Agenda, pacientes, llegadas |
| Enfermería | enfermeria | Triage, signos vitales, notas |
| Caja y Cobros | caja | Cobros, corte, facturación |
| Farmacia | farmacia | Dispensación, recetas, estudios |
| Laboratorio | laboratorio | Estudios, resultados |
| Directivo | directivo | Supervisión, reportes, auditoría |

1.2 Reglas de negocio
Doble capa de permisos: control a nivel ruta (roleRoutes, qué páginas puede abrir) y a nivel funcionalidad (rolePermissions, qué acciones puede ejecutar dentro de la UI).
Acceso por ruta: canAccessRoute(rol, path) retorna false si el usuario no autenticado o la ruta no está en su lista. Las rutas con sufijo / (p. ej. /app/pacientes/, /app/normatividad/) usan prefijo (startsWith), las demás igualdad exacta o startsWith(r + '/').
Principio de menor privilegio: recepción, enfermería, caja, farmacia y laboratorio no pueden crear consultas, administrar usuarios ni ver auditoría. Solo admin y directivo administran usuarios/catálogos y ven auditoría.
admin y directivo son los únicos con acceso a hl7-fhir, reportes, seguridad/roles, seguridad/auditoria y todos los módulos de normatividad/.
Rol anónimo (null): getPermissions(null) retorna todos los permisos en false (bloqueo total por defecto).
directivo es de solo lectura clínica: no crea/edita pacientes, consultas, recetas, triage ni urgencias; solo canAdminUsers, canAdminMedicos, canAdminCatalogos, canVerAuditoria, canVerEstadisticas y canExportar en true.
caja puede exportar (canExportar: true) además de cobrar/cerrar caja; medico y directivo también exportan.
El médico no puede cobrar ni administrar (canCobrar: false, canAdminUsers: false), pero sí atender urgencias y editar triage.
1.3 Matriz de permisos funcionales (resumen)
| Permiso | admin | medico | recepción | enfermería | caja | farmacia | laboratorio | directivo |
|—|—|:–:|:–:|:–:|:–:|:–:|:–:|:–:|:–:|
| Crear paciente | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Eliminar paciente | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Crear consulta | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Crear receta | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Dispensar | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Cobrar | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Cerrar caja | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Editar triage | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Atender urgencia | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Ver auditoría | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Ver estadísticas | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Exportar | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |
1.4 Autenticación (sesión)
Sesión persistida en localStorage (medicore_auth_user), con sincronización entre pestañas vía evento storage.
Solo usuarios con status === 'activo' pueden iniciar sesión; inactivo/bloqueado no autentican.
login(email, password) es sensible a mayúsculas en el password pero insensible en el email (toLowerCase()). Devuelve null si falla (no revela cuál dato falló).
loginAs(userId) permite cambiar de usuario (modo demo) siempre que el usuario destino esté activo.
logout() limpia usuario y sucursal, y borra ambas claves de localStorage.
Sucursal por defecto: al autenticar se asigna la primera sucursalIds del usuario (o la última guardada si sigue siendo válida). El usuario solo opera en sucursales asignadas.
Sincronización cross-tab: si se cierra sesión en una pestaña, el evento storage desloguea las demás.

2. Auditoría
2.1 Flujo
																Evento (login, crear, editar, eliminar, cobrar, corte, exportar) → Registro de auditoría
																→ Filtrado/sorteo/paginación → Exportar
2.2 Reglas de negocio
Registro inmutable (AuditLog): usuario, rol, acción, módulo, detalle, resultado, IP y fecha/hora. No se edita ni elimina.
Resultado en 3 valores cerrados: exito, error, advertencia. Un intento fallido de login o una operación no autorizada se registra como error/advertencia.
Cobertura de eventos sensibles: inicio/cierre de sesión (con Desconocido si el login falla), acceso a expediente (Ver), creación/edición/eliminación, cobros, cortes, exportación de reportes.
Trazabilidad de autenticación: los intentos fallidos registran el email atacado y la IP de origen, no datos sensibles adicionales.
Filtros: por módulo, acción, resultado y búsqueda libre. Ordenable por fecha, usuario, acción, módulo, resultado e IP. Paginación a 12 registros.
Solo admin y directivo tienen acceso al módulo (regla RBAC §1.2).
2.3 Reglas por campo

| Campo | Tipo | Obligatorio | Regla |
| usuario | texto | Sí | Nombre real o “Desconocido” |
| rol | enum | Sí | Del catálogo de 8 roles |
| accion | enum | Sí | Iniciar sesión / Cerrar sesión / Ver / Crear / Editar / Eliminar / Cancelar / Registrar / Cobrar / Corte / Solicitar / Exportar |
| modulo | texto | Sí | Módulo origen |
| detalle | texto | Sí | Descripción con expediente/objeto afectado |
| resultado | enum | Sí | exito / error / advertencia |
| ip | texto | Sí | Dirección IPv4 |
| fecha | datetime | Sí | Formato YYYY-MM-DD HH:mm |

3. HL7-FHIR (Interoperabilidad)
3.1 Reglas de negocio
Versiones FHIR soportadas (3): R4 (4.0.1), R4B (4.3.0), R5 (5.0.0).
Recursos FHIR soportados (12): Patient, Observation, DiagnosticReport, MedicationRequest, Encounter, Condition, AllergyIntolerance, Immunization, Procedure, Practitioner, Organization, Bundle.
Operaciones (6): create (POST), update (PUT), read (GET), search (GET), delete (DELETE), transaction (Bundle atómico).
Servidores FHIR con tipo de autenticación (none, basic, bearer, apikey). Un servidor es isDefault y está enabled para ser el destino por defecto.
Mensajes con dirección (outbound/inbound) y estado (pending, sent, received, error, acked).
Regla de dependencia: un DiagnosticReport enviado antes de sincronizar su Patient de referencia produce error 422 (Patient reference not found). El log recomienda “sincronizar paciente antes de enviar reportes”.
Perfiles de mapeo (FhirResourceProfile): cada recurso declara mapeoCampos con campoFhir, campoLocal y requerido. Los campos requerido: true deben estar presentes para emitir el recurso.
Codificación estándar: LOINC (signos/lab), WHO-ATC (medicamentos), SNOMED CT (diagnósticos/encuentros), HL7 actCode (clase de encuentro AMB/EMER/IMP).
Correlación: todo mensaje lleva correlationId para rastrear la transacción extremo a extremo en los logs.
Log de transmisión con 4 niveles (info, warning, error, debug).
3.2 Perfiles de mapeo (campos requeridos)

| Perfil | Campo FHIR requerido | Campo local |
| MX-Patient | identifier[0].value | expediente |
| MX-Patient | name[0].family, name[0].given[0] | apellidos, nombre |
| MX-Patient | gender, birthDate | genero, fechaNacimiento |
| MX-VitalSigns | code.coding[0].code (LOINC), valueQuantity.value/unit | tipoSigno, valor, unidad |
| MX-VitalSigns | subject.reference | patientId |
| MX-Receta | medicationCodeableConcept.coding[0].code (ATC) | medicamentoId |
| MX-Receta | subject.reference, requester.reference | patientId, doctorId |
| MX-Receta | dosageInstruction[0].text, authoredOn | indicaciones, fecha |
| MX-LabReport | code.coding[0].code (LOINC), subject.reference | estudioCatalogoId, patientId |
| MX-Encounter | class.code, subject.reference, participant[0].individual.reference, period.start | tipo, patientId, doctorId, fecha+hora |

4. Consentimientos Informados (NOM-004 / LFPDPPP)
4.1 Flujo
																Alta/atención → Crear consentimiento (plantilla por tipo) → Pendiente → Firmado
