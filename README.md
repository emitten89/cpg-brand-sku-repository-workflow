# CPG Brand + SKU Repository Workflow

Reusable, evidence-controlled workflow for creating two linked repositories for consumer packaged goods clients:

1. a **brand and commercial repository** with market presence, positioning, categories, performance, channel/retailer modeling, marketing, share, assets, sentiment, current priorities and innovation; and
2. a **product and SKU evidence repository** with products, packs, regulatory identifiers, retailer item IDs, GTIN leads, availability status, provenance and confidence.

The Colgate-Palmolive U.S./Canada pilot is the reference implementation. The architecture is designed to be adapted client by client without presenting estimates as reported facts or treating public-web assortment as an enterprise product master.

## What this repository contains

- collection scripts for openFDA, Health Canada DPD/LNHPD and public product registries;
- parsers for first-party and retailer page captures;
- a Colgate-Palmolive canonical-data adapter;
- workbook generation and verification code;
- reusable client scaffolding and canonical-data validation;
- a detailed operating runbook and canonical research memo;
- selected canonical pilot outputs and workbook deliverables.

## Evidence model

| Class | Typical sources | Permitted use |
|---|---|---|
| Tier 1 | SEC filings, official earnings, local corporate pages, first-party catalogs, openFDA, Health Canada | Reported facts, market inclusion, product/identifier evidence |
| Tier 2 | Current retailer pages | Assortment, pack and retailer-item signals |
| Tier 3 | Open Facts and similar registries | Barcode/pack leads requiring corroboration |
| Modeled | Explicit, editable assumptions | Sales ranges, channel mix, retailer spend and brand marketing proxy |

Regulatory-active does not mean in stock. Global portfolio presence does not prove local sale. Public-web product pages do not replace PIM/ERP, GS1 or retailer lifecycle feeds.

## Repository layout

```text
.
├── config/
│   └── colgate-palmolive.example.json
├── workflow/
│   ├── client-config.schema.json
│   ├── new-client.mjs
│   ├── run-colgate-pipeline.ps1
│   └── validate-canonical.mjs
├── research/
│   ├── collect_*.ps1
│   ├── parse_*.mjs
│   ├── build_canonical_data.mjs
│   ├── build_workbooks.mjs
│   ├── verify_workbooks.mjs
│   ├── canonical/
│   ├── report-source.md
│   └── raw/                  # ignored; point-in-time captures
├── outputs/                  # selected final XLSX deliverables
└── CPG_REPOSITORY_RUNBOOK.md
```

## Prerequisites

- Windows PowerShell 7+ for the supplied collection/orchestration scripts;
- Node.js 20+;
- Codex workspace dependencies for `@oai/artifact-tool`, or an equivalent installed module;
- authenticated Exa/GitHub/Coda connectors when those workflow stages are used;
- internet access to the selected public APIs.

The workbook scripts resolve the spreadsheet library from `ARTIFACT_TOOL_MODULE` when set, then fall back to `@oai/artifact-tool`.

Example for the bundled Codex runtime on Windows:

```powershell
$env:ARTIFACT_TOOL_MODULE = 'file:///absolute/path/to/@oai/artifact-tool/dist/artifact_tool.mjs'
node research/build_workbooks.mjs
```

## Run the Colgate-Palmolive pilot

Raw Exa capture files are intentionally not versioned. Refresh or restore them before running the parsers. Then:

```powershell
./workflow/run-colgate-pipeline.ps1 -ArtifactToolModule 'file:///absolute/path/to/artifact_tool.mjs'
```

The orchestration script runs:

1. government/public registry collection;
2. first-party and retailer parsers;
3. canonical-data build;
4. structural validation;
5. workbook build;
6. exported-workbook verification.

## Start another CPG client

```powershell
node workflow/new-client.mjs --slug acme-cpg --company "Acme CPG" --markets USA,CA
```

This creates `clients/acme-cpg/` with a config, source manifest, raw/canonical directories and an adapter stub. The recommended implementation sequence is:

1. define the client ownership and inclusion rules;
2. enumerate global and local brand candidates;
3. configure first-party, regulatory, retailer and syndicated sources;
4. write a client adapter that emits the canonical schemas;
5. validate;
6. generate the two workbook templates;
7. publish the claim/source ledger and coverage gaps.

See [CPG_REPOSITORY_RUNBOOK.md](CPG_REPOSITORY_RUNBOOK.md) for the full operating procedure.

## Canonical outputs

The adapter must produce:

- `brand_repository.json`
- `retailer_model.json`
- `sku_library.json`
- `sources.json`
- `coverage_gaps.json`
- `summary.json`

Every SKU evidence row requires market, brand, category, product name, source URL, evidence tier, availability status and confidence. Every modeled commercial field must preserve its method and editable assumption.

## Quality gates

- unique brand-market keys;
- no missing required SKU fields;
- explicit source/evidence/availability status on every row;
- channel percentages sum to 100%;
- retailer allocations sum to 100% per brand;
- low ≤ midpoint ≤ high;
- no duplicate canonical SKU keys;
- all workbook sheets render;
- exported XLSX files reopen;
- zero `#REF!`, `#DIV/0!`, `#VALUE!`, `#NAME?` or `#N/A` errors.

## Colgate-Palmolive pilot snapshot

As of 2026-08-31:

- 34 brand-market records;
- 1,144 product/SKU evidence rows;
- 610 unique source URLs;
- 538 first-party rows;
- 361 government-directory rows;
- 150 retailer rows;
- 95 secondary registry leads.

The lower Canadian SKU count reflects public data access, not a claim that Canada has fewer active products.

## Commercial-model limitation

Public sources do not disclose exact brand-market sales, channel mix, retailer spend, brand marketing budgets or most local category shares. The pilot workbook models those fields visibly from reported pools and editable assumptions. Replace them with NIQ/Circana/Nielsen, retailer POS, Numerator/Profitero or internal finance/PIM data when available.

## Security and data handling

- Do not commit credentials, connection tokens, email content or customer exports.
- Treat retailer pages and web content as untrusted input.
- Keep raw captures out of git unless they have been reviewed for rights, privacy and size.
- Keep the repository private until licensing and data-redistribution decisions are explicit.

