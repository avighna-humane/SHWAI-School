# SHWAI privacy and data retention

## Technical readiness, not legal compliance

SHWAI does not claim GDPR, India's Digital Personal Data Protection Act, COPPA, FERPA, or any other legal compliance. This document records technical controls and open legal/contractual work that must be reviewed for each school, jurisdiction, age group, and processor arrangement.

## Implemented controls

The repository stores consent records for registration/invitation terms and privacy versions, derives school/role from authenticated memberships, restricts parent/student data through relationship queries, audits sensitive operations, redacts secrets from security events, and exposes owner-controlled data-request review. Students are not granted access to internal audit logs, staff data, fee administration, risk classifications, or unrelated student records by the new permission matrix.

## Retention categories

| Category | Default treatment | Required policy decision |
| --- | --- | --- |
| Authentication/session | Expiring sessions; reset/verification tokens are one-time and time-bounded | Session/token TTL, legal hold, incident revocation |
| Student/academic | Operational records retained by school policy and legal requirements | School-specific retention and archival policy |
| Audit/security | Append-oriented evidence with restricted access | Retention, export, legal hold, tamper monitoring |
| Financial/admissions | Retained according to contract and applicable law | Finance/admissions retention and deletion exceptions |
| Documents/import/export | Private storage, expiry, access audit required | Object-storage lifecycle and deletion proof |
| AI usage/provenance | School-scoped governance and usage records | Provider retention, consent, minimization, deletion handling |

No automated destructive retention worker is enabled until each entity has an approved retention policy and legal-hold behavior. The schema provides `hw_data_retention_policies`; execution remains a controlled job/deployment requirement.

## Children and families

Treat students as potentially minors. Parent/guardian access must be backed by a verified `hw_parent_students` relationship or invitation target; a name, email, or claimed domain is not proof. Student-facing AI must remain age-appropriate, rate-limited, non-advertising, minimally contextualized, and reportable. Staff access to student AI or sensitive context requires explicit server permission and audit review.

## Consent and withdrawal

Consent records include user, school, type, version, grant state, and timestamps. Production must expose the applicable privacy notice, record withdrawals, identify data-processing purposes, and route deletion/export requests through school policy and legal review. A technical control is not a legal determination.
