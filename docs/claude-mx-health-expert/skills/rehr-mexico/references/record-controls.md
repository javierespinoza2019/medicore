# ECE control catalogue

## Core documents
Model at least:
- history/initial clinical history
- evolution note
- interconsultation note
- referral/transfer note
- emergency note
- preoperative note
- postoperative note
- anesthesia-related records
- nursing records
- diagnostic/treatment auxiliary reports
- informed-consent documents when applicable
- discharge/clinical summary and other service-specific records

## Document metadata
Each document should contain or inherit:
- document_id
- patient_id
- encounter_id
- organization_id
- facility_id
- service
- author_id
- author_role
- professional_credentials
- created_at
- signed_at
- status
- version
- supersedes/amends relationship
- provenance
- integrity evidence

## Audit events
At minimum consider:
LOGIN, LOGOUT, VIEW_RECORD, CREATE_NOTE, UPDATE_DRAFT, SIGN_NOTE, AMEND_NOTE, EXPORT, PRINT, SHARE, BREAK_GLASS, MERGE_PATIENT, CONSENT_CHANGE.
