/**
 * Catálogo de profesionales y especialidades para agenda (API real, sin mocks).
 * Cédulas/especialidades solo si vienen del servidor; no se fabrican.
 */

import { useEffect, useState } from 'react';
import {
  listProfessionals,
  listSpecialties,
  type ProfessionalDto,
  type SpecialtyDto,
} from '@/api/professionals';

export function useAgendaProfessionalsCatalog(onlyActive = true) {
  const [professionals, setProfessionals] = useState<ProfessionalDto[]>([]);
  const [specialties, setSpecialties] = useState<SpecialtyDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      const [profs, specs] = await Promise.all([
        listProfessionals(onlyActive),
        listSpecialties(onlyActive),
      ]);
      if (cancelled) return;
      if (!profs.success || !profs.data) {
        setError(profs.message ?? 'No se pudo cargar profesionales.');
        setProfessionals([]);
        setSpecialties([]);
        setLoading(false);
        return;
      }
      if (!specs.success || !specs.data) {
        setError(specs.message ?? 'No se pudo cargar especialidades.');
        setProfessionals(profs.data);
        setSpecialties([]);
        setLoading(false);
        return;
      }
      setProfessionals(profs.data);
      setSpecialties(specs.data);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [onlyActive]);

  return { professionals, specialties, loading, error };
}
