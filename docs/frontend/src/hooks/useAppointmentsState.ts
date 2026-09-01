import { useState, useEffect, useCallback } from 'react';
import { appointments as mockAppointments, type Appointment } from '@/mocks/appointments';

// ── Module-level shared mutable state ──
// Sala de Espera y Monitor de Turnos comparten esta misma lista
let sharedAppointments: Appointment[] = [...mockAppointments];
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

export function updateAppointmentGlobal(id: string, updates: Partial<Appointment>) {
  sharedAppointments = sharedAppointments.map((a) => (a.id === id ? { ...a, ...updates } : a));
  notify();
}

export function getAppointmentsGlobal(): Appointment[] {
  return sharedAppointments;
}

export function useAppointmentsState() {
  const [, tick] = useState(0);

  useEffect(() => {
    const listener = () => tick((n) => n + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const updateAppointment = useCallback((id: string, updates: Partial<Appointment>) => {
    updateAppointmentGlobal(id, updates);
  }, []);

  return {
    appointments: sharedAppointments,
    updateAppointment,
  };
}