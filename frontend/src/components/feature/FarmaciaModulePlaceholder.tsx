/**
 * Placeholder honesto: farmacia / dispensación sin API de surtido en Fase 1.
 * Sin inventario ni dispensaciones mock.
 */
import { useNavigate } from 'react-router-dom';
import Button from '@/components/base/Button';
import Card from '@/components/base/Card';

type Props = {
  /** testid del contenedor raíz. */
  testId?: string;
  /** Título opcional. */
  title?: string;
};

export default function FarmaciaModulePlaceholder({
  testId = 'page-farmacia',
  title = 'Farmacia',
}: Props) {
  const navigate = useNavigate();

  return (
    <div className="space-y-4 p-4 md:p-6" data-testid={testId}>
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground-900">{title}</h1>
        <p className="text-sm text-foreground-500">
          Dispensación, inventario y surtido — integración pendiente de contrato API.
        </p>
      </div>

      <Card padding="md" className="border-dashed border-secondary-300 bg-secondary-50/40">
        <div className="flex flex-col items-center py-8 text-center">
          <span
            className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-secondary-100 text-foreground-400"
            aria-hidden
          >
            <i className="ri-medicine-bottle-line text-xl" />
          </span>
          <h2 className="text-sm font-semibold text-foreground-800">Módulo en preparación</h2>
          <p className="mt-2 max-w-lg text-xs text-foreground-500">
            El surtido contra recetas firmadas (M8) y el control de existencias requieren endpoints
            propios de farmacia, aún no publicados. No se muestran inventarios ni dispensaciones
            sintéticas. La emisión clínica vigente (prescripción con captura alérgica) está en
            consulta y urgencias; el listado de recetas firmadas está disponible en Recetas.
          </p>
          <p className="mt-2 max-w-lg text-xs text-foreground-500">
            Estupefacientes y psicotrópicos permanecen fuera de alcance (doc 06 §64/68).
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button variant="primary" size="sm" onClick={() => navigate('/app/recetas')}>
              Ver recetas firmadas
            </Button>
            <Button variant="secondary" size="sm" onClick={() => navigate('/app/consultas')}>
              Ir a consultas
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
