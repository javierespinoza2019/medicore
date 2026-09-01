import type { Page } from '@playwright/test';

/**
 * Inspección del almacenamiento local del dispositivo.
 *
 * La cola de salida durable vive en IndexedDB (doc 03 §6, doc 07 §4). Estas
 * funciones observan el almacenamiento sin conocer su esquema, porque el
 * esquema no existe todavía: lo que se afirma hoy es la presencia o ausencia
 * de bases y de claves, no su contenido.
 */

export async function basesIndexedDB(page: Page): Promise<string[]> {
  return page.evaluate(async () => {
    if (typeof indexedDB.databases !== 'function') return [];
    const bases = await indexedDB.databases();
    return bases.map((b) => b.name ?? '').filter((n) => n.length > 0);
  });
}

export async function existeBase(page: Page, nombre: string): Promise<boolean> {
  const bases = await basesIndexedDB(page);
  return bases.includes(nombre);
}

/** Claves de `localStorage`. El prototipo guarda ahí la sesión (`medicore_auth_user`). */
export async function clavesLocalStorage(page: Page): Promise<string[]> {
  return page.evaluate(() => Object.keys(window.localStorage));
}

export async function leerLocalStorage(page: Page, clave: string): Promise<string | null> {
  return page.evaluate((k) => window.localStorage.getItem(k), clave);
}

/**
 * Resultado de `navigator.storage.persist()`. Caso SS-01: si el navegador
 * deniega el almacenamiento persistente, el dispositivo no es apto para
 * captura fuera de línea prolongada y la interfaz debe advertirlo antes.
 */
export async function almacenamientoPersistente(page: Page): Promise<boolean | null> {
  return page.evaluate(async () => {
    if (!navigator.storage || typeof navigator.storage.persisted !== 'function') return null;
    return navigator.storage.persisted();
  });
}

/** Cuota estimada del origen. Caso SS-02. */
export async function cuotaEstimada(page: Page): Promise<{ usage: number; quota: number } | null> {
  return page.evaluate(async () => {
    if (!navigator.storage || typeof navigator.storage.estimate !== 'function') return null;
    const e = await navigator.storage.estimate();
    return { usage: e.usage ?? 0, quota: e.quota ?? 0 };
  });
}
