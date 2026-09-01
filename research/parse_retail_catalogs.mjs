import fs from 'node:fs/promises';
import path from 'node:path';

const rawDir = path.resolve('research/raw');
const files = (await fs.readdir(rawDir)).filter((name) => /^exa_retail_.*\.json$/i.test(name));

function clean(value='') {
  return value.replace(/\s+/g, ' ').replace(/\s*[:|–-]\s*(Target|Walmart(?:\.ca)?|PetSmart|Petco|Chewy|Pet Valu|Well\.ca|London Drugs|Shoppers Drug Mart|Canadian Tire|Loblaws?|Dermstore|Ulta Beauty).*$/i,'').trim();
}

function brandFor(title='', url='') {
  const value = `${title} ${url}`.toLowerCase();
  if (/hill.?s.*prescription diet/.test(value)) return "Hill's Prescription Diet";
  if (/hill.?s.*science diet/.test(value)) return "Hill's Science Diet";
  if (/lady speed stick/.test(value)) return 'Lady Speed Stick';
  if (/murphy(?:'s)?(?: oil soap)?/.test(value)) return 'Murphy Oil Soap';
  if (/tom'?s of maine|tomsofmaine/.test(value)) return "Tom's of Maine";
  if (/pca skin|pcaskin/.test(value)) return 'PCA SKIN';
  if (/elta\s*md|eltamd/.test(value)) return 'EltaMD';
  if (/filorga/.test(value)) return 'FILORGA';
  if (/irish spring|irishspring/.test(value)) return 'Irish Spring';
  if (/speed stick|speedstick/.test(value)) return 'Speed Stick';
  if (/softsoap/.test(value)) return 'Softsoap';
  if (/palmolive/.test(value)) return 'Palmolive';
  if (/fabuloso/.test(value)) return 'Fabuloso';
  if (/suavitel/.test(value)) return 'Suavitel';
  if (/fleecy/.test(value)) return 'Fleecy';
  if (/\bajax\b/.test(value)) return 'Ajax';
  if (/\bhello\b/.test(value)) return 'hello';
  if (/\bcolgate\b/.test(value)) return 'Colgate';
  return '';
}

function marketFor(file, url='') {
  const value = `${file} ${url}`.toLowerCase();
  if (/\.ca(?:\/|$)|well\.ca|londondrugs\.com|canadiantire\.ca|petvalu\.ca/.test(url.toLowerCase())) return 'CA';
  if (/target\.com|walmart\.com|chewy\.com|petsmart\.com|petco\.com|dermstore\.com|ulta\.com|amazon\.com/.test(url.toLowerCase())) return 'USA';
  if (file.includes('ca_')) return 'CA';
  return 'USA';
}

function retailerFor(url='') {
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./,'');
    const map = [
      ['target.com','Target'],['walmart.ca','Walmart Canada'],['walmart.com','Walmart'],
      ['chewy.com','Chewy'],['petsmart.ca','PetSmart Canada'],['petsmart.com','PetSmart'],
      ['petco.com','Petco'],['petvalu.ca','Pet Valu'],['well.ca','Well.ca'],
      ['londondrugs.com','London Drugs'],['shoppersdrugmart.ca','Shoppers Drug Mart'],
      ['canadiantire.ca','Canadian Tire'],['loblaws.ca','Loblaws'],['realcanadiansuperstore.ca','Real Canadian Superstore'],
      ['dermstore.com','Dermstore'],['ulta.com','Ulta Beauty'],['amazon.com','Amazon'],['amazon.ca','Amazon Canada']
      ,['pcaskincanada.ca','PCA SKIN Canada (official)'],['filorga.com','FILORGA Canada (official)']
      ,['wedoskin.ca','WeDoSkin'],['dermshop.ca','Dermshop'],['yourskinsolution.ca','Your Skin Solution']
      ,['skinvault.ca','Skin Vault'],['beautysense.ca','BeautySense'],['sweetcare.com','SweetCare Canada']
    ];
    return map.find(([domain])=>host===domain || host.endsWith('.'+domain))?.[1] || host;
  } catch { return ''; }
}

function categoryFor(brand, title='') {
  const v=title.toLowerCase();
  if (['Colgate',"Tom's of Maine",'hello'].includes(brand)) {
    const sub=/toothbrush|brush head/.test(v)?'Toothbrushes':/mouthwash|rinse/.test(v)?'Mouthwash & rinses':/floss/.test(v)?'Floss & interdental':/whitening pen|whitening kit|whitening serum/.test(v)?'Whitening treatments':'Toothpaste';
    return ['Oral Care',sub,sub];
  }
  if (brand.startsWith("Hill's")) {
    const animal=/cat|feline/.test(v)?'Cat':/dog|canine/.test(v)?'Dog':'Dog & Cat';
    const format=/wet|stew|canned|pouch|loaf|entrée/.test(v)?'Wet food':/treat/.test(v)?'Treats':/fresh|single protein/.test(v)?'Fresh food':'Dry food';
    return ['Pet Nutrition',animal+' food',format];
  }
  if (['Palmolive','Fabuloso','Suavitel','Ajax','Murphy Oil Soap','Fleecy'].includes(brand)) {
    const sub=brand==='Palmolive'?'Dish care':['Suavitel','Fleecy'].includes(brand)?'Fabric care':'Surface care';
    return ['Home Care',sub,sub];
  }
  if (['EltaMD','PCA SKIN','FILORGA'].includes(brand)) {
    const sub=/spf|sunscreen|uv /.test(v)?'Sun care':/cleanser|wash/.test(v)?'Cleansers':/serum|treatment|peel/.test(v)?'Treatments & serums':/cream|moistur|lotion|balm/.test(v)?'Moisturizers':/eye/.test(v)?'Eye care':'Premium skin care';
    return ['Skin Health',sub,sub];
  }
  const sub=/deodorant|antiperspirant|speed stick/.test(v)?'Deodorant & antiperspirant':/hand soap/.test(v)?'Hand soap':/bar soap/.test(v)?'Bar soap':'Body wash';
  return ['Personal Care',sub,sub];
}

function packs(text='') {
  const matches = text.match(/\b\d+(?:\.\d+)?\s*(?:fl\.?\s*oz|fluid ounces?|oz|ounces?|lb|lbs|pounds?|g|kg|ml|mL|l|L|ct|count|sheets?|pack|pk|tablets?)\b/gi)||[];
  return [...new Set(matches.map(x=>x.replace(/\s+/g,' ').trim()))].slice(0,8).join(' | ');
}

function retailerSku(url='') {
  const patterns=[/\/-\/A-(\d+)/i,/\/ip\/(?:[^/]+\/)?(\d+)(?:[/?]|$)/i,/\/product\/(?:[^/]+\/)?(\d+)(?:[/?]|$)/i,/\/p\/(\d+)(?:[/?]|$)/i,/\/([a-z0-9_-]{8,})(?:[/?]|$)/i];
  for (const p of patterns) { const m=url.match(p); if(m) return m[1]; }
  return '';
}

const rows=[];
for (const file of files) {
  const parsed=JSON.parse(await fs.readFile(path.join(rawDir,file),'utf8'));
  const text=(parsed.content||[]).filter(x=>x.type==='text').map(x=>x.text).join('\n---\n');
  for (const block of text.split(/\n---\n/g)) {
    const rawTitle=block.match(/^Title:\s*(.+)$/m)?.[1]?.trim()||'';
    const url=block.match(/^URL:\s*(.+)$/m)?.[1]?.trim()||'';
    if (!rawTitle || !url) continue;
    let pathname='';
    try { pathname=new URL(url).pathname.toLowerCase().replace(/\/$/,''); } catch {}
    if (!pathname || /\/(collections?|pages?)\//.test(pathname) || /^(shop|boutique|authorized retailers?|.* canada \| #1|.*sunscreens? \|)/i.test(rawTitle)) continue;
    const brand=brandFor(rawTitle,url);
    if (!brand) continue;
    const retailer=retailerFor(url);
    const allowed=/^(Target|Walmart|Walmart Canada|Chewy|PetSmart|PetSmart Canada|Petco|Pet Valu|Well\.ca|London Drugs|Shoppers Drug Mart|Canadian Tire|Loblaws|Real Canadian Superstore|Dermstore|Ulta Beauty|Amazon|Amazon Canada|PCA SKIN Canada \(official\)|FILORGA Canada \(official\)|WeDoSkin|Dermshop|Your Skin Solution|Skin Vault|BeautySense|SweetCare Canada)$/;
    if (!allowed.test(retailer)) continue;
    const market=marketFor(file,url);
    const product_name=clean(rawTitle);
    const [category,subcategory,portfolio]=categoryFor(brand,product_name);
    rows.push({
      market,brand,category,subcategory,product_portfolio:portfolio,product_name,
      product_description:block.replace(/^Title:.*$/m,'').replace(/^URL:.*$/m,'').replace(/^Published:.*$/m,'').replace(/^Author:.*$/m,'').replace(/^Highlights:.*$/m,'').replace(/\n\.\.\.\n/g,' ').replace(/^#+\s*/gm,'').replace(/\s+/g,' ').trim().slice(0,500),
      pack_size_evidence:packs(block),product_sku:retailerSku(url),sku_type:'Retailer item ID',
      retailer,source_url:url,
      source_type:retailer.includes('(official)')?'Official Canada product page':'Current retailer product page',
      evidence_tier:retailer.includes('(official)')?'Tier 1 - first party':'Tier 2 - retailer',
      source_file:file,captured_date:'2026-08-31'
    });
  }
}

const seen=new Set();
const deduped=rows.filter(row=>{
  const key=`${row.market}|${row.retailer}|${row.product_sku||row.product_name}`.toLowerCase().replace(/[^a-z0-9|]+/g,' ');
  if(seen.has(key)) return false; seen.add(key); return true;
}).sort((a,b)=>`${a.market}|${a.brand}|${a.product_name}`.localeCompare(`${b.market}|${b.brand}|${b.product_name}`));

await fs.writeFile(path.join(rawDir,'retailer_catalog_candidates.json'),JSON.stringify({generated_at:new Date().toISOString(),count:deduped.length,records:deduped},null,2));
console.log(`Saved ${deduped.length} major-retailer catalog candidates from ${files.length} Exa evidence files.`);
const counts=Object.entries(deduped.reduce((a,r)=>{const k=`${r.market} | ${r.brand} | ${r.retailer}`;a[k]=(a[k]||0)+1;return a;},{})).sort();
for(const [key,count] of counts) console.log(`${key}: ${count}`);

