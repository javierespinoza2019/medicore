/**
 * Placeholder honesto: farmacia / dispensación sin API de surtido (Fase 2).
 * Sin inventario ni dispensaciones mock. Controlados impedidos (doc 06 §64/68).
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
    <div className="space-y-4" data-testid={testId}>
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground-900">{title}</h1>
        <p className="text-sm text-foreground-500">
          Dispensación e inventario — pendiente de contrato API (sin API de surtido en Fase 1).
        </p>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        No se muestran inventarios ni dispensaciones sintéticas. Estupefacientes/psicotrópicos
        permanecen <strong>fuera de alcance</strong> (doc 06 §64/68). Libro de farmacia = decisión
        #60 abierta. Offline de farmacia → Fase 2.
      </div>

      <Card padding="md" className="border-dashed border-secondary-300 bg-secondary-50/40">
        <div className="flex flex-col items-center py-6 text-center">
          <span
            className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-secondary-100 text-foreground-400"
            aria-hidden
          >
            <i className="ri-medicine-bottle-line text-xl" />
          </span>
          <h2 className="text-sm font-semibold text-foreground-800">Módulo en preparación</h2>
          <p className="mt-2 max-w-lg text-xs text-foreground-500">
            El surtido contra recetas firmadas (M8) y el control de existencias requieren endpoints
            propios. La emisión (prescripción + captura alérgica) está en Consultas / Urgencias; el
            listado por sujeto está en Recetas. Catálogo de medicamentos admin: Administración →
            Catálogos.
          </p>
          <p className="mt-3 max-w-lg text-left text-xs text-foreground-500 border border-secondary-200 rounded-lg bg-background-50 px-4 py-3">
            <span className="font-medium text-foreground-700">Diseño original (referencia): </span>
            Readdy tenía cola de recetas activas (consulta/urgencias), formulario de dispensación
            parcial/total, inventario con stock bajo, historial e integración a caja — no se porta.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button variant="primary" size="sm" onClick={() => navigate('/app/recetas')}>
              Ver recetas firmadas
            </Button>
            <Button variant="secondary" size="sm" onClick={() => navigate('/app/consultas')}>
              Ir a consultas
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/app/administracion/catalogos')}
            >
              Catálogo medicamentos
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
