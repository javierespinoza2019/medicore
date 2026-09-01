import { useState, useRef } from 'react';
import { sucursales, type Sucursal, type Consultorio } from '@/mocks/branches';
import Button from '@/components/base/Button';
import Card from '@/components/base/Card';
import Modal from '@/components/base/Modal';
import Input from '@/components/base/Input';
import Select from '@/components/base/Select';
import Badge from '@/components/base/Badge';
import { useLogo } from '@/hooks/useAppSettings';
import { setLogo, removeLogo } from '@/utils/appSettings';
import { fileToResizedDataUrl } from '@/utils/imageUtils';

const tipoConsultorioLabels: Record<Consultorio['tipo'], { label: string; icon: string; variant: 'primary' | 'accent' | 'warning' | 'info' | 'secondary' }> = {
  consulta: { label: 'Consulta', icon: 'ri-stethoscope-line', variant: 'primary' },
  procedimiento: { label: 'Procedimiento', icon: 'ri-surgical-mask-line', variant: 'accent' },
  urgencias: { label: 'Urgencias', icon: 'ri-alert-line', variant: 'warning' },
  triage: { label: 'Triage', icon: 'ri-heart-pulse-line', variant: 'info' },
  estudio: { label: 'Estudio', icon: 'ri-microscope-line', variant: 'secondary' },
};

interface SucursalForm {
  nombre: string;
  direccion: string;
  ciudad: string;
  estado: string;
  codigoPostal: string;
  telefono: string;
  email: string;
  horarioApertura: string;
  horarioCierre: string;
  diasOperacion: string[];
  activo: boolean;
}

const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

const emptySucursal: SucursalForm = {
  nombre: '',
  direccion: '',
  ciudad: '',
  estado: '',
  codigoPostal: '',
  telefono: '',
  email: '',
  horarioApertura: '07:00',
  horarioCierre: '20:00',
  diasOperacion: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'],
  activo: true,
};

interface ConsultorioForm {
  nombre: string;
  piso: string;
  tipo: Consultorio['tipo'];
  activo: boolean;
}

const emptyConsultorio: ConsultorioForm = {
  nombre: '',
  piso: '1',
  tipo: 'consulta',
  activo: true,
};

export default function Sucursales() {
  const [items, setItems] = useState<Sucursal[]>(sucursales);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Sucursal modal
  const [sucModalOpen, setSucModalOpen] = useState(false);
  const [editingSucId, setEditingSucId] = useState<string | null>(null);
  const [sucForm, setSucForm] = useState<SucursalForm>(emptySucursal);
  const [sucErrors, setSucErrors] = useState<Partial<Record<keyof SucursalForm, string>>>({});
  const [deleteSucTarget, setDeleteSucTarget] = useState<Sucursal | null>(null);

  // Consultorio modal
  const [conModalOpen, setConModalOpen] = useState(false);
  const [editingConId, setEditingConId] = useState<string | null>(null);
  const [conParentId, setConParentId] = useState<string>('');
  const [conForm, setConForm] = useState<ConsultorioForm>(emptyConsultorio);
  const [conErrors, setConErrors] = useState<Partial<Record<keyof ConsultorioForm, string>>>({});
  const [deleteConTarget, setDeleteConTarget] = useState<{ sucursalId: string; consultorio: Consultorio } | null>(null);

  const logo = useLogo();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoError, setLogoError] = useState('');

  const filtered = items.filter(
    (s) =>
      s.nombre.toLowerCase().includes(search.toLowerCase()) ||
      s.ciudad.toLowerCase().includes(search.toLowerCase()) ||
      s.direccion.toLowerCase().includes(search.toLowerCase())
  );

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  // --- Sucursal CRUD ---
  const openCreateSuc = () => {
    setEditingSucId(null);
    setSucForm(emptySucursal);
    setSucErrors({});
    setSucModalOpen(true);
  };

  const openEditSuc = (s: Sucursal) => {
    setEditingSucId(s.id);
    setSucForm({
      nombre: s.nombre,
      direccion: s.direccion,
      ciudad: s.ciudad,
      estado: s.estado,
      codigoPostal: s.codigoPostal,
      telefono: s.telefono,
      email: s.email,
      horarioApertura: s.horarioApertura,
      horarioCierre: s.horarioCierre,
      diasOperacion: s.diasOperacion,
      activo: s.activo,
    });
    setSucErrors({});
    setSucModalOpen(true);
  };

  const validateSuc = (): boolean => {
    const errors: Partial<Record<keyof SucursalForm, string>> = {};
    if (!sucForm.nombre.trim()) errors.nombre = 'El nombre es obligatorio';
    else if (sucForm.nombre.trim().length > 100) errors.nombre = 'El nombre no puede exceder 100 caracteres';
    if (!sucForm.direccion.trim()) errors.direccion = 'La dirección es obligatoria';
    else if (sucForm.direccion.trim().length > 200) errors.direccion = 'La dirección no puede exceder 200 caracteres';
    if (!sucForm.ciudad.trim()) errors.ciudad = 'La ciudad es obligatoria';
    else if (sucForm.ciudad.trim().length > 60) errors.ciudad = 'La ciudad no puede exceder 60 caracteres';
    if (!sucForm.telefono.trim()) errors.telefono = 'El teléfono es obligatorio';
    else if (!/^\d{10}$/.test(sucForm.telefono.replace(/\D/g, ''))) errors.telefono = 'Ingresa 10 dígitos';
    if (sucForm.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sucForm.email)) errors.email = 'Formato de email inválido';
    if (sucForm.email.trim().length > 100) errors.email = 'El email no puede exceder 100 caracteres';
    if (sucForm.codigoPostal.trim().length > 10) errors.codigoPostal = 'El código postal no puede exceder 10 caracteres';
    if (sucForm.estado.trim().length > 30) errors.estado = 'El estado no puede exceder 30 caracteres';
    setSucErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveSuc = () => {
    if (!validateSuc()) return;

    if (editingSucId) {
      setItems((prev) =>
        prev.map((s) =>
          s.id === editingSucId
            ? { ...s, ...sucForm, nombre: sucForm.nombre.trim(), direccion: sucForm.direccion.trim(), ciudad: sucForm.ciudad.trim(), telefono: sucForm.telefono.trim() }
            : s
        )
      );
    } else {
      const newItem: Sucursal = {
        id: `suc${Date.now()}`,
        ...sucForm,
        nombre: sucForm.nombre.trim(),
        direccion: sucForm.direccion.trim(),
        ciudad: sucForm.ciudad.trim(),
        telefono: sucForm.telefono.trim(),
        consultorios: [],
      };
      setItems((prev) => [...prev, newItem]);
    }
    setSucModalOpen(false);
  };

  const handleDeleteSuc = () => {
    if (!deleteSucTarget) return;
    setItems((prev) => prev.filter((s) => s.id !== deleteSucTarget.id));
    setDeleteSucTarget(null);
  };

  // --- Consultorio CRUD ---
  const openCreateCon = (sucursalId: string) => {
    setEditingConId(null);
    setConParentId(sucursalId);
    setConForm(emptyConsultorio);
    setConErrors({});
    setConModalOpen(true);
  };

  const openEditCon = (sucursalId: string, c: Consultorio) => {
    setEditingConId(c.id);
    setConParentId(sucursalId);
    setConForm({
      nombre: c.nombre,
      piso: c.piso.toString(),
      tipo: c.tipo,
      activo: c.activo,
    });
    setConErrors({});
    setConModalOpen(true);
  };

  const validateCon = (): boolean => {
    const errors: Partial<Record<keyof ConsultorioForm, string>> = {};
    if (!conForm.nombre.trim()) errors.nombre = 'El nombre es obligatorio';
    else if (conForm.nombre.trim().length > 80) errors.nombre = 'El nombre no puede exceder 80 caracteres';
    const suc = items.find((s) => s.id === conParentId);
    if (suc && conForm.nombre.trim() && suc.consultorios.some((c) => c.nombre.toLowerCase() === conForm.nombre.trim().toLowerCase() && c.id !== editingConId)) {
      errors.nombre = 'Ya existe un consultorio con este nombre en esta sucursal';
    }
    setConErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveCon = () => {
    if (!validateCon()) return;

    setItems((prev) =>
      prev.map((s) => {
        if (s.id !== conParentId) return s;
        if (editingConId) {
          return {
            ...s,
            consultorios: s.consultorios.map((c) =>
              c.id === editingConId
                ? { ...c, nombre: conForm.nombre.trim(), piso: Number(conForm.piso), tipo: conForm.tipo, activo: conForm.activo }
                : c
            ),
          };
        }
        return {
          ...s,
          consultorios: [
            ...s.consultorios,
            {
              id: `c${Date.now()}`,
              nombre: conForm.nombre.trim(),
              piso: Number(conForm.piso),
              tipo: conForm.tipo,
              activo: conForm.activo,
            },
          ],
        };
      })
    );
    setConModalOpen(false);
  };

  const handleDeleteCon = () => {
    if (!deleteConTarget) return;
    setItems((prev) =>
      prev.map((s) => {
        if (s.id !== deleteConTarget.sucursalId) return s;
        return {
          ...s,
          consultorios: s.consultorios.filter((c) => c.id !== deleteConTarget.consultorio.id),
        };
      })
    );
    setDeleteConTarget(null);
  };

  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToResizedDataUrl(file, 400);
      setLogo(dataUrl);
      setLogoError('');
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : 'No se pudo cargar el logo.');
    } finally {
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Logo institucional */}
      <Card padding="lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-20 h-20 rounded-xl border border-secondary-200 bg-secondary-50 flex items-center justify-center overflow-hidden flex-shrink-0">
            {logo ? (
              <img src={logo} alt="Logo institucional" className="w-full h-full object-contain" />
            ) : (
              <i className="ri-image-add-line text-2xl text-foreground-400"></i>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground-900 font-heading">Logo institucional</h3>
            <p className="text-xs text-foreground-500 mt-1">
              Este logo se muestra en el inicio de sesión, el menú lateral y en todos los reportes impresos.
            </p>
            {logoError && <p className="text-xs text-red-500 mt-1">{logoError}</p>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoSelect}
              className="hidden"
            />
            <Button size="sm" icon={<i className="ri-upload-cloud-line"></i>} onClick={() => logoInputRef.current?.click()}>
              {logo ? 'Cambiar logo' : 'Subir logo'}
            </Button>
            {logo && (
              <Button size="sm" variant="ghost" onClick={removeLogo}>
                Quitar
              </Button>
            )}
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-end">
        <Button icon={<i className="ri-add-line"></i>} onClick={openCreateSuc}>
          Nueva Sucursal
        </Button>
      </div>

      <div className="relative w-full sm:w-80">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-foreground-400 pointer-events-none">
          <i className="ri-search-line text-sm"></i>
        </span>
        <input
          type="search"
          aria-label="Buscar sucursal"
          placeholder="Buscar sucursal..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-3 py-2.5 text-sm bg-background-50 border border-secondary-200 rounded-lg text-foreground-900 placeholder:text-foreground-400 outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-base"
        />
      </div>

      <div className="space-y-4">
        {filtered.length === 0 ? (
          <Card>
            <div className="flex flex-col items-center gap-2 py-8 text-foreground-400">
              <span className="w-10 h-10 flex items-center justify-center">
                <i className="ri-building-line text-2xl"></i>
              </span>
              <p className="text-sm">No se encontraron sucursales</p>
              {search && (
                <button onClick={() => setSearch('')} className="text-xs text-primary-500 hover:text-primary-600 cursor-pointer">
                  Limpiar búsqueda
                </button>
              )}
            </div>
          </Card>
        ) : (
          filtered.map((suc) => (
            <Card key={suc.id} padding="none">
              <div
                className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-secondary-50/50 transition-base"
                onClick={() => toggleExpand(suc.id)}
              >
                <div className="flex items-center gap-4">
                  <span className={`w-5 h-5 flex items-center justify-center transition-base ${expandedId === suc.id ? 'rotate-90' : ''}`}>
                    <i className="ri-arrow-right-s-line text-foreground-400"></i>
                  </span>
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-semibold text-foreground-900">{suc.nombre}</h3>
                      <Badge variant={suc.activo ? 'success' : 'danger'} size="sm" dot>
                        {suc.activo ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </div>
                    <p className="text-xs text-foreground-500 mt-0.5">{suc.direccion}, {suc.ciudad}, {suc.estado}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-foreground-500 bg-secondary-100 px-2 py-0.5 rounded-full">
                    {suc.consultorios.length} consultorio{suc.consultorios.length !== 1 ? 's' : ''}
                  </span>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => openEditSuc(suc)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-400 hover:text-foreground-700 hover:bg-secondary-100 transition-base cursor-pointer"
                      aria-label={`Editar sucursal ${suc.nombre}`}
                      title="Editar sucursal"
                    >
                      <i className="ri-pencil-line text-sm" aria-hidden="true"></i>
                    </button>
                    <button
                      onClick={() => setDeleteSucTarget(suc)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-400 hover:text-red-600 hover:bg-red-500/10 transition-base cursor-pointer"
                      aria-label={`Eliminar sucursal ${suc.nombre}`}
                      title="Eliminar sucursal"
                    >
                      <i className="ri-delete-bin-line text-sm" aria-hidden="true"></i>
                    </button>
                  </div>
                </div>
              </div>

              {expandedId === suc.id && (
                <div className="border-t border-secondary-200">
                  <div className="px-5 py-3 bg-secondary-50/50 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <span className="text-foreground-400 text-xs">Teléfono</span>
                      <p className="text-foreground-800 font-medium">{suc.telefono}</p>
                    </div>
                    <div>
                      <span className="text-foreground-400 text-xs">Email</span>
                      <p className="text-foreground-800 font-medium">{suc.email}</p>
                    </div>
                    <div>
                      <span className="text-foreground-400 text-xs">Horario</span>
                      <p className="text-foreground-800 font-medium">{suc.horarioApertura} — {suc.horarioCierre}</p>
                    </div>
                    <div>
                      <span className="text-foreground-400 text-xs">Días</span>
                      <p className="text-foreground-800 font-medium">{suc.diasOperacion.join(', ')}</p>
                    </div>
                  </div>
                  <div className="border-t border-secondary-200 px-5 py-3">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-semibold text-foreground-500 uppercase tracking-wider">Consultorios</h4>
                      <Button size="xs" variant="secondary" icon={<i className="ri-add-line"></i>} onClick={() => openCreateCon(suc.id)}>
                        Agregar
                      </Button>
                    </div>
                    {suc.consultorios.length === 0 ? (
                      <p className="text-xs text-foreground-400 py-3 text-center">Sin consultorios registrados</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {suc.consultorios.map((c) => {
                          const tc = tipoConsultorioLabels[c.tipo];
                          return (
                            <div
                              key={c.id}
                              className="flex items-center justify-between p-3 bg-background-50 rounded-lg border border-secondary-200 group"
                            >
                              <div className="flex items-center gap-2.5">
                                <span className={`w-7 h-7 flex items-center justify-center rounded-md bg-secondary-100 text-secondary-700`}>
                                  <i className={`${tc.icon} text-xs`}></i>
                                </span>
                                <div>
                                  <p className="text-sm font-medium text-foreground-900">{c.nombre}</p>
                                  <div className="flex items-center gap-2 text-xs text-foreground-500">
                                    <span>Piso {c.piso}</span>
                                    <Badge variant={tc.variant} size="sm">{tc.label}</Badge>
                                    {!c.activo && <Badge variant="danger" size="sm">Inactivo</Badge>}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-base">
                                <button
                                  onClick={() => openEditCon(suc.id, c)}
                                  className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-400 hover:text-foreground-700 hover:bg-secondary-100 transition-base cursor-pointer"
                                  aria-label={`Editar consultorio ${c.nombre}`}
                                >
                                  <i className="ri-pencil-line text-xs" aria-hidden="true"></i>
                                </button>
                                <button
                                  onClick={() => setDeleteConTarget({ sucursalId: suc.id, consultorio: c })}
                                  className="w-7 h-7 flex items-center justify-center rounded-md text-foreground-400 hover:text-red-600 hover:bg-red-500/10 transition-base cursor-pointer"
                                  aria-label={`Eliminar consultorio ${c.nombre}`}
                                >
                                  <i className="ri-delete-bin-line text-xs" aria-hidden="true"></i>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Sucursal Modal */}
      <Modal
        open={sucModalOpen}
        onClose={() => setSucModalOpen(false)}
        title={editingSucId ? 'Editar Sucursal' : 'Nueva Sucursal'}
        size="lg"
        footer={
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setSucModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveSuc}>{editingSucId ? 'Guardar Cambios' : 'Registrar Sucursal'}</Button>
          </div>
        }
      >
        <div className="space-y-5">
          <Input
            label="Nombre de la sucursal"
            placeholder="Ej: Clínica Central - CDMX"
            value={sucForm.nombre}
            onChange={(e) => setSucForm({ ...sucForm, nombre: e.target.value })}
            error={sucErrors.nombre}
            maxLength={100}
            autoComplete="organization"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Dirección"
              placeholder="Calle, número, colonia"
              value={sucForm.direccion}
              onChange={(e) => setSucForm({ ...sucForm, direccion: e.target.value })}
              error={sucErrors.direccion}
              maxLength={200}
              autoComplete="street-address"
            />
            <Input
              label="Ciudad"
              placeholder="Ej: Ciudad de México"
              value={sucForm.ciudad}
              onChange={(e) => setSucForm({ ...sucForm, ciudad: e.target.value })}
              error={sucErrors.ciudad}
              maxLength={60}
              autoComplete="address-level2"
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Input
              label="Estado"
              placeholder="Ej: CDMX"
              value={sucForm.estado}
              onChange={(e) => setSucForm({ ...sucForm, estado: e.target.value })}
              error={sucErrors.estado}
              maxLength={30}
              autoComplete="address-level1"
            />
            <Input
              label="C.P."
              placeholder="06600"
              value={sucForm.codigoPostal}
              onChange={(e) => setSucForm({ ...sucForm, codigoPostal: e.target.value })}
              error={sucErrors.codigoPostal}
              maxLength={10}
              autoComplete="postal-code"
            />
            <Input
              label="Teléfono"
              placeholder="55-1000-2000"
              value={sucForm.telefono}
              onChange={(e) => setSucForm({ ...sucForm, telefono: e.target.value })}
              error={sucErrors.telefono}
              maxLength={20}
              autoComplete="tel"
            />
            <Input
              label="Email"
              placeholder="sucursal@medicore.mx"
              type="email"
              value={sucForm.email}
              onChange={(e) => setSucForm({ ...sucForm, email: e.target.value })}
              error={sucErrors.email}
              maxLength={100}
              autoComplete="email"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Horario apertura"
              type="time"
              value={sucForm.horarioApertura}
              onChange={(e) => setSucForm({ ...sucForm, horarioApertura: e.target.value })}
            />
            <Input
              label="Horario cierre"
              type="time"
              value={sucForm.horarioCierre}
              onChange={(e) => setSucForm({ ...sucForm, horarioCierre: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground-800 mb-2">Días de operación</label>
            <div className="flex flex-wrap gap-2">
              {diasSemana.map((dia) => (
                <button
                  key={dia}
                  onClick={() => {
                    const updated = sucForm.diasOperacion.includes(dia)
                      ? sucForm.diasOperacion.filter((d) => d !== dia)
                      : [...sucForm.diasOperacion, dia];
                    setSucForm({ ...sucForm, diasOperacion: updated });
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full cursor-pointer transition-base ${
                    sucForm.diasOperacion.includes(dia)
                      ? 'bg-primary-100 text-primary-700 border border-primary-300'
                      : 'bg-secondary-100 text-foreground-600 border border-secondary-200 hover:border-secondary-300'
                  }`}
                  aria-pressed={sucForm.diasOperacion.includes(dia)}
                  type="button"
                >
                  {dia}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={sucForm.activo}
              onChange={(e) => setSucForm({ ...sucForm, activo: e.target.checked })}
              className="w-4 h-4 rounded border-secondary-300 text-primary-500 focus:ring-primary-400 cursor-pointer"
            />
            <span className="text-sm text-foreground-700">Sucursal activa</span>
          </label>
        </div>
      </Modal>

      {/* Delete Sucursal Modal */}
      <Modal
        open={!!deleteSucTarget}
        onClose={() => setDeleteSucTarget(null)}
        title="Eliminar Sucursal"
        size="sm"
        footer={
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setDeleteSucTarget(null)}>Cancelar</Button>
            <Button variant="danger" onClick={handleDeleteSuc}>Eliminar</Button>
          </div>
        }
      >
        {deleteSucTarget && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
              <span className="w-10 h-10 flex items-center justify-center rounded-full bg-red-100 text-red-600">
                <i className="ri-error-warning-line text-lg"></i>
              </span>
              <div>
                <p className="text-sm font-medium text-red-800">¿Eliminar esta sucursal?</p>
                <p className="text-xs text-red-600 mt-0.5">Se eliminarán también todos sus consultorios. Médicos y citas asociadas quedarán sin sucursal.</p>
              </div>
            </div>
            <div className="p-3 bg-background-50 rounded-lg border border-secondary-200">
              <p className="text-sm font-medium text-foreground-900">{deleteSucTarget.nombre}</p>
              <p className="text-xs text-foreground-500">{deleteSucTarget.direccion} · {deleteSucTarget.consultorios.length} consultorios</p>
            </div>
          </div>
        )}
      </Modal>

      {/* Consultorio Modal */}
      <Modal
        open={conModalOpen}
        onClose={() => setConModalOpen(false)}
        title={editingConId ? 'Editar Consultorio' : 'Nuevo Consultorio'}
        size="md"
        footer={
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setConModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveCon}>{editingConId ? 'Guardar Cambios' : 'Agregar Consultorio'}</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Nombre del consultorio"
            placeholder="Ej: Consultorio 101"
            value={conForm.nombre}
            onChange={(e) => setConForm({ ...conForm, nombre: e.target.value })}
            error={conErrors.nombre}
            maxLength={80}
            autoComplete="off"
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Piso"
              value={conForm.piso}
              onChange={(e) => setConForm({ ...conForm, piso: e.target.value })}
              options={[
                { value: '1', label: 'Piso 1' },
                { value: '2', label: 'Piso 2' },
                { value: '3', label: 'Piso 3' },
              ]}
            />
            <Select
              label="Tipo"
              value={conForm.tipo}
              onChange={(e) => setConForm({ ...conForm, tipo: e.target.value as Consultorio['tipo'] })}
              options={[
                { value: 'consulta', label: 'Consulta' },
                { value: 'procedimiento', label: 'Procedimiento' },
                { value: 'urgencias', label: 'Urgencias' },
                { value: 'triage', label: 'Triage' },
                { value: 'estudio', label: 'Estudio' },
              ]}
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={conForm.activo}
              onChange={(e) => setConForm({ ...conForm, activo: e.target.checked })}
              className="w-4 h-4 rounded border-secondary-300 text-primary-500 focus:ring-primary-400 cursor-pointer"
            />
            <span className="text-sm text-foreground-700">Consultorio activo</span>
          </label>
        </div>
      </Modal>

      {/* Delete Consultorio Modal */}
      <Modal
        open={!!deleteConTarget}
        onClose={() => setDeleteConTarget(null)}
        title="Eliminar Consultorio"
        size="sm"
        footer={
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setDeleteConTarget(null)}>Cancelar</Button>
            <Button variant="danger" onClick={handleDeleteCon}>Eliminar</Button>
          </div>
        }
      >
        {deleteConTarget && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
              <span className="w-10 h-10 flex items-center justify-center rounded-full bg-red-100 text-red-600">
                <i className="ri-error-warning-line text-lg"></i>
              </span>
              <div>
                <p className="text-sm font-medium text-red-800">¿Eliminar este consultorio?</p>
                <p className="text-xs text-red-600 mt-0.5">Las citas programadas en este consultorio quedarán sin ubicación asignada.</p>
              </div>
            </div>
            <div className="p-3 bg-background-50 rounded-lg border border-secondary-200">
              <p className="text-sm font-medium text-foreground-900">{deleteConTarget.consultorio.nombre}</p>
              <p className="text-xs text-foreground-500">Piso {deleteConTarget.consultorio.piso} · {tipoConsultorioLabels[deleteConTarget.consultorio.tipo].label}</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}