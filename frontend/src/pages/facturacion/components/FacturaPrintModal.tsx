import { useRef } from 'react';
import Modal from '@/components/base/Modal';
import Button from '@/components/base/Button';
import Badge from '@/components/base/Badge';
import InstitucionalLogo from '@/components/feature/InstitucionalLogo';
import { exportElementToPDF } from '@/utils/exportUtils';
import type { FacturaCFDI } from '@/mocks/facturacion';

interface FacturaPrintModalProps {
  open: boolean;
  onClose: () => void;
  factura: FacturaCFDI | null;
}

function formatMoney(value: number): string {
  return `$${value.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`;
}

function buildXml(factura: FacturaCFDI): string {
  const conceptos = factura.conceptos
    .map(
      (c) => `    <cfdi:Concepto ClaveProdServ="${c.claveProdServ}" ClaveUnidad="${c.claveUnidad}" Cantidad="${c.cantidad}" Descripcion="${c.descripcion}" ValorUnitario="${c.valorUnitario.toFixed(2)}" Importe="${c.importe.toFixed(2)}" Descuento="${c.descuento.toFixed(2)}" />`,
    )
    .join('\n');

  const traslados = factura.impuestos.traslados
    .map(
      (t) => `      <cfdi:Traslado Base="${t.base.toFixed(2)}" Impuesto="${t.impuesto}" TipoFactor="${t.tipoFactor}" TasaOCuota="${t.tasaOCuota.toFixed(6)}" Importe="${t.importe.toFixed(2)}" />`,
    )
    .join('\n');

  const impuestosBlock =
    factura.impuestos.traslados.length > 0
      ? `  <cfdi:Impuestos TotalImpuestosTrasladados="${factura.impuestos.traslados
          .reduce((s, t) => s + t.importe, 0)
          .toFixed(2)}">\n    <cfdi:Traslados>\n${traslados}\n    </cfdi:Traslados>\n  </cfdi:Impuestos>`
      : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<cfdi:Comprobante xmlns:cfdi="http://www.sat.gob.mx/cfd/4"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd"
  Version="4.0"
  Serie="${factura.serie}"
  Folio="${factura.folio}"
  Fecha="${factura.fechaEmision}"
  Sello="${factura.selloCFD}"
  FormaPago="${factura.formaPago}"
  NoCertificado="${factura.certificadoSAT}"
  Certificado="${factura.certificadoSAT}"
  SubTotal="${factura.subtotal.toFixed(2)}"
  Descuento="${factura.descuento.toFixed(2)}"
  Moneda="${factura.moneda}"
  Total="${factura.total.toFixed(2)}"
  TipoDeComprobante="I"
  Exportacion="01"
  MetodoPago="${factura.metodoPago}"
  LugarExpedicion="06600">
  <cfdi:Emisor Rfc="${factura.rfcEmisor}" Nombre="${factura.nombreEmisor}" RegimenFiscal="${factura.regimenEmisor}" />
  <cfdi:Receptor Rfc="${factura.rfcReceptor}" Nombre="${factura.nombreReceptor}" UsoCFDI="${factura.usoCfdi}" RegimenFiscal="${factura.regimenReceptor}" DomicilioFiscalReceptor="06600" />
  <cfdi:Conceptos>
${conceptos}
  </cfdi:Conceptos>
${impuestosBlock}
  <cfdi:Complemento>
    <tfd:TimbreFiscalDigital xmlns:tfd="http://www.sat.gob.mx/TimbreFiscalDigital"
      Version="1.1"
      UUID="${factura.uuid}"
      FechaTimbrado="${factura.fechaTimbrado}"
      NoCertificadoSAT="${factura.certificadoSAT}"
      SelloCFD="${factura.selloCFD}"
      SelloSAT="${factura.selloSAT}" />
  </cfdi:Complemento>
</cfdi:Comprobante>`;
}

export default function FacturaPrintModal({ open, onClose, factura }: FacturaPrintModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!factura) return null;

  const ivaTotal = factura.impuestos.traslados.reduce((s, t) => s + t.importe, 0);
  const esCancelada = factura.estado === 'cancelada';

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    await exportElementToPDF(printRef.current, `CFDI_${factura.serie}_${factura.folio}`, {
      title: `CFDI ${factura.serie}-${factura.folio}`,
      orientation: 'portrait',
    });
  };

  const handleDownloadXml = () => {
    const xml = buildXml(factura);
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${factura.serie}_${factura.folio}.xml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Modal open={open} onClose={onClose} title={`Comprobante Fiscal Digital (CFDI 4.0)`} size="xl">
      <div className="space-y-4">
        {/* Printable content */}
        <div ref={printRef} className="bg-white border border-secondary-200 rounded-lg p-6 text-foreground-900">
          {/* Emisor header */}
          <div className="flex items-start justify-between pb-4 border-b border-secondary-200">
            <div className="flex items-center gap-3">
              <InstitucionalLogo
                fallbackClassName="w-11 h-11 rounded-lg bg-primary-500 text-white flex items-center justify-center flex-shrink-0"
                iconClassName="text-xl"
                imgClassName="w-11 h-11 object-contain flex-shrink-0"
              />
              <div>
                <p className="text-sm font-bold font-heading">{factura.nombreEmisor}</p>
                <p className="text-[11px] text-foreground-600">RFC: {factura.rfcEmisor}</p>
                <p className="text-[11px] text-foreground-500">
                  Régimen: {factura.regimenEmisor} — {factura.regimenEmisorNombre}
                </p>
                <p className="text-[11px] text-foreground-500">Av. Paseo de la Reforma 234, Col. Juárez, CDMX · Lugar de expedición: 06600</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary-100 text-foreground-700 text-[11px] font-semibold">
                <i className="ri-bill-line text-xs"></i> Factura (Ingreso)
              </span>
              <p className="text-xs font-bold mt-2">Serie {factura.serie} · Folio {factura.folio}</p>
              <Badge variant={esCancelada ? 'danger' : 'success'} size="sm">
                {esCancelada ? 'Cancelada' : 'Vigente'}
              </Badge>
            </div>
          </div>

          {/* UUID */}
          <div className="mt-4 bg-secondary-50/70 rounded-lg p-3 border border-secondary-200">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-foreground-500 font-semibold">Folio Fiscal (UUID)</p>
                <p className="text-sm font-mono font-semibold text-foreground-900">{factura.uuid}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-foreground-500">Fecha de emisión</p>
                <p className="text-xs font-semibold">{formatDateTime(factura.fechaEmision)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-foreground-500">Fecha de certificación</p>
                <p className="text-xs font-semibold">{formatDateTime(factura.fechaTimbrado)}</p>
              </div>
            </div>
          </div>

          {/* Receptor */}
          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
            <div className="col-span-2">
              <span className="text-foreground-500">Receptor:</span>{' '}
              <span className="font-semibold">{factura.nombreReceptor}</span>
            </div>
            <div>
              <span className="text-foreground-500">RFC receptor:</span>{' '}
              <span className="font-semibold">{factura.rfcReceptor}</span>
            </div>
            <div>
              <span className="text-foreground-500">Uso CFDI:</span>{' '}
              <span className="font-semibold">{factura.usoCfdi} — {factura.usoCfdiNombre}</span>
            </div>
            <div className="col-span-2">
              <span className="text-foreground-500">Régimen fiscal receptor:</span>{' '}
              <span>{factura.regimenReceptor} — {factura.regimenReceptorNombre}</span>
            </div>
            <div>
              <span className="text-foreground-500">Método de pago:</span>{' '}
              <span>{factura.metodoPago} — {factura.metodoPagoNombre}</span>
            </div>
            <div>
              <span className="text-foreground-500">Forma de pago:</span>{' '}
              <span>{factura.formaPago} — {factura.formaPagoNombre}</span>
            </div>
            <div>
              <span className="text-foreground-500">Moneda:</span>{' '}
              <span>{factura.moneda}</span>
            </div>
            <div>
              <span className="text-foreground-500">Tipo de comprobante:</span>{' '}
              <span>I (Ingreso)</span>
            </div>
          </div>

          {/* Conceptos */}
          <div className="mt-4">
            <p className="text-[10px] uppercase tracking-wide text-foreground-500 font-semibold mb-1.5">Conceptos</p>
            <div className="overflow-hidden rounded-lg border border-secondary-200">
              <table className="w-full text-[11px]">
                <thead className="bg-secondary-50">
                  <tr className="text-left text-foreground-600">
                    <th className="px-3 py-2 font-semibold">Clave</th>
                    <th className="px-3 py-2 font-semibold">Descripción</th>
                    <th className="px-3 py-2 font-semibold text-center">Cant.</th>
                    <th className="px-3 py-2 font-semibold text-right">V. Unitario</th>
                    <th className="px-3 py-2 font-semibold text-right">Importe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-100">
                  {factura.conceptos.map((c, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2 text-foreground-600">{c.claveProdServ}</td>
                      <td className="px-3 py-2 text-foreground-800">{c.descripcion}</td>
                      <td className="px-3 py-2 text-center">{c.cantidad}</td>
                      <td className="px-3 py-2 text-right">{formatMoney(c.valorUnitario)}</td>
                      <td className="px-3 py-2 text-right font-medium">{formatMoney(c.importe)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totales */}
          <div className="mt-4 flex justify-end">
            <div className="w-full max-w-xs space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-foreground-500">Subtotal</span>
                <span>{formatMoney(factura.subtotal)}</span>
              </div>
              {factura.descuento > 0 && (
                <div className="flex justify-between">
                  <span className="text-foreground-500">Descuento</span>
                  <span className="text-emerald-600">-{formatMoney(factura.descuento)}</span>
                </div>
              )}
              {factura.impuestos.traslados.length > 0 ? (
                <div className="flex justify-between">
                  <span className="text-foreground-500">IVA 16% (trasladado)</span>
                  <span>{formatMoney(ivaTotal)}</span>
                </div>
              ) : (
                <div className="flex justify-between">
                  <span className="text-foreground-500">IVA</span>
                  <span className="text-foreground-500 italic">Exento (servicio médico)</span>
                </div>
              )}
              <div className="flex justify-between border-t border-secondary-200 pt-2">
                <span className="font-bold">Total</span>
                <span className="font-bold font-heading text-base">{formatMoney(factura.total)} {factura.moneda}</span>
              </div>
            </div>
          </div>

          {/* Sello digital */}
          <div className="mt-4 pt-4 border-t border-dashed border-secondary-200 space-y-1.5">
            <p className="text-[10px] uppercase tracking-wide text-foreground-500 font-semibold">Sello digital del CFDI</p>
            <p className="text-[10px] font-mono text-foreground-600 break-all bg-secondary-50/70 p-2 rounded">{factura.selloCFD}</p>
            <p className="text-[10px] font-mono text-foreground-600 break-all bg-secondary-50/70 p-2 rounded">{factura.selloSAT}</p>
            <div className="flex items-start justify-between gap-4 mt-2">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-wide text-foreground-500 font-semibold mb-1">Cadena original</p>
                <p className="text-[10px] font-mono text-foreground-500 break-all">{factura.cadenaOriginal}</p>
              </div>
              {/* QR placeholder */}
              <div className="shrink-0 w-20 h-20 rounded border-2 border-dashed border-secondary-300 flex flex-col items-center justify-center text-foreground-400">
                <i className="ri-qr-code-line text-2xl"></i>
                <span className="text-[8px] mt-1 text-center px-1">Código QR SAT</span>
              </div>
            </div>
            <p className="text-[10px] text-foreground-500 mt-2">
              Este documento es una representación impresa de un CFDI. Consulte el comprobante en la página del SAT con el Folio Fiscal (UUID).
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 print:hidden">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cerrar
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDownloadXml}>
            <i className="ri-file-code-line"></i> Descargar XML
          </Button>
          <Button variant="primary" size="sm" onClick={handleDownloadPdf}>
            <i className="ri-download-2-line"></i> Descargar PDF
          </Button>
        </div>
      </div>
    </Modal>
  );
}