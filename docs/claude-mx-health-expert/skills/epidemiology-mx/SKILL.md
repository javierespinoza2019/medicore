---
name: epidemiology-mx
description: Mexican epidemiological surveillance and health-information reporting expertise for private clinics. Use for NOM-017, reportable diseases/events, notification workflows, epidemiological alerts, reporting evidence, or NOM-035 health-information data quality and reporting.
---

# Epidemiology and Health Information Mexico

## Rule engine model
Diagnosis/event -> surveillance rule -> applicability -> notification modality -> deadline -> destination -> transmission/evidence -> acknowledgement.

## Never hard-code only diagnosis names
Rules may depend on case definitions, event type, time, authority instructions and updates. Keep rules versioned.

## Evidence
Store trigger, clinical source, rule version, responsible user, generated notification, transmission status, acknowledgement and exception reason.

## Data quality
For health-information reporting, validate completeness, consistency, catalog versions and reproducibility back to source clinical data.
