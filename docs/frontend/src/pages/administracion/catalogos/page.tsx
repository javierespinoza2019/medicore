import { useState, useMemo, useCallback } from 'react';
import { catalogoMedicamentos as initialMedicamentos, frecuenciasComunes, viasAdministracion, searchMedicamentos, type Medicamento } from '@/mocks/recetas';
import { catalogocIE10 as initialCIE10, categoriasCIE10 as initialCategoriasCIE10, searchDiagnosticos, type DiagnosticoCIE10 } from '@/mocks/diagnosticos';
import { catalogoEstudios as initialEstudios, searchEstudios, type EstudioCatalogo } from '@/mocks/estudios';
import Card from '@/components/base/Card';
import MedicamentoFormModal from './components/MedicamentoFormModal';
import CIE10FormModal from './components/CIE10FormModal';
import EstudioFormModal from './components/EstudioFormModal';
import ConfirmDeleteModal from './components/ConfirmDeleteModal';

const categoriaColors: Record<string, string> = {
  Infecciosas: 'bg-red-100 text-red-700 border-red-200',
  Neoplasias: 'bg-purple-100 text-purple-700 border-purple-200',
  Endocrinas: 'bg-amber-100 text-amber-700 border-amber-200',
  Nervioso: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  Circulatorio: 'bg-rose-100 text-rose-700 border-rose-200',
  Respiratorio: 'bg-sky-100 text-sky-700 border-sky-200',
  Digestivo: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Piel: 'bg-orange-100 text-orange-700 border-orange-200',
  'Musculoesquelético': 'bg-teal-100 text-teal-700 border-teal-200',
  Genitourinario: 'bg-violet-100 text-violet-700 border-violet-200',
  Traumatismos: 'bg-stone-100 text-stone-700 border-stone-200',
  'Factores de salud': 'bg-lime-100 text-lime-700 border-lime-200',
  Síntomas: 'bg-cyan-100 text-cyan-700 border-cyan-200',
};

const tipoEstudioConfig: Record<EstudioCatalogo['tipo'], { label: string; icon: string; color: string }> = {
  laboratorio: { label: 'Laboratorio', icon: 'ri-test-tube-line', color: 'bg-violet-100 text-violet-700' },
  imagen: { label: 'Imagen', icon: 'ri-image-line', color: 'bg-sky-100 text-sky-700' },
  gabinete: { label: 'Gabinete', icon: 'ri-computer-line', color: 'bg-teal-100 text-teal-700' },
  patologia: { label: 'Patología', icon: 'ri-microscope-line', color: 'bg-rose-100 text-rose-700' },
  otro: { label: 'Otro', icon: 'ri-more-line', color: 'bg-secondary-100 text-foreground-600' },
};

type CatalogoTab = 'medicamentos' | 'cie10' | 'estudios';

export default function Catalogos() {
  const [activeTab, setActiveTab] = useState<CatalogoTab>('medicamentos');
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>(initialMedicamentos);
  const [diagnosticos, setDiagnosticos] = useState<DiagnosticoCIE10[]>(initialCIE10);
  const [estudios, setEstudios] = useState<EstudioCatalogo[]>(initialEstudios);

  const stats = useMemo(() => ({
    medicamentos: medicamentos.length,
    cie10: diagnosticos.length,
    estudios: estudios.length,
  }), [medicamentos, diagnosticos, estudios]);

  const handleSaveMedicamento = useCallback((med: Medicamento) => {
    setMedicamentos((prev) => {
      const idx = prev.findIndex((m) => m.id === med.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = med;
        return updated;
      }
      return [...prev, med];
    });
  }, []);

  const handleDeleteMedicamento = useCallback((id: string) => {
    setMedicamentos((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const handleSaveDiagnostico = useCallback((d: DiagnosticoCIE10) => {
    setDiagnosticos((prev) => {
      const idx = prev.findIndex((x) => x.codigo === d.codigo);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = d;
        return updated;
      }
      return [...prev, d];
    });
  }, []);

  const handleDeleteDiagnostico = useCallback((codigo: string) => {
    setDiagnosticos((prev) => prev.filter((d) => d.codigo !== codigo));
  }, []);

  const handleSaveEstudio = useCallback((e: EstudioCatalogo) => {
    setEstudios((prev) => {
      const idx = prev.findIndex((x) => x.id === e.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = e;
        return updated;
      }
      return [...prev, e];
    });
  }, []);

  const handleDeleteEstudio = useCallback((id: string) => {
    setEstudios((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card padding="md">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 flex items-center justify-center rounded-lg bg-primary-100 text-primary-600">
              <i className="ri-capsule-line"></i>
            </span>
            <div>
              <p className="text-lg font-bold text-foreground-950">{stats.medicamentos}</p>
              <p className="text-2xs text-foreground-500">Medicamentos</p>
            </div>
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 flex items-center justify-center rounded-lg bg-accent-100 text-accent-600">
              <i className="ri-book-open-line"></i>
            </span>
            <div>
              <p className="text-lg font-bold text-foreground-950">{stats.cie10}</p>
              <p className="text-2xs text-foreground-500">Códigos CIE-10</p>
            </div>
          </div>
        </Card>
        <Card padding="md">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 flex items-center justify-center rounded-lg bg-secondary-100 text-secondary-600">
              <i className="ri-microscope-line"></i>
            </span>
            <div>
              <p className="text-lg font-bold text-foreground-950">{stats.estudios}</p>
              <p className="text-2xs text-foreground-500">Estudios</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="bg-background-50 rounded-lg border border-secondary-200 p-1 flex gap-1 w-fit" role="tablist" aria-label="Catálogos">
        {([
          { key: 'medicamentos' as CatalogoTab, label: 'Medicamentos', icon: 'ri-capsule-line', count: stats.medicamentos },
          { key: 'cie10' as CatalogoTab, label: 'CIE-10', icon: 'ri-book-open-line', count: stats.cie10 },
          { key: 'estudios' as CatalogoTab, label: 'Estudios', icon: 'ri-microscope-line', count: stats.estudios },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            role="tab"
            aria-selected={activeTab === t.key}
            aria-controls={`panel-${t.key}`}
            id={`tab-${t.key}`}
            className={`px-4 py-2 rounded-md text-sm font-medium cursor-pointer transition-base flex items-center gap-2 whitespace-nowrap ${
              activeTab === t.key ? 'bg-background-50 text-foreground-900 shadow-sm' : 'text-foreground-500 hover:text-foreground-700'
            }`}
            type="button"
          >
            <i className={t.icon} aria-hidden="true"></i>
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* Content */}
      <div role="tabpanel" id="panel-medicamentos" aria-labelledby="tab-medicamentos" hidden={activeTab !== 'medicamentos'}>
        {activeTab === 'medicamentos' && (
          <MedicamentosTab
            medicamentos={medicamentos}
            onSave={handleSaveMedicamento}
            onDelete={handleDeleteMedicamento}
          />
        )}
      </div>
      <div role="tabpanel" id="panel-cie10" aria-labelledby="tab-cie10" hidden={activeTab !== 'cie10'}>
        {activeTab === 'cie10' && (
          <CIE10Tab
            diagnosticos={diagnosticos}
            onSave={handleSaveDiagnostico}
            onDelete={handleDeleteDiagnostico}
          />
        )}
      </div>
      <div role="tabpanel" id="panel-estudios" aria-labelledby="tab-estudios" hidden={activeTab !== 'estudios'}>
        {activeTab === 'estudios' && (
          <EstudiosTab
            estudios={estudios}
            onSave={handleSaveEstudio}
            onDelete={handleDeleteEstudio}
          />
        )}
      </div>
    </div>
  );
}

/* ──────────────────── MEDICAMENTOS ──────────────────── */

interface MedicamentosTabProps {
  medicamentos: Medicamento[];
  onSave: (m: Medicamento) => void;
  onDelete: (id: string) => void;
}

function MedicamentosTab({ medicamentos, onSave, onDelete }: MedicamentosTabProps) {
  const [search, setSearch] = useState('');
  const [selectedMed, setSelectedMed] = useState<Medicamento | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingMed, setEditingMed] = useState<Medicamento | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingMed, setDeletingMed] = useState<Medicamento | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return medicamentos;
    return searchMedicamentos(search).filter((m) => medicamentos.some((x) => x.id === m.id));
  }, [search, medicamentos]);

  const categorias = useMemo(() => {
    const cats = new Map<string, number>();
    medicamentos.forEach((m) => {
      cats.set(m.categoria, (cats.get(m.categoria) || 0) + 1);
    });
    return Array.from(cats.entries()).sort((a, b) => b[1] - a[1]);
  }, [medicamentos]);

  const handleEdit = (m: Medicamento) => {
    setEditingMed(m);
    setFormOpen(true);
  };

  const handleAdd = () => {
    setEditingMed(null);
    setFormOpen(true);
  };

  const handleDeleteClick = (m: Medicamento) => {
    setDeletingMed(m);
    setDeleteOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deletingMed) {
      onDelete(deletingMed.id);
      if (selectedMed?.id === deletingMed.id) setSelectedMed(null);
      setDeletingMed(null);
    }
  };

  return (
    <>
      <Card padding="none">
        <div className="px-5 py-3 border-b border-secondary-200">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h3 className="text-sm font-semibold text-foreground-800 flex items-center gap-2">
                <i className="ri-mental-health-line text-foreground-400"></i>
                Catálogo de Medicamentos
              </h3>
              <p className="text-2xs text-foreground-400 mt-0.5">{medicamentos.length} medicamentos disponibles</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative w-full sm:w-64">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-foreground-400 pointer-events-none">
                  <i className="ri-search-line text-sm"></i>
                </span>
                <input
                  type="search"
                  aria-label="Buscar medicamento"
                  placeholder="Buscar medicamento..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setSelectedMed(null); }}
                  className="w-full pl-10 pr-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base"
                />
              </div>
              <button
                onClick={handleAdd}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-base cursor-pointer whitespace-nowrap flex items-center gap-1.5"
              >
                <i className="ri-add-line"></i>
                Nuevo medicamento
              </button>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="flex gap-1.5 flex-wrap mb-4">
            {categorias.map(([cat, count]) => (
              <button
                key={cat}
                onClick={() => { setSearch(cat); setSelectedMed(null); }}
                className="px-2.5 py-1 text-2xs rounded-full cursor-pointer transition-base bg-secondary-100 text-foreground-600 border border-secondary-200 hover:border-secondary-300 whitespace-nowrap"
                aria-pressed={search === cat}
                type="button"
              >
                {cat} ({count})
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {filtered.map((m) => {
              const isSelected = selectedMed?.id === m.id;
              return (
                <div
                  key={m.id}
                  className={`relative flex items-start gap-2 p-3 rounded-lg border text-left transition-base group ${
                    isSelected
                      ? 'bg-primary-50 border-primary-300'
                      : 'bg-background-50 border-secondary-100 hover:border-secondary-200'
                  }`}
                >
                  <button
                    onClick={() => setSelectedMed(isSelected ? null : m)}
                    className="flex items-start gap-2 flex-1 min-w-0 cursor-pointer text-left"
                  >
                    <span className="w-7 h-7 flex items-center justify-center rounded bg-secondary-100 text-foreground-500 flex-shrink-0">
                      <i className="ri-capsule-line text-xs"></i>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground-900 truncate">{m.nombre}</p>
                      <p className="text-2xs text-foreground-500">{m.concentracion} · {m.presentacion}</p>
                      {isSelected && (
                        <div className="mt-2 pt-2 border-t border-primary-200">
                          <p className="text-2xs text-foreground-500">Categoría: <span className="font-medium text-foreground-700">{m.categoria}</span></p>
                          <p className="text-2xs text-foreground-500">Vía: <span className="font-medium text-foreground-700">{m.viaAdministracion}</span></p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className="text-2xs text-foreground-400">Frecuencias comunes:</span>
                            <div className="flex gap-1 flex-wrap">
                              {frecuenciasComunes.slice(0, 4).map((f) => (
                                <span key={f} className="text-2xs bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded-full">{f}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <span className="text-2xs text-foreground-400 flex-shrink-0">{m.viaAdministracion}</span>
                  </button>

                  {/* Action buttons */}
                  <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-base">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEdit(m); }}
                      className="w-6 h-6 flex items-center justify-center rounded text-foreground-400 hover:text-foreground-700 hover:bg-secondary-100 cursor-pointer transition-base"
                      title="Editar medicamento"
                      aria-label={`Editar medicamento ${m.nombre}`}
                    >
                      <i className="ri-pencil-line text-xs" aria-hidden="true"></i>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteClick(m); }}
                      className="w-6 h-6 flex items-center justify-center rounded text-foreground-400 hover:text-red-500 hover:bg-red-500/10 cursor-pointer transition-base"
                      title="Eliminar medicamento"
                      aria-label={`Eliminar medicamento ${m.nombre}`}
                    >
                      <i className="ri-delete-bin-line text-xs" aria-hidden="true"></i>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-secondary-100">
            <h4 className="text-xs font-semibold text-foreground-700 mb-2 flex items-center gap-2">
              <i className="ri-syringe-line text-foreground-400"></i>
              Vías de administración disponibles
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {viasAdministracion.map((via) => (
                <span key={via} className="text-2xs bg-secondary-100 text-foreground-600 px-2.5 py-1 rounded-full border border-secondary-200">
                  {via}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <MedicamentoFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingMed(null); }}
        onSave={onSave}
        medicamento={editingMed}
      />

      <ConfirmDeleteModal
        open={deleteOpen}
        onClose={() => { setDeleteOpen(false); setDeletingMed(null); }}
        onConfirm={handleConfirmDelete}
        itemName={deletingMed?.nombre || ''}
        itemType="medicamento"
      />
    </>
  );
}

/* ──────────────────── CIE-10 ──────────────────── */

interface CIE10TabProps {
  diagnosticos: DiagnosticoCIE10[];
  onSave: (d: DiagnosticoCIE10) => void;
  onDelete: (codigo: string) => void;
}

function CIE10Tab({ diagnosticos, onSave, onDelete }: CIE10TabProps) {
  const [search, setSearch] = useState('');
  const [categoriaActiva, setCategoriaActiva] = useState('todas');
  const [diagnosticoSeleccionado, setDiagnosticoSeleccionado] = useState<DiagnosticoCIE10 | null>(null);
  const [resultados, setResultados] = useState<DiagnosticoCIE10[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingDiag, setEditingDiag] = useState<DiagnosticoCIE10 | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingDiag, setDeletingDiag] = useState<DiagnosticoCIE10 | null>(null);

  const categoriasCIE10 = useMemo(() => {
    const catsMap = new Map<string, number>();
    diagnosticos.forEach((d) => {
      catsMap.set(d.categoria, (catsMap.get(d.categoria) || 0) + 1);
    });
    const list = Array.from(catsMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([key, count]) => {
        const labels: Record<string, string> = {
          Infecciosas: 'Infecciosas (A00-B99)',
          Neoplasias: 'Neoplasias (C00-D49)',
          Endocrinas: 'Endocrinas y Metabólicas (E00-E89)',
          Nervioso: 'Sistema Nervioso (G00-G99)',
          Circulatorio: 'Aparato Circulatorio (I00-I99)',
          Respiratorio: 'Aparato Respiratorio (J00-J99)',
          Digestivo: 'Aparato Digestivo (K00-K95)',
          Piel: 'Piel y Tejido Subcutáneo (L00-L99)',
          'Musculoesquelético': 'Musculoesquelético (M00-M99)',
          Genitourinario: 'Genitourinario (N00-N99)',
          Traumatismos: 'Traumatismos (S00-T98)',
          'Factores de salud': 'Factores de salud (Z00-Z99)',
          Síntomas: 'Síntomas y Signos (R00-R99)',
        };
        return { key, label: labels[key] || key, count };
      });
    return [{ key: 'todas', label: 'Todas las categorías', count: diagnosticos.length }, ...list];
  }, [diagnosticos]);

  const diagnosticosFiltrados = useMemo(() => {
    let list = categoriaActiva === 'todas'
      ? diagnosticos
      : diagnosticos.filter((d) => d.categoria === categoriaActiva);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (d) => d.codigo.toLowerCase().includes(q) || d.descripcion.toLowerCase().includes(q)
      );
    }
    return list;
  }, [search, categoriaActiva, diagnosticos]);

  const handleSearch = (value: string) => {
    setSearch(value);
    if (value.trim()) {
      const q = value.toLowerCase();
      const res = diagnosticos.filter(
        (d) => d.codigo.toLowerCase().includes(q) || d.descripcion.toLowerCase().includes(q)
      ).slice(0, 20);
      setResultados(res);
    } else {
      setResultados([]);
    }
  };

  const handleEdit = (d: DiagnosticoCIE10) => {
    setEditingDiag(d);
    setFormOpen(true);
  };

  const handleAdd = () => {
    setEditingDiag(null);
    setFormOpen(true);
  };

  const handleDeleteClick = (d: DiagnosticoCIE10) => {
    setDeletingDiag(d);
    setDeleteOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deletingDiag) {
      onDelete(deletingDiag.codigo);
      if (diagnosticoSeleccionado?.codigo === deletingDiag.codigo) setDiagnosticoSeleccionado(null);
      setDeletingDiag(null);
    }
  };

  const handleSaveLocal = (d: DiagnosticoCIE10) => {
    if (editingDiag && editingDiag.codigo !== d.codigo) {
      onDelete(editingDiag.codigo);
    }
    onSave(d);
    if (diagnosticoSeleccionado?.codigo === d.codigo || diagnosticoSeleccionado?.codigo === editingDiag?.codigo) {
      setDiagnosticoSeleccionado(d);
    }
  };

  return (
    <>
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        <Card className="w-full lg:w-80 flex-shrink-0" padding="none">
          <div className="p-4 border-b border-secondary-200">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground-800 flex items-center gap-2">
                <i className="ri-search-eye-line text-foreground-400"></i>
                Buscar Diagnóstico
              </h2>
              <button
                onClick={handleAdd}
                className="px-3 py-1.5 text-2xs font-medium rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-base cursor-pointer whitespace-nowrap flex items-center gap-1"
              >
                <i className="ri-add-line"></i>
                Nuevo
              </button>
            </div>
            <div className="relative mb-3">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-foreground-400 pointer-events-none">
                <i className="ri-search-line text-sm"></i>
              </span>
              <input
                type="search"
                aria-label="Buscar diagnóstico CIE-10"
                placeholder="Código CIE-10 o descripción..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base"
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {categoriasCIE10.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => {
                    setCategoriaActiva(cat.key);
                    setDiagnosticoSeleccionado(null);
                    setResultados([]);
                    setSearch('');
                  }}
                  className={`px-2.5 py-1 text-2xs rounded-full cursor-pointer transition-base whitespace-nowrap ${
                    categoriaActiva === cat.key
                      ? 'bg-primary-100 text-primary-700 border border-primary-300'
                      : 'bg-secondary-100 text-foreground-600 border border-secondary-200 hover:border-secondary-300'
                  }`}
                  aria-pressed={categoriaActiva === cat.key}
                  type="button"
                >
                  {cat.label} ({cat.count})
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[calc(100vh-400px)] overflow-y-auto">
            {search.trim() && resultados.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-foreground-400 px-4">
                <span className="w-8 h-8 flex items-center justify-center">
                  <i className="ri-search-line text-lg"></i>
                </span>
                <p className="text-xs text-center">No se encontraron resultados para &quot;{search}&quot;</p>
              </div>
            ) : (
              (search.trim() ? resultados : diagnosticosFiltrados).map((d) => {
                const isSelected = diagnosticoSeleccionado?.codigo === d.codigo;
                return (
                  <div
                    key={d.codigo}
                    className={`w-full border-b border-secondary-100 transition-base group ${
                      isSelected ? 'bg-primary-50/50 border-l-2 border-l-primary-500' : 'hover:bg-secondary-50/50'
                    }`}
                  >
                    <div className="flex items-start px-4 py-3">
                      <button
                        onClick={() => setDiagnosticoSeleccionado(isSelected ? null : d)}
                        className="flex-1 min-w-0 text-left cursor-pointer"
                      >
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span className="text-xs font-mono font-bold text-foreground-900">{d.codigo}</span>
                          <span className={`text-2xs px-1.5 py-0.5 rounded-full border ${categoriaColors[d.categoria] || 'bg-secondary-100 text-foreground-600 border-secondary-200'}`}>
                            {d.categoria}
                          </span>
                        </div>
                        <p className="text-xs text-foreground-600 line-clamp-2">{d.descripcion}</p>
                      </button>
                      <div className="flex items-center gap-0.5 ml-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-base">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEdit(d); }}
                          className="w-6 h-6 flex items-center justify-center rounded text-foreground-400 hover:text-foreground-700 hover:bg-secondary-100 cursor-pointer transition-base"
                          title="Editar diagnóstico"
                          aria-label={`Editar diagnóstico ${d.codigo}`}
                        >
                          <i className="ri-pencil-line text-xs" aria-hidden="true"></i>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteClick(d); }}
                          className="w-6 h-6 flex items-center justify-center rounded text-foreground-400 hover:text-red-500 hover:bg-red-500/10 cursor-pointer transition-base"
                          title="Eliminar diagnóstico"
                          aria-label={`Eliminar diagnóstico ${d.codigo}`}
                        >
                          <i className="ri-delete-bin-line text-xs" aria-hidden="true"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        <div className="flex-1 min-w-0 w-full">
          {diagnosticoSeleccionado ? (
            <Card padding="lg">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg font-mono font-bold text-foreground-900">{diagnosticoSeleccionado.codigo}</span>
                      <span className={`text-2xs px-1.5 py-0.5 rounded-full border ${categoriaColors[diagnosticoSeleccionado.categoria] || 'bg-secondary-100 text-foreground-600 border-secondary-200'}`}>
                        {diagnosticoSeleccionado.categoria}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-foreground-900">{diagnosticoSeleccionado.descripcion}</h3>
                    <p className="text-xs text-foreground-500 mt-1">{diagnosticoSeleccionado.subcategoria}</p>
                  </div>
                  <button
                    onClick={() => setDiagnosticoSeleccionado(null)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-secondary-100 text-foreground-400 hover:bg-secondary-200 hover:text-foreground-600 transition-base cursor-pointer"
                  >
                    <i className="ri-close-line"></i>
                  </button>
                </div>

                <div className="p-4 bg-background-50 rounded-lg border border-secondary-100">
                  <h4 className="text-xs font-semibold text-foreground-700 mb-3 flex items-center gap-2">
                    <i className="ri-information-line text-foreground-400"></i>
                    Información del código
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-2xs text-foreground-400">Categoría principal</p>
                      <p className="font-medium text-foreground-800">{diagnosticoSeleccionado.categoria}</p>
                    </div>
                    <div>
                      <p className="text-2xs text-foreground-400">Subcategoría</p>
                      <p className="font-medium text-foreground-800">{diagnosticoSeleccionado.subcategoria}</p>
                    </div>
                    <div>
                      <p className="text-2xs text-foreground-400">Código</p>
                      <p className="font-medium text-foreground-800 font-mono">{diagnosticoSeleccionado.codigo}</p>
                    </div>
                    <div>
                      <p className="text-2xs text-foreground-400">Descripción completa</p>
                      <p className="font-medium text-foreground-800 text-xs leading-relaxed">{diagnosticoSeleccionado.descripcion}</p>
                    </div>
                  </div>
                </div>

                <RelatedDiagnoses
                  selected={diagnosticoSeleccionado}
                  onSelect={setDiagnosticoSeleccionado}
                  allDiagnosticos={diagnosticos}
                />
              </div>
            </Card>
          ) : (
            <Card>
              <div className="flex flex-col items-center gap-4 py-20 text-foreground-400">
                <span className="w-16 h-16 flex items-center justify-center rounded-full bg-secondary-100">
                  <i className="ri-book-open-line text-3xl"></i>
                </span>
                <div className="text-center max-w-sm">
                  <p className="text-base font-medium text-foreground-600 mb-1">Selecciona un diagnóstico</p>
                  <p className="text-sm">Busca o filtra por categoría en el panel izquierdo para ver el detalle completo del código CIE-10.</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      <CIE10FormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingDiag(null); }}
        onSave={handleSaveLocal}
        diagnostico={editingDiag}
      />

      <ConfirmDeleteModal
        open={deleteOpen}
        onClose={() => { setDeleteOpen(false); setDeletingDiag(null); }}
        onConfirm={handleConfirmDelete}
        itemName={deletingDiag ? `${deletingDiag.codigo} - ${deletingDiag.descripcion}` : ''}
        itemType="diagnóstico CIE-10"
      />
    </>
  );
}

function RelatedDiagnoses({ selected, onSelect, allDiagnosticos }: { selected: DiagnosticoCIE10; onSelect: (d: DiagnosticoCIE10) => void; allDiagnosticos: DiagnosticoCIE10[] }) {
  const related = allDiagnosticos
    .filter((d) => d.subcategoria === selected.subcategoria && d.codigo !== selected.codigo)
    .slice(0, 6);

  if (related.length === 0) return null;

  return (
    <div>
      <h4 className="text-xs font-semibold text-foreground-700 mb-2 flex items-center gap-2">
        <i className="ri-git-branch-line text-foreground-400"></i>
        Diagnósticos relacionados ({selected.subcategoria})
      </h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {related.map((d) => (
          <button
            key={d.codigo}
            onClick={() => onSelect(d)}
            className="flex items-center gap-2 p-2.5 bg-background-50 rounded-lg border border-secondary-100 text-left hover:border-primary-300 transition-base cursor-pointer"
          >
            <span className="text-xs font-mono font-bold text-foreground-800 flex-shrink-0">{d.codigo}</span>
            <span className="text-xs text-foreground-600 line-clamp-2">{d.descripcion}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ──────────────────── ESTUDIOS ──────────────────── */

interface EstudiosTabProps {
  estudios: EstudioCatalogo[];
  onSave: (e: EstudioCatalogo) => void;
  onDelete: (id: string) => void;
}

function EstudiosTab({ estudios, onSave, onDelete }: EstudiosTabProps) {
  const [search, setSearch] = useState('');
  const [selectedEstudio, setSelectedEstudio] = useState<EstudioCatalogo | null>(null);
  const [filterTipo, setFilterTipo] = useState<EstudioCatalogo['tipo'] | 'todas'>('todas');
  const [formOpen, setFormOpen] = useState(false);
  const [editingEstudio, setEditingEstudio] = useState<EstudioCatalogo | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingEstudio, setDeletingEstudio] = useState<EstudioCatalogo | null>(null);

  const filtered = useMemo(() => {
    let list = estudios;
    if (filterTipo !== 'todas') {
      list = list.filter((e) => e.tipo === filterTipo);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) => e.nombre.toLowerCase().includes(q) || e.categoria.toLowerCase().includes(q)
      );
    }
    return list;
  }, [search, filterTipo, estudios]);

  const categorias = useMemo(() => {
    const cats = new Map<string, number>();
    estudios.forEach((e) => {
      cats.set(e.categoria, (cats.get(e.categoria) || 0) + 1);
    });
    return Array.from(cats.entries()).sort((a, b) => b[1] - a[1]);
  }, [estudios]);

  const handleEdit = (e: EstudioCatalogo) => {
    setEditingEstudio(e);
    setFormOpen(true);
  };

  const handleAdd = () => {
    setEditingEstudio(null);
    setFormOpen(true);
  };

  const handleDeleteClick = (e: EstudioCatalogo) => {
    setDeletingEstudio(e);
    setDeleteOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deletingEstudio) {
      onDelete(deletingEstudio.id);
      if (selectedEstudio?.id === deletingEstudio.id) setSelectedEstudio(null);
      setDeletingEstudio(null);
    }
  };

  return (
    <>
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        <Card className="w-full lg:w-80 flex-shrink-0" padding="none">
          <div className="p-4 border-b border-secondary-200">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-foreground-800 flex items-center gap-2">
                <i className="ri-microscope-line text-foreground-400"></i>
                Catálogo de Estudios
              </h2>
              <button
                onClick={handleAdd}
                className="px-3 py-1.5 text-2xs font-medium rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-base cursor-pointer whitespace-nowrap flex items-center gap-1"
              >
                <i className="ri-add-line"></i>
                Nuevo
              </button>
            </div>
            <div className="relative mb-3">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-foreground-400 pointer-events-none">
                <i className="ri-search-line text-sm"></i>
              </span>
              <input
                type="search"
                aria-label="Buscar estudio"
                placeholder="Buscar estudio..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base"
              />
            </div>
            <div className="flex gap-1.5 flex-wrap mb-2">
              {(['todas', 'laboratorio', 'imagen', 'gabinete'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterTipo(f)}
                  className={`px-2.5 py-1 text-2xs rounded-full cursor-pointer transition-base whitespace-nowrap ${
                    filterTipo === f
                      ? 'bg-primary-100 text-primary-700 border border-primary-300'
                      : 'bg-secondary-100 text-foreground-600 border border-secondary-200 hover:border-secondary-300'
                  }`}
                  aria-pressed={filterTipo === f}
                  type="button"
                >
                  {f === 'todas' ? 'Todos' : tipoEstudioConfig[f]?.label || f}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {categorias.map(([cat, count]) => (
                <button
                  key={cat}
                  onClick={() => setSearch(cat)}
                  className="px-2.5 py-1 text-2xs rounded-full cursor-pointer transition-base bg-secondary-100 text-foreground-600 border border-secondary-200 hover:border-secondary-300 whitespace-nowrap"
                >
                  {cat} ({count})
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[calc(100vh-400px)] overflow-y-auto">
            {filtered.map((e) => {
              const isSelected = selectedEstudio?.id === e.id;
              const tipo = tipoEstudioConfig[e.tipo];
              return (
                <div
                  key={e.id}
                  className={`w-full border-b border-secondary-100 transition-base group ${
                    isSelected ? 'bg-accent-50/50 border-l-2 border-l-accent-500' : 'hover:bg-secondary-50/50'
                  }`}
                >
                  <div className="flex items-start px-4 py-3">
                    <button
                      onClick={() => setSelectedEstudio(isSelected ? null : e)}
                      className="flex items-start gap-2 flex-1 min-w-0 text-left cursor-pointer"
                    >
                      <span className={`w-7 h-7 flex items-center justify-center rounded ${tipo.color} flex-shrink-0`}>
                        <i className={`${tipo.icon} text-xs`}></i>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-foreground-900 line-clamp-2">{e.nombre}</p>
                        <p className="text-2xs text-foreground-500 mt-0.5">{e.categoria} · {e.tiempoResultado}</p>
                        {e.requiereAyuno && (
                          <span className="inline-flex items-center gap-1 text-2xs text-amber-600 mt-1">
                            <i className="ri-restaurant-line"></i> Requiere ayuno
                          </span>
                        )}
                      </div>
                    </button>
                    <div className="flex items-center gap-0.5 ml-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-base">
                      <button
                        onClick={(ev) => { ev.stopPropagation(); handleEdit(e); }}
                        className="w-6 h-6 flex items-center justify-center rounded text-foreground-400 hover:text-foreground-700 hover:bg-secondary-100 cursor-pointer transition-base"
                        title="Editar estudio"
                        aria-label={`Editar estudio ${e.nombre}`}
                      >
                        <i className="ri-pencil-line text-xs" aria-hidden="true"></i>
                      </button>
                      <button
                        onClick={(ev) => { ev.stopPropagation(); handleDeleteClick(e); }}
                        className="w-6 h-6 flex items-center justify-center rounded text-foreground-400 hover:text-red-500 hover:bg-red-500/10 cursor-pointer transition-base"
                        title="Eliminar estudio"
                        aria-label={`Eliminar estudio ${e.nombre}`}
                      >
                        <i className="ri-delete-bin-line text-xs" aria-hidden="true"></i>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="flex-1 min-w-0 w-full">
          {selectedEstudio ? (
            <Card padding="lg">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${tipoEstudioConfig[selectedEstudio.tipo].color}`}>
                        <i className={tipoEstudioConfig[selectedEstudio.tipo].icon}></i>
                        {tipoEstudioConfig[selectedEstudio.tipo].label}
                      </span>
                      <span className="text-2xs text-foreground-400">{selectedEstudio.categoria}</span>
                    </div>
                    <h3 className="text-base font-semibold text-foreground-900">{selectedEstudio.nombre}</h3>
                  </div>
                  <button
                    onClick={() => setSelectedEstudio(null)}
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-secondary-100 text-foreground-400 hover:bg-secondary-200 hover:text-foreground-600 transition-base cursor-pointer"
                  >
                    <i className="ri-close-line"></i>
                  </button>
                </div>

                <div className="p-4 bg-background-50 rounded-lg border border-secondary-100">
                  <p className="text-sm text-foreground-700 leading-relaxed">{selectedEstudio.descripcion}</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-background-50 rounded-lg border border-secondary-100">
                    <p className="text-2xs text-foreground-400">Tiempo estimado</p>
                    <p className="text-sm font-semibold text-foreground-800">{selectedEstudio.tiempoResultado}</p>
                  </div>
                  <div className="p-3 bg-background-50 rounded-lg border border-secondary-100">
                    <p className="text-2xs text-foreground-400">Ayuno</p>
                    <p className="text-sm font-semibold flex items-center gap-1">
                      {selectedEstudio.requiereAyuno ? (
                        <span className="text-amber-600 flex items-center gap-1"><i className="ri-restaurant-line"></i> Requiere ayuno</span>
                      ) : (
                        <span className="text-emerald-600 flex items-center gap-1"><i className="ri-check-line"></i> No requiere</span>
                      )}
                    </p>
                  </div>
                  <div className="p-3 bg-background-50 rounded-lg border border-secondary-100">
                    <p className="text-2xs text-foreground-400">Categoría</p>
                    <p className="text-sm font-semibold text-foreground-800">{selectedEstudio.categoria}</p>
                  </div>
                </div>

                {selectedEstudio.requiereAyuno && (
                  <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20 flex items-start gap-2">
                    <span className="w-5 h-5 flex items-center justify-center text-amber-600 flex-shrink-0 mt-0.5">
                      <i className="ri-information-line text-sm"></i>
                    </span>
                    <p className="text-xs text-amber-700">
                      Este estudio requiere ayuno de 8 a 12 horas. El paciente debe evitar consumir alimentos y bebidas (excepto agua) antes de la toma de muestra.
                    </p>
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <Card>
              <div className="flex flex-col items-center gap-4 py-20 text-foreground-400">
                <span className="w-16 h-16 flex items-center justify-center rounded-full bg-secondary-100">
                  <i className="ri-microscope-line text-3xl"></i>
                </span>
                <div className="text-center max-w-sm">
                  <p className="text-base font-medium text-foreground-600 mb-1">Selecciona un estudio</p>
                  <p className="text-sm">Busca o filtra por tipo en el panel izquierdo para ver el detalle completo del estudio.</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      <EstudioFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingEstudio(null); }}
        onSave={onSave}
        estudio={editingEstudio}
      />

      <ConfirmDeleteModal
        open={deleteOpen}
        onClose={() => { setDeleteOpen(false); setDeletingEstudio(null); }}
        onConfirm={handleConfirmDelete}
        itemName={deletingEstudio?.nombre || ''}
        itemType="estudio"
      />
    </>
  );
}