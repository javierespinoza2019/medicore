import { useState, useMemo, useEffect } from 'react';
import Modal from '@/components/base/Modal';
import Button from '@/components/base/Button';
import Input from '@/components/base/Input';
import Select from '@/components/base/Select';
import { emisorFiscal, usosCfdi, regimenesFiscales, formasPago, metodosPago, metodoPagoCajaASat } from '@/mocks/facturacion';
import type { FacturaCFDI } from '@/mocks/facturacion';
import type { CashTransaction } from '@/mocks/caja';

interface NuevaFacturaModalProps {
  open: boolean;
  onClose: () => void;
  transactions: CashTransaction[];
  prefillTransactionId?: string;
  folioSiguiente: string;
  serie: string;
  onGenerate: (factura: FacturaCFDI) => void;
}

function generateUuid(): string {
  const hex = '0123456789ABCDEF';
  const seg = (n: number) =>
    Array.from({ length: n }, () => hex[Math.floor(Math.random() * 16)]).join('');
  return `${seg(8)}-${seg(4)}-${seg(4)}-${seg(4)}-${seg(12)}`;
}

export default function NuevaFacturaModal({
  open,
  onClose,
  transactions,
  prefillTransactionId,
  folioSiguiente,
  serie,
  onGenerate,
}: NuevaFacturaModalProps) {
  const pagadas = useMemo(() => transactions.filter((t) => t.estado === 'pagado'), [transactions]);

  const [transaccionId, setTransaccionId] = useState('');
  const [rfcReceptor, setRfcReceptor] = useState('');
  const [nombreReceptor, setNombreReceptor] = useState('');
  const [regimenReceptor, setRegimenReceptor] = useState('612');
  const [usoCfdi, setUsoCfdi] = useState('D01');
  const [correo, setCorreo] = useState('');
  const [metodoPago, setMetodoPago] = useState('PUE');
  const [formaPago, setFormaPago] = useState('01');
  const [aplicaIva, setAplicaIva] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const transaccion = useMemo(
    () => pagadas.find((t) => t.id === transaccionId) || null,
    [pagadas, transaccionId],
  );

  // Prefill from transaction (selected via query param or user pick)
  useEffect(() => {
    if (!open) return;
    const initialId = prefillTransactionId || pagadas[0]?.id || '';
    setTransaccionId(initialId);
  }, [open, prefillTransactionId, pagadas]);

  // Auto-fill receptor + forma pago when transaction changes
  useEffect(() => {
    if (!transaccion) return;
    setNombreReceptor(transaccion.paciente);
    const sat = metodoPagoCajaASat[transaccion.metodoPago];
    if (sat) setFormaPago(sat.formaPago);
  }, [transaccion]);

  const subtotal = transaccion ? transaccion.subtotal : 0;
  const descuento = transaccion ? transaccion.descuento : 0;
  const baseGravable = subtotal - descuento;
  const iva = aplicaIva ? Math.round(baseGravable * 0.16 * 100) / 100 : 0;
  const total = baseGravable + iva;

  const resetForm = () => {
    setRfcReceptor('');
    setNombreReceptor('');
    setRegimenReceptor('612');
    setUsoCfdi('D01');
    setCorreo('');
    setMetodoPago('PUE');
    setAplicaIva(false);
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!transaccion) errs.transaccion = 'Selecciona un cobro a facturar';
    if (!rfcReceptor.trim()) errs.rfc = 'El RFC del receptor es obligatorio';
    else if (!/^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/.test(rfcReceptor.trim().toUpperCase())) {
      errs.rfc = 'Formato de RFC inválido (ej. XAXX010101000)';
    }
    if (!nombreReceptor.trim()) errs.nombre = 'El nombre del receptor es obligatorio';
    if (!correo.trim()) errs.correo = 'El correo es obligatorio';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) {
      errs.correo = 'Correo electrónico inválido';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleGenerate = () => {
    if (!validate() || !transaccion) return;

    const usoNombre = usosCfdi.find((u) => u.value === usoCfdi)?.label.split(' — ')[1] || usoCfdi;
    const regimenNombre =
      regimenesFiscales.find((r) => r.value === regimenReceptor)?.label.split(' — ')[1] || regimenReceptor;
    const formaNombre = formasPago.find((f) => f.value === formaPago)?.label.split(' — ')[1] || formaPago;
    const metodoNombre = metodosPago.find((m) => m.value === metodoPago)?.label.split(' — ')[1] || metodoPago;

    const now = new Date();
    const fechaISO = now.toISOString().slice(0, 19);
    const uuid = generateUuid();

    const claveProdServ = transaccion.origen === 'estudio'
      ? '85121802'
      : transaccion.origen === 'urgencia'
      ? '85121800'
      : '85121801';

    const factura: FacturaCFDI = {
      id: `fac-${Date.now()}`,
      serie,
      folio: folioSiguiente,
      uuid,
      fechaEmision: fechaISO,
      fechaTimbrado: fechaISO,
      rfcEmisor: emisorFiscal.rfc,
      nombreEmisor: emisorFiscal.nombre,
      regimenEmisor: emisorFiscal.regimen,
      regimenEmisorNombre: emisorFiscal.regimenNombre,
      rfcReceptor: rfcReceptor.trim().toUpperCase(),
      nombreReceptor: nombreReceptor.trim(),
      regimenReceptor,
      regimenReceptorNombre: regimenNombre,
      usoCfdi,
      usoCfdiNombre: usoNombre,
      correoReceptor: correo.trim(),
      metodoPago,
      metodoPagoNombre: metodoNombre,
      formaPago,
      formaPagoNombre: formaNombre,
      moneda: 'MXN',
      subtotal,
      descuento,
      total,
      impuestos: {
        traslados: aplicaIva
          ? [{ impuesto: '002', tipoFactor: 'Tasa', tasaOCuota: 0.16, base: baseGravable, importe: iva }]
          : [],
      },
      conceptos: [
        {
          claveProdServ,
          claveUnidad: 'E48',
          descripcion: transaccion.concepto,
          cantidad: 1,
          valorUnitario: subtotal,
          importe: subtotal,
          descuento,
        },
      ],
      estado: 'vigente',
      transaccionId: transaccion.id,
      pacienteId: transaccion.pacienteId,
      paciente: transaccion.paciente,
      usuario: transaccion.usuario,
      certificadoSAT: '00001000000409193623',
      selloCFD: generateUuid().replace(/-/g, '').toUpperCase(),
      selloSAT: generateUuid().replace(/-/g, '').toUpperCase(),
      cadenaOriginal: `||4.0|${serie}|${folioSiguiente}|${fechaISO}|${formaPago}|${metodoPago}|${total.toFixed(2)}|MXN|${usoCfdi}|${emisorFiscal.rfc}|${emisorFiscal.nombre}|${emisorFiscal.regimen}|${rfcReceptor.toUpperCase()}|${nombreReceptor}|`,
    };

    onGenerate(factura);
    resetForm();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Generar CFDI 4.0 (Factura)" size="lg">
      <div className="space-y-4">
        {/* Paso 1: cobro a facturar */}
        <div>
          <p className="text-xs font-semibold text-foreground-800 mb-1.5">1. Cobro a facturar</p>
          <Select
            value={transaccionId}
            onChange={(e) => setTransaccionId(e.target.value)}
            options={pagadas.map((t) => ({
              value: t.id,
              label: `${t.paciente} — ${t.concepto} ($${t.total.toLocaleString()})`,
            }))}
            placeholder="Selecciona un cobro"
            error={errors.transaccion}
          />
        </div>

        {transaccion && (
          <div className="bg-secondary-50/70 rounded-lg p-3 border border-secondary-200">
            <div className="flex items-center justify-between text-xs">
              <span className="text-foreground-500">Concepto</span>
              <span className="font-semibold text-foreground-800">{transaccion.concepto}</span>
            </div>
            <div className="flex items-center justify-between text-xs mt-1">
              <span className="text-foreground-500">Subtotal</span>
              <span className="font-semibold">${subtotal.toLocaleString('es-MX')}</span>
            </div>
            <div className="flex items-center justify-between text-xs mt-1">
              <span className="text-foreground-500">Recibo de origen</span>
              <span className="font-mono">{transaccion.recibo}</span>
            </div>
          </div>
        )}

        {/* Paso 2: datos del receptor */}
        <div>
          <p className="text-xs font-semibold text-foreground-800 mb-1.5">2. Datos del receptor</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="RFC del receptor"
              placeholder="XAXX010101000"
              value={rfcReceptor}
              onChange={(e) => setRfcReceptor(e.target.value.toUpperCase())}
              error={errors.rfc}
              required
            />
            <Input
              label="Nombre / Razón social"
              placeholder="Nombre del receptor"
              value={nombreReceptor}
              onChange={(e) => setNombreReceptor(e.target.value)}
              error={errors.nombre}
              required
            />
            <Select
              label="Régimen fiscal"
              value={regimenReceptor}
              onChange={(e) => setRegimenReceptor(e.target.value)}
              options={regimenesFiscales}
            />
            <Select
              label="Uso de CFDI"
              value={usoCfdi}
              onChange={(e) => setUsoCfdi(e.target.value)}
              options={usosCfdi}
            />
            <div className="sm:col-span-2">
              <Input
                label="Correo electrónico"
                type="email"
                placeholder="correo@receptor.mx"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                error={errors.correo}
                required
              />
            </div>
          </div>
        </div>

        {/* Paso 3: forma de pago e impuestos */}
        <div>
          <p className="text-xs font-semibold text-foreground-800 mb-1.5">3. Pago e impuestos</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Método de pago"
              value={metodoPago}
              onChange={(e) => setMetodoPago(e.target.value)}
              options={metodosPago}
            />
            <Select
              label="Forma de pago"
              value={formaPago}
              onChange={(e) => setFormaPago(e.target.value)}
              options={formasPago}
            />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAplicaIva((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-base cursor-pointer whitespace-nowrap ${
                aplicaIva
                  ? 'bg-primary-500 text-white'
                  : 'bg-secondary-100 text-foreground-500 hover:bg-secondary-200/70'
              }`}
            >
              <span className="w-3.5 h-3.5 flex items-center justify-center">
                <i className="ri-percent-line text-xs"></i>
              </span>
              Trasladar IVA 16%
            </button>
            {!aplicaIva && (
              <span className="text-[11px] text-foreground-500 italic">Servicio médico exento de IVA</span>
            )}
          </div>
        </div>

        {/* Resumen */}
        <div className="bg-secondary-50/70 rounded-lg p-3 border border-secondary-200 text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-foreground-500">Subtotal</span>
            <span>${subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
          </div>
          {descuento > 0 && (
            <div className="flex justify-between">
              <span className="text-foreground-500">Descuento</span>
              <span className="text-emerald-600">-${descuento.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          {aplicaIva && (
            <div className="flex justify-between">
              <span className="text-foreground-500">IVA 16%</span>
              <span>${iva.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-secondary-200 pt-2">
            <span className="font-bold">Total</span>
            <span className="font-bold font-heading text-sm">${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</span>
          </div>
          <p className="text-[10px] text-foreground-400 pt-1">
            Serie {serie} · Folio {folioSiguiente} · Emisor: {emisorFiscal.nombre} ({emisorFiscal.rfc})
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={handleClose}>
            Cancelar
          </Button>
          <Button variant="primary" size="sm" onClick={handleGenerate} disabled={!transaccion}>
            <i className="ri-file-shield-2-line"></i> Timbrar y generar CFDI
          </Button>
        </div>
      </div>
    </Modal>
  );
}