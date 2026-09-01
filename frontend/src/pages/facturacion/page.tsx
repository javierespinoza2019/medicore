import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Button from '@/components/base/Button';
import Modal from '@/components/base/Modal';
import FacturasList from '@/pages/facturacion/components/FacturasList';
import NuevaFacturaModal from '@/pages/facturacion/components/NuevaFacturaModal';
import FacturaPrintModal from '@/pages/facturacion/components/FacturaPrintModal';
import { facturasIniciales, emisorFiscal } from '@/mocks/facturacion';
import type { FacturaCFDI } from '@/mocks/facturacion';
import { useCaja } from '@/hooks/useCajaContext';

const SERIE = 'FAC-A';

export default function Facturacion() {
  const { transactions } = useCaja();
  const [searchParams, setSearchParams] = useSearchParams();

  const [facturas, setFacturas] = useState<FacturaCFDI[]>(facturasIniciales);
  const [nuevoOpen, setNuevoOpen] = useState(false);
  const [prefillTrxId, setPrefillTrxId] = useState<string | undefined>(undefined);
  const [viewFactura, setViewFactura] = useState<FacturaCFDI | null>(null);
  const [printOpen, setPrintOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<FacturaCFDI | null>(null);

  // Leer ?trx=ID para prefill desde Caja
  useEffect(() => {
    const trx = searchParams.get('trx');
    if (trx) {
      setPrefillTrxId(trx);
      setNuevoOpen(true);
      // Limpiar el query param
      const next = new URLSearchParams(searchParams);
      next.delete('trx');
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const folioSiguiente = useMemo(() => {
    const maxFolio = facturas.reduce((max, f) => {
      const n = parseInt(f.folio, 10);
      return Number.isNaN(n) ? max : Math.max(max, n);
    }, 0);
    return String(maxFolio + 1).padStart(4, '0');
  }, [facturas]);

  const stats = useMemo(() => {
    const vigentes = facturas.filter((f) => f.estado === 'vigente');
    const canceladas = facturas.filter((f) => f.estado === 'cancelada');
    const totalFacturado = vigentes.reduce((s, f) => s + f.total, 0);
    const ivaTrasladado = facturas.reduce(
      (s, f) => s + f.impuestos.traslados.reduce((a, t) => a + t.importe, 0),
      0,
    );
    return { totalFacturado, ivaTrasladado, vigentes: vigentes.length, canceladas: canceladas.length };
  }, [facturas]);

  const handleGenerate = (factura: FacturaCFDI) => {
    setFacturas((prev) => [factura, ...prev]);
    setNuevoOpen(false);
    setPrefillTrxId(undefined);
    setViewFactura(factura);
    setPrintOpen(true);
  };

  const handleView = (factura: FacturaCFDI) => {
    setViewFactura(factura);
    setPrintOpen(true);
  };

  const handleConfirmCancel = () => {
    if (!cancelTarget) return;
    setFacturas((prev) =>
      prev.map((f) => (f.id === cancelTarget.id ? { ...f, estado: 'cancelada' } : f)),
    );
    setCancelTarget(null);
  };

  return (
    <div className="p-4 md:p-6 h-full flex flex-col">
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-foreground-900 font-heading">Facturación (CFDI 4.0)</h1>
            <p className="text-xs text-foreground-500 mt-0.5">
              Emisor fiscal: {emisorFiscal.nombre} · RFC {emisorFiscal.rfc}
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={() => { setPrefillTrxId(undefined); setNuevoOpen(true); }}>
            <i className="ri-add-line"></i> Nueva factura
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-background-50 border border-secondary-200/70 rounded-xl p-3.5">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-6 h-6 flex items-center justify-center rounded-md bg-primary-50 text-primary-600">
                <i className="ri-money-dollar-circle-line text-xs"></i>
              </span>
              <p className="text-[11px] text-foreground-500 font-medium">Total facturado</p>
            </div>
            <p className="text-xl font-bold text-foreground-900 font-heading">
              ${stats.totalFacturado.toLocaleString('es-MX')}
            </p>
            <p className="text-[10px] text-foreground-400 mt-0.5">facturas vigentes</p>
          </div>
          <div className="bg-background-50 border border-secondary-200/70 rounded-xl p-3.5">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-6 h-6 flex items-center justify-center rounded-md bg-accent-50 text-accent-600">
                <i className="ri-percent-line text-xs"></i>
              </span>
              <p className="text-[11px] text-foreground-500 font-medium">IVA trasladado</p>
            </div>
            <p className="text-xl font-bold text-foreground-900 font-heading">
              ${stats.ivaTrasladado.toLocaleString('es-MX')}
            </p>
            <p className="text-[10px] text-foreground-400 mt-0.5">servicios gravados</p>
          </div>
          <div className="bg-background-50 border border-secondary-200/70 rounded-xl p-3.5">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-6 h-6 flex items-center justify-center rounded-md bg-emerald-50 text-emerald-600">
                <i className="ri-check-double-line text-xs"></i>
              </span>
              <p className="text-[11px] text-foreground-500 font-medium">Vigentes</p>
            </div>
            <p className="text-xl font-bold text-foreground-900 font-heading">{stats.vigentes}</p>
            <p className="text-[10px] text-foreground-400 mt-0.5">comprobantes activos</p>
          </div>
          <div className="bg-background-50 border border-secondary-200/70 rounded-xl p-3.5">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-6 h-6 flex items-center justify-center rounded-md bg-red-50 text-red-500">
                <i className="ri-close-circle-line text-xs"></i>
              </span>
              <p className="text-[11px] text-foreground-500 font-medium">Canceladas</p>
            </div>
            <p className="text-xl font-bold text-foreground-900 font-heading">{stats.canceladas}</p>
            <p className="text-[10px] text-foreground-400 mt-0.5">comprobantes anulados</p>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 min-h-0">
        <FacturasList
          facturas={facturas}
          onView={handleView}
          onCancelar={setCancelTarget}
        />
      </div>

      {/* Modals */}
      <NuevaFacturaModal
        open={nuevoOpen}
        onClose={() => { setNuevoOpen(false); setPrefillTrxId(undefined); }}
        transactions={transactions}
        prefillTransactionId={prefillTrxId}
        folioSiguiente={folioSiguiente}
        serie={SERIE}
        onGenerate={handleGenerate}
      />

      <FacturaPrintModal
        open={printOpen}
        onClose={() => { setPrintOpen(false); setViewFactura(null); }}
        factura={viewFactura}
      />

      {/* Cancel confirmation */}
      <Modal open={!!cancelTarget} onClose={() => setCancelTarget(null)} title="Cancelar CFDI" size="sm">
        {cancelTarget && (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <span className="w-9 h-9 flex items-center justify-center rounded-lg bg-red-500/10 text-red-500 shrink-0">
                <i className="ri-error-warning-line text-lg"></i>
              </span>
              <div>
                <p className="text-sm text-foreground-800">
                  ¿Cancelar la factura <strong className="font-mono">{cancelTarget.serie}-{cancelTarget.folio}</strong>?
                </p>
                <p className="text-xs text-foreground-500 mt-1">
                  La cancelación se registrará con motivo "01 — Comprobante emitido con errores con relación". Esta acción no se puede deshacer en el MVP.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setCancelTarget(null)}>
                Volver
              </Button>
              <Button variant="danger" size="sm" onClick={handleConfirmCancel}>
                <i className="ri-close-circle-line"></i> Cancelar CFDI
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}