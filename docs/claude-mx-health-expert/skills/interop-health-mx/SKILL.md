---
name: interop-health-mx
description: Healthcare interoperability architecture for Mexico. Use for NOM-024 exchange, FHIR, HL7, DICOM, CLUES, CURP, CIE/ICD, SNOMED CT, LOINC, canonical data models, external APIs, patient matching, terminology servers, or integration with Mexican health-sector systems.
---

# Health Interoperability Mexico

## Architecture principle
Use an internal canonical clinical model and adapters to external standards. Do not hard-code the EHR core to a single message specification.

## Recommended layers
EHR core -> canonical clinical model -> terminology service -> consent/privacy decision -> interoperability gateway -> external adapter.

## Identity
Use internal persistent IDs. Support CURP where applicable but do not make CURP the only possible patient identifier.

## Facility
Support CLUES where applicable and preserve internal facility identifiers.

## Terminologies
Store code_system, code, display, version. Avoid free-text-only clinical concepts when structured exchange is expected.

## FHIR
Use FHIR as a strategic API layer where appropriate, but do not claim Mexican legal compliance merely because FHIR is implemented.

## Imaging
Use DICOM/PACS integration for imaging workflows when applicable.

## Exchange audit
Preserve sender, recipient, purpose, patient, message ID, timestamps, authorization/legal basis as applicable, outcome, retries and reconciliation.
