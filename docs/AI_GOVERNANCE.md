# SHWAI AI governance

**Current classification:** `PARTIAL / PROVIDER REQUIRED`.

All current AI request paths are server-side. Provider credentials are read only by the server abstraction in `src/lib/ai/provider.ts`; browser code does not receive provider keys. Requests have bounded input/output sizes, timeouts, retries, request IDs, normalized errors, and explicit configuration-required failures. AI usage is attributed to the authenticated school, user, role, feature, provider, model, and request metadata where the provider supplies it.

## Human review

Teacher-generated content is stored as a draft and requires explicit review before publication. V6 provenance records retain source references, model/provider metadata, prompt-template identifiers, output versions, confidence/uncertainty fields, missing-data warnings, bias-warning fields, and approval state. Intelligence and prediction paths do not automatically expel, deny admission, assign punishment, permanently label a student, make a medical diagnosis, or apply another irreversible high-impact decision.

## Student safety

The student tutor uses progressive Socratic hints and limits the context sent to the provider to necessary academic information. The repository includes policy checks for unsafe requests and does not claim that a provider can replace a teacher, counselor, safeguarding lead, or emergency service. Schools remain responsible for age-appropriate policy, safeguarding escalation, consent, retention, and human review.

## Data and source governance

The knowledge-base path retrieves only approved, non-expired school sources and returns an explicit no-approved-source result when eligible evidence is absent. The current implementation is text-search based. Embeddings, OCR, speech, automatic external-drive ingestion, provider-level content filtering, and independent red-team evidence remain unimplemented or provider-dependent.

## Production controls still required

Before enabling AI for a real school, configure a server-only provider, model allowlist, per-user and per-school budget limits, request monitoring, retention policy, prompt-injection review, sensitive-data minimization, provider data-use terms, incident response, and a staging test covering blocked prompts, malformed provider responses, rate limits, timeouts, and human approval workflows. Never classify AI as ready merely because the UI route exists.
