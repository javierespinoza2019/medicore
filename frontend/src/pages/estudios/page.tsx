/**
 * Estudios / imagenología — placeholder honesto hasta contrato API dedicado.
 * Sin mocks de solicitudes ni resultados.
 */
import EstudiosModulePlaceholder from '@/components/feature/EstudiosModulePlaceholder';
import { useSearchParams } from 'react-router-dom';

export default function Estudios() {
  const [searchParams] = useSearchParams();
  const pacienteParam = searchParams.get('paciente') || undefined;

  return (
    <EstudiosModulePlaceholder
      subjectId={pacienteParam}
      testId="page-estudios"
    />
  );
}
