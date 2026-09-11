import { test, expect } from '@playwright/test';
import {
  api,
  autorizacion,
  contextoLimpio,
  idE2E,
  iniciarSesion,
  sesionValida,
} from '../../fixtures/api';
import { isGuidedEnabled } from '../../fixtures/guided-overlay';
import { runGuidedPaso } from '../../fixtures/guided-runner';
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
import { CICLO_AUTHZ, PASOS_AUTHZ } from '../../guided/ciclos/authz';

/**
 * Ciclo guiado QA — AuthZ (CP-MC-AUTHZ 1/6).
 * MEDICORE_E2E_GUIDED=1 · tools/run-guided-qa.ps1 -Cycle authz
 */

const BRANCH_DEMO = '22222222-2222-2222-2222-222222222222';
const JUSTIFICACION =
  'Continuidad de atencion en urgencias; estacion sin medico de guardia.';

const RUTAS_CLINICAS = ['/api/subjects', '/api/encounters', '/api/professionals'] as const;

test.describe.configure({ mode: 'serial' });

test.describe('Guided QA · CP-MC-AUTHZ authz', () => {
  test.beforeEach(async () => {
    test.skip(!isGuidedEnabled(), 'Activa con MEDICORE_E2E_GUIDED=1 (tools/run-guided-qa.ps1 -Cycle authz)');
    const upUi = await servidorDisponible(entorno.baseURL);
    const upApi = await apiDisponible(api.url);
    test.skip(!upUi || !upApi, `Requiere Vite (${entorno.baseURL}) + API (${api.url})`);
  });

  test('ciclo AUTHZ 1/6 — matriz API, UI roles y tenant', async ({ page }) => {
    test.setTimeout(180_000);

    await runGuidedPaso(page, CICLO_AUTHZ, PASOS_AUTHZ[0]!, async () => {
      await page.goto('/login');
      const ctx = await contextoLimpio();
      try {
        for (const ruta of RUTAS_CLINICAS) {
          const res = await ctx.get(ruta);
          expect([401, 405], `${ruta} sin token`).toContain(res.status());
        }
        const post = await ctx.post('/api/subjects', {
          data: { branchId: BRANCH_DEMO },
        });
        expect(post.status()).toBe(401);
      } finally {
        await ctx.dispose();
      }
      return 'S.1: clinico sin Bearer → 401';
    });

    await runGuidedPaso(page, CICLO_AUTHZ, PASOS_AUTHZ[1]!, async () => {
      const ctx = await contextoLimpio();
      try {
        const admin = await sesionValida(ctx);
        const ok = await ctx.post('/api/subjects/search-by-description', {
          headers: autorizacion(admin),
          data: { branchId: BRANCH_DEMO },
        });
        expect(ok.status()).toBe(200);
        const okBody = await ok.json();
        for (const m of okBody.data.matches) {
          expect(m).not.toHaveProperty('givenName');
          expect(m).not.toHaveProperty('curp');
        }

        const login = await iniciarSesion(ctx, {
          userName: users.medico.email,
          password: users.medico.password,
        });
        expect(login.status()).toBe(200);
        const medico = await login.json();
        const deny = await ctx.post('/api/subjects/search-by-description', {
          headers: { Authorization: `Bearer ${medico.data.accessToken}` },
          data: { branchId: BRANCH_DEMO },
        });
        expect(deny.status()).toBe(403);
      } finally {
        await ctx.dispose();
      }
      await page.goto('/login');
      return 'SC-23: admin OK sin PHI; medico 403';
    });

    await runGuidedPaso(page, CICLO_AUTHZ, PASOS_AUTHZ[2]!, async () => {
      const ctx = await contextoLimpio();
      try {
        const admin = await sesionValida(ctx);
        const headersAdmin = autorizacion(admin);
        const subj = await ctx.post('/api/subjects', {
          headers: headersAdmin,
          data: { branchId: BRANCH_DEMO },
        });
        expect(subj.status()).toBe(200);
        const subjectId = (await subj.json()).data.subjectId as string;
        const enc = await ctx.post('/api/encounters', {
          headers: headersAdmin,
          data: {
            branchId: BRANCH_DEMO,
            subjectId,
            encounterType: 'consulta_externa',
          },
        });
        expect(enc.status()).toBe(200);
        const encounterId = (await enc.json()).data.encounterId as string;

        const loginCaja = await iniciarSesion(ctx, {
          userName: users.caja.email,
          password: users.caja.password,
        });
        expect(loginCaja.status()).toBe(200);
        const cajaBody = await loginCaja.json();
        const headersCaja = { Authorization: `Bearer ${cajaBody.data.accessToken}` };

        const nota = await ctx.post(`/api/encounters/${encounterId}/notes`, {
          headers: headersCaja,
          data: {
            noteType: 'evolucion',
            prognosis: null,
            body: { subjetivo: 'intento caja', objetivo: null, analisis: null, plan: null },
          },
        });
        expect(nota.status(), await nota.text()).toBe(403);

        const audit = await ctx.get(`/api/audit/actor/${cajaBody.data.userId}`, {
          headers: headersCaja,
        });
        expect(audit.status()).toBe(403);
      } finally {
        await ctx.dispose();
      }
      await page.goto('/login');
      return 'S.3: caja 403 en nota y auditoria';
    });

    await runGuidedPaso(page, CICLO_AUTHZ, PASOS_AUTHZ[3]!, async () => {
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
      return 'Medico: PermissionGate + deep-links OK';
    });

    await runGuidedPaso(page, CICLO_AUTHZ, PASOS_AUTHZ[4]!, async () => {
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
      return 'Caja: menu finanzas; clinico denegado';
    });

    await runGuidedPaso(page, CICLO_AUTHZ, PASOS_AUTHZ[5]!, async () => {
      await page.goto('/login');
      const hayB = api.tenantB.trim().length > 0 && api.tenantB !== api.tenant;
      const ctx = await contextoLimpio();
      try {
        if (hayB) {
          const sesionA = await sesionValida(ctx);
          const headersA = autorizacion(sesionA);
          const created = await ctx.post('/api/subjects', {
            headers: headersA,
            data: { branchId: BRANCH_DEMO },
          });
          expect(created.status(), await created.text()).toBe(200);
          const subjectId = (await created.json()).data.subjectId as string;
          const enc = await ctx.post('/api/encounters', {
            headers: headersA,
            data: {
              branchId: BRANCH_DEMO,
              subjectId,
              encounterType: 'urgencias',
            },
          });
          expect(enc.status(), await enc.text()).toBe(200);
          const encounterId = (await enc.json()).data.encounterId as string;

          const loginB = await ctx.post('/api/auth/login', {
            data: {
              tenantCode: api.tenantB,
              userName: api.usuario,
              password: api.password,
            },
          });
          expect(loginB.status()).toBe(200);
          const headersB = {
            Authorization: `Bearer ${(await loginB.json()).data.accessToken}`,
          };

          expect((await ctx.get(`/api/subjects/${subjectId}`, { headers: headersB })).status()).toBe(
            404,
          );
          expect(
            (await ctx.get(`/api/encounters/${encounterId}`, { headers: headersB })).status(),
          ).toBe(404);
          const recordCruzado = await ctx.get(`/api/subjects/${subjectId}/record`, {
            headers: headersB,
          });
          expect([403, 404]).toContain(recordCruzado.status());
          return `S.2 IDOR: tenant ${api.tenantB} no ve demo (404)`;
        }

        // Fallback S.4 si no hay TENANT_B (sin contaminar recepcion seed).
        const admin = await sesionValida(ctx);
        const adminHeaders = autorizacion(admin);
        const stamp = idE2E('authz');
        const userId = crypto.randomUUID();
        const userName = `e2e.authz.${stamp}@medicore.mx`.slice(0, 128);
        const password = 'AuthzUi123!';
        const branches = await ctx.get('/api/branches?onlyActive=true', { headers: adminHeaders });
        expect(branches.status(), await branches.text()).toBe(200);
        const branchId = ((await branches.json()).data as Array<{ branchId: string }>)[0].branchId;
        const create = await ctx.post('/api/users', {
          headers: adminHeaders,
          data: {
            userId,
            userName,
            displayName: `E2E AUTHZ ${stamp}`,
            password,
            isActive: true,
            roleCodes: ['recepcion'],
            branchIds: [branchId],
          },
        });
        expect(create.status(), await create.text()).toBe(200);

        const login = await iniciarSesion(ctx, { userName, password });
        expect(login.status()).toBe(200);
        const token = (await login.json()).data.accessToken as string;
        const headers = { Authorization: `Bearer ${token}` };

        expect(
          (
            await ctx.post('/api/auth/break-glass', {
              headers,
              data: { justification: JUSTIFICACION, permissionKeys: ['canAdminUsers'] },
            })
          ).status(),
        ).toBe(400);
        expect(
          (
            await ctx.post('/api/auth/break-glass', {
              headers,
              data: { justification: JUSTIFICACION, permissionKeys: ['canVerAuditoria'] },
            })
          ).status(),
        ).toBe(400);

        const bgClinico = await ctx.post('/api/auth/break-glass', {
          headers,
          data: {
            justification: JUSTIFICACION,
            permissionKeys: ['canCreateConsulta'],
          },
        });
        expect(bgClinico.status(), await bgClinico.text()).toBe(200);
        const perms = (await bgClinico.json()).data.permissions;
        expect(perms.canAdminUsers).toBe(false);
        expect(perms.canVerAuditoria).toBe(false);

        // Baja logica via API de producto (mismo patron que M13 S.4).
        await ctx.delete(`/api/users/${userId}`, { headers: adminHeaders });
        return 'S.4: break-glass clinico si; admin/auditoria no';
      } finally {
        await ctx.dispose();
      }
    });
  });
});
