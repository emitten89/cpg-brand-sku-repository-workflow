const viewRoot = document.querySelector('#view-root');
const loadingState = document.querySelector('#loading-state');
const appContent = document.querySelector('#app-content');
const errorState = document.querySelector('#error-state');
const errorMessage = document.querySelector('#error-message');
const viewName = document.querySelector('#view-name');
const sidebarStatus = document.querySelector('#sidebar-status');
const asOfLabel = document.querySelector('#as-of-label');
const drawer = document.querySelector('#detail-drawer');
const drawerBackdrop = document.querySelector('#drawer-backdrop');
const drawerTitle = document.querySelector('#drawer-title');
const drawerKicker = document.querySelector('#drawer-kicker');
const drawerContent = document.querySelector('#drawer-content');
const drawerClose = document.querySelector('#drawer-close');
const menuButton = document.querySelector('.menu-button');

const state = {
  activeView: 'overview',
  page: 1,
  pageSize: 25,
  filters: { search: '', market: '', category: '', tier: '' },
  manifest: null,
  data: null,
  lastFocus: null,
};

const viewConfig = {
  brands: {
    name: 'Brand repository',
    description: 'Market presence, positioning, availability, modeled commercial context and cited brand evidence.',
    dataset: 'brands',
    primary: 'brand',
    columns: [
      ['market', 'Market'],
      ['brand', 'Brand'],
      ['primary_category', 'Category'],
      ['availability_confidence', 'Confidence'],
      ['availability_status', 'Availability'],
      ['positioning', 'Positioning'],
      ['estimated_yearly_sales_mid_usd_m', 'Modeled sales midpoint'],
    ],
  },
  skus: {
    name: 'SKU evidence',
    description: 'One row per observed product or identifier signal, preserving evidence grain, provenance and confidence.',
    dataset: 'skus',
    primary: 'product_name',
    columns: [
      ['market', 'Market'],
      ['brand', 'Brand'],
      ['category', 'Category'],
      ['product_name', 'Product'],
      ['pack_size_evidence', 'Pack evidence'],
      ['evidence_tier', 'Evidence tier'],
      ['confidence', 'Confidence'],
      ['availability_status', 'Availability'],
    ],
  },
  retailers: {
    name: 'Retailer model',
    description: 'Editable allocation assumptions for planning. Values are modeled and are not retailer-reported facts.',
    dataset: 'retailers',
    primary: 'retailer',
    columns: [
      ['market', 'Market'],
      ['brand', 'Brand'],
      ['category', 'Category'],
      ['retailer', 'Retailer'],
      ['allocation_pct', 'Allocation'],
      ['estimated_yearly_spend_usd_m', 'Modeled spend'],
      ['method', 'Method'],
    ],
  },
  sources: {
    name: 'Source ledger',
    description: 'The inspectable claim-to-source ledger behind the snapshot, organized by evidence tier and use.',
    dataset: 'sources',
    primary: 'source_id',
    columns: [
      ['source_id', 'Source ID'],
      ['evidence_tier', 'Evidence tier'],
      ['source_type', 'Source type'],
      ['claim_supported', 'Claim supported'],
      ['used_in', 'Used in'],
      ['captured_date', 'Captured'],
      ['source_url', 'Source'],
    ],
  },
  gaps: {
    name: 'Coverage gaps',
    description: 'Known exclusions, unavailable commercial fields and the next evidence needed to close each gap.',
    dataset: 'gaps',
    primary: 'candidate',
    columns: [
      ['market', 'Market'],
      ['candidate', 'Candidate or field'],
      ['status', 'Status'],
      ['reason', 'Why it is a gap'],
      ['next_action', 'Next action'],
    ],
  },
};

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function safeUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(`${String(value).slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  }).format(date);
}

function formatBytes(value) {
  const bytes = Number(value || 0);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

function formatMoney(value) {
  if (value === '' || value === null || value === undefined) return '—';
  return `$${Number(value).toLocaleString('en-US', { maximumFractionDigits: 1 })}M`;
}

function unique(rows, keys) {
  const values = new Set();
  for (const row of rows) {
    for (const key of keys) {
      const value = row[key];
      if (value) values.add(String(value));
    }
  }
  return [...values].sort((a, b) => a.localeCompare(b));
}

function records(artifact) {
  if (!artifact || !Array.isArray(artifact.records)) {
    throw new Error('A manifest-bound artifact does not contain the required records array.');
  }
  return artifact.records;
}

async function loadArtifact(logicalName) {
  const artifact = state.manifest.artifacts?.[logicalName];
  if (!artifact?.file) throw new Error(`Manifest artifact missing: ${logicalName}`);
  const response = await fetch(`./data/${encodeURIComponent(artifact.file)}`, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`Could not load ${artifact.file} (${response.status}).`);
  return response.json();
}

async function initialize() {
  try {
    const manifestResponse = await fetch('./data/manifest.json', { cache: 'no-cache' });
    if (!manifestResponse.ok) throw new Error(`Could not load manifest.json (${manifestResponse.status}).`);
    state.manifest = await manifestResponse.json();

    const [brandRepository, skuLibrary, retailerModel, sourceLedger, coverageGaps, summary] =
      await Promise.all([
        loadArtifact('brand_repository'),
        loadArtifact('sku_library'),
        loadArtifact('retailer_model'),
        loadArtifact('sources'),
        loadArtifact('coverage_gaps'),
        loadArtifact('summary'),
      ]);

    state.data = {
      brands: records(brandRepository),
      skus: records(skuLibrary),
      retailers: records(retailerModel),
      sources: records(sourceLedger),
      gaps: records(coverageGaps),
      summary,
    };

    const expected = state.manifest.row_counts || {};
    const actual = {
      brand_repository: state.data.brands.length,
      sku_library: state.data.skus.length,
      retailer_model: state.data.retailers.length,
      sources: state.data.sources.length,
      coverage_gaps: state.data.gaps.length,
    };
    for (const [key, count] of Object.entries(actual)) {
      if (Number(expected[key]) !== count) {
        throw new Error(`Rendered row count does not match manifest for ${key}.`);
      }
    }

    updateChrome();
    loadingState.hidden = true;
    appContent.hidden = false;
    render();
  } catch (error) {
    console.error(error);
    loadingState.hidden = true;
    errorState.hidden = false;
    errorMessage.textContent = error instanceof Error ? error.message : String(error);
    sidebarStatus.textContent = 'FAIL CLOSED';
  }
}

function updateChrome() {
  const counts = {
    brands: state.data.brands.length,
    skus: state.data.skus.length,
    retailers: state.data.retailers.length,
    sources: state.data.sources.length,
    gaps: state.data.gaps.length,
  };
  for (const [key, count] of Object.entries(counts)) {
    const target = document.querySelector(`[data-count="${key}"]`);
    if (target) target.textContent = formatNumber(count);
  }
  sidebarStatus.textContent = 'PASS · READY';
  asOfLabel.textContent = `As of ${formatDate(state.manifest.source_window?.as_of || state.manifest.generated_at)}`;
}

function render() {
  closeDrawer();
  viewName.textContent = state.activeView === 'overview'
    ? 'Overview'
    : state.activeView === 'contract'
      ? 'Snapshot contract'
      : viewConfig[state.activeView].name;

  for (const button of document.querySelectorAll('.nav-item')) {
    const active = button.dataset.view === state.activeView;
    button.classList.toggle('is-active', active);
    if (active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  }

  if (state.activeView === 'overview') renderOverview();
  else if (state.activeView === 'contract') renderContract();
  else renderDatasetView();
}

function metricCard(label, value, note, glyph) {
  return `
    <article class="metric-card">
      <p class="metric-label">${escapeHtml(label)} <span class="metric-glyph" aria-hidden="true">${escapeHtml(glyph)}</span></p>
      <p class="metric-value">${escapeHtml(value)}</p>
      <p class="metric-note">${escapeHtml(note)}</p>
    </article>`;
}

function barList(entries) {
  const max = Math.max(...entries.map(([, count]) => count), 1);
  return `<div class="bar-list">${entries.map(([label, count]) => `
    <div class="bar-row">
      <div class="bar-label"><span>${escapeHtml(label)}</span><strong>${formatNumber(count)}</strong></div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.max(3, (count / max) * 100)}%"></div></div>
    </div>`).join('')}</div>`;
}

function countBy(rows, key) {
  const counts = new Map();
  for (const row of rows) {
    const label = row[key] || 'Unspecified';
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function renderOverview() {
  const { brands, skus, retailers, sources, gaps, summary } = state.data;
  const marketSkus = countBy(skus, 'market');
  const categories = countBy(brands, 'primary_category');
  const evidenceMix = Object.entries(summary.sku_by_tier || {}).sort((a, b) => b[1] - a[1]);

  viewRoot.innerHTML = `
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow">Validated canonical snapshot</p>
        <h1>Evidence you can inspect.<br />Gaps you can see.</h1>
        <p>A read-only view of ${escapeHtml(state.manifest.client.name)} brand, SKU, retailer and source evidence across ${escapeHtml(state.manifest.markets.join(' + '))}. Commercial estimates remain visibly modeled.</p>
      </div>
      <div class="hero-contract" aria-label="Snapshot metadata">
        <div class="contract-line"><span>Snapshot</span><strong>${escapeHtml(state.manifest.snapshot_id)}</strong></div>
        <div class="contract-line"><span>Contract</span><strong>v${escapeHtml(state.manifest.contract_version)}</strong></div>
        <div class="contract-line"><span>Generated</span><strong>${escapeHtml(formatDate(state.manifest.generated_at))}</strong></div>
        <div class="contract-line"><span>Integrity</span><strong>Manifest + SHA-256</strong></div>
      </div>
    </section>

    <section class="metrics-grid" aria-label="Repository counts">
      ${metricCard('Brand-market records', formatNumber(brands.length), `${unique(brands, ['brand']).length} distinct brands`, 'B')}
      ${metricCard('SKU evidence rows', formatNumber(skus.length), 'Observed product and identifier signals', 'S')}
      ${metricCard('Retailer rows', formatNumber(retailers.length), 'Modeled allocation assumptions', 'R')}
      ${metricCard('Source records', formatNumber(sources.length), 'Inspectable claim-to-source ledger', '↗')}
      ${metricCard('Known gaps', formatNumber(gaps.length), 'Explicit exclusions and next actions', '!')}
    </section>

    <section class="overview-grid">
      <article class="panel span-7">
        <div class="panel-header">
          <div><p class="eyebrow">Portfolio structure</p><h2>Brand-market records by category</h2><p>Counts reflect market-level brand records, not revenue share.</p></div>
          <span class="chip">Observed</span>
        </div>
        ${barList(categories)}
      </article>

      <article class="panel span-5">
        <div class="panel-header">
          <div><p class="eyebrow">Market coverage</p><h2>SKU evidence footprint</h2><p>Public evidence volume is not a proxy for active assortment size.</p></div>
        </div>
        <div class="market-split">
          ${marketSkus.map(([market, count]) => `<div class="market-card"><p>${escapeHtml(market)} evidence rows</p><strong>${formatNumber(count)}</strong><div class="bar-track"><div class="bar-fill" style="width:${(count / skus.length) * 100}%"></div></div></div>`).join('')}
        </div>
      </article>

      <article class="panel span-7">
        <div class="panel-header">
          <div><p class="eyebrow">Evidence hierarchy</p><h2>SKU rows by evidence tier</h2><p>Every record preserves its source class and confidence.</p></div>
        </div>
        ${barList(evidenceMix)}
      </article>

      <article class="panel span-5">
        <div class="panel-header">
          <div><p class="eyebrow">Open questions</p><h2>Named coverage gaps</h2><p>Unknowns remain visible instead of being filled with unsupported claims.</p></div>
        </div>
        <ol class="gap-list">
          ${gaps.slice(0, 5).map((gap, index) => `<li><span class="gap-index">${index + 1}</span><div><strong>${escapeHtml(gap.market)} · ${escapeHtml(gap.candidate)}</strong><p>${escapeHtml(gap.status)}</p></div></li>`).join('')}
        </ol>
      </article>

      <article class="panel span-12">
        <div class="panel-header">
          <div><p class="eyebrow">Use with care</p><h2>Snapshot limitations</h2><p>The interface carries the same qualifications as the canonical data.</p></div>
        </div>
        <ul class="limitation-list">
          ${(summary.limitations || []).map((item, index) => `<li><span class="gap-index">${String(index + 1).padStart(2, '0')}</span><p>${escapeHtml(item)}</p></li>`).join('')}
        </ul>
      </article>
    </section>`;
}

function filteredRows(config) {
  const query = state.filters.search.trim().toLowerCase();
  return state.data[config.dataset].filter((row) => {
    if (state.filters.market && row.market !== state.filters.market) return false;
    const category = row.category || row.primary_category || '';
    if (state.filters.category && category !== state.filters.category) return false;
    const tier = row.evidence_tier || row.availability_confidence || row.confidence || '';
    if (state.filters.tier && tier !== state.filters.tier) return false;
    if (!query) return true;
    return Object.values(row).some((value) => String(value ?? '').toLowerCase().includes(query));
  });
}

function cellValue(key, value) {
  if (value === '' || value === null || value === undefined) return '<span class="muted">—</span>';
  if (key === 'estimated_yearly_sales_mid_usd_m' || key === 'estimated_yearly_spend_usd_m') {
    return `<span class="nowrap">${escapeHtml(formatMoney(value))}</span> <span class="badge modeled">Modeled</span>`;
  }
  if (key === 'allocation_pct') return `<span class="nowrap">${escapeHtml(value)}%</span> <span class="badge modeled">Modeled</span>`;
  if (key === 'source_url') {
    const url = safeUrl(String(value).split(' | ')[0]);
    return url ? `<a class="cell-link" href="${escapeHtml(url)}" target="_blank" rel="noreferrer" onclick="event.stopPropagation()">Open source ↗</a>` : escapeHtml(value);
  }
  if (key.includes('confidence')) {
    const tone = String(value).toLowerCase().includes('high') ? 'high' : String(value).toLowerCase().includes('medium') ? 'medium' : 'low';
    return `<span class="badge ${tone}">${escapeHtml(value)}</span>`;
  }
  if (key === 'market' || key === 'evidence_tier') return `<span class="badge">${escapeHtml(value)}</span>`;
  const primaryClass = ['brand', 'product_name', 'candidate', 'source_id', 'retailer'].includes(key) ? 'cell-primary' : '';
  return `<span class="truncate ${primaryClass}">${escapeHtml(value)}</span>`;
}

function renderDatasetView() {
  const config = viewConfig[state.activeView];
  const allRows = state.data[config.dataset];
  const rows = filteredRows(config);
  const pages = Math.max(1, Math.ceil(rows.length / state.pageSize));
  state.page = Math.min(state.page, pages);
  const start = (state.page - 1) * state.pageSize;
  const visible = rows.slice(start, start + state.pageSize);
  const markets = unique(allRows, ['market']);
  const categories = unique(allRows, ['category', 'primary_category']);
  const tiers = unique(allRows, ['evidence_tier', 'availability_confidence', 'confidence']);

  viewRoot.innerHTML = `
    <div class="page-heading">
      <div><p class="eyebrow">Canonical repository</p><h1>${escapeHtml(config.name)}</h1><p>${escapeHtml(config.description)}</p></div>
      <p class="result-count"><strong>${formatNumber(rows.length)}</strong> of ${formatNumber(allRows.length)} records</p>
    </div>
    <div class="toolbar" role="search">
      ${filterField('search', 'Search records', 'Search brand, product, retailer or source…')}
      ${selectField('market', 'All markets', markets)}
      ${selectField('category', 'All categories', categories)}
      ${selectField('tier', 'All evidence / confidence', tiers)}
    </div>
    <section class="table-card" aria-label="${escapeHtml(config.name)} records">
      ${visible.length ? `
        <div class="table-scroll"><table>
          <thead><tr>${config.columns.map(([, label]) => `<th scope="col">${escapeHtml(label)}</th>`).join('')}</tr></thead>
          <tbody>${visible.map((row, index) => `<tr tabindex="0" data-row-index="${start + index}" aria-label="Open ${escapeHtml(row[config.primary] || 'record')} details">${config.columns.map(([key]) => `<td>${cellValue(key, row[key])}</td>`).join('')}</tr>`).join('')}</tbody>
        </table></div>` : '<div class="empty-state"><strong>No records match these filters.</strong><p>Clear or broaden the filters to continue.</p></div>'}
      <div class="table-footer">
        <span>Showing ${rows.length ? formatNumber(start + 1) : 0}–${formatNumber(Math.min(start + state.pageSize, rows.length))} of ${formatNumber(rows.length)}</span>
        <div class="pagination"><button type="button" data-page="prev" ${state.page === 1 ? 'disabled' : ''}>← Previous</button><span>Page ${state.page} of ${pages}</span><button type="button" data-page="next" ${state.page === pages ? 'disabled' : ''}>Next →</button></div>
      </div>
    </section>`;

  wireDatasetEvents(config, rows);
}

function filterField(key, label, placeholder) {
  return `<div class="field"><label for="filter-${key}">${escapeHtml(label)}</label><input id="filter-${key}" data-filter="${key}" type="search" value="${escapeHtml(state.filters[key])}" placeholder="${escapeHtml(placeholder)}" autocomplete="off" /></div>`;
}

function selectField(key, placeholder, values) {
  return `<div class="field"><label for="filter-${key}">${escapeHtml(placeholder)}</label><select id="filter-${key}" data-filter="${key}"><option value="">${escapeHtml(placeholder)}</option>${values.map((value) => `<option value="${escapeHtml(value)}" ${state.filters[key] === value ? 'selected' : ''}>${escapeHtml(value)}</option>`).join('')}</select></div>`;
}

function wireDatasetEvents(config, rows) {
  for (const control of viewRoot.querySelectorAll('[data-filter]')) {
    const eventName = control.tagName === 'INPUT' ? 'input' : 'change';
    control.addEventListener(eventName, () => {
      state.filters[control.dataset.filter] = control.value;
      state.page = 1;
      renderDatasetView();
      if (control.tagName === 'INPUT') {
        const replacement = viewRoot.querySelector(`[data-filter="${control.dataset.filter}"]`);
        replacement?.focus();
        replacement?.setSelectionRange(replacement.value.length, replacement.value.length);
      }
    });
  }

  for (const rowElement of viewRoot.querySelectorAll('tbody tr')) {
    const open = () => openDrawer(rows[Number(rowElement.dataset.rowIndex)], config);
    rowElement.addEventListener('click', open);
    rowElement.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        open();
      }
    });
  }

  for (const button of viewRoot.querySelectorAll('[data-page]')) {
    button.addEventListener('click', () => {
      state.page += button.dataset.page === 'next' ? 1 : -1;
      renderDatasetView();
      viewRoot.querySelector('.table-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
}

function renderContract() {
  const manifest = state.manifest;
  const artifacts = Object.entries(manifest.artifacts || {});
  viewRoot.innerHTML = `
    <div class="page-heading">
      <div><p class="eyebrow">Trust boundary</p><h1>Snapshot contract</h1><p>This site is built only after completeness, manifest shape, byte counts, SHA-256 hashes, JSON structure and semantic checks pass.</p></div>
      <span class="chip">✓ Validation PASS</span>
    </div>
    <section class="contract-grid">
      <article class="contract-card span-2">
        <p class="eyebrow">Release marker</p><h2>Manifest identity</h2>
        <div class="manifest-grid">
          ${manifestStat('Snapshot ID', manifest.snapshot_id)}
          ${manifestStat('Client', manifest.client.name)}
          ${manifestStat('Markets', manifest.markets.join(', '))}
          ${manifestStat('Contract', `v${manifest.contract_version}`)}
          ${manifestStat('Schema', `v${manifest.schema_version}`)}
          ${manifestStat('Pipeline', `v${manifest.pipeline_version}`)}
        </div>
      </article>
      <article class="contract-card">
        <p class="eyebrow">Consumer rule</p><h2>Fail closed</h2>
        <ul class="rule-list">
          ${rule('Manifest required', 'The manifest is the release marker for the complete snapshot.')}
          ${rule('Integrity before content', 'Every referenced file is checked for byte count and SHA-256 hash.')}
          ${rule('Semantics after preflight', 'Referential and data-quality rules run only after the unit is complete.')}
          ${rule('Last known good', 'Downstream consumers retain the previous validated snapshot on failure.')}
        </ul>
      </article>
      <article class="contract-card">
        <p class="eyebrow">Failure taxonomy</p><h2>Structured classifications</h2>
        <ul class="rule-list">
          ${rule('BUILD_INCOMPLETE', 'Manifest or required artifacts are missing.')}
          ${rule('MANIFEST_INVALID', 'Manifest shape or supported version is invalid.')}
          ${rule('SNAPSHOT_INTEGRITY_ERROR', 'Byte count, hash or manifest row count differs.')}
          ${rule('MALFORMED_JSON / DATA_QUALITY_ERROR', 'Artifact syntax, shape, semantics or references fail.')}
        </ul>
      </article>
      <article class="contract-card span-2">
        <p class="eyebrow">Bound artifacts</p><h2>Checksums and file sizes</h2>
        <div class="artifact-list">
          ${artifacts.map(([logical, artifact]) => `<div class="artifact-row"><strong>${escapeHtml(logical)}</strong><span>${escapeHtml(formatBytes(artifact.bytes))}</span><code title="${escapeHtml(artifact.sha256)}">sha256:${escapeHtml(artifact.sha256)}</code></div>`).join('')}
        </div>
      </article>
    </section>`;
}

function manifestStat(label, value) {
  return `<div class="manifest-stat"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function rule(title, description) {
  return `<li><span class="rule-check">✓</span><div><strong>${escapeHtml(title)}</strong><p>${escapeHtml(description)}</p></div></li>`;
}

function drawerValue(key, value) {
  if (value === '' || value === null || value === undefined) return '<span class="muted">Not published</span>';
  if (key.includes('source') || key.includes('url')) {
    const links = String(value).split(' | ');
    const rendered = links.map((item) => {
      const url = safeUrl(item);
      return url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(url)} ↗</a>` : escapeHtml(item);
    });
    return rendered.join('<br />');
  }
  if (key.includes('_usd_m')) return `${escapeHtml(formatMoney(value))} <span class="badge modeled">Modeled</span>`;
  if (key.endsWith('_pct')) return `${escapeHtml(value)}%`;
  return escapeHtml(value);
}

function humanize(key) {
  return key.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function openDrawer(row, config) {
  if (!row) return;
  state.lastFocus = document.activeElement;
  drawerKicker.textContent = config.name;
  drawerTitle.textContent = row[config.primary] || 'Record detail';
  drawerContent.innerHTML = `<dl>${Object.entries(row).map(([key, value]) => `<div class="detail-field"><dt>${escapeHtml(humanize(key))}</dt><dd>${drawerValue(key, value)}</dd></div>`).join('')}</dl>`;
  drawerBackdrop.hidden = false;
  drawer.setAttribute('aria-hidden', 'false');
  requestAnimationFrame(() => drawer.classList.add('is-open'));
  drawerClose.focus();
}

function closeDrawer() {
  if (!drawer.classList.contains('is-open')) return;
  drawer.classList.remove('is-open');
  drawer.setAttribute('aria-hidden', 'true');
  drawerBackdrop.hidden = true;
  state.lastFocus?.focus?.();
}

for (const button of document.querySelectorAll('.nav-item')) {
  button.addEventListener('click', () => {
    state.activeView = button.dataset.view;
    state.page = 1;
    state.filters = { search: '', market: '', category: '', tier: '' };
    document.body.classList.remove('nav-open');
    menuButton.setAttribute('aria-expanded', 'false');
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

menuButton.addEventListener('click', () => {
  const open = document.body.classList.toggle('nav-open');
  menuButton.setAttribute('aria-expanded', String(open));
});

drawerClose.addEventListener('click', closeDrawer);
drawerBackdrop.addEventListener('click', closeDrawer);
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeDrawer();
    document.body.classList.remove('nav-open');
    menuButton.setAttribute('aria-expanded', 'false');
  }
});

initialize();
