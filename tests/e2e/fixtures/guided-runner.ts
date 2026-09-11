import type { Page } from '@playwright/test';
import {
  guidedFail,
  guidedPass,
  isGuidedEnabled,
  updateGuidedOverlay,
  type GuidedOverlayState,
} from './guided-overlay';

export type GuidedPasoDef = {
  id: string;
  index: number;
  title: string;
  detail: string;
};

export type GuidedCicloDef = {
  code: string;
  label: string;
  total: number;
};

/** Ejecuta un paso con overlay; el veredicto es el expect del body. */
export async function runGuidedPaso(
  page: Page,
  ciclo: GuidedCicloDef,
  paso: GuidedPasoDef,
  body: (state: GuidedOverlayState) => Promise<string>,
): Promise<void> {
  const state: GuidedOverlayState = {
    cycleLabel: ciclo.label,
    caseId: paso.id,
    index: paso.index,
    total: ciclo.total,
    title: paso.title,
    detail: paso.detail,
  };
  await updateGuidedOverlay(page, state);
  try {
    const msg = await body(state);
    await guidedPass(page, msg, state);
    await new Promise((r) => setTimeout(r, isGuidedEnabled() ? 800 : 0));
  } catch (err) {
    const message = err instanceof Error ? err.message.split('\n')[0] ?? 'fallo' : String(err);
    await guidedFail(page, message.slice(0, 180), state);
    throw err;
  }
}
