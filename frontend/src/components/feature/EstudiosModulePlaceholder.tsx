/**
 * Placeholder honesto: estudios/imagenología sin API en Fase 1.
 * Sin datos mock clínicos.
 */
import { useNavigate } from 'react-router-dom';
import Button from '@/components/base/Button';
import Card from '@/components/base/Card';

type Props = {
  /** Si se indica, muestra enlace contextual a consultas del sujeto. */
  subjectId?: string;
  /** testid del contenedor raíz. */
  testId?: string;
  /** Título opcional (p. ej. en tab de paciente vs módulo global). */
  title?: string;
};

export default function EstudiosModulePlaceholder({
  subjectId,
  testId = 'page-estudios',
  title = 'Estudios e imagenología',
}: Props) {
  const navigate = useNavigate();

  return (
    <div className="space-y-4 p-4 md:p-6" data-testid={testId}>
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground-900">{title}</h1>
        <p className="text-sm text-foreground-500">
          Solicitud, seguimiento y captura de resultados — integración pendiente de contrato API.
        </p>
      </div>

      <Card padding="md" className="border-dashed border-secondary-300 bg-secondary-50/40">
        <div className="flex flex-col items-center py-8 text-center">
          <span
            className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-secondary-100 text-foreground-400"
            aria-hidden
          >
            <i className="ri-microscope-line text-xl" />
          </span>
          <h2 className="text-sm font-semibold text-foreground-800">Módulo en preparación</h2>
          <p className="mt-2 max-w-lg text-xs text-foreground-500">
            Laboratorio, imagen y gabinete requieren endpoints propios (fuera de M4–M8 actuales). No se
            muestran solicitudes ni resultados sintéticos. La emisión clínica vigente (notas y recetas)
            sigue en consulta y urgencias.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {subjectId ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate(`/app/consultas?paciente=${subjectId}`)}
              >
                Ir a consultas del sujeto
              </Button>
            ) : (
              <Button variant="primary" size="sm" onClick={() => navigate('/app/consultas')}>
                Ir a consultas
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => navigate('/app/pacientes')}>
              Padrón de pacientes
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
