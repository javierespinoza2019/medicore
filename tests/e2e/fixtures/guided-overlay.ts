import type { Page } from '@playwright/test';

/**
 * Overlay de ciclo guiado QA — inyectado solo por Playwright (no vive en frontend/).
 * Activo cuando MEDICORE_E2E_GUIDED=1. Nunca en builds demo/prod del producto.
 */

export type GuidedOverlayState = {
  cycleLabel: string;
  caseId: string;
  index: number;
  total: number;
  title: string;
  detail: string;
  result?: { ok: boolean; message: string };
};

const OVERLAY_ID = 'medicore-e2e-guided-overlay';

const INJECT_CSS = `
#${OVERLAY_ID} {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 2147483646;
  font-family: ui-sans-serif, system-ui, Segoe UI, Roboto, sans-serif;
  background: linear-gradient(90deg, #9d174d 0%, #be185d 55%, #831843 100%);
  color: #fff; box-shadow: 0 -4px 24px rgba(0,0,0,.35);
  padding: 10px 16px 12px; pointer-events: none;
}
#${OVERLAY_ID} .mc-row { display: flex; align-items: flex-start; gap: 14px; }
#${OVERLAY_ID} .mc-badge {
  flex: 0 0 auto; font-size: 11px; font-weight: 700; letter-spacing: .04em;
  text-transform: uppercase; opacity: .95; margin-top: 2px;
}
#${OVERLAY_ID} .mc-id {
  display: inline-block; margin-left: 8px; padding: 2px 8px; border-radius: 4px;
  background: rgba(0,0,0,.28); font-family: ui-monospace, Consolas, monospace;
  font-size: 11px; font-weight: 600; letter-spacing: 0;
  text-transform: none;
}
#${OVERLAY_ID} .mc-main { flex: 1; min-width: 0; }
#${OVERLAY_ID} .mc-title { font-size: 15px; font-weight: 700; line-height: 1.25; }
#${OVERLAY_ID} .mc-detail { font-size: 12px; opacity: .92; margin-top: 2px; line-height: 1.35; }
#${OVERLAY_ID} .mc-result {
  margin-top: 6px; font-size: 12px; font-weight: 600;
  display: flex; align-items: center; gap: 6px;
}
#${OVERLAY_ID} .mc-result.ok { color: #bbf7d0; }
#${OVERLAY_ID} .mc-result.fail { color: #fecaca; }
#${OVERLAY_ID} .mc-progress {
  flex: 0 0 auto; font-size: 18px; font-weight: 800; font-variant-numeric: tabular-nums;
  align-self: center; padding: 4px 10px; border-radius: 6px; background: rgba(0,0,0,.25);
}
`;

function isGuidedEnabled(): boolean {
  return process.env.MEDICORE_E2E_GUIDED === '1';
}

/** Crea o actualiza la barra inferior. Seguro tras navegaciones (reinyecta si falta). */
export async function updateGuidedOverlay(page: Page, state: GuidedOverlayState): Promise<void> {
  if (!isGuidedEnabled()) return;

  await page.evaluate(
    ({ overlayId, css, state: s }) => {
      let style = document.getElementById(`${overlayId}-style`);
      if (!style) {
        style = document.createElement('style');
        style.id = `${overlayId}-style`;
        style.textContent = css;
        document.head.appendChild(style);
      }
      let root = document.getElementById(overlayId);
      if (!root) {
        root = document.createElement('div');
        root.id = overlayId;
        root.setAttribute('data-testid', 'guided-qa-overlay');
        root.setAttribute('role', 'status');
        root.setAttribute('aria-live', 'polite');
        document.body.appendChild(root);
      }
      document.body.style.paddingBottom = '88px';
      const resultHtml = s.result
        ? `<div class="mc-result ${s.result.ok ? 'ok' : 'fail'}">${
            s.result.ok ? '✓' : '✗'
          } ${esc(s.result.message)}</div>`
        : '';
      root.innerHTML = `
        <div class="mc-row">
          <div class="mc-badge">Prueba automatizada<span class="mc-id">${esc(s.caseId)}</span></div>
          <div class="mc-main">
            <div class="mc-title">${esc(s.title)}</div>
            <div class="mc-detail">${esc(s.cycleLabel)} · ${esc(s.detail)}</div>
            ${resultHtml}
          </div>
          <div class="mc-progress">${s.index}/${s.total}</div>
        </div>`;

      function esc(t: string): string {
        return String(t)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      }
    },
    { overlayId: OVERLAY_ID, css: INJECT_CSS, state },
  );
}

export async function guidedPass(page: Page, message: string, base: GuidedOverlayState): Promise<void> {
  await updateGuidedOverlay(page, { ...base, result: { ok: true, message } });
}

export async function guidedFail(page: Page, message: string, base: GuidedOverlayState): Promise<void> {
  await updateGuidedOverlay(page, { ...base, result: { ok: false, message } });
}

export { isGuidedEnabled };
