import { useState, useRef } from 'react';
import Card from '@/components/base/Card';
import Button from '@/components/base/Button';
import { exportElementToPDF } from '@/utils/exportUtils';

export default function AvisoPrivacidad() {
  const [activeTab, setActiveTab] = useState<'integral' | 'simplificado'>('integral');
  const contentRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = async () => {
    const el = contentRef.current;
    if (!el) return;
    await exportElementToPDF(el, `Aviso_Privacidad_MediCore_${activeTab}_${new Date().toISOString().split('T')[0]}`, {
      title: `Aviso de Privacidad MediCore — ${activeTab === 'integral' ? 'Integral' : 'Simplificado'}`,
      orientation: 'portrait',
      margin: 8,
    });
  };

  const tabs = [
    { key: 'integral' as const, label: 'Aviso Integral', icon: 'ri-file-text-line' },
    { key: 'simplificado' as const, label: 'Aviso Simplificado', icon: 'ri-file-list-3-line' },
  ];

  return (
    <div className="space-y-5 max-w-5xl mx-auto" data-testid="page-aviso-privacidad">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground-900 font-heading">Aviso de Privacidad</h1>
          <p className="text-sm text-foreground-500 mt-1">
            Plantilla de referencia del producto (no es el aviso oficial del establecimiento)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={<i className="ri-printer-line"></i>} onClick={() => window.print()}>
            Imprimir
          </Button>
          <Button variant="secondary" size="sm" icon={<i className="ri-download-2-line"></i>} onClick={handleDownloadPDF}>
            Descargar PDF
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        Texto estático de demostración. Domicilio, razón social y contacto deben sustituirse por los
        del <strong>responsable del tratamiento</strong> del tenant (white-label pendiente). Esta
        pantalla <strong>no afirma</strong> cumplimiento LFPDPPP ni sustituye asesoría jurídica.
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-secondary-50 rounded-lg w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-background-50 text-foreground-900 shadow-sm'
                : 'text-foreground-500 hover:text-foreground-700'
            }`}
          >
            <span className="w-4 h-4 flex items-center justify-center">
              <i className={`${tab.icon} text-xs`}></i>
            </span>
            {tab.label}
          </button>
        ))}
      </div>

      <div ref={contentRef}>
      {activeTab === 'integral' ? (
        <Card padding="lg">
          <div className="space-y-6 text-sm text-foreground-700 leading-relaxed">
            <div className="text-center pb-4 border-b border-secondary-200">
              <h2 className="text-lg font-bold text-foreground-900 font-heading">
                AVISO DE PRIVACIDAD INTEGRAL
              </h2>
              <p className="text-xs text-foreground-500 mt-2">
                Última actualización: 15 de enero de 2026 · Vigencia: Indefinida · Responsable: MediCore Clínica S.A. de C.V.
              </p>
            </div>

            <section>
              <h3 className="text-base font-semibold text-foreground-900 mb-2 flex items-center gap-2">
                <span className="w-6 h-6 flex items-center justify-center rounded bg-primary-100 text-primary-600 text-xs font-bold">1</span>
                Identidad y domicilio del responsable
              </h3>
              <p>
                MediCore Clínica S.A. de C.V., con domicilio en Av. Insurgentes Sur 1845, Col. Del Valle, Alcaldía Benito Juárez, Ciudad de México, C.P. 03100, es el responsable del tratamiento de los datos personales que nos proporcione. Para cualquier asunto relacionado con este aviso de privacidad, puede contactar a nuestro Departamento de Protección de Datos a través del correo privacidad@medicore.mx o al teléfono 55-1234-5678, de lunes a viernes de 9:00 a 18:00 horas.
              </p>
            </section>

            <section>
              <h3 className="text-base font-semibold text-foreground-900 mb-2 flex items-center gap-2">
                <span className="w-6 h-6 flex items-center justify-center rounded bg-primary-100 text-primary-600 text-xs font-bold">2</span>
                Datos personales que recabamos
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                <div className="p-3 rounded-lg bg-secondary-50 border border-secondary-200">
                  <p className="font-medium text-foreground-800 mb-1">Datos de identificación</p>
                  <p className="text-xs text-foreground-600">Nombre completo, fecha de nacimiento, edad, sexo, CURP, estado civil, fotografía (para expediente).</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary-50 border border-secondary-200">
                  <p className="font-medium text-foreground-800 mb-1">Datos de contacto</p>
                  <p className="text-xs text-foreground-600">Teléfono fijo, celular, correo electrónico, domicilio particular.</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary-50 border border-secondary-200">
                  <p className="font-medium text-foreground-800 mb-1">Datos sensibles (requieren consentimiento expreso)</p>
                  <p className="text-xs text-foreground-600">Información de salud, diagnósticos, tratamientos, antecedentes médicos, resultados de estudios, alergias, información gineco-obstétrica.</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary-50 border border-secondary-200">
                  <p className="font-medium text-foreground-800 mb-1">Datos financieros</p>
                  <p className="text-xs text-foreground-600">Información de aseguradora, póliza, forma de pago, datos de facturación (RFC para CFDI).</p>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-base font-semibold text-foreground-900 mb-2 flex items-center gap-2">
                <span className="w-6 h-6 flex items-center justify-center rounded bg-primary-100 text-primary-600 text-xs font-bold">3</span>
                Finalidades del tratamiento
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="font-medium text-foreground-800 mb-1">Finalidades primarias (necesarias para la prestación del servicio):</p>
                  <ul className="list-disc list-inside space-y-1 text-xs text-foreground-600 pl-2">
                    <li>Prestación de servicios de atención médica integral</li>
                    <li>Elaboración, integración y conservación del expediente clínico (NOM-004-SSA3-2012, NOM-024-SSA3-2012)</li>
                    <li>Diagnóstico, tratamiento y seguimiento de la salud del paciente</li>
                    <li>Facturación, cobranza y emisión de comprobantes fiscales (CFDI)</li>
                    <li>Cumplimiento de obligaciones legales ante autoridades sanitarias (COFEPRIS, Secretaría de Salud)</li>
                    <li>Notificación de enfermedades de vigilancia epidemiológica (NOM-017-SSA2-2012)</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-foreground-800 mb-1">Finalidades secundarias (requieren consentimiento, puede negarlas):</p>
                  <ul className="list-disc list-inside space-y-1 text-xs text-foreground-600 pl-2">
                    <li>Envío de información sobre programas de prevención y promoción de la salud</li>
                    <li>Recordatorios de citas médicas y controles periódicos</li>
                    <li>Encuestas de satisfacción y mejora continua de la calidad</li>
                    <li>Ofertas de servicios médicos adicionales (marketing)</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-base font-semibold text-foreground-900 mb-2 flex items-center gap-2">
                <span className="w-6 h-6 flex items-center justify-center rounded bg-primary-100 text-primary-600 text-xs font-bold">4</span>
                Derechos ARCO
              </h3>
              <p className="mb-3">
                Usted tiene derecho a conocer qué datos personales tenemos de usted, para qué los utilizamos y las condiciones del uso que les damos (Acceso). Asimismo, es su derecho solicitar la corrección de su información personal en caso de que esté desactualizada, sea inexacta o incompleta (Rectificación); que la eliminemos de nuestros registros o bases de datos cuando considere que no está siendo utilizada adecuadamente (Cancelación); así como oponerse al uso de sus datos personales para fines específicos (Oposición).
              </p>
              <div className="p-3 rounded-lg bg-primary-50 border border-primary-200">
                <p className="text-xs text-primary-800">
                  <strong>Para ejercer sus derechos ARCO:</strong> Envíe una solicitud al Departamento de Protección de Datos a través del correo privacidad@medicore.mx o presente su solicitud en recepción. Le responderemos en un plazo máximo de 20 días hábiles. Deberá acreditar su identidad con credencial oficial vigente o CURP.
                </p>
              </div>
            </section>

            <section>
              <h3 className="text-base font-semibold text-foreground-900 mb-2 flex items-center gap-2">
                <span className="w-6 h-6 flex items-center justify-center rounded bg-primary-100 text-primary-600 text-xs font-bold">5</span>
                Transferencia de datos
              </h3>
              <p>
                Sus datos personales pueden ser transferidos a: aseguradoras para procesos de facturación y reembolso, unidades médicas receptoras en caso de referencia médica, autoridades sanitarias para notificaciones obligatorias, y laboratorios externos para procesamiento de estudios. En todos los casos, la transferencia se realiza conforme a las disposiciones legales aplicables y con las medidas de seguridad necesarias.
              </p>
            </section>

            <section>
              <h3 className="text-base font-semibold text-foreground-900 mb-2 flex items-center gap-2">
                <span className="w-6 h-6 flex items-center justify-center rounded bg-primary-100 text-primary-600 text-xs font-bold">6</span>
                Medidas de seguridad y conservación
              </h3>
              <p>
                Implementamos medidas de seguridad administrativas, técnicas y físicas para proteger sus datos personales contra daño, pérdida, alteración, destrucción o uso, acceso o tratamiento no autorizado. El expediente clínico se conserva por un mínimo de 5 años conforme a la NOM-004-SSA3-2012. La información sensible se cifra en tránsito y en reposo conforme a la NOM-024-SSA3-2012.
              </p>
            </section>

            <section>
              <h3 className="text-base font-semibold text-foreground-900 mb-2 flex items-center gap-2">
                <span className="w-6 h-6 flex items-center justify-center rounded bg-primary-100 text-primary-600 text-xs font-bold">7</span>
                Uso de cookies y tecnologías de seguimiento
              </h3>
              <p>
                En nuestro portal web utilizamos cookies técnicas necesarias para el funcionamiento del sistema de citas en línea. No utilizamos cookies de terceros para fines publicitarios ni de rastreo de comportamiento. Puede desactivar las cookies en la configuración de su navegador, aunque esto podría afectar la funcionalidad del portal.
              </p>
            </section>

            <section>
              <h3 className="text-base font-semibold text-foreground-900 mb-2 flex items-center gap-2">
                <span className="w-6 h-6 flex items-center justify-center rounded bg-primary-100 text-primary-600 text-xs font-bold">8</span>
                Cambios al aviso de privacidad
              </h3>
              <p>
                Nos reservamos el derecho de efectuar en cualquier momento modificaciones o actualizaciones al presente aviso de privacidad, para la atención de novedades legislativas, políticas internas o nuevos requerimientos para la prestación de nuestros servicios. Estas modificaciones estarán disponibles en el portal web de la clínica y en recepción de cada sucursal.
              </p>
            </section>

            <div className="pt-4 border-t border-secondary-200 text-center">
              <p className="text-xs text-foreground-500">
                Si tiene alguna duda sobre este Aviso de Privacidad, contacte a nuestro Departamento de Protección de Datos:
              </p>
              <p className="text-sm font-medium text-foreground-800 mt-1">
                privacidad@medicore.mx · 55-1234-5678 · Av. Insurgentes Sur 1845, CDMX
              </p>
              <p className="text-2xs text-foreground-400 mt-3">
                Documento elaborado conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP) y su Reglamento.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <Card padding="lg">
          <div className="space-y-5 text-sm text-foreground-700 leading-relaxed">
            <div className="text-center pb-4 border-b border-secondary-200">
              <h2 className="text-lg font-bold text-foreground-900 font-heading">
                AVISO DE PRIVACIDAD SIMPLIFICADO
              </h2>
              <p className="text-xs text-foreground-500 mt-2">
                MediCore Clínica · Responsable: MediCore Clínica S.A. de C.V.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-secondary-50 border border-secondary-200">
              <p className="text-sm text-foreground-700">
                <strong>MediCore Clínica</strong> es responsable de proteger sus datos personales. Utilizamos su información de salud para: atenderle médicamente, crear y conservar su expediente clínico, facturar servicios y cumplir con obligaciones legales sanitarias.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground-800 flex items-center gap-2">
                  <i className="ri-user-line text-primary-600"></i>
                  Datos que recabamos
                </h4>
                <ul className="list-disc list-inside text-xs text-foreground-600 space-y-1 pl-1">
                  <li>Nombre, fecha de nacimiento, CURP, sexo</li>
                  <li>Teléfono, correo, domicilio</li>
                  <li><strong>Datos sensibles:</strong> información de salud, diagnósticos, alergias, estudios</li>
                  <li>Datos de aseguradora y facturación</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground-800 flex items-center gap-2">
                  <i className="ri-shield-check-line text-emerald-600"></i>
                  Sus derechos
                </h4>
                <ul className="list-disc list-inside text-xs text-foreground-600 space-y-1 pl-1">
                  <li><strong>Acceso:</strong> Saber qué datos tenemos de usted</li>
                  <li><strong>Rectificación:</strong> Corregir datos inexactos</li>
                  <li><strong>Cancelación:</strong> Eliminar sus datos cuando ya no sean necesarios</li>
                  <li><strong>Oposición:</strong> Negar el uso para fines específicos</li>
                </ul>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
              <p className="text-xs text-amber-800">
                <strong>Consentimiento expreso:</strong> Para datos sensibles de salud requerimos su consentimiento expreso por escrito. Puede consultar el Aviso Integral completo arriba.
              </p>
            </div>

            <div className="text-center pt-2">
              <p className="text-xs text-foreground-500">
                Para ejercer sus derechos: <strong>privacidad@medicore.mx</strong> · Plazo de respuesta: 20 días hábiles
              </p>
              <p className="text-2xs text-foreground-400 mt-1">
                Domicilio: Av. Insurgentes Sur 1845, Col. Del Valle, CDMX · Tel: 55-1234-5678
              </p>
            </div>
          </div>
        </Card>
      )}
      </div>
    </div>
  );
}