export interface DiagnosticoCIE10 {
  codigo: string;
  descripcion: string;
  categoria: string;
  subcategoria: string;
}

export const catalogocIE10: DiagnosticoCIE10[] = [
  // Enfermedades infecciosas (A00-B99)
  { codigo: 'A09.0', descripcion: 'Diarrea y gastroenteritis de presunto origen infeccioso', categoria: 'Infecciosas', subcategoria: 'Enfermedades infecciosas intestinales' },
  { codigo: 'A15.0', descripcion: 'Tuberculosis pulmonar confirmada bacteriológicamente', categoria: 'Infecciosas', subcategoria: 'Tuberculosis' },
  { codigo: 'A37.0', descripcion: 'Tos ferina debida a Bordetella pertussis', categoria: 'Infecciosas', subcategoria: 'Otras enfermedades bacterianas' },
  { codigo: 'A46', descripcion: 'Erisipela', categoria: 'Infecciosas', subcategoria: 'Otras enfermedades bacterianas' },
  { codigo: 'B01.9', descripcion: 'Varicela sin complicaciones', categoria: 'Infecciosas', subcategoria: 'Infecciones virales' },
  { codigo: 'B02.9', descripcion: 'Herpes zóster sin complicaciones', categoria: 'Infecciosas', subcategoria: 'Infecciones virales' },
  { codigo: 'B34.9', descripcion: 'Infección viral no especificada', categoria: 'Infecciosas', subcategoria: 'Infecciones virales' },
  { codigo: 'B35.4', descripcion: 'Tiña corporal', categoria: 'Infecciosas', subcategoria: 'Micosis' },

  // Neoplasias (C00-D49)
  { codigo: 'D22.5', descripcion: 'Nevo melanocítico del tronco', categoria: 'Neoplasias', subcategoria: 'Tumores benignos' },
  { codigo: 'D25.9', descripcion: 'Leiomioma uterino sin otra especificación', categoria: 'Neoplasias', subcategoria: 'Tumores benignos' },

  // Endocrinas y metabólicas (E00-E89)
  { codigo: 'E03.9', descripcion: 'Hipotiroidismo no especificado', categoria: 'Endocrinas', subcategoria: 'Trastornos tiroideos' },
  { codigo: 'E05.9', descripcion: 'Hipertiroidismo no especificado', categoria: 'Endocrinas', subcategoria: 'Trastornos tiroideos' },
  { codigo: 'E10.9', descripcion: 'Diabetes mellitus tipo 1 sin complicaciones', categoria: 'Endocrinas', subcategoria: 'Diabetes mellitus' },
  { codigo: 'E11.9', descripcion: 'Diabetes mellitus tipo 2 sin complicaciones', categoria: 'Endocrinas', subcategoria: 'Diabetes mellitus' },
  { codigo: 'E11.65', descripcion: 'Diabetes mellitus tipo 2 con hiperglucemia', categoria: 'Endocrinas', subcategoria: 'Diabetes mellitus' },
  { codigo: 'E66.9', descripcion: 'Obesidad no especificada', categoria: 'Endocrinas', subcategoria: 'Obesidad y sobrepeso' },
  { codigo: 'E66.0', descripcion: 'Obesidad debida a exceso de calorías', categoria: 'Endocrinas', subcategoria: 'Obesidad y sobrepeso' },
  { codigo: 'E78.0', descripcion: 'Hipercolesterolemia pura', categoria: 'Endocrinas', subcategoria: 'Trastornos metabólicos' },
  { codigo: 'E78.2', descripcion: 'Hiperlipidemia mixta', categoria: 'Endocrinas', subcategoria: 'Trastornos metabólicos' },
  { codigo: 'E78.5', descripcion: 'Dislipidemia no especificada', categoria: 'Endocrinas', subcategoria: 'Trastornos metabólicos' },
  { codigo: 'E79.0', descripcion: 'Hiperuricemia sin signos de artritis', categoria: 'Endocrinas', subcategoria: 'Trastornos metabólicos' },
  { codigo: 'E86.0', descripcion: 'Deshidratación', categoria: 'Endocrinas', subcategoria: 'Trastornos metabólicos' },

  // Sistema nervioso (G00-G99)
  { codigo: 'G40.9', descripcion: 'Epilepsia no especificada', categoria: 'Nervioso', subcategoria: 'Trastornos episódicos' },
  { codigo: 'G43.9', descripcion: 'Migraña sin aura', categoria: 'Nervioso', subcategoria: 'Cefaleas' },
  { codigo: 'G44.2', descripcion: 'Cefalea tensional', categoria: 'Nervioso', subcategoria: 'Cefaleas' },
  { codigo: 'G47.0', descripcion: 'Insomnio no orgánico', categoria: 'Nervioso', subcategoria: 'Trastornos del sueño' },
  { codigo: 'G56.0', descripcion: 'Síndrome del túnel carpiano', categoria: 'Nervioso', subcategoria: 'Neuropatías' },
  { codigo: 'G62.9', descripcion: 'Polineuropatía no especificada', categoria: 'Nervioso', subcategoria: 'Neuropatías' },

  // Aparato circulatorio (I00-I99)
  { codigo: 'I10', descripcion: 'Hipertensión arterial esencial primaria', categoria: 'Circulatorio', subcategoria: 'Enfermedad hipertensiva' },
  { codigo: 'I11.9', descripcion: 'Cardiopatía hipertensiva sin insuficiencia cardiaca', categoria: 'Circulatorio', subcategoria: 'Enfermedad hipertensiva' },
  { codigo: 'I20.9', descripcion: 'Angina de pecho no especificada', categoria: 'Circulatorio', subcategoria: 'Cardiopatía isquémica' },
  { codigo: 'I25.10', descripcion: 'Cardiopatía isquémica crónica', categoria: 'Circulatorio', subcategoria: 'Cardiopatía isquémica' },
  { codigo: 'I50.9', descripcion: 'Insuficiencia cardiaca no especificada', categoria: 'Circulatorio', subcategoria: 'Insuficiencia cardiaca' },
  { codigo: 'I63.9', descripcion: 'Infarto cerebral no especificado', categoria: 'Circulatorio', subcategoria: 'Enfermedad cerebrovascular' },

  // Aparato respiratorio (J00-J99)
  { codigo: 'J00', descripcion: 'Rinofaringitis aguda (resfriado común)', categoria: 'Respiratorio', subcategoria: 'Infecciones agudas vías superiores' },
  { codigo: 'J01.9', descripcion: 'Sinusitis aguda no especificada', categoria: 'Respiratorio', subcategoria: 'Infecciones agudas vías superiores' },
  { codigo: 'J02.9', descripcion: 'Faringitis aguda no especificada', categoria: 'Respiratorio', subcategoria: 'Infecciones agudas vías superiores' },
  { codigo: 'J03.9', descripcion: 'Amigdalitis aguda no especificada', categoria: 'Respiratorio', subcategoria: 'Infecciones agudas vías superiores' },
  { codigo: 'J06.9', descripcion: 'Infección aguda de vías respiratorias superiores no especificada', categoria: 'Respiratorio', subcategoria: 'Infecciones agudas vías superiores' },
  { codigo: 'J15.9', descripcion: 'Neumonía bacteriana no especificada', categoria: 'Respiratorio', subcategoria: 'Neumonía' },
  { codigo: 'J18.9', descripcion: 'Neumonía no especificada', categoria: 'Respiratorio', subcategoria: 'Neumonía' },
  { codigo: 'J20.9', descripcion: 'Bronquitis aguda no especificada', categoria: 'Respiratorio', subcategoria: 'Enfermedades crónicas vías inferiores' },
  { codigo: 'J30.4', descripcion: 'Rinitis alérgica no especificada', categoria: 'Respiratorio', subcategoria: 'Enfermedades crónicas vías superiores' },
  { codigo: 'J45.9', descripcion: 'Asma no especificada', categoria: 'Respiratorio', subcategoria: 'Enfermedades crónicas vías inferiores' },
  { codigo: 'J45.0', descripcion: 'Asma alérgica', categoria: 'Respiratorio', subcategoria: 'Enfermedades crónicas vías inferiores' },

  // Aparato digestivo (K00-K95)
  { codigo: 'K04.0', descripcion: 'Pulpitis dental', categoria: 'Digestivo', subcategoria: 'Enfermedades bucales' },
  { codigo: 'K05.1', descripcion: 'Gingivitis crónica', categoria: 'Digestivo', subcategoria: 'Enfermedades bucales' },
  { codigo: 'K20.9', descripcion: 'Esofagitis no especificada', categoria: 'Digestivo', subcategoria: 'Enfermedades del esófago' },
  { codigo: 'K21.9', descripcion: 'Enfermedad por reflujo gastroesofágico', categoria: 'Digestivo', subcategoria: 'Enfermedades del esófago' },
  { codigo: 'K25.9', descripcion: 'Úlcera gástrica no especificada', categoria: 'Digestivo', subcategoria: 'Úlcera péptica' },
  { codigo: 'K29.7', descripcion: 'Gastritis no especificada', categoria: 'Digestivo', subcategoria: 'Enfermedades del estómago' },
  { codigo: 'K35.8', descripcion: 'Apendicitis aguda no especificada', categoria: 'Digestivo', subcategoria: 'Enfermedades del apéndice' },
  { codigo: 'K52.9', descripcion: 'Colitis y gastroenteritis no infecciosas', categoria: 'Digestivo', subcategoria: 'Enfermedades intestinales' },
  { codigo: 'K58.9', descripcion: 'Síndrome de intestino irritable', categoria: 'Digestivo', subcategoria: 'Enfermedades intestinales' },
  { codigo: 'K59.0', descripcion: 'Estreñimiento funcional', categoria: 'Digestivo', subcategoria: 'Trastornos funcionales' },
  { codigo: 'K80.2', descripcion: 'Colelitiasis sin colecistitis', categoria: 'Digestivo', subcategoria: 'Enfermedades biliares' },

  // Piel (L00-L99)
  { codigo: 'L20.9', descripcion: 'Dermatitis atópica no especificada', categoria: 'Piel', subcategoria: 'Dermatitis y eczema' },
  { codigo: 'L23.9', descripcion: 'Dermatitis alérgica de contacto', categoria: 'Piel', subcategoria: 'Dermatitis y eczema' },
  { codigo: 'L30.9', descripcion: 'Dermatitis no especificada', categoria: 'Piel', subcategoria: 'Dermatitis y eczema' },
  { codigo: 'L40.9', descripcion: 'Psoriasis no especificada', categoria: 'Piel', subcategoria: 'Trastornos papuloescamosos' },
  { codigo: 'L50.9', descripcion: 'Urticaria no especificada', categoria: 'Piel', subcategoria: 'Urticaria y eritema' },
  { codigo: 'L70.9', descripcion: 'Acné no especificado', categoria: 'Piel', subcategoria: 'Trastornos anexos cutáneos' },

  // Musculoesquelético (M00-M99)
  { codigo: 'M06.9', descripcion: 'Artritis reumatoide no especificada', categoria: 'Musculoesquelético', subcategoria: 'Artropatías inflamatorias' },
  { codigo: 'M10.0', descripcion: 'Gota idiopática', categoria: 'Musculoesquelético', subcategoria: 'Artropatías por cristales' },
  { codigo: 'M17.9', descripcion: 'Gonartrosis no especificada', categoria: 'Musculoesquelético', subcategoria: 'Artrosis' },
  { codigo: 'M25.5', descripcion: 'Dolor articular', categoria: 'Musculoesquelético', subcategoria: 'Otros trastornos articulares' },
  { codigo: 'M51.1', descripcion: 'Trastorno de disco lumbar con radiculopatía', categoria: 'Musculoesquelético', subcategoria: 'Dorsopatías' },
  { codigo: 'M54.2', descripcion: 'Cervicalgia', categoria: 'Musculoesquelético', subcategoria: 'Dorsopatías' },
  { codigo: 'M54.5', descripcion: 'Lumbago no especificado', categoria: 'Musculoesquelético', subcategoria: 'Dorsopatías' },
  { codigo: 'M62.6', descripcion: 'Distensión y esguince muscular', categoria: 'Musculoesquelético', subcategoria: 'Trastornos musculares' },
  { codigo: 'M79.1', descripcion: 'Mialgia', categoria: 'Musculoesquelético', subcategoria: 'Trastornos de tejidos blandos' },
  { codigo: 'M79.7', descripcion: 'Fibromialgia', categoria: 'Musculoesquelético', subcategoria: 'Trastornos de tejidos blandos' },

  // Genitourinario (N00-N99)
  { codigo: 'N10', descripcion: 'Pielonefritis aguda', categoria: 'Genitourinario', subcategoria: 'Enfermedades renales' },
  { codigo: 'N20.0', descripcion: 'Litiasis renal', categoria: 'Genitourinario', subcategoria: 'Litiasis urinaria' },
  { codigo: 'N30.0', descripcion: 'Cistitis aguda', categoria: 'Genitourinario', subcategoria: 'Enfermedades de vejiga' },
  { codigo: 'N39.0', descripcion: 'Infección de vías urinarias, sitio no especificado', categoria: 'Genitourinario', subcategoria: 'Enfermedades urinarias' },
  { codigo: 'N94.6', descripcion: 'Dismenorrea no especificada', categoria: 'Genitourinario', subcategoria: 'Trastornos menstruales' },

  // Traumatismos (S00-T98)
  { codigo: 'S93.4', descripcion: 'Esguince y distensión de tobillo', categoria: 'Traumatismos', subcategoria: 'Traumatismos tobillo y pie' },
  { codigo: 'S33.5', descripcion: 'Esguince y distensión de columna lumbar', categoria: 'Traumatismos', subcategoria: 'Traumatismos columna' },

  // Factores que influyen en la salud (Z00-Z99)
  { codigo: 'Z00.0', descripcion: 'Examen médico general de adulto', categoria: 'Factores de salud', subcategoria: 'Exámenes de rutina' },
  { codigo: 'Z00.1', descripcion: 'Examen de rutina del niño', categoria: 'Factores de salud', subcategoria: 'Exámenes de rutina' },
  { codigo: 'Z11.9', descripcion: 'Examen de pesquisa especial no especificado', categoria: 'Factores de salud', subcategoria: 'Exámenes de pesquisa' },

  // Síntomas y signos (R00-R99)
  { codigo: 'R05', descripcion: 'Tos', categoria: 'Síntomas', subcategoria: 'Síntomas respiratorios' },
  { codigo: 'R06.0', descripcion: 'Disnea', categoria: 'Síntomas', subcategoria: 'Síntomas respiratorios' },
  { codigo: 'R07.4', descripcion: 'Dolor torácico no especificado', categoria: 'Síntomas', subcategoria: 'Síntomas cardiovasculares' },
  { codigo: 'R10.4', descripcion: 'Dolor abdominal no especificado', categoria: 'Síntomas', subcategoria: 'Síntomas digestivos' },
  { codigo: 'R11', descripcion: 'Náusea y vómito', categoria: 'Síntomas', subcategoria: 'Síntomas digestivos' },
  { codigo: 'R42', descripcion: 'Mareo y desvanecimiento', categoria: 'Síntomas', subcategoria: 'Síntomas neurológicos' },
  { codigo: 'R50.9', descripcion: 'Fiebre no especificada', categoria: 'Síntomas', subcategoria: 'Síntomas generales' },
  { codigo: 'R51', descripcion: 'Cefalea', categoria: 'Síntomas', subcategoria: 'Síntomas neurológicos' },
  { codigo: 'R52.0', descripcion: 'Dolor agudo', categoria: 'Síntomas', subcategoria: 'Síntomas generales' },
  { codigo: 'R52.2', descripcion: 'Dolor crónico', categoria: 'Síntomas', subcategoria: 'Síntomas generales' },
  { codigo: 'R53', descripcion: 'Malestar y fatiga', categoria: 'Síntomas', subcategoria: 'Síntomas generales' },
];

export const categoriasCIE10 = [
  { key: 'todas', label: 'Todas las categorías', count: catalogocIE10.length },
  { key: 'Infecciosas', label: 'Infecciosas (A00-B99)', count: catalogocIE10.filter((d) => d.categoria === 'Infecciosas').length },
  { key: 'Endocrinas', label: 'Endocrinas y Metabólicas (E00-E89)', count: catalogocIE10.filter((d) => d.categoria === 'Endocrinas').length },
  { key: 'Nervioso', label: 'Sistema Nervioso (G00-G99)', count: catalogocIE10.filter((d) => d.categoria === 'Nervioso').length },
  { key: 'Circulatorio', label: 'Aparato Circulatorio (I00-I99)', count: catalogocIE10.filter((d) => d.categoria === 'Circulatorio').length },
  { key: 'Respiratorio', label: 'Aparato Respiratorio (J00-J99)', count: catalogocIE10.filter((d) => d.categoria === 'Respiratorio').length },
  { key: 'Digestivo', label: 'Aparato Digestivo (K00-K95)', count: catalogocIE10.filter((d) => d.categoria === 'Digestivo').length },
  { key: 'Piel', label: 'Piel y Tejido Subcutáneo (L00-L99)', count: catalogocIE10.filter((d) => d.categoria === 'Piel').length },
  { key: 'Musculoesquelético', label: 'Musculoesquelético (M00-M99)', count: catalogocIE10.filter((d) => d.categoria === 'Musculoesquelético').length },
  { key: 'Genitourinario', label: 'Genitourinario (N00-N99)', count: catalogocIE10.filter((d) => d.categoria === 'Genitourinario').length },
  { key: 'Síntomas', label: 'Síntomas y Signos (R00-R99)', count: catalogocIE10.filter((d) => d.categoria === 'Síntomas').length },
];

export const searchDiagnosticos = (query: string): DiagnosticoCIE10[] => {
  const q = query.toLowerCase();
  return catalogocIE10.filter(
    (d) => d.codigo.toLowerCase().includes(q) || d.descripcion.toLowerCase().includes(q)
  ).slice(0, 20);
};