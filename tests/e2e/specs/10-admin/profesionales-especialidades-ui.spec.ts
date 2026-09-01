import { test, expect } from '@playwright/test';
import { api } from '../../fixtures/api';
import { entorno } from '../../fixtures/tenants';
import { apiDisponible, loginUi, servidorDisponible } from '../../helpers/auth-ui';
import { sel } from '../../helpers/selectors';
import { users } from '../../data/users';

/**
 * Admin UI · médicos y especialidades (Vite + API real, sin mocks).
 * Deep-link a pantallas M1 (no navega menú — claim Dev-A). Identificadores únicos por corrida;
 * baja = SoftDelete (HTTP DELETE ≠ DELETE SQL). Complementa `00-smoke/api-professionals.spec.ts`.
 */

function stampUnico(): string {
  return `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
}

test.describe.configure({ mode: 'serial' });

test.describe('10 — Admin · profesionales / especialidades UI (Vite + API)', () => {
  test.beforeEach(async () => {
    const upUi = await servidorDisponible(entorno.baseURL);
    const upApi = await apiDisponible(api.url);
    test.skip(
      !upUi || !upApi,
      `Requiere Vite (${entorno.baseURL}) + API (${api.url}). upUi=${upUi} upApi=${upApi}`,
    );
  });

  test('especialidades: lista desde API, alta, edición y baja lógica', async ({ page }) => {
    await loginUi(page, {
      userName: users.admin.email,
      password: users.admin.password,
    });

    const listPromise = page.waitForResponse(
      (r) => {
        try {
          const path = new URL(r.url()).pathname;
          return path === '/api/specialties' && r.request().method() === 'GET' && r.ok();
        } catch {
          return false;
        }
      },
      { timeout: 20_000 },
    );

    await page.goto(sel.admin.especialidadesPath);
    const listRes = await listPromise;
    const listBody = await listRes.json();
    expect(listBody.success).toBe(true);
    expect(Array.isArray(listBody.data)).toBe(true);

    await expect(page.getByTestId('page-admin-especialidades')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('tabla-especialidades')).toBeVisible();
    await expect(page.getByTestId('btn-nueva-especialidad')).toBeVisible();

    const stamp = stampUnico();
    const nombre = `Esp E2E ${stamp}`;
    const nombreEdit = `Esp E2E Edit ${stamp}`;
    const codigo = `E2E_${stamp}`.slice(0, 64).toUpperCase();

    await page.getByTestId('btn-nueva-especialidad').click();
    await expect(page.getByTestId('modal-especialidad')).toBeVisible();
    await page.getByTestId('input-especialidad-nombre').fill(nombre);
    await page.getByTestId('input-especialidad-codigo').fill(codigo);

    const upsertPromise = page.waitForResponse(
      (r) => {
        try {
          const path = new URL(r.url()).pathname;
          return path.startsWith('/api/specialties/') && r.request().method() === 'PUT' && r.ok();
        } catch {
          return false;
        }
      },
      { timeout: 20_000 },
    );

    await page.getByTestId('btn-guardar-especialidad').click();
    const upsertRes = await upsertPromise;
    const created = (await upsertRes.json()).data as { specialtyId: string; name: string };
    expect(created.name).toBe(nombre);

    const row = page.getByTestId(`admin-especialidad-row-${created.specialtyId}`);
    await expect(row).toBeVisible({ timeout: 15_000 });
    await expect(row.getByText(nombre)).toBeVisible();
    await expect(row.getByText(codigo)).toBeVisible();

    await page.getByTestId(`admin-especialidad-editar-${created.specialtyId}`).click({ force: true });
    await expect(page.getByTestId('modal-especialidad')).toBeVisible();
    await page.getByTestId('input-especialidad-nombre').fill(nombreEdit);

    const updatePromise = page.waitForResponse(
      (r) => {
        try {
          const path = new URL(r.url()).pathname;
          return (
            path === `/api/specialties/${created.specialtyId}` &&
            r.request().method() === 'PUT' &&
            r.ok()
          );
        } catch {
          return false;
        }
      },
      { timeout: 20_000 },
    );

    await page.getByTestId('btn-guardar-especialidad').click();
    await updatePromise;
    await expect(
      page.getByTestId(`admin-especialidad-row-${created.specialtyId}`).getByText(nombreEdit),
    ).toBeVisible({ timeout: 15_000 });

    await page.getByTestId(`admin-especialidad-baja-${created.specialtyId}`).click({ force: true });
    await expect(page.getByTestId('modal-baja-especialidad')).toBeVisible();

    const softPromise = page.waitForResponse(
      (r) => {
        try {
          const path = new URL(r.url()).pathname;
          return (
            path === `/api/specialties/${created.specialtyId}` &&
            r.request().method() === 'DELETE' &&
            r.ok()
          );
        } catch {
          return false;
        }
      },
      { timeout: 20_000 },
    );

    await page.getByTestId('btn-confirmar-baja-especialidad').click();
    await softPromise;
    await expect(page.getByTestId(`admin-especialidad-row-${created.specialtyId}`)).toHaveCount(0, {
      timeout: 15_000,
    });
  });

  test('médicos: lista desde API, alta, edición y baja lógica', async ({ page }) => {
    await loginUi(page, {
      userName: users.admin.email,
      password: users.admin.password,
    });

    const listPromise = page.waitForResponse(
      (r) => {
        try {
          const path = new URL(r.url()).pathname;
          return path === '/api/professionals' && r.request().method() === 'GET' && r.ok();
        } catch {
          return false;
        }
      },
      { timeout: 20_000 },
    );

    await page.goto(sel.admin.medicosPath);
    const listRes = await listPromise;
    const listBody = await listRes.json();
    expect(listBody.success).toBe(true);
    expect(Array.isArray(listBody.data)).toBe(true);
    expect((listBody.data as unknown[]).length).toBeGreaterThanOrEqual(1);

    await expect(page.getByTestId('page-admin-medicos')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('tabla-medicos')).toBeVisible();
    await expect(page.getByTestId('btn-nuevo-medico')).toBeVisible();

    const stamp = stampUnico();
    const nombreAlta = `Dr. E2E UI ${stamp}`;
    const nombreEdit = `Dr. E2E UI Edit ${stamp}`;
    const cedula = `CED-UI-${stamp}`.slice(0, 64);

    await page.getByTestId('btn-nuevo-medico').click();
    await expect(page.getByTestId('modal-medico')).toBeVisible();
    await page.getByTestId('input-medico-nombre').fill(nombreAlta);
    await page.getByTestId('input-medico-cedula').fill(cedula);

    const createPromise = page.waitForResponse(
      (r) => {
        try {
          const path = new URL(r.url()).pathname;
          return path === '/api/professionals' && r.request().method() === 'POST' && r.ok();
        } catch {
          return false;
        }
      },
      { timeout: 20_000 },
    );

    await page.getByTestId('btn-guardar-medico').click();
    const createRes = await createPromise;
    const created = (await createRes.json()).data as {
      healthcareProfessionalId: string;
      fullName: string;
    };
    expect(created.fullName).toBe(nombreAlta);

    const row = page.getByTestId(`admin-medico-row-${created.healthcareProfessionalId}`);
    await expect(row).toBeVisible({ timeout: 15_000 });
    await expect(row.getByText(nombreAlta)).toBeVisible();

    await page
      .getByTestId(`admin-medico-editar-${created.healthcareProfessionalId}`)
      .click({ force: true });
    await expect(page.getByTestId('modal-medico')).toBeVisible();
    await page.getByTestId('input-medico-nombre').fill(nombreEdit);

    const updatePromise = page.waitForResponse(
      (r) => {
        try {
          const path = new URL(r.url()).pathname;
          return (
            path === `/api/professionals/${created.healthcareProfessionalId}` &&
            r.request().method() === 'PUT' &&
            r.ok()
          );
        } catch {
          return false;
        }
      },
      { timeout: 20_000 },
    );

    await page.getByTestId('btn-guardar-medico').click();
    await updatePromise;
    await expect(
      page.getByTestId(`admin-medico-row-${created.healthcareProfessionalId}`).getByText(nombreEdit),
    ).toBeVisible({ timeout: 15_000 });

    await page
      .getByTestId(`admin-medico-baja-${created.healthcareProfessionalId}`)
      .click({ force: true });
    await expect(page.getByTestId('modal-baja-medico')).toBeVisible();

    const softPromise = page.waitForResponse(
      (r) => {
        try {
          const path = new URL(r.url()).pathname;
          return (
            path === `/api/professionals/${created.healthcareProfessionalId}` &&
            r.request().method() === 'DELETE' &&
            r.ok()
          );
        } catch {
          return false;
        }
      },
      { timeout: 20_000 },
    );

    await page.getByTestId('btn-confirmar-baja-medico').click();
    await softPromise;
    await expect(
      page.getByTestId(`admin-medico-row-${created.healthcareProfessionalId}`),
    ).toHaveCount(0, { timeout: 15_000 });
  });
});
