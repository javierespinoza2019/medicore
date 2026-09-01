---
name: regulatory-change-control
description: Verify and manage regulatory currency for Mexican healthcare compliance. Use whenever the user asks what is currently in force, whether a NOM was modified/repealed, what changed, latest requirements, regulatory roadmap, or when another skill depends on current legal status.
---

# Regulatory Change Control

## Mandatory source order
1. DOF
2. Cámara de Diputados consolidated legal text
3. Competent federal authority
4. Competent state authority

## Verification steps
1. Identify exact instrument and publication title.
2. Find original publication.
3. Find reforms/modifications/cancellation/substitution.
4. Determine effective date and transitional provisions.
5. Distinguish project/PROY from current rule.
6. Record last_verified_at and source URLs.
7. Update the knowledge base without deleting historical versions.

## Output states
VIGENTE / MODIFICADO / SUSTITUIDO / CANCELADO-DEROGADO / PROYECTO / NO VERIFICADO.

## Safety
If current status cannot be verified, say so explicitly. Never infer current validity from a cached PDF or an old article.
