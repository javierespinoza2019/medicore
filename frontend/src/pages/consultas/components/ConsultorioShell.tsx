/**
 * Shell del consultorio: identidad, episodio, tabs nota/historia y recetas del episodio.
 * API real M6/M7/M8; sin mocks. Cierre SC-04 en urgencias (AtencionUrgenciaPanel).
 */
import { useState } from 'react';
import { estadoConfig, type EncounterDto } from '@/api/encounters';
import { displayNameOf, type SubjectDto } from '@/api/subjects';
import type { PrescriptionDto } from '@/api/prescriptions';
import Button from '@/components/base/Button';
import Card from '@/components/base/Card';
import Tabs from '@/components/base/Tabs';
import IdentityHeader from '@/components/feature/IdentityHeader';
import ClinicalNotesPanel from '@/pages/consultas/components/ClinicalNotesPanel';
import EncounterPrescriptionList from '@/pages/consultas/components/EncounterPrescriptionList';
import HistoriaClinicaForm from '@/pages/consultas/components/HistoriaClinicaForm';
import RecetaInlineCreator from '@/pages/consultas/components/RecetaInlineCreator';
import { formatConsultArrival } from '@/utils/consultPresentation';

const CONSULTORIO_TABS = [
  { key: 'nota', label: 'Nota clínica', icon: 'ri-file-text-line' },
  { key: 'historia', label: 'Historia clínica', icon: 'ri-folder-history-line' },
];

type Props = {
  encounter: EncounterDto;
  subject: SubjectDto;
  doctorId: string;
  doctorName: string;
  doctorCedula: string;
  sucursalNombre?: string;
  prescriptions: PrescriptionDto[];
  onBack: () => void;
  onPrescriptionChange: (rx: PrescriptionDto) => void;
};

export default function ConsultorioShell({
  encounter,
  subject,
  doctorId,
  doctorName,
  doctorCedula,
  sucursalNombre = '',
  prescriptions,
  onBack,
  onPrescriptionChange,
}: Props) {
  const [activeTab, setActiveTab] = useState('nota');
  const [showReceta, setShowReceta] = useState(false);

  const patientName = displayNameOf(subject);
  const patientExpediente =
    subject.recordNumber || subject.activeLabel?.operationalLabel || '';

  return (
    <div className="space-y-4" data-testid="consultorio-shell">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground-900">Consultorio</h1>
          <p className="text-sm text-foreground-500">
            Nota SOAP, historia y receta (API). Sin estudios/certificados inventados en este shell.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={onBack}>
          Volver al listado
        </Button>
      </div>

      <IdentityHeader subject={subject} />

      <Card padding="md">
        <div className="flex flex-wrap items-center gap-3 text-sm text-foreground-600">
          <span>
            Turno <strong className="text-foreground-900">{encounter.turnNumber}</strong>
          </span>
          <span
            className={`rounded px-2 py-0.5 text-xs ${
              estadoConfig[encounter.state]?.className ?? 'bg-secondary-100 text-foreground-700'
            }`}
          >
            {estadoConfig[encounter.state]?.label ?? encounter.state}
          </span>
          <span>Llegada {formatConsultArrival(encounter.arrivalAtUtc)}</span>
          <span className="text-foreground-400">·</span>
          <span>Consulta externa</span>
        </div>
      </Card>

      <Card padding="none">
        <div className="border-b border-secondary-200 px-5 pt-2">
          <Tabs
            id="consultorio-tab"
            tabs={CONSULTORIO_TABS}
            activeTab={activeTab}
            onChange={setActiveTab}
            ariaLabel="Secciones del consultorio"
          />
        </div>
        <div className="p-4 md:p-5">
          {activeTab === 'nota' && (
            <div data-testid="panel-notas-clinicas">
              <ClinicalNotesPanel
                encounterId={encounter.encounterId}
                defaultNoteType="evolucion"
              />
            </div>
          )}
          {activeTab === 'historia' && (
            <HistoriaClinicaForm patientId={subject.subjectId} doctorName={doctorName} />
          )}
        </div>
      </Card>

      <Card padding="md">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-foreground-900">Recetas del episodio</h2>
          {!showReceta && (
            <Button variant="primary" size="sm" onClick={() => setShowReceta(true)}>
              Nueva receta
            </Button>
          )}
        </div>
        {showReceta && (
          <RecetaInlineCreator
            consultaId={encounter.encounterId}
            patientId={subject.subjectId}
            patientName={patientName}
            patientExpediente={patientExpediente}
            doctorId={doctorId}
            doctorName={doctorName}
            doctorCedula={doctorCedula}
            diagnosticoRelacionado=""
            onRecetaCreada={(rx) => {
              onPrescriptionChange(rx);
              setShowReceta(false);
            }}
            onCancel={() => setShowReceta(false)}
          />
        )}
        {!showReceta && (
          <EncounterPrescriptionList
            prescriptions={prescriptions}
            patientName={patientName}
            patientExpediente={patientExpediente}
            sucursalNombre={sucursalNombre}
            onUpdated={onPrescriptionChange}
          />
        )}
      </Card>
    </div>
  );
}
