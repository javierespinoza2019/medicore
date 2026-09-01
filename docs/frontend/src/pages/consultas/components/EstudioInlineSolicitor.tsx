import { useState, useMemo } from 'react';
import { catalogoEstudios, type EstudioCatalogo, type EstudioSolicitado } from '@/mocks/estudios';
import { useCaja } from '@/hooks/useCajaContext';

const MAX_ESTUDIO_SEARCH = 100;
const MAX_ESTUDIO_LIBRE = 200;

interface Props {
  consultaId: string;
  patientId: string;
  patientName: string;
  patientExpediente: string;
  doctorId: string;
  doctorName: string;
  diagnosticoRelacionado: string;
  onEstudioCreado: (estudios: EstudioSolicitado[]) => void;
  onCancel: () => void;
}

export default function EstudioInlineSolicitor({
  consultaId, patientId, patientName, patientExpediente,
  doctorId, doctorName, diagnosticoRelacionado,
  onEstudioCreado, onCancel,
}: Props) {
  const [estudioSearch, setEstudioSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [estudioLibre, setEstudioLibre] = useState('');
  const [saving, setSaving] = useState(false);
  const { addTransaction } = useCaja();

  const now = new Date();
  const fecha = now.toISOString().split('T')[0];
  const hora = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const filtered = useMemo(() => {
    if (!estudioSearch.trim()) return catalogoEstudios;
    const q = estudioSearch.toLowerCase();
    return catalogoEstudios.filter(
      (e) => e.nombre.toLowerCase().includes(q) || e.categoria.toLowerCase().includes(q) || e.tipo.toLowerCase().includes(q)
    );
  }, [estudioSearch]);

  const grouped = useMemo(() => {
    const groups = new Map<string, EstudioCatalogo[]>();
    filtered.forEach((e) => {
      const key = e.tipo.charAt(0).toUpperCase() + e.tipo.slice(1);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(e);
    });
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const tipoColors: Record<string, string> = {
    Laboratorio: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    Imagen: 'bg-sky-100 text-sky-700 border-sky-200',
    Gabinete: 'bg-amber-100 text-amber-700 border-amber-200',
    Patologia: 'bg-violet-100 text-violet-700 border-violet-200',
    Otro: 'bg-secondary-100 text-foreground-600 border-secondary-200',
  };

  // Precio total estimado de estudios seleccionados del catálogo
  const precioTotal = useMemo(() => {
    let total = 0;
    selectedIds.forEach((id) => {
      const cat = catalogoEstudios.find((e) => e.id === id);
      if (cat) total += cat.precio;
    });
    return total;
  }, [selectedIds]);

  const handleSave = () => {
    const selections: EstudioSolicitado[] = [];
    const selectedCats: EstudioCatalogo[] = [];

    selectedIds.forEach((id) => {
      const cat = catalogoEstudios.find((e) => e.id === id);
      if (!cat) return;
      selectedCats.push(cat);
      selections.push({
        id: `es-${Date.now()}-${id}`,
        patientId,
        patientName,
        patientExpediente,
        doctorId,
        doctorName,
        consultaId,
        estudioCatalogoId: cat.id,
        nombre: cat.nombre,
        tipo: cat.tipo,
        categoria: cat.categoria,
        fechaSolicitud: fecha,
        horaSolicitud: hora,
        fechaResultado: null,
        estado: 'solicitado',
        resultado: null,
        parametros: [],
        archivosAdjuntos: 0,
        numeroReferencia: `EST-${fecha.replace(/-/g, '')}-${String(Math.floor(Math.random() * 999)).padStart(3, '0')}`,
        notas: '',
        diagnosticoRelacionado,
      });
    });

    if (estudioLibre.trim()) {
      selections.push({
        id: `es-${Date.now()}-libre`,
        patientId,
        patientName,
        patientExpediente,
        doctorId,
        doctorName,
        consultaId,
        estudioCatalogoId: '',
        nombre: estudioLibre.trim(),
        tipo: 'otro',
        categoria: 'Personalizado',
        fechaSolicitud: fecha,
        horaSolicitud: hora,
        fechaResultado: null,
        estado: 'solicitado',
        resultado: null,
        parametros: [],
        archivosAdjuntos: 0,
        numeroReferencia: `EST-${fecha.replace(/-/g, '')}-${String(Math.floor(Math.random() * 999)).padStart(3, '0')}`,
        notas: '',
        diagnosticoRelacionado,
      });
    }

    if (selections.length === 0) return;

    setSaving(true);
    setTimeout(() => {
      onEstudioCreado(selections);
      // Registrar cobro en Caja por cada estudio del catálogo
      selectedCats.forEach((cat, idx) => {
        addTransaction({
          pacienteId: patientId,
          paciente: patientName,
          concepto: `Estudio: ${cat.nombre}`,
          subtotal: cat.precio,
          descuento: 0,
          total: cat.precio,
          metodoPago: 'efectivo',
          notas: `Solicitud desde consulta. Tipo: ${cat.tipo}. Dx: ${diagnosticoRelacionado}`,
          origen: 'estudio',
          consultaId,
          consultaDoctor: doctorName,
        });
      });
      setSaving(false);
    }, 400);
  };

  const totalSelected = selectedIds.size + (estudioLibre.trim() ? 1 : 0);

  return (
    <div className="bg-background-50 rounded-xl border border-secondary-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-secondary-200 bg-background-50">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 flex items-center justify-center rounded bg-accent-100 text-accent-600">
            <i className="ri-microscope-line text-sm"></i>
          </span>
          <div>
            <h3 className="text-sm font-semibold text-foreground-800">Solicitar Estudios</h3>
            <p className="text-2xs text-foreground-400">{patientName} · {diagnosticoRelacionado || 'Sin diagnóstico'}</p>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="w-7 h-7 flex items-center justify-center rounded-full text-foreground-400 hover:text-foreground-600 hover:bg-secondary-100 transition-base cursor-pointer"
        >
          <i className="ri-close-line text-sm"></i>
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Buscador */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-foreground-400 pointer-events-none" aria-hidden="true">
            <i className="ri-search-line text-sm"></i>
          </span>
          <input
            type="search"
            value={estudioSearch}
            onChange={(e) => setEstudioSearch(e.target.value)}
            placeholder="Buscar estudio por nombre o categoría..."
            maxLength={MAX_ESTUDIO_SEARCH}
            aria-label="Buscar estudio del catálogo"
            aria-autocomplete="list"
            className="w-full pl-9 pr-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-accent-400 focus:ring-2 focus:ring-accent-100 transition-base"
          />
        </div>

        {/* Resumen de selección + precio */}
        {totalSelected > 0 && (
          <div className="flex items-center justify-between gap-2 px-3 py-2 bg-accent-50 border border-accent-200/50 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 flex items-center justify-center rounded-full bg-accent-100 text-accent-600 text-2xs font-bold">
                {totalSelected}
              </span>
              <p className="text-xs font-medium text-accent-700">
                {totalSelected} estudio{totalSelected > 1 ? 's' : ''} seleccionado{totalSelected > 1 ? 's' : ''}
              </p>
            </div>
            {precioTotal > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">
                <i className="ri-bank-card-line"></i>
                <span className="font-semibold">Cargo a Caja: ${precioTotal.toLocaleString('es-MX')}</span>
              </div>
            )}
          </div>
        )}

        {/* Lista agrupada por tipo */}
        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {grouped.map(([tipo, items]) => (
            <div key={tipo}>
              <h4 className="text-2xs font-semibold text-foreground-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full border text-2xs ${tipoColors[tipo] || tipoColors.Otro}`}>
                  {tipo}
                </span>
                <span className="text-foreground-400">{items.length} estudio{items.length > 1 ? 's' : ''}</span>
              </h4>
              <div className="space-y-1">
                {items.map((e) => {
                  const isSelected = selectedIds.has(e.id);
                  return (
                    <button
                      key={e.id}
                      onClick={() => toggleSelection(e.id)}
                      className={`w-full text-left flex items-start gap-2.5 p-2.5 rounded-lg border transition-base cursor-pointer ${
                        isSelected
                          ? 'bg-accent-50 border-accent-300 ring-1 ring-accent-200'
                          : 'bg-background-50 border-secondary-100 hover:border-secondary-200'
                      }`}
                    >
                      <span className={`w-5 h-5 flex items-center justify-center rounded border flex-shrink-0 mt-0.5 transition-base ${
                        isSelected ? 'bg-accent-500 border-accent-500 text-white' : 'border-secondary-300'
                      }`}>
                        {isSelected && <i className="ri-check-line text-xs"></i>}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-medium text-foreground-800">{e.nombre}</p>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {e.requiereAyuno && (
                              <span className="text-2xs bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full border border-amber-200">
                                Ayuno
                              </span>
                            )}
                            <span className="text-2xs font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">
                              ${e.precio.toLocaleString('es-MX')}
                            </span>
                          </div>
                        </div>
                        <p className="text-2xs text-foreground-400 mt-0.5">{e.categoria} · {e.tiempoResultado}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Otro estudio */}
        <div className="pt-3 border-t border-secondary-100">
          <label className="text-2xs font-semibold text-foreground-500 uppercase tracking-wide mb-1.5 block">
            Otro estudio no listado
          </label>
          <input
            type="text"
            value={estudioLibre}
            onChange={(e) => setEstudioLibre(e.target.value)}
            placeholder="Describe el estudio a solicitar..."
            maxLength={MAX_ESTUDIO_LIBRE}
            aria-label="Especificar estudio no listado"
            className="w-full px-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-accent-400 focus:ring-2 focus:ring-accent-100 transition-base"
          />
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-2 border-t border-secondary-100">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs font-medium text-foreground-500 hover:text-foreground-700 hover:bg-secondary-100 rounded-lg transition-base cursor-pointer whitespace-nowrap"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={totalSelected === 0 || saving}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-base cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {saving ? (
              <><i className="ri-loader-4-line animate-spin"></i> Guardando...</>
            ) : (
              <><i className="ri-send-plane-line"></i> Solicitar {totalSelected > 0 ? `(${totalSelected})` : ''}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}