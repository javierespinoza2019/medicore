import { useState } from 'react';
import { fhirServers, fhirResourceTypes, fhirOperationTypes, fhirMessages, type FhirResourceType, type FhirMessage } from '@/mocks/hl7fhir';
import { patients } from '@/mocks/patients';
import { doctors } from '@/mocks/doctors';

const serverOptions = fhirServers.filter((s) => s.enabled);

const samplePayloads: Record<FhirResourceType, string> = {
  Patient: '{\n  "resourceType": "Patient",\n  "id": "medicore-{{patientId}}",\n  "identifier": [{\n    "system": "http://medicore.mx/expediente",\n    "value": "{{expediente}}"\n  }],\n  "name": [{\n    "family": "{{apellidos}}",\n    "given": ["{{nombre}}"]\n  }],\n  "gender": "{{genero}}",\n  "birthDate": "{{fechaNacimiento}}",\n  "address": [{\n    "city": "CDMX",\n    "country": "MX"\n  }]\n}',
  Observation: '{\n  "resourceType": "Observation",\n  "status": "final",\n  "category": [{\n    "coding": [{\n      "system": "http://terminology.hl7.org/CodeSystem/observation-category",\n      "code": "vital-signs"\n    }]\n  }],\n  "code": {\n    "coding": [{\n      "system": "http://loinc.org",\n      "code": "{{loincCode}}",\n      "display": "{{display}}"\n    }]\n  },\n  "subject": {\n    "reference": "Patient/medicore-{{patientId}}"\n  },\n  "effectiveDateTime": "{{fechaHora}}",\n  "valueQuantity": {\n    "value": {{valor}},\n    "unit": "{{unidad}}",\n    "system": "http://unitsofmeasure.org",\n    "code": "{{unidadCode}}"\n  }\n}',
  DiagnosticReport: '{\n  "resourceType": "DiagnosticReport",\n  "status": "final",\n  "category": [{\n    "coding": [{\n      "system": "http://terminology.hl7.org/CodeSystem/v2-0074",\n      "code": "LAB"\n    }]\n  }],\n  "code": {\n    "coding": [{\n      "system": "http://loinc.org",\n      "code": "{{loincCode}}"\n    }]\n  },\n  "subject": {\n    "reference": "Patient/medicore-{{patientId}}"\n  },\n  "effectiveDateTime": "{{fechaHora}}",\n  "conclusion": "{{conclusion}}"\n}',
  MedicationRequest: '{\n  "resourceType": "MedicationRequest",\n  "status": "active",\n  "intent": "order",\n  "medicationCodeableConcept": {\n    "coding": [{\n      "system": "http://www.whocc.no/atc",\n      "code": "{{atcCode}}",\n      "display": "{{medicamento}}"\n    }]\n  },\n  "subject": {\n    "reference": "Patient/medicore-{{patientId}}"\n  },\n  "authoredOn": "{{fechaHora}}",\n  "requester": {\n    "reference": "Practitioner/medicore-{{doctorId}}"\n  },\n  "dosageInstruction": [{\n    "text": "{{indicaciones}}"\n  }]\n}',
  Encounter: '{\n  "resourceType": "Encounter",\n  "status": "finished",\n  "class": {\n    "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",\n    "code": "AMB"\n  },\n  "subject": {\n    "reference": "Patient/medicore-{{patientId}}"\n  },\n  "participant": [{\n    "individual": {\n      "reference": "Practitioner/medicore-{{doctorId}}"\n    }\n  }],\n  "period": {\n    "start": "{{fechaInicio}}",\n    "end": "{{fechaFin}}"\n  }\n}',
  Condition: '{\n  "resourceType": "Condition",\n  "clinicalStatus": {\n    "coding": [{\n      "system": "http://terminology.hl7.org/CodeSystem/condition-clinical",\n      "code": "active"\n    }]\n  },\n  "code": {\n    "coding": [{\n      "system": "http://snomed.info/sct",\n      "code": "{{snomedCode}}",\n      "display": "{{diagnostico}}"\n    }]\n  },\n  "subject": {\n    "reference": "Patient/medicore-{{patientId}}"\n  }\n}',
  AllergyIntolerance: '{\n  "resourceType": "AllergyIntolerance",\n  "clinicalStatus": {\n    "coding": [{\n      "system": "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",\n      "code": "active"\n    }]\n  },\n  "code": {\n    "coding": [{\n      "system": "http://snomed.info/sct",\n      "code": "{{snomedCode}}"\n    }]\n  },\n  "patient": {\n    "reference": "Patient/medicore-{{patientId}}"\n  }\n}',
  Immunization: '{\n  "resourceType": "Immunization",\n  "status": "completed",\n  "vaccineCode": {\n    "coding": [{\n      "system": "http://hl7.org/fhir/sid/cvx",\n      "code": "{{cvxCode}}"\n    }]\n  },\n  "patient": {\n    "reference": "Patient/medicore-{{patientId}}"\n  },\n  "occurrenceDateTime": "{{fechaHora}}"\n}',
  Procedure: '{\n  "resourceType": "Procedure",\n  "status": "completed",\n  "code": {\n    "coding": [{\n      "system": "http://snomed.info/sct",\n      "code": "{{snomedCode}}"\n    }]\n  },\n  "subject": {\n    "reference": "Patient/medicore-{{patientId}}"\n  },\n  "performedDateTime": "{{fechaHora}}"\n}',
  Practitioner: '{\n  "resourceType": "Practitioner",\n  "id": "medicore-{{doctorId}}",\n  "identifier": [{\n    "system": "http://medicore.mx/cedula",\n    "value": "{{cedula}}"\n  }],\n  "name": [{\n    "family": "{{apellidos}}",\n    "given": ["{{nombre}}"]\n  }],\n  "qualification": [{\n    "code": {\n      "coding": [{\n        "system": "http://medicore.mx/especialidad",\n        "code": "{{especialidad}}"\n      }]\n    }\n  }]\n}',
  Organization: '{\n  "resourceType": "Organization",\n  "id": "org-medicore",\n  "identifier": [{\n    "system": "http://medicore.mx/rfc",\n    "value": "MED123456ABC"\n  }],\n  "name": "MediCore Clinica Integral",\n  "type": [{\n    "coding": [{\n      "system": "http://terminology.hl7.org/CodeSystem/organization-type",\n      "code": "prov",\n      "display": "Healthcare Provider"\n    }]\n  }],\n  "address": [{\n    "city": "Ciudad de Mexico",\n    "country": "MX"\n  }]\n}',
  Bundle: '{\n  "resourceType": "Bundle",\n  "id": "medicore-bundle-{{timestamp}}",\n  "type": "transaction",\n  "entry": [\n    {\n      "fullUrl": "urn:uuid:{{patientUuid}}",\n      "resource": {\n        "resourceType": "Patient",\n        "name": [{\n          "family": "{{apellidos}}",\n          "given": ["{{nombre}}"]\n        }]\n      },\n      "request": {\n        "method": "POST",\n        "url": "Patient"\n      }\n    }\n  ]\n}',
};

export default function FhirCreateMessage() {
  const [selectedServer, setSelectedServer] = useState(serverOptions[0]?.id || '');
  const [resourceType, setResourceType] = useState<FhirResourceType>('Patient');
  const [operation, setOperation] = useState<'create' | 'update' | 'read' | 'search' | 'delete' | 'transaction'>('create');
  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [customPayload, setCustomPayload] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; httpStatus?: number } | null>(null);

  const selectedPatient = patients.find((p) => p.id === patientId);
  const selectedDoctor = doctors.find((d) => d.id === doctorId);

  const generatePayload = () => {
    const template = samplePayloads[resourceType];
    const now = new Date();
    const isoNow = now.toISOString().replace(/\.\d{3}Z$/, 'Z');
    const dateOnly = now.toISOString().split('T')[0];

    let payload = template
      .replace(/\{\{patientId\}\}/g, patientId || 'p1')
      .replace(/\{\{expediente\}\}/g, selectedPatient?.expediente || 'EXP-0000')
      .replace(/\{\{nombre\}\}/g, selectedPatient?.nombre || 'Nombre')
      .replace(/\{\{apellidos\}\}/g, selectedPatient?.apellidos || 'Apellidos')
      .replace(/\{\{genero\}\}/g, selectedPatient?.genero === 'F' ? 'female' : 'male')
      .replace(/\{\{fechaNacimiento\}\}/g, selectedPatient?.fechaNacimiento || '1980-01-01')
      .replace(/\{\{doctorId\}\}/g, doctorId || 'd1')
      .replace(/\{\{cedula\}\}/g, selectedDoctor?.cedula || 'CED-00000000')
      .replace(/\{\{especialidad\}\}/g, selectedDoctor?.especialidad || 'Medicina General')
      .replace(/\{\{fechaHora\}\}/g, isoNow)
      .replace(/\{\{fechaInicio\}\}/g, isoNow)
      .replace(/\{\{fechaFin\}\}/g, isoNow)
      .replace(/\{\{timestamp\}\}/g, String(Date.now()))
      .replace(/\{\{patientUuid\}\}/g, `urn:uuid:${crypto.randomUUID?.() || 'uuid-' + Date.now()}`)
      .replace(/\{\{loincCode\}\}/g, '8867-4')
      .replace(/\{\{display\}\}/g, 'Heart rate')
      .replace(/\{\{valor\}\}/g, '72')
      .replace(/\{\{unidad\}\}/g, 'beats/minute')
      .replace(/\{\{unidadCode\}\}/g, '/min')
      .replace(/\{\{atcCode\}\}/g, 'C09CA01')
      .replace(/\{\{medicamento\}\}/g, 'Losartan')
      .replace(/\{\{indicaciones\}\}/g, '1 tableta VO c/24h')
      .replace(/\{\{conclusion\}\}/g, 'Resultado dentro de parametros normales')
      .replace(/\{\{snomedCode\}\}/g, '38341003')
      .replace(/\{\{diagnostico\}\}/g, 'Hipertension arterial')
      .replace(/\{\{cvxCode\}\}/g, '208');

    return payload;
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const payload = generatePayload();
      setCustomPayload(payload);
      setIsGenerating(false);
    }, 500);
  };

  const handleSimulateSend = () => {
    setIsGenerating(true);
    setResult(null);
    setTimeout(() => {
      const server = fhirServers.find((s) => s.id === selectedServer);
      const isError = !server?.enabled || (resourceType === 'DiagnosticReport' && patientId === 'p5');

      if (isError) {
        setResult({
          success: false,
          message: `Error 422 Unprocessable Entity: El servidor ${server?.nombre || 'seleccionado'} no esta disponible o la referencia del paciente no existe.`,
          httpStatus: 422,
        });
      } else {
        const newMsg: FhirMessage = {
          id: `msg-${Date.now()}`,
          serverId: selectedServer,
          serverName: server?.nombre || '',
          direction: 'outbound',
          status: 'sent',
          resourceType,
          resourceId: `${resourceType}/medicore-${patientId || 'new'}`,
          patientId: patientId || undefined,
          patientName: selectedPatient ? `${selectedPatient.nombre} ${selectedPatient.apellidos}` : undefined,
          fecha: new Date().toISOString().split('T')[0],
          hora: new Date().toTimeString().slice(0, 8),
          rawPayload: customPayload,
          httpStatus: 201,
          operation,
          endpointPath: `/${resourceType}`,
          correlationId: `corr-${Date.now()}`,
          userName: selectedDoctor?.nombre || 'Sistema',
        };
        fhirMessages.push(newMsg);
        setResult({
          success: true,
          message: `Mensaje enviado exitosamente. HTTP 201 Created. ID asignado: ${newMsg.resourceId}`,
          httpStatus: 201,
        });
      }
      setIsGenerating(false);
    }, 1200);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Configuration Panel */}
        <div className="lg:col-span-1 space-y-3">
          <div className="p-4 rounded-xl border border-secondary-200 bg-background-50">
            <h4 className="text-sm font-semibold text-foreground-800 mb-3 flex items-center gap-2">
              <i className="ri-settings-3-line text-primary-600"></i>
              Configuracion del mensaje
            </h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-foreground-600 mb-1">Servidor FHIR</label>
                <select
                  value={selectedServer}
                  onChange={(e) => setSelectedServer(e.target.value)}
                  className="w-full px-3 py-2 bg-background-50 border border-secondary-200 rounded-lg text-sm text-foreground-900 outline-none focus:border-primary-400 transition-base"
                >
                  {serverOptions.map((s) => (
                    <option key={s.id} value={s.id}>{s.nombre} ({s.version})</option>
                  ))}
                  {serverOptions.length === 0 && (
                    <option value="">No hay servidores activos</option>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-600 mb-1">Tipo de recurso FHIR</label>
                <select
                  value={resourceType}
                  onChange={(e) => {
                    setResourceType(e.target.value as FhirResourceType);
                    setCustomPayload('');
                    setResult(null);
                  }}
                  className="w-full px-3 py-2 bg-background-50 border border-secondary-200 rounded-lg text-sm text-foreground-900 outline-none focus:border-primary-400 transition-base"
                >
                  {fhirResourceTypes.map((rt) => (
                    <option key={rt.value} value={rt.value}>{rt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-600 mb-1">Operacion</label>
                <select
                  value={operation}
                  onChange={(e) => setOperation(e.target.value as typeof operation)}
                  className="w-full px-3 py-2 bg-background-50 border border-secondary-200 rounded-lg text-sm text-foreground-900 outline-none focus:border-primary-400 transition-base"
                >
                  {fhirOperationTypes.map((op) => (
                    <option key={op.value} value={op.value}>{op.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-600 mb-1">Paciente (opcional)</label>
                <select
                  value={patientId}
                  onChange={(e) => { setPatientId(e.target.value); setCustomPayload(''); setResult(null); }}
                  className="w-full px-3 py-2 bg-background-50 border border-secondary-200 rounded-lg text-sm text-foreground-900 outline-none focus:border-primary-400 transition-base"
                >
                  <option value="">Seleccionar paciente...</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre} {p.apellidos} ({p.expediente})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground-600 mb-1">Medico responsable (opcional)</label>
                <select
                  value={doctorId}
                  onChange={(e) => { setDoctorId(e.target.value); setCustomPayload(''); setResult(null); }}
                  className="w-full px-3 py-2 bg-background-50 border border-secondary-200 rounded-lg text-sm text-foreground-900 outline-none focus:border-primary-400 transition-base"
                >
                  <option value="">Seleccionar medico...</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>{d.nombre} ({d.especialidad})</option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-base cursor-pointer disabled:opacity-60 whitespace-nowrap"
            >
              {isGenerating ? <i className="ri-loader-4-line animate-spin"></i> : <i className="ri-magic-line"></i>}
              Generar payload FHIR
            </button>
          </div>

          {result && (
            <div className={`p-4 rounded-xl border ${result.success ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
              <div className="flex items-start gap-2.5">
                <span className={`w-6 h-6 flex items-center justify-center rounded-full flex-shrink-0 ${result.success ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                  <i className={`${result.success ? 'ri-check-line' : 'ri-close-line'} text-xs`}></i>
                </span>
                <div>
                  <p className={`text-sm font-semibold ${result.success ? 'text-emerald-700' : 'text-red-700'}`}>
                    {result.success ? 'Transmision exitosa' : 'Error en transmision'}
                  </p>
                  <p className="text-xs text-foreground-600 mt-1">{result.message}</p>
                  {result.httpStatus && (
                    <p className="text-xs font-mono mt-1">HTTP {result.httpStatus}</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Payload Editor */}
        <div className="lg:col-span-2">
          <div className="p-4 rounded-xl border border-secondary-200 bg-background-50 h-full flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-foreground-800 flex items-center gap-2">
                <i className="ri-code-box-line text-accent-600"></i>
                Payload JSON FHIR
              </h4>
              <div className="flex items-center gap-2">
                <span className="text-2xs text-foreground-400">{resourceType} · {operation.toUpperCase()}</span>
              </div>
            </div>
            <textarea
              value={customPayload}
              onChange={(e) => setCustomPayload(e.target.value)}
              placeholder="Genera o edita el payload JSON FHIR aqui..."
              rows={20}
              className="flex-1 w-full p-3 bg-secondary-100 rounded-lg border border-secondary-200 text-xs text-foreground-700 font-mono leading-relaxed outline-none focus:border-primary-400 transition-base resize-none min-h-[400px]"
              spellCheck={false}
            />
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={handleSimulateSend}
                disabled={!customPayload.trim() || isGenerating}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-base cursor-pointer disabled:opacity-60 whitespace-nowrap"
              >
                {isGenerating ? <i className="ri-loader-4-line animate-spin"></i> : <i className="ri-send-plane-line"></i>}
                Simular envio al servidor
              </button>
              <button
                onClick={() => { setCustomPayload(''); setResult(null); }}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-background-50 text-foreground-600 border border-secondary-200 rounded-lg hover:bg-secondary-100 transition-base cursor-pointer whitespace-nowrap"
              >
                <i className="ri-eraser-line"></i>
                Limpiar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}