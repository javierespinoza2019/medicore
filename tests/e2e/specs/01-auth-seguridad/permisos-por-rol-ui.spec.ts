import { test, expect } from '@playwright/test';
import { api } from '../../fixtures/api';
import { entorno } from '../../fixtures/tenants';
import {
  apiDisponible,
  expandirGrupo,
  expandirMenu,
  loginUi,
  servidorDisponible,
} from '../../helpers/auth-ui';
import { sel } from '../../helpers/selectors';
import { users } from '../../data/users';

/**
 * PermissionGate + menú por rol (Vite + API real). Sin mocks de sesión.
 * Roles seed demo: recepción, admin, médico, enfermería, caja.
 * Complementa `permisos-por-rol.spec.ts` (contrato-api).
 */

test.describe.configure({ mode: 'serial' });

test.describe('01 — Auth / seguridad · permisos por rol (UI)', () => {
  test.beforeEach(async () => {
    const upUi = await servidorDisponible(entorno.baseURL);
    const upApi = await apiDisponible(api.url);
    test.skip(
      !upUi || !upApi,
      `Requiere Vite (${entorno.baseURL}) + API (${api.url}). upUi=${upUi} upApi=${upApi}`,
    );
  });

  test('recepción: sin Administración/Urgencias/Consultas/Caja; deep-links denegados → dashboard', async ({
    page,
  }) => {
    await loginUi(page, {
      userName: users.recepcion.email,
      password: users.recepcion.password,
    });
    await expandirMenu(page);

    await expect(page.getByTestId(sel.nav.group('administracion'))).toHaveCount(0);
    await expect(page.getByTestId(sel.nav.group('seguridad'))).toHaveCount(0);
    await expect(page.getByTestId(sel.nav.group('clinico'))).toHaveCount(0);
    await expect(page.getByTestId(sel.nav.item('usuarios'))).toHaveCount(0);
    await expect(page.getByTestId(sel.nav.item('consultas'))).toHaveCount(0);
    await expect(page.getByTestId(sel.nav.group('finanzas'))).toHaveCount(0);
    await expect(page.getByTestId(sel.nav.item('caja'))).toHaveCount(0);

    await expect(page.getByTestId(sel.nav.group('operacion'))).toBeVisible();
    await expandirGrupo(page, 'operacion');
    await expect(page.getByTestId(sel.nav.item('triage'))).toBeVisible();
    await expect(page.getByTestId(sel.nav.item('urgencias'))).toHaveCount(0);

    await page.goto('/app/administracion/usuarios');
    await expect(page).toHaveURL(sel.app.dashboardPath, { timeout: 10_000 });

    await page.goto('/app/urgencias');
    await expect(page).toHaveURL(sel.app.dashboardPath, { timeout: 10_000 });

    await page.goto('/app/consultas');
    await expect(page).toHaveURL(sel.app.dashboardPath, { timeout: 10_000 });

    await page.goto('/app/caja');
    await expect(page).toHaveURL(sel.app.dashboardPath, { timeout: 10_000 });
  });

  test('admin: Administración/Usuarios y Seguridad visibles; deep-link permitido', async ({
    page,
  }) => {
    await loginUi(page, {
      userName: users.admin.email,
      password: users.admin.password,
    });
    await expandirMenu(page);
    await expandirGrupo(page, 'administracion');

    await expect(page.getByTestId(sel.nav.item('usuarios'))).toBeVisible();
    await expect(page.getByTestId(sel.nav.group('finanzas'))).toBeVisible();
    await expect(page.getByTestId(sel.nav.group('clinico'))).toBeVisible();
    await expect(page.getByTestId(sel.nav.group('seguridad'))).toBeVisible();

    await page.getByTestId(sel.nav.item('usuarios')).click();
    await expect(page).toHaveURL(/\/app\/administracion\/usuarios/);

    await expandirMenu(page);
    await expandirGrupo(page, 'seguridad');
    await expect(page.getByTestId(sel.nav.item('auditoria'))).toBeVisible();
    await page.goto('/app/seguridad/auditoria');
    await expect(page).toHaveURL(/\/app\/seguridad\/auditoria/);
  });

  test('médico: Clínico/Consultas sí; sin Finanzas/Admin; deep-links denegados → dashboard', async ({
    page,
  }) => {
    await loginUi(page, {
      userName: users.medico.email,
      password: users.medico.password,
    });
    await expandirMenu(page);

    await expect(page.getByTestId(sel.nav.group('finanzas'))).toHaveCount(0);
    await expect(page.getByTestId(sel.nav.item('caja'))).toHaveCount(0);
    await expect(page.getByTestId(sel.nav.group('administracion'))).toHaveCount(0);
    await expect(page.getByTestId(sel.nav.group('seguridad'))).toHaveCount(0);
    await expect(page.getByTestId(sel.nav.group('clinico'))).toBeVisible();

    await expandirGrupo(page, 'clinico');
    await expect(page.getByTestId(sel.nav.item('consultas'))).toBeVisible();
    await expect(page.getByTestId(sel.nav.item('recetas'))).toBeVisible();

    await page.goto('/app/caja');
    await expect(page).toHaveURL(sel.app.dashboardPath, { timeout: 10_000 });

    await page.goto('/app/administracion/usuarios');
    await expect(page).toHaveURL(sel.app.dashboardPath, { timeout: 10_000 });

    await page.goto('/app/seguridad/auditoria');
    await expect(page).toHaveURL(sel.app.dashboardPath, { timeout: 10_000 });
  });

  test('enfermería: Triage/Urgencias/Notas sí; sin Agenda/Caja/Consultas; deep-links → dashboard', async ({
    page,
  }) => {
    await loginUi(page, {
      userName: users.enfermeriaNorte.email,
      password: users.enfermeriaNorte.password,
      branchId: 'suc2',
    });
    await expandirMenu(page);

    await expect(page.getByTestId(sel.nav.group('operacion'))).toBeVisible();
    await expandirGrupo(page, 'operacion');
    await expect(page.getByTestId(sel.nav.item('triage'))).toBeVisible();
    await expect(page.getByTestId(sel.nav.item('urgencias'))).toBeVisible();
    await expect(page.getByTestId(sel.nav.item('agenda'))).toHaveCount(0);

    await expect(page.getByTestId(sel.nav.group('finanzas'))).toHaveCount(0);
    await expect(page.getByTestId(sel.nav.group('clinico'))).toHaveCount(0);
    await expect(page.getByTestId(sel.nav.group('administracion'))).toHaveCount(0);
    await expect(page.getByTestId(sel.nav.item('consultas'))).toHaveCount(0);
    await expect(page.getByTestId(sel.nav.item('caja'))).toHaveCount(0);

    await expect(page.getByTestId(sel.nav.group('normatividad'))).toBeVisible();
    await expandirGrupo(page, 'normatividad');
    await expect(page.getByTestId(sel.nav.item('notas-enfermeria'))).toBeVisible();

    await page.goto('/app/consultas');
    await expect(page).toHaveURL(sel.app.dashboardPath, { timeout: 10_000 });

    await page.goto('/app/caja');
    await expect(page).toHaveURL(sel.app.dashboardPath, { timeout: 10_000 });

    await page.goto('/app/agenda');
    await expect(page).toHaveURL(sel.app.dashboardPath, { timeout: 10_000 });

    await page.goto('/app/administracion/usuarios');
    await expect(page).toHaveURL(sel.app.dashboardPath, { timeout: 10_000 });
  });

  test('caja: Finanzas sí; sin Operación/Consultas/Admin; deep-links denegados → dashboard', async ({
    page,
  }) => {
    await loginUi(page, {
      userName: users.caja.email,
      password: users.caja.password,
    });
    await expandirMenu(page);

    await expect(page.getByTestId(sel.nav.group('operacion'))).toHaveCount(0);
    await expect(page.getByTestId(sel.nav.group('administracion'))).toHaveCount(0);
    await expect(page.getByTestId(sel.nav.group('seguridad'))).toHaveCount(0);

    await expect(page.getByTestId(sel.nav.group('finanzas'))).toBeVisible();
    await expandirGrupo(page, 'finanzas');
    await expect(page.getByTestId(sel.nav.item('caja'))).toBeVisible();
    await expect(page.getByTestId(sel.nav.item('cortes'))).toBeVisible();

    const clinico = page.getByTestId(sel.nav.group('clinico'));
    if ((await clinico.count()) > 0) {
      await expandirGrupo(page, 'clinico');
    }
    await expect(page.getByTestId(sel.nav.item('consultas'))).toHaveCount(0);

    await page.goto('/app/consultas');
    await expect(page).toHaveURL(sel.app.dashboardPath, { timeout: 10_000 });

    await page.goto('/app/triage');
    await expect(page).toHaveURL(sel.app.dashboardPath, { timeout: 10_000 });

    await page.goto('/app/urgencias');
    await expect(page).toHaveURL(sel.app.dashboardPath, { timeout: 10_000 });
  });
});
