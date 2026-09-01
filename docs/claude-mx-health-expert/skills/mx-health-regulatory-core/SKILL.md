---
name: mx-health-regulatory-core
description: Expert regulatory analysis for private healthcare clinics in Mexico. Use for Mexican health-law applicability, NOM mapping, compliance matrices, clinic regulatory profiles, COFEPRIS-related operational obligations, or when determining which laws/regulations apply to a healthcare software workflow. Do not use as the sole source for privacy-only, cybersecurity-only, or interoperability-only questions; load the corresponding specialized skill too.
---

# Mexican Health Regulatory Core

## Purpose
Determine the regulatory baseline applicable to a private healthcare clinic or healthcare software workflow in Mexico.

## Required workflow
1. Identify facility type: general outpatient office, specialized consultation, hospital, laboratory, imaging, emergency, ambulatory surgery, ICU, dental, other.
2. Identify active services.
3. Identify whether the workflow creates or modifies a clinical record.
4. Load `references/applicability.md`.
5. For clinical record questions, also load `../rehr-mexico/SKILL.md`.
6. For personal-data questions, also load `../privacy-mx-health/SKILL.md`.
7. For technical security, load `../health-information-security/SKILL.md`.
8. Classify each conclusion by legal force.
9. When current legal status matters, load `../regulatory-change-control/SKILL.md` and verify official sources.

## Output format for compliance analysis
For each item provide:
- Regulation
- Section/numeral if verified
- Legal force
- Applicability
- Requirement
- Product control
- Operational control
- Evidence
- Responsible role
- Priority
- Source/version

## Never do
- Never say “COFEPRIS certification” unless a specific legal/certification mechanism has been identified.
- Never state that a software feature alone proves clinic compliance.
- Never treat a voluntary standard as a NOM.
