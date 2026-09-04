import { useCallback, useEffect, useRef, useState } from 'react';
import {
  clearBranchLogo,
  clearTenantLogo,
  getTenantProfile,
  listBranches,
  updateTenantProfile,
  uploadBranchLogo,
  uploadTenantLogo,
  upsertBranch,
  type BranchDto,
  type TenantProfileDto,
  type UpsertBranchRequest,
} from '@/api/branches';
import { mensajeDeFalla, type ApiFailure } from '@/api/errors';
import Button from '@/components/base/Button';
import Card from '@/components/base/Card';
import Modal from '@/components/base/Modal';
import Input from '@/components/base/Input';
import Badge from '@/components/base/Badge';
import CargandoPantalla from '@/components/feature/CargandoPantalla';
import InstitucionalLogo from '@/components/feature/InstitucionalLogo';
import { notifyBrandLogoChanged } from '@/hooks/useBrandLogo';
import {
  notifyBrandChanged,
  oklchToCssColor,
  parseBrandToken,
} from '@/utils/brandColor';

/** Texto visible cuando un dato del establecimiento no se ha capturado. Nunca se inventa. */
const NO_CAPTURADO = 'No capturado';

function textoOpcional(valor: string | null | undefined): string {
  if (valor === null || valor === undefined || valor.trim() === '') return NO_CAPTURADO;
  return valor;
}

function textoServicioUrgencias(valor: boolean | null | undefined): string {
  if (valor === null || valor === undefined) return NO_CAPTURADO;
  return valor ? 'Sí' : 'No';
}

function formatearDomicilio(b: BranchDto): string {
  const partes = [
    b.addressStreet,
    b.addressNumber,
    b.addressNeighborhood,
    b.addressMunicipality,
    b.addressState,
    b.addressPostalCode,
  ].filter((p): p is string => !!p && p.trim().length > 0);
  return partes.length === 0 ? NO_CAPTURADO : partes.join(', ');
}

type BranchForm = {
  code: string;
  name: string;
  legalName: string;
  addressStreet: string;
  addressNumber: string;
  addressNeighborhood: string;
  addressMunicipality: string;
  addressState: string;
  addressPostalCode: string;
  phoneNumber: string;
  healthLicense: string;
  timeZoneId: string;
  isActive: boolean;
};

const emptyForm: BranchForm = {
  code: '',
  name: '',
  legalName: '',
  addressStreet: '',
  addressNumber: '',
  addressNeighborhood: '',
  addressMunicipality: '',
  addressState: '',
  addressPostalCode: '',
  phoneNumber: '',
  healthLicense: '',
  timeZoneId: '',
  isActive: true,
};

function fromDto(b: BranchDto): BranchForm {
  return {
    code: b.code,
    name: b.name,
    legalName: b.legalName ?? '',
    addressStreet: b.addressStreet ?? '',
    addressNumber: b.addressNumber ?? '',
    addressNeighborhood: b.addressNeighborhood ?? '',
    addressMunicipality: b.addressMunicipality ?? '',
    addressState: b.addressState ?? '',
    addressPostalCode: b.addressPostalCode ?? '',
    phoneNumber: b.phoneNumber ?? '',
    healthLicense: b.healthLicense ?? '',
    timeZoneId: b.timeZoneId ?? '',
    isActive: b.isActive,
  };
}

function toRequest(form: BranchForm, original: BranchDto | null): UpsertBranchRequest {
  const trimOrNull = (v: string) => {
    const t = v.trim();
    return t === '' ? null : t;
  };
  return {
    code: form.code.trim(),
    name: form.name.trim(),
    // FacilityType / HasEmergencyService: se preservan (doc 06 §10).
    // Tipología demo viene del seed; UI de edición no inventa valores.
    facilityType: original?.facilityType ?? null,
    hasEmergencyService: original?.hasEmergencyService ?? null,
    legalName: trimOrNull(form.legalName),
    addressStreet: trimOrNull(form.addressStreet),
    addressNumber: trimOrNull(form.addressNumber),
    addressNeighborhood: trimOrNull(form.addressNeighborhood),
    addressMunicipality: trimOrNull(form.addressMunicipality),
    addressState: trimOrNull(form.addressState),
    addressPostalCode: trimOrNull(form.addressPostalCode),
    phoneNumber: trimOrNull(form.phoneNumber),
    healthLicense: trimOrNull(form.healthLicense),
    timeZoneId: trimOrNull(form.timeZoneId),
    responsiblePhysicianProfessionalId: original?.responsiblePhysicianProfessionalId ?? null,
    isActive: form.isActive,
  };
}

export default function Sucursales() {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const branchLogoInputRef = useRef<HTMLInputElement>(null);
  const [logoError, setLogoError] = useState('');
  const [logoBusy, setLogoBusy] = useState(false);
  const [branchLogoTargetId, setBranchLogoTargetId] = useState<string | null>(null);

  const [tenant, setTenant] = useState<TenantProfileDto | null>(null);
  const [items, setItems] = useState<BranchDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<ApiFailure | null>(null);
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BranchDto | null>(null);
  const [form, setForm] = useState<BranchForm>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [tenantModalOpen, setTenantModalOpen] = useState(false);
  const [tenantForm, setTenantForm] = useState({
    name: '',
    legalName: '',
    rfc: '',
    primaryColorToken: '',
  });
  const [tenantFormError, setTenantFormError] = useState<string | null>(null);
  const [tenantSaving, setTenantSaving] = useState(false);

  const handleTenantLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoBusy(true);
    setLogoError('');
    const res = await uploadTenantLogo(file);
    setLogoBusy(false);
    if (logoInputRef.current) logoInputRef.current.value = '';
    if (!res.success || !res.data) {
      setLogoError(res.message ?? mensajeDeFalla(res.failure).titulo);
      return;
    }
    setTenant(res.data);
    notifyBrandLogoChanged();
  };

  const handleClearTenantLogo = async () => {
    setLogoBusy(true);
    setLogoError('');
    const res = await clearTenantLogo();
    setLogoBusy(false);
    if (!res.success || !res.data) {
      setLogoError(res.message ?? mensajeDeFalla(res.failure).titulo);
      return;
    }
    setTenant(res.data);
    notifyBrandLogoChanged();
  };

  const handleBranchLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const branchId = branchLogoTargetId;
    if (!file || !branchId) return;
    setLogoBusy(true);
    setLogoError('');
    const res = await uploadBranchLogo(branchId, file);
    setLogoBusy(false);
    setBranchLogoTargetId(null);
    if (branchLogoInputRef.current) branchLogoInputRef.current.value = '';
    if (!res.success || !res.data) {
      setLogoError(res.message ?? mensajeDeFalla(res.failure).titulo);
      return;
    }
    setItems((prev) => prev.map((b) => (b.branchId === res.data!.branchId ? res.data! : b)));
    notifyBrandLogoChanged();
  };

  const handleClearBranchLogo = async (branchId: string) => {
    setLogoBusy(true);
    setLogoError('');
    const res = await clearBranchLogo(branchId);
    setLogoBusy(false);
    if (!res.success || !res.data) {
      setLogoError(res.message ?? mensajeDeFalla(res.failure).titulo);
      return;
    }
    setItems((prev) => prev.map((b) => (b.branchId === res.data!.branchId ? res.data! : b)));
    notifyBrandLogoChanged();
  };

  const cargar = useCallback(async () => {
    setLoading(true);
    setFailure(null);
    const [perfil, listado] = await Promise.all([
      getTenantProfile(),
      listBranches(false),
    ]);
    if (!perfil.success || !perfil.data) {
      setFailure(perfil.failure ?? { kind: 'error_servidor' });
      setLoading(false);
      return;
    }
    if (!listado.success || !listado.data) {
      setFailure(listado.failure ?? { kind: 'error_servidor' });
      setLoading(false);
      return;
    }
    setTenant(perfil.data);
    setItems(listado.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const filtered = items.filter((s) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      s.code.toLowerCase().includes(q) ||
      (s.addressMunicipality ?? '').toLowerCase().includes(q) ||
      (s.addressState ?? '').toLowerCase().includes(q)
    );
  });

  const openEdit = (b: BranchDto) => {
    setEditing(b);
    setForm(fromDto(b));
    setFormError(null);
    setModalOpen(true);
  };

  const openTenantEdit = () => {
    if (!tenant) return;
    setTenantForm({
      name: tenant.name,
      legalName: tenant.legalName ?? '',
      rfc: tenant.rfc ?? '',
      primaryColorToken: tenant.primaryColorToken ?? '',
    });
    setTenantFormError(null);
    setTenantModalOpen(true);
  };

  const handleTenantSave = async () => {
    if (!tenantForm.name.trim()) {
      setTenantFormError('El nombre de la organización es obligatorio.');
      return;
    }
    const colorRaw = tenantForm.primaryColorToken.trim();
    if (colorRaw && !parseBrandToken(colorRaw)) {
      setTenantFormError(
        'Color de marca inválido. Usa hex (#0EA5E9) o OKLCH (0.55 0.195 250).',
      );
      return;
    }
    if (colorRaw.length > 64) {
      setTenantFormError('El token de color admite máximo 64 caracteres.');
      return;
    }
    setTenantSaving(true);
    setTenantFormError(null);
    const trimOrNull = (v: string) => {
      const t = v.trim();
      return t === '' ? null : t;
    };
    const res = await updateTenantProfile({
      name: tenantForm.name.trim(),
      legalName: trimOrNull(tenantForm.legalName),
      rfc: trimOrNull(tenantForm.rfc),
      primaryColorToken: trimOrNull(tenantForm.primaryColorToken),
    });
    setTenantSaving(false);
    if (!res.success || !res.data) {
      const msg = mensajeDeFalla(res.failure);
      setTenantFormError(res.message ?? msg.titulo);
      return;
    }
    setTenantModalOpen(false);
    notifyBrandChanged();
    await cargar();
  };

  const handleSave = async () => {
    if (!editing) return;
    if (!form.code.trim()) {
      setFormError('El código es obligatorio.');
      return;
    }
    if (!form.name.trim()) {
      setFormError('El nombre es obligatorio.');
      return;
    }
    setSaving(true);
    setFormError(null);
    const res = await upsertBranch(editing.branchId, toRequest(form, editing));
    setSaving(false);
    if (!res.success || !res.data) {
      const msg = mensajeDeFalla(res.failure);
      setFormError(res.message ?? msg.titulo);
      return;
    }
    setModalOpen(false);
    await cargar();
  };

  if (loading) {
    return <CargandoPantalla />;
  }

  if (failure) {
    const msg = mensajeDeFalla(failure);
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Card>
          <h1 className="text-lg font-semibold text-secondary-900 mb-2">{msg.titulo}</h1>
          <p className="text-sm text-secondary-600 mb-4">{msg.detalle}</p>
          <Button onClick={() => void cargar()}>Reintentar</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto" data-testid="page-admin-sucursales">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-secondary-900">Sucursales</h1>
        <p className="text-sm text-secondary-600">
          Datos del establecimiento que se imprimen en el expediente (NOM-004 5.2–5.2.4).
          Los campos vacíos se muestran como no capturados; no se inventa domicilio ni tipo.
        </p>
      </header>

      <div data-testid="brand-logo-card">
        <Card padding="lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-20 h-20 rounded-xl border border-secondary-200 bg-secondary-50 flex items-center justify-center overflow-hidden flex-shrink-0">
              <InstitucionalLogo
                branchId={null}
                imgClassName="w-full h-full object-contain"
                fallbackClassName="w-full h-full rounded-xl bg-secondary-100 text-foreground-400 flex items-center justify-center"
                fallbackIcon="ri-image-add-line"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground-900 font-heading">
                Logo de la organización
              </h3>
              <p className="text-xs text-foreground-500 mt-1">
                Marca por defecto del tenant (archivos en servidor). Las sucursales pueden
                definir una variante; si no, heredan este logo.
              </p>
              {logoError && (
                <p className="text-xs text-red-500 mt-1" role="alert">
                  {logoError}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <input
                ref={logoInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.gif,image/jpeg,image/png,image/gif"
                onChange={(e) => void handleTenantLogoSelect(e)}
                className="hidden"
                data-testid="brand-logo-input"
              />
              <input
                ref={branchLogoInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.gif,image/jpeg,image/png,image/gif"
                onChange={(e) => void handleBranchLogoSelect(e)}
                className="hidden"
                data-testid="branch-logo-input"
              />
              <Button
                size="sm"
                disabled={logoBusy}
                onClick={() => logoInputRef.current?.click()}
                data-testid="brand-logo-upload"
              >
                <i className="ri-upload-cloud-line" aria-hidden="true"></i>{' '}
                {tenant?.logoRelativePath ? 'Cambiar logo' : 'Subir logo'}
              </Button>
              {tenant?.logoRelativePath && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={logoBusy}
                  onClick={() => void handleClearTenantLogo()}
                >
                  Quitar
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>

      {tenant && (
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-secondary-500">Organización</p>
              <p className="text-lg font-medium text-secondary-900">{tenant.name}</p>
              <p className="text-sm text-secondary-600">Código: {tenant.code}</p>
              <p className="text-sm text-secondary-600">
                Razón social: {textoOpcional(tenant.legalName)}
              </p>
              <p className="text-sm text-secondary-600">RFC: {textoOpcional(tenant.rfc)}</p>
              <div className="flex items-center gap-2 text-sm text-secondary-600 mt-1">
                <span>Color de marca: {textoOpcional(tenant.primaryColorToken)}</span>
                {tenant.primaryColorToken && parseBrandToken(tenant.primaryColorToken) && (
                  <span
                    className="inline-block w-4 h-4 rounded border border-secondary-200"
                    style={{
                      backgroundColor: oklchToCssColor(
                        parseBrandToken(tenant.primaryColorToken)!,
                      ),
                    }}
                    title="Vista previa"
                    aria-hidden="true"
                  />
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Badge variant={tenant.isActive ? 'success' : 'secondary'}>
                {tenant.isActive ? 'Activa' : 'Inactiva'}
              </Badge>
              <Button variant="secondary" size="sm" onClick={openTenantEdit}>
                Editar organización
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, código o municipio"
          className="max-w-sm"
        />
        <Button variant="secondary" onClick={() => void cargar()}>
          Actualizar
        </Button>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <Card>
            <p className="text-sm text-secondary-600">No hay sucursales que coincidan.</p>
          </Card>
        )}
        {filtered.map((b) => (
          <Card key={b.branchId} data-testid={`branch-card-${b.code}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex gap-3 min-w-0 flex-1">
                <div className="w-14 h-14 rounded-lg border border-secondary-200 bg-secondary-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                  <InstitucionalLogo
                    branchId={b.branchId}
                    imgClassName="w-full h-full object-contain"
                    fallbackClassName="w-full h-full rounded-lg bg-secondary-100 text-foreground-400 flex items-center justify-center text-lg"
                    fallbackIcon="ri-image-line"
                  />
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold text-secondary-900">{b.name}</h2>
                    <Badge variant="info">{b.code}</Badge>
                    <Badge variant={b.isActive ? 'success' : 'secondary'}>
                      {b.isActive ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </div>
                  <p className="text-sm text-secondary-600">
                    Tipo: {b.facilityType ? b.facilityType : NO_CAPTURADO}
                  </p>
                  <p className="text-sm text-secondary-600">
                    Urgencias: {textoServicioUrgencias(b.hasEmergencyService)}
                  </p>
                  <p className="text-sm text-secondary-600">
                    Razón social: {textoOpcional(b.legalName)}
                  </p>
                  <p className="text-sm text-secondary-600">Domicilio: {formatearDomicilio(b)}</p>
                  <p className="text-sm text-secondary-600">
                    Teléfono: {textoOpcional(b.phoneNumber)}
                  </p>
                  <p className="text-sm text-secondary-600">
                    Licencia sanitaria: {textoOpcional(b.healthLicense)}
                  </p>
                  <p className="text-sm text-secondary-600">
                    Zona horaria: {textoOpcional(b.timeZoneId)}
                  </p>
                  <p className="text-xs text-secondary-500">
                    Logo sucursal:{' '}
                    {b.logoRelativePath ? 'personalizado' : 'hereda organización'}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Button variant="secondary" onClick={() => openEdit(b)}>
                  Editar datos
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={logoBusy}
                  data-testid={`branch-logo-upload-${b.code}`}
                  onClick={() => {
                    setBranchLogoTargetId(b.branchId);
                    branchLogoInputRef.current?.click();
                  }}
                >
                  {b.logoRelativePath ? 'Cambiar logo' : 'Logo sucursal'}
                </Button>
                {b.logoRelativePath && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={logoBusy}
                    onClick={() => void handleClearBranchLogo(b.branchId)}
                  >
                    Quitar logo
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editing ? `Editar ${editing.name}` : 'Sucursal'}
      >
        <div className="space-y-3">
          <p className="text-xs text-secondary-500">
            Tipo de establecimiento y servicio de urgencias quedan sin capturar hasta que el
            responsable sanitario responda la pregunta abierta L. No se rellenan por omisión.
          </p>
          <Input
            label="Código"
            value={form.code}
            onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
          />
          <Input
            label="Nombre"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Input
            label="Razón social"
            value={form.legalName}
            onChange={(e) => setForm((f) => ({ ...f, legalName: e.target.value }))}
            placeholder={NO_CAPTURADO}
          />
          <Input
            label="Calle"
            value={form.addressStreet}
            onChange={(e) => setForm((f) => ({ ...f, addressStreet: e.target.value }))}
            placeholder={NO_CAPTURADO}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Número"
              value={form.addressNumber}
              onChange={(e) => setForm((f) => ({ ...f, addressNumber: e.target.value }))}
              placeholder={NO_CAPTURADO}
            />
            <Input
              label="Colonia"
              value={form.addressNeighborhood}
              onChange={(e) => setForm((f) => ({ ...f, addressNeighborhood: e.target.value }))}
              placeholder={NO_CAPTURADO}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Municipio"
              value={form.addressMunicipality}
              onChange={(e) => setForm((f) => ({ ...f, addressMunicipality: e.target.value }))}
              placeholder={NO_CAPTURADO}
            />
            <Input
              label="Estado"
              value={form.addressState}
              onChange={(e) => setForm((f) => ({ ...f, addressState: e.target.value }))}
              placeholder={NO_CAPTURADO}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="C.P."
              value={form.addressPostalCode}
              onChange={(e) => setForm((f) => ({ ...f, addressPostalCode: e.target.value }))}
              placeholder={NO_CAPTURADO}
            />
            <Input
              label="Teléfono"
              value={form.phoneNumber}
              onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
              placeholder={NO_CAPTURADO}
            />
          </div>
          <Input
            label="Licencia sanitaria"
            value={form.healthLicense}
            onChange={(e) => setForm((f) => ({ ...f, healthLicense: e.target.value }))}
            placeholder={NO_CAPTURADO}
          />
          <Input
            label="Zona horaria (IANA)"
            value={form.timeZoneId}
            onChange={(e) => setForm((f) => ({ ...f, timeZoneId: e.target.value }))}
            placeholder={NO_CAPTURADO}
          />
          <label className="flex items-center gap-2 text-sm text-secondary-700">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
            />
            Sucursal activa
          </label>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" disabled={saving} onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={saving} onClick={() => void handleSave()}>
              {saving ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={tenantModalOpen}
        onClose={() => !tenantSaving && setTenantModalOpen(false)}
        title="Editar organización"
      >
        <div className="space-y-3">
          <p className="text-xs text-secondary-500">
            Datos de la organización (tenant). El token de color (hex u OKLCH) se aplica a la
            paleta primaria en pantalla. El logo institucional se gestiona aparte (estación
            local hasta almacenamiento en API).
          </p>
          <Input
            label="Nombre comercial"
            value={tenantForm.name}
            onChange={(e) => setTenantForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Input
            label="Razón social"
            value={tenantForm.legalName}
            onChange={(e) => setTenantForm((f) => ({ ...f, legalName: e.target.value }))}
            placeholder={NO_CAPTURADO}
          />
          <Input
            label="RFC"
            value={tenantForm.rfc}
            onChange={(e) => setTenantForm((f) => ({ ...f, rfc: e.target.value }))}
            placeholder={NO_CAPTURADO}
          />
          <div className="space-y-1.5">
            <Input
              label="Color de marca"
              value={tenantForm.primaryColorToken}
              onChange={(e) =>
                setTenantForm((f) => ({ ...f, primaryColorToken: e.target.value }))
              }
              placeholder="#0EA5E9 o 0.55 0.195 250"
              hint="Hex (#RRGGBB) u OKLCH (L C H). Vacío = paleta por defecto."
              data-testid="tenant-color-token"
            />
            {parseBrandToken(tenantForm.primaryColorToken) && (
              <div className="flex items-center gap-2 text-xs text-secondary-600">
                <span
                  className="inline-block w-6 h-6 rounded-md border border-secondary-200"
                  style={{
                    backgroundColor: oklchToCssColor(
                      parseBrandToken(tenantForm.primaryColorToken)!,
                    ),
                  }}
                  aria-hidden="true"
                />
                Vista previa del tono primario
              </div>
            )}
          </div>          {tenantFormError && <p className="text-sm text-red-600">{tenantFormError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              disabled={tenantSaving}
              onClick={() => setTenantModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button disabled={tenantSaving} onClick={() => void handleTenantSave()}>
              {tenantSaving ? 'Guardando…' : 'Guardar'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
