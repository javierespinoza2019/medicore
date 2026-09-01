import { useState } from 'react';
import { getPatientById } from '@/mocks/patients';
import { getHistoriaClinicaByPatient } from '@/mocks/historiaClinica';
import HistoriaClinicaPrintModal from './HistoriaClinicaPrintModal';

function formatearFecha(fecha: string): string {
  if (!fecha) return '—';
  const [y, m, d] = fecha.split('-');
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${parseInt(d)} ${meses[parseInt(m) - 1]} ${y}`;
}

function Seccion({ icono, titulo, tono, children }: { icono: string; titulo: string; tono: string; children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-xl border border-secondary-200 bg-background-50">
      <h4 className="text-sm font-semibold text-foreground-800 flex items-center gap-2 mb-3">
        <span className={`w-6 h-6 flex items-center justify-center rounded-md ${tono}`} aria-hidden="true">
          <i className={`${icono} text-xs`}></i>
        </span>
        {titulo}
      </h4>
      {children}
    </div>
  );
}

function Dato({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="text-2xs text-foreground-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm text-foreground-700">{valor || 'Sin registro'}</p>
    </div>
  );
}

export default function HistoriaClinicaReadOnly({ patientId }: { patientId: string }) {
  const patient = getPatientById(patientId);
  const hc = getHistoriaClinicaByPatient(patientId);
  const [showPrintModal, setShowPrintModal] = useState(false);

  if (!hc) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-14 h-14 flex items-center justify-center rounded-full bg-secondary-100 mb-3">
          <i className="ri-folder-open-line text-xl text-foreground-400"></i>
        </div>
        <p className="text-sm font-medium text-foreground-700">Sin Historia Clínica registrada</p>
        <p className="text-xs text-foreground-500 mt-1 max-w-sm">
          La Historia Clínica se genera al realizar la primera consulta del paciente en el módulo de consultas.
        </p>
      </div>
    );
  }

  const sexo = patient?.sexo ?? 'F';

  return (
    <div className="space-y-4">
      {/* Encabezado */}
      <div className="flex items-center justify-between flex-wrap gap-3 px-4 py-3 bg-background-50 rounded-xl border border-secondary-200">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary-100 text-primary-600">
            <i className="ri-folder-history-line"></i>
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground-900">Historia Clínica</p>
            <p className="text-2xs text-foreground-400">Creada {formatearFecha(hc.fechaCreacion)} · Actualizada {formatearFecha(hc.fechaActualizacion)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-2xs text-foreground-500">{hc.creadoPor}</span>
          <button
            onClick={() => setShowPrintModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-background-50 border border-secondary-200 text-foreground-600 rounded-lg hover:bg-secondary-100 transition-base cursor-pointer whitespace-nowrap"
          >
            <i className="ri-printer-line"></i> Imprimir Historia Clínica
          </button>
        </div>
      </div>

      {/* Ficha de identificación */}
      <Seccion icono="ri-profile-line" titulo="Ficha de Identificación" tono="bg-primary-100 text-primary-600">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          <Dato label="Paciente" valor={patient ? `${patient.nombre} ${patient.apellidos}` : '—'} />
          <Dato label="Edad" valor={patient ? `${patient.edad} años` : '—'} />
          <Dato label="Sexo" valor={sexo === 'F' ? 'Femenino' : 'Masculino'} />
          <Dato label="Expediente" valor={patient?.expediente ?? '—'} />
          <Dato label="Ocupación" valor={hc.apnp.ocupacion} />
          <Dato label="Aseguradora" valor={patient?.aseguradora || 'Particular'} />
        </div>
      </Seccion>

      {/* AHF */}
      <Seccion icono="ri-parent-line" titulo="Antecedentes Heredofamiliares" tono="bg-sky-100 text-sky-600">
        {hc.ahf.length === 0 ? (
          <p className="text-sm text-foreground-500 italic">Sin antecedentes heredofamiliares registrados.</p>
        ) : (
          <div className="space-y-2.5">
            {hc.ahf.map((a) => (
              <div key={a.id} className="p-3 rounded-lg border border-secondary-100 bg-background-50">
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <span className="text-sm font-semibold text-foreground-800">{a.parentesco}</span>
                  <div className="flex flex-wrap gap-1">
                    {a.condiciones.map((c) => (
                      <span key={c} className="text-2xs bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded-full border border-sky-200">{c}</span>
                    ))}
                  </div>
                </div>
                {a.detalle && <p className="text-xs text-foreground-500">{a.detalle}</p>}
              </div>
            ))}
          </div>
        )}
      </Seccion>

      {/* APNP */}
      <Seccion icono="ri-user-settings-line" titulo="Antecedentes Personales No Patológicos" tono="bg-emerald-100 text-emerald-600">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Dato label="Tabaquismo" valor={hc.apnp.tabaquismo === 'negado' ? 'Negado' : hc.apnp.tabaquismo === 'activo' ? 'Activo' : 'Ex-fumador'} />
          <Dato label="Alcoholismo" valor={hc.apnp.alcoholismo === 'negado' ? 'Negado' : hc.apnp.alcoholismo === 'ocasional' ? 'Ocasional' : 'Frecuente'} />
          <Dato label="Toxicomanías" valor={hc.apnp.toxicomanias === 'negado' ? 'Negado' : 'Presente'} />
          <Dato label="Actividad física" valor={hc.apnp.actividadFisica} />
          <Dato label="Horas de sueño" valor={hc.apnp.horasSueno} />
          <Dato label="Inmunizaciones" valor={hc.apnp.inmunizaciones} />
          <Dato label="Alimentación" valor={hc.apnp.alimentacion} />
          <Dato label="Vivienda" valor={hc.apnp.vivienda} />
          <Dato label="Ocupación" valor={hc.apnp.ocupacion} />
          <Dato label="Riesgo laboral" valor={hc.apnp.riesgoLaboral} />
        </div>
        {hc.apnp.tabaquismoDetalle && <div className="mt-2"><Dato label="Detalle tabaquismo" valor={hc.apnp.tabaquismoDetalle} /></div>}
        {hc.apnp.alcoholismoDetalle && <div className="mt-2"><Dato label="Detalle alcoholismo" valor={hc.apnp.alcoholismoDetalle} /></div>}
        {hc.apnp.toxicomaniasDetalle && <div className="mt-2"><Dato label="Detalle toxicomanías" valor={hc.apnp.toxicomaniasDetalle} /></div>}
      </Seccion>

      {/* APP */}
      <Seccion icono="ri-mental-health-line" titulo="Antecedentes Personales Patológicos" tono="bg-amber-100 text-amber-600">
        {hc.app.length === 0 ? (
          <p className="text-sm text-foreground-500 italic">Sin antecedentes patológicos registrados.</p>
        ) : (
          <div className="space-y-1.5">
            {hc.app.map((a) => (
              <div key={a.id} className="flex items-center gap-2 p-2.5 rounded-lg border border-secondary-100 bg-background-50">
                <span className="text-2xs bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full border border-amber-200 whitespace-nowrap">{a.tipo}</span>
                <span className="text-sm text-foreground-700 flex-1">{a.descripcion}</span>
                {a.anio && <span className="text-2xs text-foreground-400 whitespace-nowrap">{a.anio}</span>}
              </div>
            ))}
          </div>
        )}
      </Seccion>

      {/* AGO */}
      {hc.ago && sexo === 'F' && (
        <Seccion icono="ri-women-line" titulo="Antecedentes Gineco-Obstétricos" tono="bg-rose-100 text-rose-600">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Dato label="Menarca" valor={hc.ago.menarca} />
            <Dato label="Ritmo" valor={hc.ago.ritmo} />
            <Dato label="FUM" valor={hc.ago.fum} />
            <Dato label="G / P / A / C" valor={`${hc.ago.gestas}/${hc.ago.partos}/${hc.ago.abortos}/${hc.ago.cesareas}`} />
            <Dato label="Método anticonceptivo" valor={hc.ago.metodoAnticonceptivo} />
            <Dato label="Último Papanicolau" valor={hc.ago.ultimoPapanicolau} />
            <Dato label="Mastografía" valor={hc.ago.mastografia} />
          </div>
        </Seccion>
      )}

      {/* Interrogatorio */}
      <Seccion icono="ri-stethoscope-line" titulo="Interrogatorio por Aparatos y Sistemas" tono="bg-violet-100 text-violet-600">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {hc.interrogatorio.map((s) => (
            <div key={s.id} className={`p-2.5 rounded-lg border ${s.estado === 'anormal' ? 'bg-red-500/5 border-red-500/20' : 'bg-background-50 border-secondary-100'}`}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-foreground-700">{s.sistema}</p>
                <span className={`text-2xs px-1.5 py-0.5 rounded-full font-medium ${s.estado === 'anormal' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {s.estado === 'anormal' ? 'Anormal' : 'Normal'}
                </span>
              </div>
              {s.estado === 'anormal' && s.detalle && <p className="text-xs text-foreground-600 mt-1">{s.detalle}</p>}
            </div>
          ))}
        </div>
      </Seccion>

      {/* Observaciones */}
      {hc.observaciones && (
        <Seccion icono="ri-sticky-note-line" titulo="Observaciones Generales" tono="bg-secondary-100 text-foreground-500">
          <p className="text-sm text-foreground-700 leading-relaxed whitespace-pre-wrap">{hc.observaciones}</p>
        </Seccion>
      )}

      {/* Modal de impresión */}
      {showPrintModal && (
        <HistoriaClinicaPrintModal
          patientId={patientId}
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </div>
  );
}