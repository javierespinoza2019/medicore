import { useState, useEffect, useCallback } from 'react';
import { plantillasData, type PlantillaMedica } from '@/mocks/plantillas';

const STORAGE_KEY = 'medicore_plantillas_v1';

function loadInitial(): PlantillaMedica[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as PlantillaMedica[];
    }
  } catch {
    // Ignorar errores de parseo y caer a datos semilla
  }
  return plantillasData;
}

export function usePlantillas() {
  const [plantillas, setPlantillas] = useState<PlantillaMedica[]>(loadInitial);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plantillas));
    } catch {
      // Persistencia opcional: si falla, solo se mantiene en memoria
    }
  }, [plantillas]);

  const addPlantilla = useCallback((p: PlantillaMedica) => {
    setPlantillas((prev) => [p, ...prev]);
  }, []);

  const updatePlantilla = useCallback((p: PlantillaMedica) => {
    setPlantillas((prev) => prev.map((x) => (x.id === p.id ? p : x)));
  }, []);

  const removePlantilla = useCallback((id: string) => {
    setPlantillas((prev) => prev.filter((x) => x.id !== id));
  }, []);

  return { plantillas, addPlantilla, updatePlantilla, removePlantilla };
}