/**
 * Ciclo guiado QA — AuthZ / aislamiento (CP-MC-AUTHZ).
 * M13 + SC-23 + PermissionGate UI; sin exploits.
 */

export const CICLO_AUTHZ = {
  code: 'AUTHZ',
  label: 'AuthZ y aislamiento',
  total: 6,
} as const;

export type PasoAuthz = {
  id: string;
  index: number;
  title: string;
  detail: string;
};

export const PASOS_AUTHZ: readonly PasoAuthz[] = [
  {
    id: 'CP-MC-AUTHZ-01',
    index: 1,
    title: 'Sin token → 401',
    detail: 'S.1: rutas clinicas y POST subjects sin Bearer responden 401 (o 405).',
  },
  {
    id: 'CP-MC-AUTHZ-02',
    index: 2,
    title: 'SC-23 busqueda por descripcion',
    detail: 'Admin 200 sin givenName/CURP; medico 403 (interes legitimo).',
  },
  {
    id: 'CP-MC-AUTHZ-03',
    index: 3,
    title: 'Caja no escala a clinico',
    detail: 'S.3: caja no crea nota ni lee auditoria (403).',
  },
  {
    id: 'CP-MC-AUTHZ-04',
    index: 4,
    title: 'UI medico: menu y deep-links',
    detail: 'Clínico visible; sin Finanzas/Admin; caja/usuarios/auditoria → dashboard.',
  },
  {
    id: 'CP-MC-AUTHZ-05',
    index: 5,
    title: 'UI caja: menu y deep-links',
    detail: 'Finanzas si; sin Operacion/Admin; consultas/triage/urgencias → dashboard.',
  },
  {
    id: 'CP-MC-AUTHZ-06',
    index: 6,
    title: 'Tenant / break-glass',
    detail: 'S.2 IDOR bravo 404 si hay TENANT_B; si no, S.4 break-glass no abre admin/auditoria.',
  },
] as const;
