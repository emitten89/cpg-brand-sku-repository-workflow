import fs from 'node:fs/promises';
import path from 'node:path';

const rawDir = path.resolve('research/raw');
const names = (await fs.readdir(rawDir)).filter((name) => /^exa_.*\.txt$/i.test(name));

const officialHosts = [
  'colgate.com', 'colgatepalmolive.com', 'colgatepalmolive.ca', 'softsoap.com',
  'irishspring.com', 'tomsofmaine.com', 'hello-products.com', 'palmolive.com',
  'fabuloso.com', 'suavitel.com', 'ajax.com', 'ajaxcleaner.com', 'murphyoilsoap.com',
  'speedstick.com', 'ladyspeedstick.com', 'eltamd.com', 'pcaskin.com', 'filorga.com',
  'hillspet.com', 'hillspet.ca'
];

const genericHeadings = /^(all products|products?|product overview|about( us)?|related products?|ingredients?|how to use|directions|benefits?|faq|faqs|frequently asked questions|shop all|our products|best sellers|learn more|reviews?|you may also like|recommended for you|find a store|where to buy|contact us|explore|discover|oral care|personal care|home care|skin health|pet health|toothpaste|toothbrush(?:es)?|mouthwashes?(?: & rinses)?|hand soap|body wash|bar soap|deodorant|antiperspirant|dog food|cat food|science diet|prescription diet|.*ingredients|.*finder tool|history of .*|looking for .*|.*food for high quality nutrition|.*dog & cat food.*|.*which one to choose.*|.*how to .*|.*guide)$/i;
const productWords = /(toothpaste|toothbrush|mouthwash|rinse|floss|whiten|brush|deodorant|anti-?perspirant|soap|wash|cleanser|cleaner|softener|conditioner|sheets|wipes|spray|serum|cream|moistur|sunscreen|spf|toner|mask|peel|treatment|balm|gel|lotion|shampoo|food|diet|recipe|stew|entr[ée]e|treats?|nutrition|canned|dry|wet|liquid|bar|refill|kit|set)/i;

function clean(value='') {
  return value.replace(/\[([^\]]+)\]\([^)]+\)/g,'$1').replace(/\*+/g,'').replace(/\s+/g, ' ').replace(/\s*\|\s*(Colgate.*|Softsoap.*|Irish Spring.*|Hill.*|EltaMD.*|PCA SKIN.*|FILORGA.*)$/i, '').trim();
}

function hostIsOfficial(url) {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    return officialHosts.some((item) => host === item || host.endsWith(`.${item}`));
  } catch { return false; }
}

function marketFor(file, url) {
  const value = `${file} ${url}`.toLowerCase();
  if (value.includes('_ca.') || value.includes('/en-ca/') || value.includes('colgatepalmolive.ca') || value.includes('hillspet.ca')) return 'CA';
  return 'USA';
}

function brandFor(file, title, url) {
  const value = `${file} ${title} ${url}`.toLowerCase();
  const direct = `${title} ${url}`.toLowerCase();
  if (direct.includes('prescription diet') || /\/pd-[^/]+/.test(direct)) return "Hill's Prescription Diet";
  if (direct.includes('science diet') || /\/sd-[^/]+/.test(direct)) return "Hill's Science Diet";
  if (direct.includes('murphy')) return 'Murphy Oil Soap';
  if (direct.includes('ajax')) return 'Ajax';
  if (value.includes('exa_hills_sd_')) return "Hill's Science Diet";
  if (value.includes('exa_hills_pd_')) return "Hill's Prescription Diet";
  if (value.includes('prescription diet')) return "Hill's Prescription Diet";
  if (value.includes('science diet')) return "Hill's Science Diet";
  if (value.includes('healthy advantage')) return "Hill's Healthy Advantage";
  if (value.includes('lady speed')) return 'Lady Speed Stick';
  if (value.includes('murphy')) return 'Murphy Oil Soap';
  if (value.includes('fabuloso')) return 'Fabuloso';
  if (value.includes('suavitel')) return 'Suavitel';
  if (value.includes('fleecy')) return 'Fleecy';
  if (value.includes('ajax')) return 'Ajax';
  if (value.includes('palmolive')) return 'Palmolive';
  if (value.includes('softsoap') || value.includes('soft-soap')) return 'Softsoap';
  if (value.includes('irishspring') || value.includes('irish spring')) return 'Irish Spring';
  if (value.includes('speedstick') || value.includes('speed stick')) return 'Speed Stick';
  if (value.includes('tomsofmaine') || value.includes("tom's of maine") || value.includes('toms of maine')) return "Tom's of Maine";
  if (value.includes('hello-products') || /\bhello\b/.test(value)) return 'hello';
  if (value.includes('eltamd') || value.includes('elta md')) return 'EltaMD';
  if (value.includes('pcaskin') || value.includes('pca skin')) return 'PCA SKIN';
  if (value.includes('filorga')) return 'FILORGA';
  if (value.includes('hillspet') || value.includes("hill's")) return "Hill's";
  if (value.includes('colgate')) return 'Colgate';
  return '';
}

function classify(brand, name, url) {
  const value = `${name} ${url}`.toLowerCase();
  if (["Colgate", "Tom's of Maine", 'hello'].includes(brand)) {
    const sub = value.includes('toothbrush') || value.includes('brush') ? 'Toothbrushes'
      : value.includes('mouthwash') || value.includes('rinse') ? 'Mouthwash & rinses'
      : value.includes('floss') ? 'Floss & interdental'
      : value.includes('whiten') && !value.includes('toothpaste') ? 'Whitening treatments'
      : value.includes('prescription') || value.includes('prevident') || value.includes('periogard') ? 'Prescription oral care'
      : 'Toothpaste';
    return ['Oral Care', sub, sub];
  }
  if (brand.startsWith("Hill's")) {
    const animal = value.includes('cat') || value.includes('feline') ? 'Cat' : value.includes('dog') || value.includes('canine') ? 'Dog' : 'Dog & Cat';
    const format = /(stew|entr[ée]e|canned|wet|pouch)/.test(value) ? 'Wet food' : value.includes('treat') ? 'Treats' : 'Dry food';
    return ['Pet Nutrition', `${animal} food`, format];
  }
  if (['Palmolive','Fabuloso','Suavitel','Ajax','Murphy Oil Soap','Fleecy'].includes(brand)) {
    const sub = brand === 'Palmolive' ? 'Dish care' : brand === 'Suavitel' || brand === 'Fleecy' ? 'Fabric care' : 'Surface care';
    return ['Home Care', sub, sub];
  }
  if (['EltaMD','PCA SKIN','FILORGA'].includes(brand)) {
    const sub = /spf|sunscreen|uv /.test(value) ? 'Sun care' : /cleanser|wash/.test(value) ? 'Cleansers' : /serum|treatment|peel/.test(value) ? 'Treatments & serums' : /cream|moistur|lotion|balm/.test(value) ? 'Moisturizers' : /eye/.test(value) ? 'Eye care' : 'Premium skin care';
    return ['Skin Health', sub, sub];
  }
  const sub = /deodorant|anti-?perspirant/.test(value) || brand.includes('Speed Stick') ? 'Deodorant & antiperspirant' : /hand soap/.test(value) ? 'Hand soap' : /bar soap/.test(value) ? 'Bar soap' : 'Body wash';
  return ['Personal Care', sub, sub];
}

function packSizes(text) {
  const matches = text.match(/\b\d+(?:\.\d+)?\s*(?:fl\.?\s*oz|fluid ounces?|oz|ounces?|lb|lbs|pounds?|g|kg|ml|mL|l|L|ct|count|sheets?|pack|pk)\b/gi) || [];
  return [...new Set(matches.map((x) => x.replace(/\s+/g, ' ').trim()))].slice(0, 12).join(' | ');
}

function isListing(url, title) {
  try {
    const pathname = new URL(url).pathname.replace(/\/$/, '').toLowerCase();
    return /\/products(?:\/(toothpaste|toothbrush|mouthwash|whitening-products|kids-products|prescription-only-products|hand-soap|body-wash|seasonal))?$/.test(pathname)
      || /^(all )?.*products?$|catalog/i.test(title);
  } catch { return false; }
}

const candidates = [];
for (const file of names) {
  const text = await fs.readFile(path.join(rawDir, file), 'utf8');
  for (const block of text.split(/\n---\n/g)) {
    const title = clean(block.match(/^Title:\s*(.+)$/m)?.[1] || '');
    const url = (block.match(/^URL:\s*(.+)$/m)?.[1] || '').trim();
    if (!title || title === 'N/A' || !url || !hostIsOfficial(url)) continue;
    const market = marketFor(file, url);
    const baseBrand = brandFor(file, title, url);
    if (!baseBrand) continue;
    const listing = isListing(url, title);
    const headings = [...block.matchAll(/^#{2,3}\s+(.+)$/gm)].map((m) => clean(m[1]));
    const titleProductish = productWords.test(title) && !genericHeadings.test(title);
    const rows = [];
    if (titleProductish && !listing) rows.push({name:title, evidence:'Official product page'});
    if (listing) {
      for (const heading of headings) {
        if (heading.length < 5 || heading.length > 180 || genericHeadings.test(heading) || !productWords.test(heading)) continue;
        rows.push({name:heading, evidence:'Official catalog listing'});
      }
    }
    for (const row of rows) {
      const brand = brandFor(file, row.name, url) || baseBrand;
      const [category, subcategory, portfolio] = classify(brand, row.name, url);
      const body = block.replace(/^Title:.*$/m,'').replace(/^URL:.*$/m,'').replace(/^Published:.*$/m,'').replace(/^Author:.*$/m,'').replace(/^Highlights:.*$/m,'').replace(/\n\.\.\.\n/g,' ').replace(/^#+\s*/gm,'').replace(/\s+/g,' ').trim();
      candidates.push({
        market, brand, category, subcategory, product_portfolio:portfolio,
        product_name:row.name, product_description:body.slice(0, 500),
        pack_size_evidence:packSizes(block), product_sku:'', sku_type:'Not published on captured catalog page',
        source_url:url, source_type:row.evidence, evidence_tier:'Tier 1 - first party',
        source_file:file, captured_date:'2026-08-31'
      });
    }
  }
}

const seen = new Set();
const deduped = candidates.filter((row) => {
  const key = `${row.market}|${row.brand}|${row.product_name}`.toLowerCase().replace(/[^a-z0-9|]+/g,' ');
  if (seen.has(key)) return false;
  seen.add(key); return true;
}).sort((a,b)=>`${a.market}|${a.brand}|${a.product_name}`.localeCompare(`${b.market}|${b.brand}|${b.product_name}`));

await fs.writeFile(path.join(rawDir, 'official_catalog_candidates.json'), JSON.stringify({generated_at:new Date().toISOString(), count:deduped.length, records:deduped}, null, 2));
console.log(`Saved ${deduped.length} official catalog candidates from ${names.length} Exa evidence files.`);
const counts = Object.entries(deduped.reduce((acc,row)=>{const key=`${row.market} | ${row.brand}`;acc[key]=(acc[key]||0)+1;return acc;},{})).sort();
for (const [key,count] of counts) console.log(`${key}: ${count}`);

