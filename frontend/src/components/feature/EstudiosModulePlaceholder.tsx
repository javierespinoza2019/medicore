/**
 * Placeholder honesto: estudios/imagenología sin API (Fase 2).
 * Sin datos mock clínicos. No inventar solicitudes ni resultados.
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
    <div className="space-y-4" data-testid={testId}>
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground-900">{title}</h1>
        <p className="text-sm text-foreground-500">
          Solicitud, seguimiento y captura de resultados — sin contrato API en Fase 1.
        </p>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        No se muestran solicitudes ni resultados sintéticos. Laboratorio / imagen / gabinete =
        Fase 2. La emisión clínica vigente (notas y recetas) sigue en Consultas y Urgencias.
      </div>

      <Card padding="md" className="border-dashed border-secondary-300 bg-secondary-50/40">
        <div className="flex flex-col items-center py-6 text-center">
          <span
            className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-secondary-100 text-foreground-400"
            aria-hidden
          >
            <i className="ri-microscope-line text-xl" />
          </span>
          <h2 className="text-sm font-semibold text-foreground-800">Módulo en preparación</h2>
          <p className="mt-2 max-w-lg text-xs text-foreground-500">
            Pendiente de endpoints propios (fuera de M4–M8). Catálogo de estudios en
            Administración → Catálogos también es aviso hasta existir persistencia.
          </p>
          <p className="mt-3 max-w-lg text-left text-xs text-foreground-500 border border-secondary-200 rounded-lg bg-background-50 px-4 py-3">
            <span className="font-medium text-foreground-700">Diseño original (referencia): </span>
            Readdy tenía tabs Solicitudes / Catálogo, filtros estado/tipo, alta de solicitud,
            captura de resultados por parámetro, cobro vía caja e impresión — no se porta.
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
