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

## Prohibiciones absolutas

1. Valores por omisión que fabriquen clínico (`sexo: 'M'`, antecedentes `negado`, aparatos `normal`, botón “vitales normales”).
2. Campos admin obligatorios en ingreso a urgencias (nombre, CURP, pago, consentimiento como bloqueo).
3. Asignar nivel de triage por omisión.
4. Presentar `alergias: []` como “sin alergias” si el estado es `no_interrogado`.
5. Fusionar identidades automáticamente.
6. Editar nota ya firmada (local o sellada).
7. Prescribir/surtir estupefacientes hasta decisión + norma (debe **impedirse**).

## Identidad

- Sujeto ≠ episodio; identidad opcional al inicio.
- Etiqueta operativa (fonética) ≠ centinelas DGIS de reporte.
- Sexo/edad: permitir ausente / no determinado / estimado marcado.

## Offline clínico

- Append-only preferente (triage, notas, ingreso).
- Firma: local + sello al sync; UI “sello pendiente”.
- Cobro/surtido offline: permitidos con provisional / existencia reconciliable.
- Rechazo diferido: bandeja; nunca borrar el hecho; addendum.

## Al revisar un PR clínico

Verificar SC relevantes o dejar `test.skip` con ID hasta que exista API, pero no borrar el caso del mapa E2E.
