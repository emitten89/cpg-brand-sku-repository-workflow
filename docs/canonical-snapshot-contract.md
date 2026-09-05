# Canonical snapshot publishing contract

## Purpose

The canonical directory is one versioned publication unit, not a collection of independently publishable JSON files. `manifest.json` is the release marker that binds every required artifact to a client, market scope, generation time, schema/pipeline version, row count, byte count and SHA-256 checksum.

The contract prevents a producer, CI job or downstream system from treating a partially written or partially committed build as a data-quality failure or a usable snapshot.

## Required unit

Contract version `1.0.0` requires these logical artifacts:

- `brand_repository`
- `retailer_model`
- `sku_library`
- `sources`
- `coverage_gaps`
- `summary`

The `artifacts` object in `manifest.json` provides the exact filename, byte count and SHA-256 checksum for each logical artifact. `row_counts` binds the five record-bearing artifacts. The JSON Schema is in `workflow/canonical-manifest.schema.json`; the runtime validator also enforces the contract without external packages.

A manifest contains:

```json
{
  "contract_version": "1.0.0",
  "schema_version": "1.0.0",
  "pipeline_version": "0.2.0",
  "snapshot_id": "client-ca-usa-20260901t120000000z",
  "generated_at": "2026-09-01T12:00:00.000Z",
  "client": { "slug": "client", "name": "Client" },
  "markets": ["CA", "USA"],
  "source_window": {
    "as_of": "2026-09-01",
    "captured_from": "2026-08-01",
    "captured_to": "2026-09-01"
  },
  "row_counts": {
    "brand_repository": 1,
    "retailer_model": 1,
    "sku_library": 1,
    "sources": 2,
    "coverage_gaps": 1
  },
  "artifacts": {
    "brand_repository": {
      "file": "brand_repository.json",
      "bytes": 123,
      "sha256": "<64 lowercase hexadecimal characters>"
    }
  }
}
```

The abbreviated `artifacts` example above is explanatory only; a valid manifest references all six logical artifacts.

## Producer sequence

1. Write all six JSON artifacts to a new staging directory.
2. Derive counts and hashes from the exact staged bytes.
3. Write `manifest.json` last.
4. Run preflight: manifest shape, complete file set, byte counts, hashes, JSON parsing and row counts.
5. Run semantic and referential validation only after preflight passes.
6. Promote the validated staged directory as the current canonical snapshot.
7. In Git, commit `manifest.json` and every referenced artifact in the same commit.

`npm run build:canonical` implements this sequence. `npm run manifest:canonical` exists to bootstrap or regenerate a manifest for an already complete local snapshot; it immediately validates the result and is not a substitute for staged publication.

Line endings for canonical and fixture JSON are fixed to LF so manifest checksums remain stable across Windows and Linux checkouts.

## Failure classifications

| Classification | Phase | Consumer response |
|---|---|---|
| `BUILD_INCOMPLETE` | Preflight | Reject the build; report every detected missing manifest/artifact file. |
| `MANIFEST_INVALID` | Preflight | Reject the build; update the producer to the supported manifest contract. |
| `SNAPSHOT_INTEGRITY_ERROR` | Preflight | Reject the build; regenerate the snapshot/manifest from the same bytes. |
| `MALFORMED_JSON` | Preflight | Reject the build; repair the producer output. |
| `DATA_QUALITY_ERROR` | Semantic | Reject the build; review the specific data-quality or referential errors. |

The validator returns structured JSON with `status`, `phase`, `classifications`, row counts, snapshot metadata and error codes. A non-zero process exit accompanies every failure.

## Semantic and referential checks

The original repository gates remain intact: unique brand-market and canonical SKU keys, complete required SKU fields, valid channel/sales ranges, retailer allocations totaling 100%, and unique source URLs.

Checks added only where the current model supplies the necessary fields:

- SKU and retailer `market|brand` values must resolve to `brand_repository`;
- SKU and brand source URLs must resolve to `sources`;
- `brand_market_id`, `repository_row_id` and `source_id` must be unique when present;
- manifest markets, manifest row counts and summary counts/timestamps must match the published data.

No new business facts or unsupported identifiers are inferred.

## Downstream rule: ARC Audience

ARC Audience must execute the canonical validator against the directory it intends to ingest and proceed only when the result contains `status: "PASS"` and the process exits successfully. It must read filenames from the validated manifest rather than guessing paths.

On `BUILD_INCOMPLETE`, `MANIFEST_INVALID`, `SNAPSHOT_INTEGRITY_ERROR`, `MALFORMED_JSON` or `DATA_QUALITY_ERROR`, ARC Audience must:

1. reject the new snapshot without partially loading any artifact;
2. retain the last previously validated snapshot;
3. surface the classification and structured errors to the publishing owner.

This is a fail-closed consumption rule. The manifest identifies and verifies a snapshot; it does not make an invalid snapshot acceptable.
