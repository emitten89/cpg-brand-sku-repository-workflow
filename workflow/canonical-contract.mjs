import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export const CONTRACT_VERSION = '1.0.0';
export const SCHEMA_VERSION = '1.0.0';
export const PIPELINE_VERSION = '0.2.0';

export const FAILURE_CLASSIFICATIONS = Object.freeze({
  BUILD_INCOMPLETE: 'BUILD_INCOMPLETE',
  MANIFEST_INVALID: 'MANIFEST_INVALID',
  SNAPSHOT_INTEGRITY_ERROR: 'SNAPSHOT_INTEGRITY_ERROR',
  MALFORMED_JSON: 'MALFORMED_JSON',
  DATA_QUALITY_ERROR: 'DATA_QUALITY_ERROR'
});

export const REQUIRED_ARTIFACTS = Object.freeze([
  Object.freeze({
    key: 'brand_repository',
    defaultFile: 'brand_repository.json',
    resultCount: 'brandRows',
    summaryCount: 'brand_market_rows'
  }),
  Object.freeze({
    key: 'retailer_model',
    defaultFile: 'retailer_model.json',
    resultCount: 'retailerRows',
    summaryCount: 'retailer_model_rows'
  }),
  Object.freeze({
    key: 'sku_library',
    defaultFile: 'sku_library.json',
    resultCount: 'skuRows',
    summaryCount: 'sku_rows'
  }),
  Object.freeze({
    key: 'sources',
    defaultFile: 'sources.json',
    resultCount: 'sourceRows',
    summaryCount: 'source_rows'
  }),
  Object.freeze({
    key: 'coverage_gaps',
    defaultFile: 'coverage_gaps.json',
    resultCount: 'coverageGapRows'
  }),
  Object.freeze({
    key: 'summary',
    defaultFile: 'summary.json',
    resultCount: null
  })
]);

const RECORD_ARTIFACTS = REQUIRED_ARTIFACTS.filter(artifact => artifact.resultCount);
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SEMVER_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const SNAPSHOT_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,127}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

const unique = values => [...new Set(values)];
const sortedUnique = values => unique(values).sort((a, b) => a.localeCompare(b));
const normalizeKey = value => String(value ?? '').toLowerCase().replace(/[^a-z0-9|]+/g, ' ');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const serializeJson = value => `${JSON.stringify(value, null, 2)}\n`;
const isObject = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const isIsoDateTime = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && !Number.isNaN(Date.parse(value));
const isDate = value => typeof value === 'string' && DATE_PATTERN.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
const isSafeArtifactFilename = value => (
  typeof value === 'string'
  && value.endsWith('.json')
  && !value.includes('/')
  && !value.includes('\\')
  && path.basename(value) === value
  && value !== 'manifest.json'
  && value !== '.'
  && value !== '..'
);

function addError(result, classification, code, message, file) {
  if (!result.classifications.includes(classification)) result.classifications.push(classification);
  const error = { classification, code, message };
  if (file) error.file = file;
  result.errors.push(error);
}

function baseResult(directory) {
  return {
    directory: path.resolve(directory),
    manifest: 'manifest.json',
    status: 'FAIL',
    phase: 'preflight',
    classifications: [],
    brandRows: null,
    skuRows: null,
    retailerRows: null,
    sourceRows: null,
    coverageGapRows: null,
    snapshot: null,
    errors: []
  };
}

async function reportDefaultMissingArtifacts(directory, result) {
  await Promise.all(REQUIRED_ARTIFACTS.map(async artifact => {
    try {
      await fs.access(path.join(directory, artifact.defaultFile));
    } catch (error) {
      if (error?.code === 'ENOENT') {
        addError(
          result,
          FAILURE_CLASSIFICATIONS.BUILD_INCOMPLETE,
          'ARTIFACT_MISSING',
          `Required canonical artifact is missing: ${artifact.defaultFile}`,
          artifact.defaultFile
        );
      } else {
        throw error;
      }
    }
  }));
}

function validateManifestShape(manifest, result) {
  const invalid = (code, message, file = 'manifest.json') => addError(
    result,
    FAILURE_CLASSIFICATIONS.MANIFEST_INVALID,
    code,
    message,
    file
  );

  if (!isObject(manifest)) {
    invalid('MANIFEST_NOT_OBJECT', 'manifest.json must contain a JSON object.');
    return;
  }
  const allowedTopLevelKeys = new Set([
    'contract_version',
    'schema_version',
    'pipeline_version',
    'snapshot_id',
    'generated_at',
    'client',
    'markets',
    'source_window',
    'row_counts',
    'artifacts'
  ]);
  const unexpectedTopLevelKeys = Object.keys(manifest).filter(key => !allowedTopLevelKeys.has(key));
  if (unexpectedTopLevelKeys.length) {
    invalid('MANIFEST_PROPERTIES_INVALID', `Unexpected manifest properties: ${unexpectedTopLevelKeys.join(', ')}.`);
  }
  if (manifest.contract_version !== CONTRACT_VERSION) {
    invalid('UNSUPPORTED_CONTRACT_VERSION', `contract_version must be ${CONTRACT_VERSION}.`);
  }
  if (manifest.schema_version !== SCHEMA_VERSION) {
    invalid('UNSUPPORTED_SCHEMA_VERSION', `schema_version must be ${SCHEMA_VERSION}.`);
  }
  if (typeof manifest.pipeline_version !== 'string' || !SEMVER_PATTERN.test(manifest.pipeline_version)) {
    invalid('PIPELINE_VERSION_INVALID', 'pipeline_version must be a semantic version string.');
  }
  if (typeof manifest.snapshot_id !== 'string' || !SNAPSHOT_ID_PATTERN.test(manifest.snapshot_id)) {
    invalid('SNAPSHOT_ID_INVALID', 'snapshot_id must be a lowercase, filesystem-safe identifier of at most 128 characters.');
  }
  if (!isIsoDateTime(manifest.generated_at)) {
    invalid('GENERATED_AT_INVALID', 'generated_at must be an ISO-8601 timestamp.');
  }
  if (!isObject(manifest.client) || typeof manifest.client.slug !== 'string' || !manifest.client.slug || typeof manifest.client.name !== 'string' || !manifest.client.name) {
    invalid('CLIENT_INVALID', 'client must contain non-empty slug and name values.');
  } else if (Object.keys(manifest.client).some(key => !['slug', 'name'].includes(key))) {
    invalid('CLIENT_PROPERTIES_INVALID', 'client may contain only slug and name.');
  }
  if (!Array.isArray(manifest.markets) || manifest.markets.length === 0 || manifest.markets.some(market => typeof market !== 'string' || !market) || unique(manifest.markets).length !== manifest.markets.length) {
    invalid('MARKETS_INVALID', 'markets must be a non-empty array of unique strings.');
  }
  if (manifest.source_window !== undefined) {
    if (!isObject(manifest.source_window)) {
      invalid('SOURCE_WINDOW_INVALID', 'source_window must be an object when supplied.');
    } else {
      const unexpectedSourceWindowKeys = Object.keys(manifest.source_window).filter(key => !['as_of', 'captured_from', 'captured_to'].includes(key));
      if (unexpectedSourceWindowKeys.length) {
        invalid('SOURCE_WINDOW_PROPERTIES_INVALID', `Unexpected source_window properties: ${unexpectedSourceWindowKeys.join(', ')}.`);
      }
      for (const field of ['as_of', 'captured_from', 'captured_to']) {
        if (manifest.source_window[field] !== undefined && !isDate(manifest.source_window[field])) {
          invalid('SOURCE_WINDOW_DATE_INVALID', `source_window.${field} must be an ISO date when supplied.`);
        }
      }
      if (
        isDate(manifest.source_window.captured_from)
        && isDate(manifest.source_window.captured_to)
        && manifest.source_window.captured_from > manifest.source_window.captured_to
      ) {
        invalid('SOURCE_WINDOW_RANGE_INVALID', 'source_window.captured_from must not be after captured_to.');
      }
    }
  }

  if (!isObject(manifest.row_counts)) {
    invalid('ROW_COUNTS_INVALID', 'row_counts must be an object.');
  } else {
    const expectedKeys = RECORD_ARTIFACTS.map(artifact => artifact.key).sort();
    const actualKeys = Object.keys(manifest.row_counts).sort();
    if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) {
      invalid('ROW_COUNT_KEYS_INVALID', `row_counts must contain exactly: ${expectedKeys.join(', ')}.`);
    }
    for (const artifact of RECORD_ARTIFACTS) {
      const count = manifest.row_counts[artifact.key];
      if (!Number.isInteger(count) || count < 0) {
        invalid('ROW_COUNT_INVALID', `row_counts.${artifact.key} must be a non-negative integer.`);
      }
    }
  }

  if (!isObject(manifest.artifacts)) {
    invalid('ARTIFACTS_INVALID', 'artifacts must be an object.');
    return;
  }

  const expectedKeys = REQUIRED_ARTIFACTS.map(artifact => artifact.key).sort();
  const actualKeys = Object.keys(manifest.artifacts).sort();
  if (JSON.stringify(actualKeys) !== JSON.stringify(expectedKeys)) {
    invalid('ARTIFACT_KEYS_INVALID', `artifacts must contain exactly: ${expectedKeys.join(', ')}.`);
  }

  const filenames = [];
  for (const artifact of REQUIRED_ARTIFACTS) {
    const reference = manifest.artifacts[artifact.key];
    if (!isObject(reference)) {
      invalid('ARTIFACT_REFERENCE_INVALID', `artifacts.${artifact.key} must be an object.`);
      continue;
    }
    if (!isSafeArtifactFilename(reference.file)) {
      invalid('ARTIFACT_FILENAME_INVALID', `artifacts.${artifact.key}.file must be a local JSON filename.`);
    } else {
      filenames.push(reference.file);
    }
    if (typeof reference.sha256 !== 'string' || !SHA256_PATTERN.test(reference.sha256)) {
      invalid('ARTIFACT_HASH_INVALID', `artifacts.${artifact.key}.sha256 must be a lowercase SHA-256 digest.`);
    }
    if (!Number.isInteger(reference.bytes) || reference.bytes < 0) {
      invalid('ARTIFACT_BYTES_INVALID', `artifacts.${artifact.key}.bytes must be a non-negative integer.`);
    }
    const unexpectedReferenceKeys = Object.keys(reference).filter(key => !['file', 'bytes', 'sha256'].includes(key));
    if (unexpectedReferenceKeys.length) {
      invalid('ARTIFACT_REFERENCE_PROPERTIES_INVALID', `Unexpected artifacts.${artifact.key} properties: ${unexpectedReferenceKeys.join(', ')}.`);
    }
  }
  if (unique(filenames).length !== filenames.length) {
    invalid('ARTIFACT_FILENAMES_DUPLICATED', 'Each required artifact must reference a distinct filename.');
  }
}

function setCounts(result, data) {
  for (const artifact of RECORD_ARTIFACTS) {
    const records = data[artifact.key]?.records;
    result[artifact.resultCount] = Array.isArray(records) ? records.length : null;
  }
}

function duplicateValues(values) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values.filter(Boolean)) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}

function splitSourceUrls(value) {
  return String(value ?? '').split(' | ').map(url => url.trim()).filter(Boolean);
}

function validateSemanticData(data, manifest, result) {
  result.phase = 'semantic';
  const semanticError = (code, message, file) => addError(
    result,
    FAILURE_CLASSIFICATIONS.DATA_QUALITY_ERROR,
    code,
    message,
    file
  );

  const brands = data.brand_repository.records;
  const skus = data.sku_library.records;
  const retailers = data.retailer_model.records;
  const sources = data.sources.records;
  const summary = data.summary;
  const requiredSku = ['market', 'brand', 'category', 'product_name', 'source_url', 'evidence_tier', 'availability_status', 'confidence'];

  const brandKeys = brands.map(record => `${record.market}|${record.brand}`);
  const brandKeySet = new Set(brandKeys);
  if (brandKeySet.size !== brandKeys.length) {
    semanticError('DUPLICATE_BRAND_MARKET_KEY', 'Duplicate brand-market keys', manifest.artifacts.brand_repository.file);
  }
  for (const duplicate of duplicateValues(brands.map(record => record.brand_market_id))) {
    semanticError('DUPLICATE_BRAND_MARKET_ID', `Duplicate brand_market_id: ${duplicate}`, manifest.artifacts.brand_repository.file);
  }
  for (const record of brands) {
    if ((record.estimated_in_store_pct ?? 0) + (record.estimated_online_pct ?? 0) !== 100) {
      semanticError('CHANNEL_MIX_INVALID', `Channel mix does not sum to 100: ${record.market} ${record.brand}`, manifest.artifacts.brand_repository.file);
    }
    if (!(record.estimated_yearly_sales_low_usd_m <= record.estimated_yearly_sales_mid_usd_m && record.estimated_yearly_sales_mid_usd_m <= record.estimated_yearly_sales_high_usd_m)) {
      semanticError('SALES_RANGE_INVALID', `Invalid sales range: ${record.market} ${record.brand}`, manifest.artifacts.brand_repository.file);
    }
  }

  for (const record of skus) {
    for (const field of requiredSku) {
      if (!record[field]) {
        semanticError('SKU_REQUIRED_FIELD_MISSING', `Missing ${field}: ${record.repository_row_id || 'unknown row'}`, manifest.artifacts.sku_library.file);
      }
    }
    const brandKey = `${record.market}|${record.brand}`;
    if (!brandKeySet.has(brandKey)) {
      semanticError('SKU_BRAND_REFERENCE_MISSING', `SKU row references unknown brand-market: ${brandKey}`, manifest.artifacts.sku_library.file);
    }
  }
  for (const duplicate of duplicateValues(skus.map(record => record.repository_row_id))) {
    semanticError('DUPLICATE_SKU_ROW_ID', `Duplicate repository_row_id: ${duplicate}`, manifest.artifacts.sku_library.file);
  }
  const skuKeys = skus.map(record => normalizeKey(`${record.market}|${record.brand}|${record.product_sku || record.product_name}|${record.pack_size_evidence || ''}`));
  if (new Set(skuKeys).size !== skuKeys.length) {
    semanticError('DUPLICATE_CANONICAL_SKU_KEY', 'Duplicate canonical SKU keys', manifest.artifacts.sku_library.file);
  }

  const retailerKeys = new Set(retailers.map(record => `${record.market}|${record.brand}`));
  for (const key of retailerKeys) {
    if (!brandKeySet.has(key)) {
      semanticError('RETAILER_BRAND_REFERENCE_MISSING', `Retailer row references unknown brand-market: ${key}`, manifest.artifacts.retailer_model.file);
    }
    const total = retailers.filter(record => `${record.market}|${record.brand}` === key).reduce((sum, record) => sum + record.allocation_pct, 0);
    if (total !== 100) {
      semanticError('RETAILER_ALLOCATION_INVALID', `Retailer allocation is ${total}%: ${key}`, manifest.artifacts.retailer_model.file);
    }
  }

  const sourceUrls = sources.map(record => record.source_url);
  const sourceUrlSet = new Set(sourceUrls);
  if (sourceUrlSet.size !== sourceUrls.length) {
    semanticError('DUPLICATE_SOURCE_URL', 'Duplicate source URLs', manifest.artifacts.sources.file);
  }
  for (const duplicate of duplicateValues(sources.map(record => record.source_id))) {
    semanticError('DUPLICATE_SOURCE_ID', `Duplicate source_id: ${duplicate}`, manifest.artifacts.sources.file);
  }

  for (const record of skus) {
    for (const url of splitSourceUrls(record.source_url)) {
      if (!sourceUrlSet.has(url)) {
        semanticError('SKU_SOURCE_REFERENCE_MISSING', `SKU source_url is absent from the source ledger: ${url}`, manifest.artifacts.sku_library.file);
      }
    }
  }
  const brandSourceFields = ['brand_fact_source', 'availability_source', 'commercial_fact_source', 'current_2026_source'];
  for (const record of brands) {
    for (const field of brandSourceFields) {
      for (const url of splitSourceUrls(record[field])) {
        if (!sourceUrlSet.has(url)) {
          semanticError('BRAND_SOURCE_REFERENCE_MISSING', `${field} is absent from the source ledger: ${url}`, manifest.artifacts.brand_repository.file);
        }
      }
    }
  }

  for (const artifact of RECORD_ARTIFACTS.filter(item => item.summaryCount)) {
    const actual = data[artifact.key].records.length;
    if (summary[artifact.summaryCount] !== actual) {
      semanticError('SUMMARY_ROW_COUNT_MISMATCH', `summary.${artifact.summaryCount} is ${summary[artifact.summaryCount]}; expected ${actual}.`, manifest.artifacts.summary.file);
    }
  }
  if (summary.generated_at !== manifest.generated_at) {
    semanticError('SUMMARY_TIMESTAMP_MISMATCH', 'summary.generated_at must equal manifest.generated_at.', manifest.artifacts.summary.file);
  }
  if (manifest.source_window?.as_of && summary.as_of !== manifest.source_window.as_of) {
    semanticError('SUMMARY_AS_OF_MISMATCH', 'summary.as_of must equal manifest.source_window.as_of.', manifest.artifacts.summary.file);
  }

  const observedMarkets = sortedUnique([...brands, ...skus, ...retailers].map(record => record.market).filter(Boolean));
  const manifestMarkets = sortedUnique(manifest.markets);
  if (JSON.stringify(observedMarkets) !== JSON.stringify(manifestMarkets)) {
    semanticError('MANIFEST_MARKETS_MISMATCH', `Manifest markets ${manifestMarkets.join(', ')} do not match observed markets ${observedMarkets.join(', ')}.`, 'manifest.json');
  }
}

export async function validateCanonicalSnapshot(directory = 'research/canonical') {
  const resolvedDirectory = path.resolve(directory);
  const result = baseResult(resolvedDirectory);
  const manifestPath = path.join(resolvedDirectory, 'manifest.json');

  let manifestBytes;
  try {
    manifestBytes = await fs.readFile(manifestPath);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
    addError(
      result,
      FAILURE_CLASSIFICATIONS.BUILD_INCOMPLETE,
      'MANIFEST_MISSING',
      'Canonical snapshot is incomplete: manifest.json is missing.',
      'manifest.json'
    );
    await reportDefaultMissingArtifacts(resolvedDirectory, result);
    return result;
  }

  let manifest;
  try {
    manifest = JSON.parse(manifestBytes.toString('utf8'));
  } catch (error) {
    addError(
      result,
      FAILURE_CLASSIFICATIONS.MANIFEST_INVALID,
      'MANIFEST_JSON_INVALID',
      `manifest.json is not valid JSON: ${error.message}`,
      'manifest.json'
    );
    await reportDefaultMissingArtifacts(resolvedDirectory, result);
    return result;
  }

  validateManifestShape(manifest, result);
  if (result.errors.length) {
    await reportDefaultMissingArtifacts(resolvedDirectory, result);
    return result;
  }

  result.snapshot = {
    id: manifest.snapshot_id,
    contractVersion: manifest.contract_version,
    schemaVersion: manifest.schema_version,
    pipelineVersion: manifest.pipeline_version,
    generatedAt: manifest.generated_at,
    client: manifest.client,
    markets: manifest.markets,
    sourceWindow: manifest.source_window ?? null
  };

  const bytesByArtifact = {};
  await Promise.all(REQUIRED_ARTIFACTS.map(async artifact => {
    const reference = manifest.artifacts[artifact.key];
    try {
      bytesByArtifact[artifact.key] = await fs.readFile(path.join(resolvedDirectory, reference.file));
    } catch (error) {
      if (error?.code === 'ENOENT') {
        addError(
          result,
          FAILURE_CLASSIFICATIONS.BUILD_INCOMPLETE,
          'ARTIFACT_MISSING',
          `Manifest-referenced artifact is missing: ${reference.file}`,
          reference.file
        );
        return;
      }
      throw error;
    }
  }));
  if (result.classifications.includes(FAILURE_CLASSIFICATIONS.BUILD_INCOMPLETE)) return result;

  const data = {};
  for (const artifact of REQUIRED_ARTIFACTS) {
    const reference = manifest.artifacts[artifact.key];
    const bytes = bytesByArtifact[artifact.key];
    const actualHash = sha256(bytes);
    if (bytes.length !== reference.bytes) {
      addError(
        result,
        FAILURE_CLASSIFICATIONS.SNAPSHOT_INTEGRITY_ERROR,
        'BYTE_COUNT_MISMATCH',
        `${reference.file} has ${bytes.length} bytes; manifest declares ${reference.bytes}.`,
        reference.file
      );
    }
    if (actualHash !== reference.sha256) {
      addError(
        result,
        FAILURE_CLASSIFICATIONS.SNAPSHOT_INTEGRITY_ERROR,
        'CHECKSUM_MISMATCH',
        `${reference.file} SHA-256 does not match manifest.json.`,
        reference.file
      );
    }
    try {
      data[artifact.key] = JSON.parse(bytes.toString('utf8'));
    } catch (error) {
      addError(
        result,
        FAILURE_CLASSIFICATIONS.MALFORMED_JSON,
        'ARTIFACT_JSON_INVALID',
        `${reference.file} is not valid JSON: ${error.message}`,
        reference.file
      );
      continue;
    }
    if (artifact.resultCount && !Array.isArray(data[artifact.key]?.records)) {
      addError(
        result,
        FAILURE_CLASSIFICATIONS.MALFORMED_JSON,
        'RECORDS_ARRAY_MISSING',
        `${reference.file} must contain a records array.`,
        reference.file
      );
    }
    if (artifact.key === 'summary' && !isObject(data.summary)) {
      addError(
        result,
        FAILURE_CLASSIFICATIONS.MALFORMED_JSON,
        'SUMMARY_OBJECT_MISSING',
        `${reference.file} must contain a JSON object.`,
        reference.file
      );
    }
  }

  setCounts(result, data);
  if (result.errors.length) return result;

  for (const artifact of RECORD_ARTIFACTS) {
    const actual = data[artifact.key].records.length;
    const declared = manifest.row_counts[artifact.key];
    if (declared !== actual) {
      addError(
        result,
        FAILURE_CLASSIFICATIONS.SNAPSHOT_INTEGRITY_ERROR,
        'MANIFEST_ROW_COUNT_MISMATCH',
        `row_counts.${artifact.key} is ${declared}; ${manifest.artifacts[artifact.key].file} contains ${actual} records.`,
        manifest.artifacts[artifact.key].file
      );
    }
  }
  if (result.errors.length) return result;

  validateSemanticData(data, manifest, result);
  if (result.errors.length) return result;

  result.status = 'PASS';
  result.phase = 'complete';
  return result;
}

function slugify(value, maxLength = 48) {
  return String(value ?? 'client')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength) || 'client';
}

function timestampId(value) {
  return new Date(value).toISOString().toLowerCase().replace(/[-:.]/g, '');
}

export async function createCanonicalManifest(directory, metadata = {}) {
  const resolvedDirectory = path.resolve(directory);
  const bytesByArtifact = {};
  const data = {};
  for (const artifact of REQUIRED_ARTIFACTS) {
    const file = metadata.files?.[artifact.key] ?? artifact.defaultFile;
    const bytes = await fs.readFile(path.join(resolvedDirectory, file));
    bytesByArtifact[artifact.key] = { file, bytes };
    data[artifact.key] = JSON.parse(bytes.toString('utf8'));
    if (artifact.resultCount && !Array.isArray(data[artifact.key]?.records)) {
      throw new Error(`${file} must contain a records array before a manifest can be generated.`);
    }
  }

  const summary = data.summary;
  const parentCompanies = sortedUnique(data.brand_repository.records.map(record => record.parent_company).filter(Boolean));
  const clientName = metadata.client?.name ?? (parentCompanies.length === 1 ? parentCompanies[0] : null);
  if (!clientName) throw new Error('Client name could not be inferred; supply metadata.client.name.');
  const client = {
    slug: metadata.client?.slug ?? slugify(clientName),
    name: clientName
  };
  const markets = sortedUnique(metadata.markets ?? [
    ...data.brand_repository.records,
    ...data.sku_library.records,
    ...data.retailer_model.records
  ].map(record => record.market).filter(Boolean));
  const generatedAt = metadata.generatedAt ?? summary.generated_at;
  if (!isIsoDateTime(generatedAt)) throw new Error('generatedAt must be supplied or available as summary.generated_at.');

  const capturedDates = sortedUnique([
    ...data.sources.records.map(record => record.captured_date),
    ...data.sku_library.records.map(record => record.captured_date)
  ].filter(isDate));
  const sourceWindow = metadata.sourceWindow ?? {
    ...(isDate(summary.as_of) ? { as_of: summary.as_of } : {}),
    ...(capturedDates.length ? { captured_from: capturedDates[0], captured_to: capturedDates.at(-1) } : {})
  };
  const snapshotId = metadata.snapshotId ?? slugify(`${client.slug}-${markets.join('-')}-${timestampId(generatedAt)}`, 128);

  const artifacts = {};
  const rowCounts = {};
  for (const artifact of REQUIRED_ARTIFACTS) {
    const { file, bytes } = bytesByArtifact[artifact.key];
    artifacts[artifact.key] = {
      file,
      bytes: bytes.length,
      sha256: sha256(bytes)
    };
    if (artifact.resultCount) rowCounts[artifact.key] = data[artifact.key].records.length;
  }

  return {
    contract_version: CONTRACT_VERSION,
    schema_version: SCHEMA_VERSION,
    pipeline_version: metadata.pipelineVersion ?? PIPELINE_VERSION,
    snapshot_id: snapshotId,
    generated_at: generatedAt,
    client,
    markets,
    ...(Object.keys(sourceWindow).length ? { source_window: sourceWindow } : {}),
    row_counts: rowCounts,
    artifacts
  };
}

export async function writeCanonicalManifest(directory, metadata = {}) {
  const manifest = await createCanonicalManifest(directory, metadata);
  await fs.writeFile(path.join(path.resolve(directory), 'manifest.json'), serializeJson(manifest), 'utf8');
  return manifest;
}

async function pathExists(target) {
  try {
    await fs.access(target);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

export async function publishCanonicalSnapshot({ directory, artifacts, metadata = {} }) {
  const targetDirectory = path.resolve(directory);
  const parentDirectory = path.dirname(targetDirectory);
  const suffix = `${process.pid}-${Date.now()}`;
  const stageDirectory = path.join(parentDirectory, `.${path.basename(targetDirectory)}.staging-${suffix}`);
  const backupDirectory = path.join(parentDirectory, `.${path.basename(targetDirectory)}.previous-${suffix}`);
  await fs.mkdir(parentDirectory, { recursive: true });
  await fs.mkdir(stageDirectory, { recursive: false });

  let targetMoved = false;
  let stagePromoted = false;
  try {
    for (const artifact of REQUIRED_ARTIFACTS) {
      if (!(artifact.key in artifacts)) throw new Error(`Missing generated artifact payload: ${artifact.key}`);
      await fs.writeFile(
        path.join(stageDirectory, artifact.defaultFile),
        serializeJson(artifacts[artifact.key]),
        'utf8'
      );
    }

    const manifest = await writeCanonicalManifest(stageDirectory, metadata);
    const validation = await validateCanonicalSnapshot(stageDirectory);
    if (validation.status !== 'PASS') {
      throw new Error(`Generated canonical snapshot failed validation:\n${JSON.stringify(validation, null, 2)}`);
    }

    if (await pathExists(targetDirectory)) {
      await fs.rename(targetDirectory, backupDirectory);
      targetMoved = true;
    }
    await fs.rename(stageDirectory, targetDirectory);
    stagePromoted = true;
    if (targetMoved) await fs.rm(backupDirectory, { recursive: true, force: true });
    return manifest;
  } catch (error) {
    if (targetMoved && !stagePromoted && !(await pathExists(targetDirectory)) && await pathExists(backupDirectory)) {
      await fs.rename(backupDirectory, targetDirectory);
    }
    throw error;
  } finally {
    if (!stagePromoted) await fs.rm(stageDirectory, { recursive: true, force: true });
  }
}
