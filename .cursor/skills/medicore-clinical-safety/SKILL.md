---
name: medicore-clinical-safety
description: >-
  Enforces MediCore clinical safety rules: no fabricated clinical data, progressive
  identity, triage/allergies/vitals, emergency ingress. Use when editing patients,
  triage, urgencias, consult, prescriptions, pharmacy, historia clinica, or SC tests.
---

# MediCore — seguridad clínica

## Documentos

- Identidad: `docs/analisis/08-identidad-y-paciente-no-identificado.md`
- Brechas de modelo: `docs/analisis/09-brechas-del-modelo-de-datos.md`
- Casos SC: `docs/analisis/05-roadmap-qa-riesgos.md` (SC-01…)
- Decisiones: `docs/analisis/06-decisiones-abiertas.md` (oleadas arriba)

## Prohibiciones absolutas

1. Valores por omisión que fabriquen clínico (`sexo: 'M'`, antecedentes `negado`, aparatos `normal`, botón “vitales normales”).
2. Campos admin obligatorios en ingreso a urgencias (nombre, CURP, pago, consentimiento como bloqueo).
3. Asignar nivel de triage por omisión.
4. Presentar `alergias: []` como “sin alergias” si el estado es `no_interrogado`.
5. Fusionar identidades automáticamente.
6. Editar nota ya firmada (local o sellada).
7. Prescribir/surtir estupefacientes: **fuera de alcance**; debe **impedirse** (doc 06 §64/68).
8. Hardcodear escala de triage de **4 colores** (rojo/naranja/amarillo/verde) como escala de producto (doc 06 §63). Usar escala efectiva (API/config).
9. Mostrar nombre/PHI en el **monitor de turnos** por omisión (doc 06 #21: solo número).

## Identidad

- Sujeto ≠ episodio; identidad opcional al inicio.
- Etiqueta operativa (fonética) ≠ centinelas DGIS de reporte.
- Sexo/edad: permitir ausente / no determinado / estimado marcado.
- **Sexo biológico vs género (Opción B, 2026-08-28):** clínica (dosis, rangos, triage, alertas) y
  reporte Urgencias SEUL usan solo `BiologicalSex`. `GenderIdentity` es opcional (trato / GIIS);
  NULL = no capturado; **prohibido fabricar género** o usarlo en cálculos clínicos.

## Triage

- Escala **configurable** (cascada sucursal → tenant). Demo: 5 niveles sintéticos (`006`).
- Sin afirmar Manchester/ESI/NOM de escala.
- UI clínica: `triageScalePresentation` / labels de la escala efectiva.
- Signos: ninguno obligatorio; no_medido explícito.

## Firma / receta

- Piloto: firma de **integridad** (hash + sello); sin afirmar e.firma/NOM-004 5.10 (doc 06 §9/69).
- Controlados: 422 + exclusión de catálogo (política de producto).

## Offline clínico

- Append-only preferente (triage, notas, ingreso).
- Firma: local + sello al sync; UI “sello pendiente”.
- Cobro/surtido offline: permitidos con provisional / existencia reconciliable (no controlados).
- Rechazo diferido: bandeja; nunca borrar el hecho; addendum.

## Al revisar un PR clínico

Verificar SC relevantes o dejar `test.skip` con ID hasta que exista API, pero no borrar el caso del mapa E2E.
