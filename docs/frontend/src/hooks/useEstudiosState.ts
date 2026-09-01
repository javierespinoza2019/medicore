import { useState, useEffect, useCallback } from 'react';
import { estudios as estudiosMock, type EstudioSolicitado } from '@/mocks/estudios';

// ── Module-level shared mutable state ──
// Permite que Consultas y el módulo de Estudios (Laboratorio/Imagen/Gabinete)
// operen sobre la misma lista de solicitudes.
let sharedEstudios: EstudioSolicitado[] = [...estudiosMock];
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

export function addEstudioGlobal(e: EstudioSolicitado) {
  sharedEstudios = [e, ...sharedEstudios];
  notify();
}

export function addEstudiosGlobal(list: EstudioSolicitado[]) {
  if (list.length === 0) return;
  sharedEstudios = [...list, ...sharedEstudios];
  notify();
}

export function updateEstudioGlobal(e: EstudioSolicitado) {
  sharedEstudios = sharedEstudios.map((item) => (item.id === e.id ? e : item));
  notify();
}

export function getEstudiosGlobal(): EstudioSolicitado[] {
  return sharedEstudios;
}

export function useEstudiosState() {
  const [, tick] = useState(0);

  useEffect(() => {
    const listener = () => tick((n) => n + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const addEstudio = useCallback((e: EstudioSolicitado) => addEstudioGlobal(e), []);
  const addEstudios = useCallback((list: EstudioSolicitado[]) => addEstudiosGlobal(list), []);
  const updateEstudio = useCallback((e: EstudioSolicitado) => updateEstudioGlobal(e), []);

  return {
    estudios: sharedEstudios,
    addEstudio,
    addEstudios,
    updateEstudio,
  };
}