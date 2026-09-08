# Live contribution workflow

The Evidence Atlas contribution workspace adds a durable write path without turning the currently validated snapshot into mutable application state.

## User capabilities

An end user can:

1. upload a JSON, CSV, TSV, XLSX, XLS or TXT file containing proposed additional data;
2. open a brand, SKU, retailer, source or coverage-gap record and request a targeted correction;
3. provide evidence and optional contact information for reviewer follow-up; and
4. retain an opaque receipt in the browser and check the persisted review status later.

Uploads are limited to 2 MiB. JSON syntax is checked before persistence. File extensions, request fields, lengths, source snapshot IDs and target artifact names are allowlisted server-side.

## Persistence model

`neon/migrations/001_contribution_submissions.sql` creates `contribution_submissions` in Postgres. Each row includes:

- an internal UUID and hashed receipt token;
- submission type and target canonical artifact;
- the exact source snapshot ID visible when the submission was made;
- record reference, summary and detailed proposal;
- optional submitter name and email;
- original filename, media type, byte count, SHA-256 and file bytes for uploads;
- review status and optional reviewer notes; and
- a one-way request fingerprint used only for rate limiting.

The API never returns stored file bytes, contact information or the request fingerprint. Status lookup requires both the UUID and the opaque receipt token; only its SHA-256 hash is stored.

## Review and publication boundary

New submissions start as `pending_review`. The supported lifecycle is:

```text
pending_review -> under_review -> approved -> published
                               -> rejected
                               -> superseded
```

Approval is not publication. A reviewer must translate an approved proposal into the relevant source-controlled canonical artifact, regenerate `manifest.json`, and run the complete preflight and semantic validator. The dashboard and ARC Audience may consume the change only after a new snapshot returns `status: "PASS"`.

## API surface

The Neon Function in `neon/submissions.mjs` exposes:

- `GET /health` — database readiness;
- `POST /submissions` — validates and stores a proposal; and
- `GET /submissions?id=<uuid>&receipt=<token>` — returns the status for one private receipt.

It does not expose a public submission list, file-download route, reviewer mutation route or canonical-data write route.

## Preview security controls

The contribution endpoint is intentionally narrow:

- strict Vercel-preview and localhost origin allowlist;
- parameterized SQL only;
- a 3 MiB request limit and 2 MiB file limit;
- allowlisted artifacts and file extensions;
- malformed-JSON rejection;
- automation honeypot;
- eight accepted submissions per request fingerprint per hour;
- server-side database credentials injected by Neon; and
- no secrets in the browser runtime configuration.

Origin checks and rate limiting reduce preview abuse but are not user authentication. Before a public production launch, require validated end-user identity and scope reviewer actions separately. Keep the current submission store isolated from privileged canonical publishing credentials.

## Deployment

1. Create a Neon project in a region supporting Neon Functions.
2. Apply `neon/migrations/001_contribution_submissions.sql`.
3. Bundle `neon/submissions.mjs` with `npm run build:submission-api`.
4. Zip `.tmp/neon-function/index.mjs` at the archive root and deploy it as a Neon Function with `RATE_LIMIT_SALT` set server-side.
5. Build the dashboard with `DASHBOARD_SUBMISSION_API_URL` set to the function invocation origin.
6. Run `npm test`, `npm run validate` and `npm run build:site` before deploying the Vercel preview.
