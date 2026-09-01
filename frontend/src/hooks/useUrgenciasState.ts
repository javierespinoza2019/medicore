import { useState, useEffect, useCallback } from 'react';
import { urgenciasMock, type Urgencia } from '@/mocks/urgencias';

// ── Module-level shared mutable state ──
// This lets Triage, Sala de Espera y Urgencias operate on the same list
let sharedUrgencias: Urgencia[] = [...urgenciasMock];
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

export function addUrgenciaGlobal(u: Urgencia) {
  sharedUrgencias = [u, ...sharedUrgencias];
  notify();
}

export function updateUrgenciaGlobal(u: Urgencia) {
  sharedUrgencias = sharedUrgencias.map((item) => (item.id === u.id ? u : item));
  notify();
}

export function getUrgenciasGlobal(): Urgencia[] {
  return sharedUrgencias;
}

export function useUrgenciasState() {
  const [, tick] = useState(0);

  useEffect(() => {
    const listener = () => tick((n) => n + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const addUrgencia = useCallback((u: Urgencia) => addUrgenciaGlobal(u), []);
  const updateUrgencia = useCallback((u: Urgencia) => updateUrgenciaGlobal(u), []);

  return {
    urgencias: sharedUrgencias,
    addUrgencia,
    updateUrgencia,
  };
}