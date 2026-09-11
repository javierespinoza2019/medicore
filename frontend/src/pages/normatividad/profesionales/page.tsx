/**
 * Gestión normativa de profesionales — enlace a catálogo API (Administración → Médicos).
 * El prototipo Readdy tenía alertas de vigencia de cédula/certificación: sin fechas en el modelo.
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listProfessionals, type ProfessionalDto } from '@/api/professionals';
import { mensajeDeFalla } from '@/api/errors';
import Button from '@/components/base/Button';
import Card from '@/components/base/Card';
import Badge from '@/components/base/Badge';
import CargandoPantalla from '@/components/feature/CargandoPantalla';

const NO_CAPTURADO = 'No capturado';

export default function GestionProfesionales() {
  const navigate = useNavigate();
  const [items, setItems] = useState<ProfessionalDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await listProfessionals(false);
    if (!res.success || !res.data) {
      setError(res.message ?? mensajeDeFalla(res.failure).titulo);
      setItems([]);
      setLoading(false);
      return;
    }
    setItems(res.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  if (loading) return <CargandoPantalla />;

  return (
    <div className="space-y-5" data-testid="page-normatividad-profesionales">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground-900 font-heading">
            Gestión de Profesionales
          </h1>
          <p className="text-sm text-foreground-500 mt-1">
            Lectura del catálogo operativo (API M1). Alta/edición en Administración → Médicos.
          </p>
        </div>
        <Button
          icon={<i className="ri-user-star-line" />}
          onClick={() => navigate('/app/administracion/medicos')}
        >
          Ir a Médicos
        </Button>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        El prototipo mostraba vigencias de cédula, certificaciones y licencias sanitarias. Esos
        campos <strong>no existen</strong> en el profesional actual; no se inventan alertas de
        vencimiento. Cédula capturada = dato; ausencia = «No capturado».
      </div>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card padding="md">
          <p className="text-lg font-bold text-foreground-950">{items.length}</p>
          <p className="text-2xs text-foreground-500">En catálogo</p>
        </Card>
        <Card padding="md">
          <p className="text-lg font-bold text-foreground-950">
            {items.filter((p) => p.isActive).length}
          </p>
          <p className="text-2xs text-foreground-500">Activos</p>
        </Card>
        <Card padding="md">
          <p className="text-lg font-bold text-foreground-950">
            {items.filter((p) => p.professionalLicense).length}
          </p>
          <p className="text-2xs text-foreground-500">Con cédula capturada</p>
        </Card>
      </div>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-secondary-200 text-left">
                <th className="px-5 py-2 text-xs font-semibold text-foreground-500 uppercase">
                  Profesional
                </th>
                <th className="px-5 py-2 text-xs font-semibold text-foreground-500 uppercase">
                  Especialidad
                </th>
                <th className="px-5 py-2 text-xs font-semibold text-foreground-500 uppercase">
                  Cédula
                </th>
                <th className="px-5 py-2 text-xs font-semibold text-foreground-500 uppercase text-center">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-10 text-center text-foreground-400 text-sm">
                    No hay profesionales en el tenant.
                  </td>
                </tr>
              ) : (
                items.map((p) => (
                  <tr key={p.healthcareProfessionalId} className="hover:bg-secondary-50/50">
                    <td className="px-5 py-2 font-medium text-foreground-900">{p.fullName}</td>
                    <td className="px-5 py-2 text-foreground-600 text-xs">
                      {p.specialtyName ?? NO_CAPTURADO}
                    </td>
                    <td className="px-5 py-2 font-mono text-xs text-foreground-600">
                      {p.professionalLicense ?? NO_CAPTURADO}
                    </td>
                    <td className="px-5 py-2 text-center">
                      <Badge variant={p.isActive ? 'success' : 'secondary'} size="sm">
                        {p.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
