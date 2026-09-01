---
name: rehr-mexico
description: Design and compliance expertise for Mexican electronic clinical records (expediente clínico electrónico / SIRES). Use for NOM-004, NOM-024, clinical-note structure, signatures, corrections, retention, audit trails, patient identity, record access, EHR workflows, or EHR product requirements in Mexico.
---

# ECE / SIRES Mexico

## Core distinction
- NOM-004: clinical-document content and expediente requirements.
- NOM-024: electronic health-record information systems, security/interchange concepts and SIRES requirements.

Load `references/record-controls.md` for product controls.

## Design principles
- Patient identity != encounter identity != document identity.
- Signed/finalized clinical documents must not be silently overwritten.
- Corrections require version history/addendum and attribution.
- Every clinical document must preserve author, date/time, organization/facility and provenance.
- Access must be role/context based and auditable.
- Export, print and external disclosure should be auditable.
- Retention and deletion must be policy-driven; a privacy deletion request does not automatically defeat a legal retention obligation.

## Canonical entities
Patient, Practitioner, Organization, Facility, Encounter, ClinicalDocument, Observation, Condition, Procedure, MedicationRequest, DiagnosticReport, Consent, Provenance, AuditEvent.

## Required checks
When designing a workflow determine:
1. Which NOM-004 document type is generated?
2. Which fields are mandatory for the specific service?
3. Who is authorized to author/sign it?
4. Can it be amended? If yes, how is original preserved?
5. What retention rule applies?
6. What audit events are required?
7. Does it leave the organization? If yes, invoke interoperability/privacy skills.
