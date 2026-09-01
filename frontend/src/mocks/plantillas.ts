import type { Pronostico } from '@/mocks/notasEvolucion';

export type TipoPacientePlantilla =
  | 'Pediátrico'
  | 'Adulto'
  | 'Adulto mayor'
  | 'Embarazada'
  | 'General';

export interface PlantillaMedica {
  id: string;
  doctorId: string;
  nombre: string;
  tipoPaciente: TipoPacientePlantilla;
  tipoDiagnostico: string;
  diagnosticoPrincipal: string;
  diagnosticosSecundarios: string[];
  evolucionSubjetiva: string;
  evolucionObjetiva: string;
  tratamiento: string;
  pronostico: Pronostico;
  observaciones: string;
  createdAt: string;
}

export const TIPOS_PACIENTE: TipoPacientePlantilla[] = [
  'Pediátrico',
  'Adulto',
  'Adulto mayor',
  'Embarazada',
  'General',
];

export const CATEGORIAS_DIAGNOSTICO: string[] = [
  'General',
  'Infecciosas',
  'Neoplasias',
  'Endocrinas',
  'Circulatorio',
  'Respiratorio',
  'Digestivo',
  'Piel',
  'Musculoesquelético',
  'Genitourinario',
  'Traumatismos',
  'Síntomas',
];

export const plantillasData: PlantillaMedica[] = [
  {
    id: 'pl-d1-dm2',
    doctorId: '66666666-6666-6666-6666-666666660001',
    nombre: 'Diabetes tipo 2 — Control mensual',
    tipoPaciente: 'Adulto',
    tipoDiagnostico: 'Endocrinas',
    diagnosticoPrincipal: 'Diabetes mellitus tipo 2 sin complicaciones (E11.9)',
    diagnosticosSecundarios: ['Sobrepeso (E66)', 'Falta de adherencia terapéutica (Z91.1)'],
    evolucionSubjetiva: 'Paciente con DM2 de larga evolución que acude a control. Refiere apego irregular al tratamiento y automonitoreo inconsistente. Niega hipoglucemias, dolor torácico o disnea. Valorar síntomas de descontrol: poliuria, polidipsia, visión borrosa.',
    evolucionObjetiva: 'Consciente, orientado, hidratado. Mucosas normales. Campos pulmonares limpios, ruidos cardíacos rítmicos sin soplos. Abdomen blando y depresible. Extremidades con sensibilidad y pulsos conservados; revisar pies para descartar lesiones. Registrar IMC.',
    tratamiento: '1. Ajustar esquema hipoglucemiante/insulina según bitácora. 2. Solicitar HbA1c, perfil de lípidos y microalbuminuria. 3. Reforzar automonitoreo de glucosa. 4. Derivar a nutrición para plan alimentario. 5. Control en 4 semanas con bitácora de glucosas.',
    pronostico: 'reservado',
    observaciones: 'Reforzar técnica de aplicación de insulina y educación en diabetes.',
    createdAt: '2026-08-10',
  },
  {
    id: 'pl-d1-hta',
    doctorId: '66666666-6666-6666-6666-666666660001',
    nombre: 'Hipertensión arterial — Control',
    tipoPaciente: 'Adulto mayor',
    tipoDiagnostico: 'Circulatorio',
    diagnosticoPrincipal: 'Hipertensión esencial (I10)',
    diagnosticosSecundarios: ['Dislipidemia (E78.5)'],
    evolucionSubjetiva: 'Paciente con hipertensión arterial conocida que acude a control. Refiere apego parcial a medicación y dieta. Niega cefalea, visión borrosa, dolor precordial o disnea. Indagar sobre consumo de sal y estrés.',
    evolucionObjetiva: 'Consciente y orientado. Tomar PA en ambos brazos y en posición sentada. Auscultación cardiopulmonar sin alteraciones. Explorar fondo de ojo si hay signos de daño a órgano blanco. Registrar peso y talla.',
    tratamiento: '1. Verificar adherencia a antihipertensivo. 2. Ajustar dosis según cifras de PA. 3. Recomendar dieta hiposódica y actividad física. 4. Solicitar creatinina, electrolitos y perfil lipídico. 5. Control en 4-8 semanas.',
    pronostico: 'bueno',
    observaciones: 'Educar sobre metas de presión arterial y automonitoreo en casa.',
    createdAt: '2026-08-10',
  },
  {
    id: 'pl-d1-ivrs',
    doctorId: '66666666-6666-6666-6666-666666660001',
    nombre: 'IVRS — Resfriado común',
    tipoPaciente: 'Adulto',
    tipoDiagnostico: 'Infecciosas',
    diagnosticoPrincipal: 'Infección aguda de vías respiratorias superiores (J06.9)',
    diagnosticosSecundarios: ['Rinorrea (R09.8)'],
    evolucionSubjetiva: 'Paciente con cuadro gripal de 2-3 días de evolución: rinorrea, congestión nasal, odinofagia leve, tos seca y malestar general. Sin fiebre alta, sin disnea, sin dolor torácico. Niega antecedente de inmunosupresión.',
    evolucionObjetiva: 'Consciente, orientado, con buen estado general. Faringe hiperémica sin exudados. Otoscopia normal. Auscultación pulmonar con adecuada entrada de aire, sin sibilancias ni estertores. Signos vitales normales.',
    tratamiento: '1. Hidratación abundante y reposo relativo. 2. Paracetamol 500 mg cada 8 hrs si hay fiebre o dolor. 3. Antihistamínico para rinorrea. 4. Aseo nasal con solución salina. 5. Revalorar en 48-72 hrs si empeoran síntomas.',
    pronostico: 'bueno',
    observaciones: 'Explicar datos de alarma: disnea, fiebre persistente, deterioro del estado general.',
    createdAt: '2026-08-10',
  },
  {
    id: 'pl-d2-asma',
    doctorId: '66666666-6666-6666-6666-666666660002',
    nombre: 'Asma bronquial — Crisis leve',
    tipoPaciente: 'Pediátrico',
    tipoDiagnostico: 'Respiratorio',
    diagnosticoPrincipal: 'Asma no especificada (J45.9)',
    diagnosticosSecundarios: ['Rinitis alérgica (J30)'],
    evolucionSubjetiva: 'Paciente pediátrico con asma bronquial conocida, acude por crisis leve tras exposición a desencadenante. Cuidador refiere tos y sibilancias, con mejoría parcial tras broncodilatador en casa. Sin fiebre, sin cianosis, tolera vía oral.',
    evolucionObjetiva: 'Menor consciente, reactivo, cooperador. Tiraje intercostal leve. Auscultación con sibilancias espiratorias bilaterales sin estertores. Oximetría al aire ambiente; valorar mejoría tras nebulización. Faringe y oídos sin alteraciones. Sin cianosis peribucal.',
    tratamiento: '1. Salbutamol inhalado según peso (con espaciador). 2. Continuar corticoide inhalado de mantenimiento. 3. Evitar desencadenantes identificados. 4. Plan de acción por escrito para crisis. 5. Revalorar en 48 hrs si no mejora.',
    pronostico: 'bueno',
    observaciones: 'Enseñar al cuidador la técnica correcta de inhalación con espaciador.',
    createdAt: '2026-08-10',
  },
];

export const getPlantillasByDoctor = (doctorId: string): PlantillaMedica[] =>
  plantillasData.filter((p) => p.doctorId === doctorId);