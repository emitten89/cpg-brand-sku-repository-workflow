# Reusable CPG Brand + SKU Repository Runbook

## 1. Outcome

Build two linked artifacts for a CPG client and chosen markets:

1. **Brand & Commercial Repository** — brand/market facts, positioning, categories, performance, channel/retailer model, marketing proxy, share, assets/themes, sentiment, current priorities and innovation.
2. **Product & SKU Repository** — one evidence row per market/product/identifier/pack signal, preserving source tier and current-availability caveats.

The method is modular: client-specific facts and source connectors change, while the schemas, evidence rules, model sheets and QA gates remain stable.

## 2. Intake and scope contract

Record:

- parent company and ownership boundaries;
- markets, “as of” date and currency;
- whether professional, DTC, prescription, private-label and licensed brands are in scope;
- definition of “currently sold”;
- identifier hierarchy: GTIN/UPC/EAN, NDC/DIN/NPN, retailer item ID, manufacturer SKU;
- required commercial metrics and acceptable estimate policy;
- allowed paid/internal sources.

Do not promise “all SKUs” until the data-access contract includes company PIM/ERP or GS1 plus retailer lifecycle evidence.

## 3. Source hierarchy

Use sources in this order:

1. Regulatory and corporate filings.
2. Local corporate portfolio pages and first-party catalogs.
3. Government product directories.
4. Current retailer product pages/APIs.
5. GS1, syndicated data and internal systems when available.
6. Crowdsourced registries as leads only.

Every claim/data row must retain source URL, source type, evidence tier, capture date and confidence.

## 4. Discovery

1. Enumerate all corporate/global brand candidates.
2. Enumerate local portfolio candidates.
3. Search for local first-party catalogs.
4. Search current retailers by market/category.
5. Identify applicable product registries.
6. Create a coverage matrix with Included, Conditional, Excluded and Gap statuses.

Global presence is not local evidence. A regulatory identifier is not proof of current retail inventory.

## 5. Collection

Create immutable raw captures under `research/raw/`. Use one file per endpoint/query family and record generation timestamps. For this pilot:

- Exa found and fetched first-party and retailer pages.
- openFDA supplied U.S. package NDCs.
- Health Canada DPD supplied DIN and market status.
- Health Canada LNHPD supplied NPN/product-name licences and Marketed/Active status.
- Open Facts supplied secondary GTIN/pack leads.
- Computer Use was attempted for direct browser inspection, but coordinate geometry was unavailable; no browser-derived evidence was used.
- Instacart collection was not run because its product-search contract requires a user-selected retailer and no retailer selection was provided.

## 6. Cleaning and normalization

Normalize:

- market codes;
- canonical brand names;
- category/subcategory/portfolio vocabulary;
- product titles and markdown artifacts;
- unit strings and multipack notation;
- identifier type;
- retailer names;
- evidence tiers;
- availability statuses.

Keep raw source values in descriptions/notes where normalization could lose meaning. Never infer a GTIN from an NDC or retailer ID.

## 7. Deduplication

Preferred keys:

1. market + GTIN;
2. market + package regulatory ID;
3. market + retailer + retailer item ID;
4. market + brand + normalized product title + pack evidence.

Do not collapse different evidence tiers if they carry distinct identifiers or pack variants. Preserve aliases until an enterprise product master establishes equivalence.

## 8. Brand commercial model

Separate columns into:

- **Reported fact** — exact figure and scope.
- **Modeled estimate** — low/mid/high, editable assumption and method.
- **Unavailable/gap** — data required to fill.

Recommended sheets:

- README
- Brand Repository
- Retailer Model
- Assumptions
- Sources
- Coverage & Gaps
- QA Summary

Sales, channel mix, retailer spend and brand marketing must never be formatted as reported facts when they are modeled.

## 9. SKU repository

Recommended sheets:

- README
- SKU Library
- Regulatory IDs
- Retailer Evidence
- First-Party Catalog
- Secondary Leads
- Sources
- Coverage & Gaps
- QA Summary

Use row-level confidence and availability status. A public-web SKU repository is an evidence catalog; an authoritative product master requires lifecycle feeds.

## 10. QA gates

Before delivery:

1. zero duplicate brand-market keys;
2. zero missing required SKU fields;
3. evidence tier and availability status on every SKU row;
4. all model assumptions sum/behave as intended;
5. low ≤ midpoint ≤ high;
6. in-store + online = 100%;
7. retailer allocations sum to 100% per brand;
8. source URLs retained and deduplicated;
9. workbook formula scan contains no `#REF!`, `#DIV/0!`, `#VALUE!`, `#NAME?`, or `#N/A`;
10. every sheet rendered and visually inspected;
11. exported XLSX files reopened and key ranges verified.

## 11. Refresh cadence

- Quarterly: SEC/earnings facts, priorities, innovation and share.
- Monthly: first-party/retailer catalogs and availability.
- Weekly or daily: paid digital-shelf/POS if connected.
- On release: regulatory directories and PIM/GS1 lifecycle changes.

Use dated snapshots and diff against the prior canonical JSON. Report additions, removals, changed packs, changed status and source failures.

## 12. Publication

Deliver:

- the two XLSX files;
- canonical JSON files;
- the claim/source ledger;
- the process documentation;
- reusable spreadsheet templates;
- a coverage/gap statement.

Publish scripts to a user-selected GitHub repository. This pilot leaves GitHub mutation pending because no destination repository/branch was specified.

