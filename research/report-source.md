# Colgate-Palmolive USA + Canada CPG Repository — Canonical Research Source

**Research as of:** 2026-08-31  
**Markets:** United States and Canada  
**Purpose:** Evidence-controlled foundation for the brand/commercial workbook and the product/SKU workbook.

## Executive synthesis

The public evidence supports a substantial, auditable Colgate-Palmolive repository: 34 brand-market records and 1,144 product/SKU evidence rows. It does **not** support calling the result a literal, complete official source of truth for current retail assortment or private commercial metrics. Colgate-Palmolive does not publicly disclose brand-market sales, brand marketing spend, brand channel mix, retailer spend, or most local category shares. Those fields are therefore either reported with their exact public scope, modeled with visible assumptions and ranges, or left as a named data gap.

The strongest current commercial signals are:

- Colgate-Palmolive reported 2025 U.S. net sales of **$3.596B** for Oral, Personal and Home Care and **$3.062B** for Pet Nutrition. North America OPHC net sales were **$4.045B**, implying **$449M** outside the U.S. within that reporting segment. This is used only as the top-down pool for the editable brand model.
- Company advertising investment in 2025 was **$2.703B**, or **13.3% of net sales**. Workbook brand marketing estimates allocate that company-level intensity to modeled brand sales; they are not reported brand budgets.
- In 2Q 2026, North America net and organic sales declined 3%. Management identified slower U.S. category growth, share losses, competitive activity and retailer inventory reductions, while prioritizing increased brand support and premium innovation.
- The reported U.S. year-to-date value shares at 2Q 2026 were **31.9% for toothpaste** and **43.4% for manual toothbrushes**. These are category/company shares, not a universal Colgate brand share measure.
- Management’s second-half 2026 priorities include Colgate Optic White Pro Series with ActivShine, Fabuloso 3-in-1 Clean Spray and Watermelon cleaners, Hill’s Prescription Diet e-commerce/omni-channel activation, and the phased rollout of Hill’s Science Diet Single Protein dog food.

## Scope and inclusion rule

A brand-market row is included when at least one of these conditions is satisfied:

1. explicit local corporate portfolio evidence;
2. a current local first-party product catalog;
3. a current major/local retailer product page;
4. an active government product identifier, with the caveat that regulatory status is not proof of retail inventory.

Global portfolio presence alone is not treated as current local sale. Fleecy in the U.S. and Ajax in Canada remain named gaps because current local evidence was not captured. Retailer-only Canadian evidence supports Fabuloso, Suavitel and Murphy Oil Soap as current-market rows, while Canadian first-party/retailer evidence supports EltaMD, PCA SKIN and FILORGA.

## Evidence hierarchy

| Tier | Evidence | How used |
|---|---|---|
| Tier 1 | SEC-filed annual report, official earnings materials, corporate/local brand pages, first-party catalogs, openFDA, Health Canada DPD/LNHPD | Brand inclusion, reported performance/share, product names, regulatory IDs |
| Tier 2 | Current retailer product pages | Current assortment signals, item IDs, pack sizes, retailer presence |
| Tier 3 | Open Beauty/Food/Pet Facts | Barcode and pack-size leads only; not official proof |
| Modeled | Explicit allocation assumptions | Brand sales ranges, channel mix, retailer spend and brand marketing proxy |

## Primary commercial sources

1. [2025 Form 10-K](https://investor.colgatepalmolive.com/static-files/c4a7e20c-1aa8-4bb1-bd4b-74755c99688f) — company, segment and U.S. sales; advertising intensity; Walmart concentration; global share methodology.
2. [2Q 2026 earnings release](https://investor.colgatepalmolive.com/news-releases/news-release-details/colgate-announces-2nd-quarter-2026-results) — current results, 2026 guidance, reported share and advertising direction.
3. [2Q 2026 prepared management remarks](https://investor.colgatepalmolive.com/static-files/ca92df4c-8d85-4df1-bf67-c2b76b8b36fe) — North America diagnosis, Colgate/Fabuloso priorities, Hill’s performance and innovation.
4. [U.S. corporate brand portfolio](https://www.colgatepalmolive.com/en-us/brands) and [Canada corporate brand portfolio](https://www.colgatepalmolive.ca/en-ca/brands) — candidate and explicit-local portfolio evidence.
5. [Colgate-Palmolive innovation hub](https://www.colgatepalmolive.com/en-us/innovation) — science-led innovation themes.

## Product and identifier sources

- [openFDA NDC Directory](https://api.fda.gov/drug/ndc.json?search=labeler_name:%22Colgate-Palmolive%20Company%22&limit=1000): 345 included active package rows after normalization and local-brand filtering. NDC listing status does not guarantee distribution.
- [Health Canada Drug Product Database](https://health-products.canada.ca/dpd-bdpp/index-eng.jsp): 7 current Colgate/hello/Softsoap DIN rows retained as Marketed or Approved; only Marketed is treated as affirmative market status.
- [Health Canada Licensed Natural Health Products Database](https://health-products.canada.ca/lnhpd-bdpsnh/index-eng.jsp): 59 marketed/active Colgate oral-care product-name records across nine NPNs; one Not Marketed licence excluded.
- First-party U.S./Canada brand catalogs: 538 included evidence rows after product-heading cleanup and local-brand filtering.
- Current retailer pages: 150 included rows from U.S. and Canadian mass, pet and skin-care retailers.
- Open Facts registries: 95 included barcode/pack leads after brand-market corroboration.

## Commercial model

The brand workbook uses a top-down, editable model:

1. Start with reported 2025 U.S. OPHC and Pet Nutrition pools.
2. Derive the non-U.S. North America OPHC residual as $4.045B less $3.596B.
3. Use a documented $280M Canada Hill’s proxy because Canada Pet Nutrition is not disclosed.
4. Allocate each pool across included brands with visible percentage assumptions.
5. Apply a ±30% range to each midpoint.
6. Apply category-market in-store/online assumptions.
7. Allocate brand midpoint sales to modeled retailers.
8. Apply the reported 13.3% company advertising intensity as a brand marketing proxy.

No modeled output is presented as a company-reported brand fact.

## Sentiment method

“General sentiment” is a directional synthesis of current retailer/review language and public brand narratives. It is not a social-listening score, review-weighted average, or statistically representative sample. Each row states recurring positive and negative themes and identifies the method. A production source of truth should replace this with a defined listening universe, deduplication, spam controls, time bounds and a reproducible scoring model.

## Coverage result

- 34 brand-market rows: 17 U.S. and 17 Canada.
- 1,144 product/SKU evidence rows: 974 U.S. and 170 Canada.
- 610 unique source URLs in the claim/source ledger.
- 603 rows contain a published regulatory, retailer or barcode identifier; the remainder are product/catalog evidence rows where an ID was not published.

The lower Canadian SKU count reflects fewer machine-readable local catalogs and the absence of a paid Canadian retailer/GS1 feed, not an assumption that the market has fewer products.

## Known limitations and next data acquisitions

1. Acquire NIQ/Circana/Nielsen or internal finance for exact brand-market sales, channel mix and share.
2. Acquire retailer POS/procurement or Numerator/Profitero for retailer-specific spend and digital shelf.
3. Acquire GS1 US/Canada or Colgate-Palmolive PIM exports for authoritative GTIN-to-pack relationships and lifecycle status.
4. Add retailer location/API coverage to distinguish listed, orderable, in-stock and discontinued.
5. Add formal social listening and normalized review ingestion.
6. Reconcile product aliases, multipacks, bundles and professional-only variants to an enterprise product master.

## Reproducibility assets

- `research/collect_openfda.ps1`
- `research/collect_health_canada_dpd.ps1`
- `research/collect_health_canada_npn.ps1`
- `research/collect_public_registries.ps1`
- `research/parse_exa_catalogs.mjs`
- `research/parse_retail_catalogs.mjs`
- `research/build_canonical_data.mjs`
- `research/canonical/*.json`

The workbook Sources sheets are the claim-to-source ledger for the delivered artifacts.

