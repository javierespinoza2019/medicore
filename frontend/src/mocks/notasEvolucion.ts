export type Pronostico = 'bueno' | 'reservado' | 'malo';

export interface ResultadoEstudioEvolucion {
  id: string;
  nombre: string;
  resultado: string;
  fecha: string;
}

export interface SignosVitalesEvolucion {
  temperatura: string;
  presionSistolica: string;
  presionDiastolica: string;
  frecuenciaCardiaca: string;
  frecuenciaRespiratoria: string;
  saturacionOxigeno: string;
  peso: string;
  talla: string;
  glucosa: string;
}

export interface NotaEvolucion {
  id: string;
  consultaId: string;
  patientId: string;
  fecha: string;
  hora: string;
  medico: string;
  medicoCedula: string;
  signosVitales: SignosVitalesEvolucion;
  evolucionSubjetiva: string;
  evolucionObjetiva: string;
  resultadosEstudios: ResultadoEstudioEvolucion[];
  diagnosticoPrincipal: string;
  diagnosticosSecundarios: string[];
  tratamientoIndicaciones: string;
  pronostico: Pronostico;
  observaciones: string;
}

export const notasEvolucionData: NotaEvolucion[] = [
  {
    id: 'ne-p5-001',
    consultaId: 'con-p5-001',
    patientId: 'p5',
    fecha: '2026-08-20',
    hora: '10:40',
    medico: 'Dr. Alejandro García Mendoza',
    medicoCedula: 'CED-09876543',
    signosVitales: {
      temperatura: '36.6',
      presionSistolica: '130',
      presionDiastolica: '85',
      frecuenciaCardiaca: '80',
      frecuenciaRespiratoria: '16',
      saturacionOxigeno: '97',
      peso: '84',
      talla: '1.72',
      glucosa: '198',
    },
    evolucionSubjetiva: 'Paciente masculino de 55 años con DM2 de 8 años de evolución, acude a control. Refiere haber retomado la aplicación de insulina tras el ajuste previo, con mejoría parcial de la visión borrosa y el mareo. Persiste poliuria ocasional y sed intensa en las tardes. Niega hipoglucemias, dolor torácico o disnea. Refiere apego irregular a la dieta y automonitoreo inconsistente.',
    evolucionObjetiva: 'Consciente, orientado, hidratado. Mucosas ligeramente secas. Tórax con campos pulmonares limpios. Ruidos cardíacos rítmicos sin soplos. Abdomen blando, depresible. Extremidades con sensibilidad conservada y pulsos presentes; no se observan lesiones en pies. IMC 28.4 kg/m² (sobrepeso).',
    resultadosEstudios: [
      { id: 're-p5-1', nombre: 'Glucosa capilar', resultado: '198 mg/dL (ayuno)', fecha: '2026-08-20' },
      { id: 're-p5-2', nombre: 'HbA1c', resultado: '8.6% (descontrol metabólico)', fecha: '2026-08-08' },
    ],
    diagnosticoPrincipal: 'E11.9 - Diabetes mellitus tipo 2 sin complicaciones',
    diagnosticosSecundarios: ['E66 - Sobrepeso', 'Z91.1 - Falta de adherencia terapéutica'],
    tratamientoIndicaciones: '1. Ajustar dosis de insulina NPH e insulina rápida según esquema. 2. Solicitar perfil de lípidos y microalbuminuria. 3. Reforzar automonitoreo de glucosa (3 veces/día). 4. Enviar a nutrición para plan alimentario individualizado. 5. Control en 4 semanas con bitácora de glucosas.',
    pronostico: 'reservado',
    observaciones: 'Se refuerza técnica de aplicación de insulina y se programa taller de educación en diabetes. Paciente acepta derivación a nutrición.',
  },
  {
    id: 'ne-p6-001',
    consultaId: 'con-p6-001',
    patientId: 'p6',
    fecha: '2026-08-20',
    hora: '11:20',
    medico: 'Dra. Patricia Mendoza Ríos',
    medicoCedula: 'CED-08765432',
    signosVitales: {
      temperatura: '36.8',
      presionSistolica: '',
      presionDiastolica: '',
      frecuenciaCardiaca: '104',
      frecuenciaRespiratoria: '26',
      saturacionOxigeno: '94',
      peso: '24',
      talla: '1.22',
      glucosa: '',
    },
    evolucionSubjetiva: 'Paciente femenina de 7 años con asma bronquial conocida, acude por crisis leve tras exposición a polvo en el colegio. Madre refiere tos seca persistente y sibilancias audibles desde hace 24 horas, con mejoría parcial tras salbutamol en casa. Sin fiebre, sin cianosis, tolera vía oral.',
    evolucionObjetiva: 'Niña consciente, reactiva, cooperadora. Tiraje intercostal leve. Auscultación con sibilancias espiratorias bilaterales, sin estertores. SpO₂ 94% al aire ambiente, mejora a 97% tras nebulización. Faringe normal, oídos sin alteraciones. Sin cianosis peribucal.',
    resultadosEstudios: [
      { id: 're-p6-1', nombre: 'Oximetría de pulso', resultado: '94% pre-nebulización / 97% post', fecha: '2026-08-20' },
    ],
    diagnosticoPrincipal: 'J45.9 - Asma no especificada',
    diagnosticosSecundarios: ['J30 - Rinitis alérgica'],
    tratamientoIndicaciones: '1. Salbutamol inhalado 100 mcg, 2 inhalaciones cada 4-6 hrs por 3 días. 2. Continuar corticoide inhalado de mantenimiento (budesonida). 3. Evitar desencadenantes identificados (polvo, cambios de temperatura). 4. Revalorar en 48 hrs si no hay mejoría o aparece dificultad respiratoria.',
    pronostico: 'bueno',
    observaciones: 'Se enseña a la madre técnica correcta de inhalación con espaciador y se entrega plan de acción por escrito para crisis.',
  },
  {
    id: 'ne-p9-001',
    consultaId: 'con-p9-001',
    patientId: 'p9',
    fecha: '2026-08-20',
    hora: '12:10',
    medico: 'Dr. Alejandro García Mendoza',
    medicoCedula: 'CED-09876543',
    signosVitales: {
      temperatura: '36.4',
      presionSistolica: '150',
      presionDiastolica: '95',
      frecuenciaCardiaca: '98',
      frecuenciaRespiratoria: '22',
      saturacionOxigeno: '95',
      peso: '78',
      talla: '1.70',
      glucosa: '',
    },
    evolucionSubjetiva: 'Paciente masculino de 61 años con antecedente de IAM en 2023 y stent coronario, refiere dolor precordial opresivo de 40 minutos de evolución, irradiado a mandíbula, acompañado de diaforesis y sensación de muerte inminente. El dolor no cede por completo con reposo. Niega disnea franca o síncope.',
    evolucionObjetiva: 'Paciente diaforético, con facies de dolor, consciente y orientado. PA 150/95 mmHg, FC 98 lpm, FR 22 rpm, SpO₂ 95% al aire ambiente. Ruidos cardíacos rítmicos, sin soplos ni galope. Campos pulmonares con adecuada entrada de aire. Abdomen blando. Electrocardiograma en proceso de interpretación.',
    resultadosEstudios: [
      { id: 're-p9-1', nombre: 'Electrocardiograma (12 derivaciones)', resultado: 'En proceso de interpretación', fecha: '2026-08-20' },
      { id: 're-p9-2', nombre: 'Troponina I', resultado: 'Solicitada (pendiente de resultado)', fecha: '2026-08-20' },
    ],
    diagnosticoPrincipal: 'I20.0 - Angina inestable',
    diagnosticosSecundarios: ['Z95.1 - Portador de stent coronario', 'Z86.7 - Antecedente de infarto agudo al miocardio'],
    tratamientoIndicaciones: '1. Manejo de síndrome coronario agudo según protocolo. 2. Administración de AAS y nitroglicerina sublingual (si no hay contraindicación). 3. Marcadores de daño miocárdico seriados. 4. Valoración urgente por cardiología. 5. Monitorización continua.',
    pronostico: 'reservado',
    observaciones: 'Se activa código de cardiología. Paciente permanece en monitoreo continuo con vigilancia estrecha de signos vitales.',
  },
  {
    id: 'ne-p7-001',
    consultaId: 'con-p7-001',
    patientId: 'p7',
    fecha: '2026-08-20',
    hora: '11:45',
    medico: 'Dr. Fernando Castillo Vega',
    medicoCedula: 'CED-05432109',
    signosVitales: {
      temperatura: '36.7',
      presionSistolica: '138',
      presionDiastolica: '88',
      frecuenciaCardiaca: '82',
      frecuenciaRespiratoria: '24',
      saturacionOxigeno: '88',
      peso: '82',
      talla: '1.78',
      glucosa: '102',
    },
    evolucionSubjetiva: 'Paciente masculino de 71 años con EPOC Gold B conocida, acude por exacerbación aguda con disnea progresiva de 3 días de evolución. Refiere aumento de expectoración amarillo-verdosa y fiebre de 37.8°C. Niega hemoptisis ni dolor torácico pleurítico.',
    evolucionObjetiva: 'Paciente consciente, orientado, en posición de ortopnea. Díspnea en reposo, uso de músculos accesorios. Cianosis peribucal leve. Auscultación con disminución de murmullo vesicular bilateral y estertores crepitantes en bases. SpO₂ 88% al aire ambiente, mejora a 92% con oxígeno suplementario 2L/min.',
    resultadosEstudios: [
      { id: 're-p7-1', nombre: 'Radiografía de tórax PA', resultado: 'Hiperinsuflación pulmonar con signos de bronquitis crónica. Sin infiltrados alveolares.', fecha: '2026-08-20' },
      { id: 're-p7-2', nombre: 'Gasometría arterial', resultado: 'pH 7.38, pCO₂ 48, pO₂ 58, HCO₃ 28. Hipoxemia sin hipercapnia severa.', fecha: '2026-08-20' },
    ],
    diagnosticoPrincipal: 'J44.1 - EPOC con exacerbación aguda',
    diagnosticosSecundarios: ['J96.0 - Insuficiencia respiratoria tipo I', 'J20.9 - Bronquitis aguda no especificada'],
    tratamientoIndicaciones: '1. Oxígeno suplementario 2-4 L/min (mantener SpO₂ 88-92%). 2. Salbutamol nebulizado cada 4 hrs + ipratropio bromuro nebulizado. 3. Prednisona 40mg VO c/24h por 5 días. 4. Amoxicilina-clavulánico 875/125mg c/12h por 7 días. 5. Se coordina valoración por neumología.',
    pronostico: 'reservado',
    observaciones: 'Paciente con EPOC de evolución conocida, requiere hospitalización por exacerbación aguda con insuficiencia respiratoria. Se coordina traslado a hospital de segundo nivel.',
  },
  {
    id: 'ne-p8-001',
    consultaId: 'con-p8-001',
    patientId: 'p8',
    fecha: '2026-08-20',
    hora: '09:50',
    medico: 'Dra. Gabriela Herrera López',
    medicoCedula: 'CED-06543210',
    signosVitales: {
      temperatura: '36.5',
      presionSistolica: '110',
      presionDiastolica: '70',
      frecuenciaCardiaca: '88',
      frecuenciaRespiratoria: '18',
      saturacionOxigeno: '98',
      peso: '66',
      talla: '1.62',
      glucosa: '82',
    },
    evolucionSubjetiva: 'Paciente femenina de 28 años con embarazo de 28 semanas, acude a control prenatal de rutina. Refiere buena evolución, movimientos fetales presentes y regulares. Niega sangrado vaginal, dolor abdominal, cefalea o alteraciones visuales. Buena tolerancia al plan de suplementos.',
    evolucionObjetiva: 'Paciente con buen estado general. Abdomen con altura uterina de 28 cm, acorde a edad gestacional. FCF 140 lpm, rítmico. Sin edema en extremidades inferiores. Reflejos osteotendinosos normales. Fondo de ojo sin alteraciones.',
    resultadosEstudios: [
      { id: 're-p8-1', nombre: 'Biometría hemática', resultado: 'Hb 11.2 g/dL (ligera anemia fisiológica), leucocitos normales.', fecha: '2026-08-20' },
      { id: 're-p8-2', nombre: 'Glucosa en ayuno', resultado: '82 mg/dL (normal)', fecha: '2026-08-20' },
    ],
    diagnosticoPrincipal: 'Z34.0 - Supervisión de primer embarazo normal',
    diagnosticosSecundarios: ['O25.9 - Ganancia de peso excesiva en el embarazo'],
    tratamientoIndicaciones: '1. Continuar suplemento de ácido fólico + hierro. 2. Solicitar ultrasonido de crecimiento fetal a las 32 semanas. 3. Control glicémico trimestral. 4. Cita de control en 4 semanas. 5. Iniciar curso de preparación para el parto.',
    pronostico: 'bueno',
    observaciones: 'Embarazo de bajo riesgo con buena evolución. Se indica esquema de vacunación antitetánica y antiinfluenza. Paciente acepta derivación a curso de preparación para el parto.',
  },
  {
    id: 'ne-p10-001',
    consultaId: 'con-p10-001',
    patientId: 'p10',
    fecha: '2026-08-20',
    hora: '11:35',
    medico: 'Dr. Eduardo Ponce León',
    medicoCedula: 'CED-01234567',
    signosVitales: {
      temperatura: '36.6',
      presionSistolica: '118',
      presionDiastolica: '76',
      frecuenciaCardiaca: '72',
      frecuenciaRespiratoria: '16',
      saturacionOxigeno: '99',
      peso: '58',
      talla: '1.63',
      glucosa: '90',
    },
    evolucionSubjetiva: 'Paciente femenina de 34 años con dermatitis atópica crónica, acude por brote de 5 días de evolución. Refiere prurito intenso que interrumpe el sueño, especialmente en pliegues antecubitales y poplíteos. Relata haber usado cremas esteroideas de venta libre con mejoría parcial. Niega fiebre, vesículas o secreción purulenta en lesiones.',
    evolucionObjetiva: 'Paciente consciente, orientada. Piel con lesiones eritemato-descamativas en pliegues antecubitales bilaterales y poplíteos. Algunas lesiones con excoriaciones secundarias al rascado. Sin costras hemáticas ni signos de sobreinfección bacteriana. Resto de la piel con xerosis leve generalizada.',
    resultadosEstudios: [
      { id: 're-p10-1', nombre: 'Cultivo de piel', resultado: 'No realizado (sin signos de sobreinfección)', fecha: '2026-08-20' },
    ],
    diagnosticoPrincipal: 'L20.9 - Dermatitis atópica no especificada',
    diagnosticosSecundarios: ['B37.9 - Candidiasis no especificada (sospecha en pliegues)'],
    tratamientoIndicaciones: '1. Betametasona dipropionato 0.05% crema en pliegues c/12h por 7 días, luego descenso gradual. 2. Emoliente con urea 10% en todo el cuerpo 2 veces al día. 3. Loratadina 10mg c/24h por prurito. 4. Evitar jabones perfumados y agua muy caliente. 5. Control en 2 semanas.',
    pronostico: 'bueno',
    observaciones: 'Se refuerza la técnica de aplicación de esteroide (cantidad equivalente a una yema de dedo para área de dos palmas). Se proporciona guía escrita de cuidados de la piel atópica.',
  },
  {
    id: 'ne-p11-001',
    consultaId: 'con-p11-001',
    patientId: 'p11',
    fecha: '2026-08-20',
    hora: '11:55',
    medico: 'Dr. Alejandro García Mendoza',
    medicoCedula: 'CED-09876543',
    signosVitales: {
      temperatura: '36.4',
      presionSistolica: '128',
      presionDiastolica: '82',
      frecuenciaCardiaca: '96',
      frecuenciaRespiratoria: '20',
      saturacionOxigeno: '98',
      peso: '74',
      talla: '1.75',
      glucosa: '92',
    },
    evolucionSubjetiva: 'Paciente masculino de 41 años con trastorno de ansiedad generalizada diagnosticado en 2022, acude por crisis de ansiedad de 2 horas de evolución. Refiere palpitaciones, sensación de falta de aire, temblores y sensación de mareo. Niega dolor torácico opresivo, náuseas o sudoración profusa. El episodio inició tras discusión laboral.',
    evolucionObjetiva: 'Paciente consciente, orientado. TAquicardia leve (FC 96). Exploración cardiopulmonar sin hallazgos patológicos. Sin desviación de tráquea. Abdomen blando. Extremidades sin edema ni cianosis. Exploración neurológica sin focalización.',
    resultadosEstudios: [
      { id: 're-p11-1', nombre: 'Electrocardiograma', resultado: 'Ritmo sinusal, FC 96 lpm, sin alteraciones de repolarización.', fecha: '2026-08-20' },
    ],
    diagnosticoPrincipal: 'F41.1 - Trastorno de ansiedad generalizada',
    diagnosticosSecundarios: ['F43.2 - Reacción de adaptación', 'R55 - Síncope y colapso (descartado)'],
    tratamientoIndicaciones: '1. Continuar sertralina 50mg c/24h (ajustar a 100mg si persisten crisis). 2. Lorazepam 0.5mg SOS en crisis (máximo 1 vez/día, no más de 3 días consecutivos). 3. Terapia cognitivo-conductual semanal. 4. Técnicas de relajación diaphragmática y mindfulness. 5. Control en 2 semanas.',
    pronostico: 'bueno',
    observaciones: 'Se descarta origen orgánico de los síntomas tras ECG normal y exploración física. Se refuerza la importancia de la terapia cognitivo-conductual como pilar del tratamiento.',
  },
  {
    id: 'ne-p12-001',
    consultaId: 'con-p12-001',
    patientId: 'p12',
    fecha: '2026-08-20',
    hora: '08:35',
    medico: 'Dr. Fernando Castillo Vega',
    medicoCedula: 'CED-05432109',
    signosVitales: {
      temperatura: '36.5',
      presionSistolica: '132',
      presionDiastolica: '86',
      frecuenciaCardiaca: '80',
      frecuenciaRespiratoria: '17',
      saturacionOxigeno: '97',
      peso: '72',
      talla: '1.60',
      glucosa: '110',
    },
    evolucionSubjetiva: 'Paciente femenina de 47 años con gonartrosis bilateral conocida desde 2021, acude por dolor e inflamación en ambas rodillas que limita la marcha de 2 semanas. Refiere haber suspendido ejercicios de fisioterapia por 1 semana por molestias previas. Niega fiebre, trauma o bloqueo articular. El dolor mejora parcialmente con AINEs.',
    evolucionObjetiva: 'Deambula con ligera cojera bilateral. Rodillas con edema leve periarticular, calor localizado, dolor a la palpación de línea articular y crepitación a la flexión. Rango de movimiento: flexión 110° (limitada por dolor), extensión completa. Sin bloqueo articular. Ligamentos colaterales y cruzados sin laxitud.',
    resultadosEstudios: [
      { id: 're-p12-1', nombre: 'Radiografía AP y lateral de rodillas', resultado: 'Estrechamiento articular medial bilateral, osteofitos marginales, esclerosis subcondral grado II-III (Kellgren-Lawrence).', fecha: '2026-08-20' },
    ],
    diagnosticoPrincipal: 'M17.1 - Gonartrosis bilateral primaria',
    diagnosticosSecundarios: ['E66.3 - Sobrepeso como factor de riesgo', 'M25.5 - Dolor articular'],
    tratamientoIndicaciones: '1. Meloxicam 15mg c/24h por 10 días (con protección gástrica). 2. Reanudar fisioterapia (fortalecimiento cuádriceps, ejercicios en cadena cerrada). 3. Bajar 5 kg de peso. 4. Uso de rodillera elástica en actividades de carga. 5. Valoración por ortopedia si no mejora en 4 semanas.',
    pronostico: 'bueno',
    observaciones: 'Paciente con gonartrosis en progresión moderada. Se enfatiza la importancia del control de peso y ejercicio regular como medidas fundamentales.',
  },
  {
    id: 'ne-p14-001',
    consultaId: 'con-p14-001',
    patientId: 'p14',
    fecha: '2026-08-20',
    hora: '10:25',
    medico: 'Dr. Fernando Castillo Vega',
    medicoCedula: 'CED-05432109',
    signosVitales: {
      temperatura: '36.3',
      presionSistolica: '98',
      presionDiastolica: '62',
      frecuenciaCardiaca: '88',
      frecuenciaRespiratoria: '18',
      saturacionOxigeno: '94',
      peso: '54',
      talla: '1.55',
      glucosa: '110',
    },
    evolucionSubjetiva: 'Paciente femenina de 66 años con insuficiencia renal crónica etapa 5 en hemodiálisis desde 2022, acude por malestar general, hipotensión ortostática y calambres musculares tras última sesión de diálisis de ayer. Refiere náusea leve y disminución del apetito. Niega fiebre, dolor torácico o disnea.',
    evolucionObjetiva: 'Paciente consciente, orientada, con mucosas secas. PA 98/62 mmHg (hipotensión ortostática), FC 88 lpm. Sin edema en extremidades. Sin ruidos cardíacos patológicos ni estertores pulmonares. Abdomen blando. Calambres en muslos al movimiento.',
    resultadosEstudios: [
      { id: 're-p14-1', nombre: 'Ionograma sérico', resultado: 'Na 138, K 4.8, Cl 102. Leve hiperpotasemia.', fecha: '2026-08-20' },
      { id: 're-p14-2', nombre: 'Biometría hemática', resultado: 'Hb 9.2 g/dL, Hto 28%, plaquetas 145,000. Anemia crónica estable.', fecha: '2026-08-20' },
    ],
    diagnosticoPrincipal: 'N18.5 - Enfermedad renal crónica etapa 5',
    diagnosticosSecundarios: ['E86.2 - Hipovolemia por ultrafiltración excesiva', 'E87.5 - Hiperpotasemia leve'],
    tratamientoIndicaciones: '1. Hidratación oral controlada (500 mL en 2 horas, monitorear ingesta-egesta). 2. Ajustar peso seco en próxima diálisis (aumentar 0.5 kg). 3. Restringir potasio en dieta (< 2g/día). 4. Reposo con extremidades elevadas. 5. Coordina con nefrología para ajuste de esquema de diálisis.',
    pronostico: 'reservado',
    observaciones: 'Paciente con IRC etapa 5 que presenta complicaciones post-diálisis recurrentes. Se sugiere evaluar modalidad de diálisis peritoneal como alterna.',
  },
  {
    id: 'ne-p17-001',
    consultaId: 'con-p17-001',
    patientId: 'p17',
    fecha: '2026-08-20',
    hora: '12:30',
    medico: 'Dr. Fernando Castillo Vega',
    medicoCedula: 'CED-05432109',
    signosVitales: {
      temperatura: '36.4',
      presionSistolica: '128',
      presionDiastolica: '78',
      frecuenciaCardiaca: '78',
      frecuenciaRespiratoria: '16',
      saturacionOxigeno: '99',
      peso: '78',
      talla: '1.78',
      glucosa: '95',
    },
    evolucionSubjetiva: 'Paciente masculino de 39 años con esguince de tobillo derecho por inversión forzada mientras jugaba fútbol. Refiere dolor intenso (7/10 EVA), edema inmediato e imposibilidad para apoyar el pie. Niega deformidad, crepitación o sensación de inestabilidad articular previa.',
    evolucionObjetiva: 'Tobillo derecho con edema moderado, eritema localizado y dolor a la palpación del ligamento lateral externo (ATF). Sin deformidad ni signos de fractura a la inspección. Pulso pedio conservado y simétrico. Sensibilidad distal conservada. Dolor a la inversión forzada pero no a la eversión.',
    resultadosEstudios: [
      { id: 're-p17-1', nombre: 'Radiografía AP, lateral y oblicua de tobillo', resultado: 'Sin signos de fractura ni luxación. Huesos con alineación anatómica conservada.', fecha: '2026-08-20' },
      { id: 're-p17-2', nombre: 'Test de Ottawa', resultado: 'Negativo (no requiere radiografía por criterios, pero se solicitó por dolor intenso).', fecha: '2026-08-20' },
    ],
    diagnosticoPrincipal: 'S93.4 - Esguince de tobillo grado II (ligamento talofibular anterior)',
    diagnosticosSecundarios: ['M25.5 - Dolor articular', 'S00.8 - Edema localizado'],
    tratamientoIndicaciones: '1. RICE: reposo, hielo 15 min c/2h, compresión con vendaje elástico, elevación. 2. Naproxeno 250mg c/12h por 5 días. 3. Vendaje elástico en ocho. 4. Descarga con muletas por 48-72h. 5. Iniciar movilización activa progresiva a las 72h. 6. Fisioterapia a la semana 2. 7. Revalorar en 1 semana.',
    pronostico: 'bueno',
    observaciones: 'Radiografía descarta fractura. Esguince grado II con buen pronóstico funcional. Se entrega guía de rehabilitación en casa.',
  },
  {
    id: 'ne-p18-001',
    consultaId: 'con-p18-001',
    patientId: 'p18',
    fecha: '2026-08-20',
    hora: '09:35',
    medico: 'Dra. Patricia Mendoza Ríos',
    medicoCedula: 'CED-08765432',
    signosVitales: {
      temperatura: '39.2',
      presionSistolica: '95',
      presionDiastolica: '60',
      frecuenciaCardiaca: '120',
      frecuenciaRespiratoria: '24',
      saturacionOxigeno: '96',
      peso: '16',
      talla: '1.05',
      glucosa: '105',
    },
    evolucionSubjetiva: 'Paciente masculino de 4 años con fiebre de 39.8°C de 2 días de evolución, irritabilidad y rechazo a la vía oral. Madre refiere tos seca no productiva, rinorrea clara y que el niño se queja de dolor al tragar. Niega erupción cutánea, convulsiones o letargo.',
    evolucionObjetiva: 'Niño con facies febril, irritable pero consolable. Faringe hiperémica con amígdalas aumentadas de tamaño y exudado purulento blanquecino bilateral. Adenopatías cervicales anteriores bilaterales, dolorosas y móviles. Tímpanos normales. Sin dificultad respiratoria. Abdomen blando.',
    resultadosEstudios: [
      { id: 're-p18-1', nombre: 'Frotis faríngeo con cultivo', resultado: 'Solicitado. Se sospecha etiología estreptocócica por exudado y adenopatías.', fecha: '2026-08-20' },
      { id: 're-p18-2', nombre: 'Biometría hemática', resultado: 'Leucocitos 14,200 (neutrofilos 72%), VSG elevada. Patrón compatible con infección bacteriana.', fecha: '2026-08-20' },
    ],
    diagnosticoPrincipal: 'J03.90 - Amigdalitis aguda, no especificada (sospecha estreptocócica)',
    diagnosticosSecundarios: ['R50.9 - Fiebre de origen infeccioso', 'R06.2 - Disnea (leve, por fiebre)'],
    tratamientoIndicaciones: '1. Paracetamol 160mg c/6h (15mg/kg/dosis) por fiebre y dolor. 2. Amoxicilina 400mg/5mL, 7.5mL c/12h por 10 días (sospecha estreptocócica). 3. Hidratación oral forzada (suero oral o agua con electrolitos). 4. Alimentación blanda y fría. 5. Reposo. 6. Control de cultivo faríngeo a los 7 días.',
    pronostico: 'bueno',
    observaciones: 'Se explica a la madre la importancia de completar los 10 días de antibiótico aunque el niño mejore antes. Se descarta complicaciones actuales (sin otitis media, sin escarlatina).',
  },
  {
    id: 'ne-p20-001',
    consultaId: 'con-p20-001',
    patientId: 'p20',
    fecha: '2026-08-20',
    hora: '10:18',
    medico: 'Dr. Fernando Castillo Vega',
    medicoCedula: 'CED-05432109',
    signosVitales: {
      temperatura: '37.4',
      presionSistolica: '110',
      presionDiastolica: '70',
      frecuenciaCardiaca: '92',
      frecuenciaRespiratoria: '18',
      saturacionOxigeno: '98',
      peso: '68',
      talla: '1.72',
      glucosa: '88',
    },
    evolucionSubjetiva: 'Paciente masculino de 29 años con cuadro de gastroenteritis aguda de 12 horas de evolución. Refiere vómito en 3 ocasiones, diarrea acuosa sin sangre en 8 evacuaciones, dolor abdominal cólico difuso y náusea persistente. Relata consumo de mariscos en restaurante el día previo. Niega fiebre alta, sangre en heces ni viajes recientes.',
    evolucionObjetiva: 'Paciente consciente, orientado. Mucosas ligeramente secas (deshidratación leve). PA 110/70 mmHg, FC 92 lpm. Abdomen blando, depresible, doloroso a la palpación difusa sin signos de irritación peritoneal. Ruidos hidroaéreos aumentados. Sin masas ni visceromegalias.',
    resultadosEstudios: [
      { id: 're-p20-1', nombre: 'Coproparasitoscópico', resultado: 'Solicitado. Pendiente de resultado.', fecha: '2026-08-20' },
      { id: 're-p20-2', nombre: 'Cultivo de heces', resultado: 'Solicitado. Se sospecha etiología bacteriana por antecedente alimentario.', fecha: '2026-08-20' },
    ],
    diagnosticoPrincipal: 'A09 - Gastroenteritis de presunto origen infeccioso',
    diagnosticosSecundarios: ['E86.0 - Deshidratación leve', 'R11.2 - Vómito sin sangre'],
    tratamientoIndicaciones: '1. Hidratación con suero oral (200-250 mL después de cada deposición líquida). 2. Ciprofloxacino 500mg VO c/12h por 7 días. 3. Omeprazol 20mg c/24h por 5 días. 4. Dieta blanda (BRAT: banana, arroz, manzana, tostadas). 5. Reposo absoluto 24-48h. 6. Revalorar en 48 horas o antes si empeora.',
    pronostico: 'bueno',
    observaciones: 'Probable gastroenteritis bacteriana por consumo de mariscos. Se indica coproparasitoscópico y cultivo de heces. Se advierte signos de alarma para regreso urgente (sangre en heces, fiebre >38.5°C, deshidratación severa).',
  },
];

export const getNotaEvolucionByConsulta = (consultaId: string): NotaEvolucion | undefined =>
  notasEvolucionData.find((n) => n.consultaId === consultaId);

export const getNotasEvolucionByPatient = (patientId: string): NotaEvolucion[] =>
  notasEvolucionData.filter((n) => n.patientId === patientId);

export const createEmptyNotaEvolucion = (
  consultaId: string,
  patientId: string,
  medico: string,
  medicoCedula: string
): NotaEvolucion => ({
  id: `ne-${consultaId}-${Date.now()}`,
  consultaId,
  patientId,
  fecha: new Date().toISOString().split('T')[0],
  hora: new Date().toTimeString().slice(0, 5),
  medico,
  medicoCedula,
  signosVitales: {
    temperatura: '',
    presionSistolica: '',
    presionDiastolica: '',
    frecuenciaCardiaca: '',
    frecuenciaRespiratoria: '',
    saturacionOxigeno: '',
    peso: '',
    talla: '',
    glucosa: '',
  },
  evolucionSubjetiva: '',
  evolucionObjetiva: '',
  resultadosEstudios: [],
  diagnosticoPrincipal: '',
  diagnosticosSecundarios: [],
  tratamientoIndicaciones: '',
  pronostico: 'bueno',
  observaciones: '',
});