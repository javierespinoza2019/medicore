---
name: health-information-security
description: Security architecture and control design for Mexican healthcare information systems. Use for EHR cybersecurity, IAM, RBAC, MFA, encryption, logging, backups, DR, incident response, DevSecOps, cloud, vendors, OWASP, ISO 27001/27799/27701, NIST, or security evidence. Always distinguish mandatory Mexican requirements from voluntary standards.
---

# Health Information Security

## Mandatory distinction
First identify legal/NOM security obligations. Then use ISO/NIST/OWASP as implementation frameworks, not as automatic legal mandates.

## Minimum control domains
- identity and access management
- least privilege and segregation of duties
- MFA for privileged/remote access
- session security
- encryption in transit and at rest
- key/secret management
- audit logging and log integrity
- backup and tested restoration
- availability, continuity and DR
- vulnerability/patch management
- secure SDLC
- API security
- environment separation
- supplier security
- incident response
- data loss/export monitoring

## Clinical-specific rule
Availability is a patient-safety concern. Define RTO/RPO by clinical criticality, not only by generic IT targets.

## Evidence pattern
For every control, ask for owner, configuration, test result, timestamp, exceptions and remediation.
