import fs from 'node:fs/promises';
import path from 'node:path';
import { PIPELINE_VERSION, publishCanonicalSnapshot } from '../workflow/canonical-contract.mjs';

const rawDir=path.resolve('research/raw');
const canonicalDir=path.resolve('research/canonical');
const read=async name=>JSON.parse(await fs.readFile(path.join(rawDir,name),'utf8'));

const official=(await read('official_catalog_candidates.json')).records;
const retail=(await read('retailer_catalog_candidates.json')).records;
const fda=(await read('openfda_colgate_ndc.json')).records;
const dpd=(await read('health_canada_dpd.json')).records;
const npn=(await read('health_canada_npn.json')).records;
const registry=(await read('public_registry_products.json')).records;

const URLs={
  tenK:'https://investor.colgatepalmolive.com/static-files/c4a7e20c-1aa8-4bb1-bd4b-74755c99688f',
  q2:'https://investor.colgatepalmolive.com/news-releases/news-release-details/colgate-announces-2nd-quarter-2026-results',
  q2remarks:'https://investor.colgatepalmolive.com/static-files/ca92df4c-8d85-4df1-bf67-c2b76b8b36fe',
  usBrands:'https://www.colgatepalmolive.com/en-us/brands',
  caBrands:'https://www.colgatepalmolive.ca/en-ca/brands',
  innovation:'https://www.colgatepalmolive.com/en-us/innovation',
  fabuloso10x:'https://www.colgatepalmolive.com/en-us/news/how-fabuloso-10x-is-shrinking-its-footprint-not-its-performance'
};

const metadata={
  'Colgate':{
    category:'Oral Care',positioning:'Mass-premium oral-health leader spanning prevention, whitening, sensitivity, kids and professional oral care.',
    assets:'Red-and-white masterbrand; dentist/science authority; Total, Optic White, Max Fresh and Sensitive benefit platforms; strong shelf block.',
    themes:'Whole-mouth prevention, premium whitening, clinical efficacy, healthy smiles and family routines.',
    sentiment:'Mixed-to-positive directional signal: high awareness and trust; taste, price and sensitivity experiences vary by product.',
    q4:'Management-stated North America priority: improved execution, increased brand support and premium innovation, led by Optic White Pro Series with ActivShine Technology.',
    innovation:'Optic White Pro Series with ActivShine; Total Active Prevention system; premium science-led innovation and recyclable packaging.',
    source:URLs.q2remarks
  },
  'hello':{
    category:'Oral Care',positioning:'Friendly, design-led oral care emphasizing enjoyable flavors, ingredient transparency and accessible natural-positioned choices.',
    assets:'Lowercase hello name; colorful playful packs; flavor/texture novelty; ingredient and sustainability cues.',
    themes:'Make brushing fun, approachable ingredients, kids/family routines, foam and flavor experimentation.',
    sentiment:'Positive among design- and ingredient-conscious shoppers; flavor, foam and fluoride preferences are polarizing.',
    q4:'Inferred from corporate strategy: use premium innovation and omni-channel demand generation to scale differentiated oral-care formats.',
    innovation:'Whipped foaming toothpaste, kids flavors, tablets and alternative-format oral care.',
    source:'https://www.hello-products.com/'
  },
  "Tom's of Maine":{
    category:'Oral Care',positioning:'Natural-positioned personal and oral care built on ingredient transparency, responsibility and community giving.',
    assets:'Maine provenance; natural ingredients; simple pack system; purpose/community credentials.',
    themes:'Naturally sourced ingredients, responsible packaging, community impact and everyday family wellness.',
    sentiment:'Mixed-to-positive: loyal natural-care users value ingredient choices; efficacy, texture and flavor generate mixed reviews.',
    q4:'Inferred: defend natural-care differentiation while supporting science-led claims and omni-channel visibility.',
    innovation:'Fluoride and fluoride-free variants, natural whitening/sensitivity and plastic-reduction initiatives.',
    source:'https://www.tomsofmaine.com/'
  },
  "Hill's Science Diet":{
    category:'Pet Nutrition',positioning:'Science-led everyday pet nutrition formulated by veterinarians and nutritionists for life-stage and wellness needs.',
    assets:'Veterinary/science credibility; breed, age and condition navigation; feeding guidance; premium specialist distribution.',
    themes:'Biology-based nutrition, measurable pet health, life-stage personalization and vet trust.',
    sentiment:'Positive-to-mixed: strong vet trust and perceived outcomes; premium price, palatability and ingredient preferences drive criticism.',
    q4:'Management-stated: phased rollout of Science Diet Single Protein dog food in the fresh segment, supported by omni-channel demand generation.',
    innovation:'Science Diet Single Protein fresh dog food; precision nutrition by life stage and health need.',
    source:URLs.q2remarks
  },
  "Hill's Prescription Diet":{
    category:'Pet Nutrition',positioning:'Veterinary therapeutic nutrition designed to support diagnosed health conditions in dogs and cats.',
    assets:'Vet authorization; condition-first navigation; clinical research; therapeutic sub-lines and strong e-commerce replenishment.',
    themes:'Clinically supported nutrition, vet partnership, condition management and quality of life.',
    sentiment:'Positive-to-mixed: health outcomes and vet confidence are strengths; prescription access, price and palatability are common frictions.',
    q4:'Management-stated: build on therapeutic-category share gains with e-commerce and omni-channel activations.',
    innovation:'ONC Care cancer-support nutrition and continued condition-specific therapeutic formulas.',
    source:URLs.q2remarks
  },
  'Palmolive':{
    category:'Home Care',positioning:'Mainstream dish care balancing grease-cutting performance, hand feel, scent and value.',
    assets:'Green masterbrand; strength/gentleness duality; scent and concentrated-formula variants.',
    themes:'Tough on grease, gentle experience, value and sustainable packaging/formulas.',
    sentiment:'Mixed-to-positive: value and cleaning performance are strengths; scent and skin feel vary by user.',
    q4:'Inferred: support core dish-care superiority through improved execution, visible claims and omni-channel availability.',
    innovation:'Concentrated dish liquids, antibacterial and eco-positioned formula/packaging variants.',
    source:'https://www.palmolive.com/en-us/products'
  },
  'Fleecy':{
    category:'Home Care',positioning:'Canadian fabric-care brand focused on softness, freshness and scent-led laundry routines.',
    assets:'Softness imagery; scent architecture; liquid, sheet and rinse formats; Canadian familiarity.',
    themes:'Long-lasting freshness, soft fabrics, scent choice and easy laundry routines.',
    sentiment:'Mixed-to-positive: softness and fragrance drive loyalty; fragrance intensity is polarizing.',
    q4:'Inferred: maintain Canadian distribution and fragrance-led innovation within the company-wide omni-channel program.',
    innovation:'Scent variants, dryer sheets and rinse/fabric-conditioning formats.',
    source:URLs.caBrands
  },
  'Softsoap':{
    category:'Personal Care',positioning:'Accessible hand and body cleansing with recognizable scents, moisturization and refill/value formats.',
    assets:'Clear pump bottles; scent/color coding; refill architecture; kitchen/bath ubiquity.',
    themes:'Clean hands, skin feel, scent discovery, family hygiene and value.',
    sentiment:'Mixed-to-positive: convenience, value and scent perform well; dryness and fragrance sensitivity recur.',
    q4:'Inferred: improve shelf and digital execution while highlighting formula and pack innovation.',
    innovation:'Antibacterial and sensitive-skin variants; refill and moisturizing formats.',
    source:'https://www.softsoap.com/'
  },
  'Irish Spring':{
    category:'Personal Care',positioning:'High-recognition men’s cleansing centered on strong freshness, deodorizing and value.',
    assets:'Green color, outdoors/freshness world, distinctive scent, bar and body-wash formats.',
    themes:'Long-lasting freshness, active masculinity, odor control and high-energy humor.',
    sentiment:'Mixed-to-positive: strong clean/fresh signal and value; scent strength and dryness are polarizing.',
    q4:'Inferred: defend freshness equity with strong retail execution and scent/format innovation.',
    innovation:'Moisture and exfoliating variants, body wash and multi-bar value packs.',
    source:'https://www.irishspring.com/'
  },
  'Speed Stick':{
    category:'Personal Care',positioning:'Value-oriented men’s deodorant and antiperspirant offering straightforward odor and sweat protection.',
    assets:'Bold masculine colors; benefit-first naming; deodorant/antiperspirant choice; classic scent equities.',
    themes:'All-day protection, active confidence, simple value and classic freshness.',
    sentiment:'Mixed-to-positive: affordability and protection are strengths; scent, residue and skin compatibility vary.',
    q4:'Inferred: renew distribution and digital discoverability behind clear protection claims and value.',
    innovation:'Aluminum-free deodorant, Power protection and scent/format extensions.',
    source:'https://www.speedstick.com/'
  },
  'Lady Speed Stick':{
    category:'Personal Care',positioning:'Accessible women’s antiperspirant/deodorant built on reliable protection and scent choice.',
    assets:'Benefit-first pack hierarchy; bright feminine colors; invisible/clinical and scent variants.',
    themes:'Confidence, invisible protection, freshness and everyday value.',
    sentiment:'Mixed-to-positive: protection and price resonate; scent and white-mark experiences vary.',
    q4:'Inferred: strengthen distribution and relevance through benefit clarity and omni-channel support.',
    innovation:'Invisible protection, clinical-strength and gel/solid variants.',
    source:'https://www.ladyspeedstick.com/'
  },
  'Fabuloso':{
    category:'Home Care',positioning:'Value-forward multi-purpose cleaning with high-impact fragrance, color and culturally resonant personality.',
    assets:'Purple masterbrand cue; vibrant liquids; fragrance-led naming; large value sizes and social-ready energy.',
    themes:'Joyful cleaning, long-lasting fragrance, versatility, value and bold color.',
    sentiment:'Mixed-to-positive: fragrance, value and versatility drive advocacy; scent intensity and dilution/use questions polarize.',
    q4:'Management-stated North America priority: support momentum behind 3-in-1 Clean Spray and Watermelon cleaners with increased brand support.',
    innovation:'3-in-1 Clean Spray, Watermelon cleaners and concentrated 10x platform/test-and-learn.',
    source:URLs.q2remarks
  },
  'Suavitel':{
    category:'Home Care',positioning:'Fabric care centered on softness, family care and long-lasting fragrance.',
    assets:'Heart/family warmth; blue/pink scent coding; fragrance variants; Hispanic-market affinity.',
    themes:'Care for family, irresistible softness, lasting scent and laundry ritual.',
    sentiment:'Mixed-to-positive: softness and fragrance are key strengths; scent intensity and sensitivity concerns recur.',
    q4:'Inferred: support fragrance-led core and adjacent fabric refresh formats through omni-channel execution.',
    innovation:'Shed Shield and Complete fabric refresher spray; concentrated softener variants.',
    source:'https://www.suavitel.com/'
  },
  'Ajax':{
    category:'Home Care',positioning:'Value cleaning focused on powerful grease removal across dish and hard-surface jobs.',
    assets:'Bold red/orange branding; “stronger than grease” style claims; large value formats; dish and cleanser heritage.',
    themes:'Power, degreasing, speed, affordability and no-nonsense efficacy.',
    sentiment:'Mixed-to-positive: cleaning strength and price are praised; fragrance and harshness perceptions vary.',
    q4:'Inferred: emphasize cleaning superiority, value packs and improved retail/digital execution.',
    innovation:'Ultra concentrated dish liquids and multi-surface/all-purpose cleaner variants.',
    source:'https://www.ajax.com/en-us/products'
  },
  'Murphy Oil Soap':{
    category:'Home Care',positioning:'Heritage wood and multi-surface cleaner associated with gentle care and a recognizable oil-soap experience.',
    assets:'Heritage branding; wood-care expertise; concentrated liquid; recognizable scent.',
    themes:'Care for wood, trusted routines, gentle cleaning and home preservation.',
    sentiment:'Mixed-to-positive: loyal users cite wood-care trust and scent; residue/dilution experiences vary.',
    q4:'Inferred: protect heritage equity while improving digital education on dilution, surfaces and usage.',
    innovation:'Concentrated and ready-to-use wood/multi-surface formats.',
    source:'https://www.murphyoilsoap.com/'
  },
  'EltaMD':{
    category:'Skin Health',positioning:'Dermatologist-recommended premium sun and skin care emphasizing broad-spectrum protection and skin compatibility.',
    assets:'Clinical white packaging; dermatologist channel; UV Clear franchise; mineral/hybrid and tinted choices.',
    themes:'Daily sun safety, sensitive/acne-prone skin, inclusive tinting and dermatology credibility.',
    sentiment:'Positive-to-mixed: wearability and dermatologist trust are strong; price, tint match, pilling and white cast vary.',
    q4:'Inferred: scale science-led premium innovation, deep-tint inclusion and professional/omni-channel demand.',
    innovation:'Deep Tint sunscreen for darker skin tones and specialized UV protection formats.',
    source:'https://www.colgatepalmolive.com/en-us/innovation/skin-health'
  },
  'PCA SKIN':{
    category:'Skin Health',positioning:'Professional, science-led skin care spanning corrective treatments, peels, serums and daily regimens.',
    assets:'Professional education; clinical regimen architecture; ingredient-led claims; treatment-room affinity.',
    themes:'Visible correction, professional protocols, ingredient science and personalized regimens.',
    sentiment:'Positive-to-mixed: efficacy/professional trust are strengths; premium price and irritation/adjustment periods recur.',
    q4:'Inferred: build premium science-led innovation through professional and e-commerce education.',
    innovation:'High-potency anti-aging serum and targeted retinol/brightening systems.',
    source:'https://www.pcaskin.com/'
  },
  'FILORGA':{
    category:'Skin Health',positioning:'French premium anti-aging skin care translating aesthetic-medicine cues into topical routines.',
    assets:'French laboratory heritage; NCEF platform; silver/black premium packs; treatment-inspired names.',
    themes:'Visible anti-aging correction, sensorial luxury, aesthetic expertise and multi-correction.',
    sentiment:'Positive-to-mixed: texture and premium experience attract users; price, fragrance and results expectations vary.',
    q4:'Inferred: prioritize premium innovation and omni-channel demand while maintaining selective positioning.',
    innovation:'Time-Filler 5XP, NCEF Revitalize/Reverse and multi-correction product systems.',
    source:'https://ca.filorga.com/'
  }
};

const included={
  USA:['Ajax','Colgate','EltaMD','Fabuloso','FILORGA','hello',"Hill's Prescription Diet","Hill's Science Diet",'Irish Spring','Lady Speed Stick','Murphy Oil Soap','Palmolive','PCA SKIN','Softsoap','Speed Stick','Suavitel',"Tom's of Maine"],
  CA:['Colgate','EltaMD','Fabuloso','FILORGA','Fleecy','hello',"Hill's Prescription Diet","Hill's Science Diet",'Irish Spring','Lady Speed Stick','Murphy Oil Soap','Palmolive','PCA SKIN','Softsoap','Speed Stick','Suavitel',"Tom's of Maine"]
};
const includedSet=new Set(Object.entries(included).flatMap(([m,bs])=>bs.map(b=>m+'|'+b)));

const pool={
  USA:{OPHC:3596,Pet:3062,pool_source:'2025 10-K reported U.S. net sales'},
  CA:{OPHC:449,Pet:280,pool_source:'OPHC = reported North America less reported U.S.; Pet is a population/category proxy'}
};
const weights={
  USA:{'Colgate':36,'hello':2.2,"Tom's of Maine":4.8,'Softsoap':8,'Irish Spring':6,'Speed Stick':2,'Lady Speed Stick':1,'Palmolive':6,'Fabuloso':8,'Suavitel':3,'Ajax':3,'Murphy Oil Soap':1.5,'EltaMD':7,'PCA SKIN':3.5,'FILORGA':2,"Hill's Science Diet":65,"Hill's Prescription Diet":35},
  CA:{'Colgate':38,'hello':1.5,"Tom's of Maine":3,'Softsoap':7,'Irish Spring':5,'Speed Stick':1.5,'Lady Speed Stick':0.8,'Palmolive':9,'Fleecy':6,'Fabuloso':2,'Suavitel':1,'Murphy Oil Soap':0.5,'EltaMD':4,'PCA SKIN':2,'FILORGA':1.5,"Hill's Science Diet":65,"Hill's Prescription Diet":35}
};
const channel={
  USA:{'Oral Care':[80,20],'Personal Care':[85,15],'Home Care':[82,18],'Skin Health':[35,65],'Pet Nutrition':[45,55]},
  CA:{'Oral Care':[82,18],'Personal Care':[87,13],'Home Care':[85,15],'Skin Health':[40,60],'Pet Nutrition':[50,50]}
};
const retailerShares={
  USA:{
    mass:[['Walmart',26],['Amazon',14],['Target',12],['Club retailers',8],['Drug/grocery',14],['Other',26]],
    pet:[['Chewy',25],['Veterinary clinics',20],['PetSmart',18],['Petco',12],['Amazon',10],['Other',15]],
    skin:[['Professional/DTC',45],['Dermstore/Ulta',15],['Amazon',15],['Clinics',15],['Other',10]]
  },
  CA:{
    mass:[['Walmart Canada',22],['Amazon Canada',12],['Loblaw/Shoppers',12],['Costco',10],['Specialty/grocery',14],['Other',30]],
    pet:[['PetSmart Canada',25],['Pet Valu',20],['Veterinary clinics',20],['Amazon Canada',15],['Other',20]],
    skin:[['Professional/DTC',45],['Specialist e-commerce',30],['Amazon Canada',10],['Other',15]]
  }
};

function evidenceFor(market,brand){
  const first=official.find(r=>r.market===market&&r.brand===brand);
  const store=retail.find(r=>r.market===market&&r.brand===brand);
  if(first&&store)return {status:'Verified first-party catalog + current retailer evidence',source:first.source_url+' | '+store.source_url,confidence:'High'};
  if(first)return {status:'Verified first-party/local catalog evidence',source:first.source_url,confidence:'High'};
  if(store)return {status:'Verified current retailer evidence',source:store.source_url,confidence:'Medium-High'};
  const government=(market==='USA'?fda.some(r=>normalizeFdaBrand(r.brand_name)===brand):dpd.some(r=>normalizeBrand(r.brand_name)===brand)||npn.some(r=>normalizeBrand(r.product_name)===brand));
  if(government)return {status:'Regulatory-active; retail availability not independently verified',source:market==='USA'?(awaitedFdaUrl):'https://health-products.canada.ca/',confidence:'Medium'};
  return {status:'Corporate portfolio evidence; SKU coverage gap',source:market==='CA'?URLs.caBrands:URLs.usBrands,confidence:'Medium'};
}
const awaitedFdaUrl='https://api.fda.gov/drug/ndc.json?search=labeler_name:%22Colgate-Palmolive%20Company%22&limit=1000';

function normalizeBrand(name=''){
  const v=name.toLowerCase();
  if(v.includes('lady speed')||v.includes('ladies speed'))return 'Lady Speed Stick';
  if(v.includes('speed stick'))return 'Speed Stick';
  if(v.includes('softsoap'))return 'Softsoap';
  if(v.includes('irish spring'))return 'Irish Spring';
  if(v.includes('palmolive'))return 'Palmolive';
  if(v.includes('fabuloso'))return 'Fabuloso';
  if(v.includes('suavitel'))return 'Suavitel';
  if(v.includes('fleecy'))return 'Fleecy';
  if(v.includes('ajax'))return 'Ajax';
  if(v.includes('murphy'))return 'Murphy Oil Soap';
  if(v.includes('hello'))return 'hello';
  if(v.includes("tom's")||v.includes('toms '))return "Tom's of Maine";
  if(v.includes('colgate')||v.includes('prevident')||v.includes('periogard')||v.includes('optic white')||v.includes('ultra brite'))return 'Colgate';
  return '';
}
function normalizeFdaBrand(name=''){
  const v=name.toLowerCase();
  if(v.includes('lady speed')||v.includes('ladies speed'))return 'Lady Speed Stick';
  if(v.includes('speed stick'))return 'Speed Stick';
  if(v.includes('softsoap'))return 'Softsoap';
  if(v.includes('hello'))return 'hello';
  if(v.includes('toms'))return "Tom's of Maine";
  if(v.includes('colgate')||v.includes('prevident')||v.includes('periogard')||v.includes('optic')||v.includes('total')||v.includes('ultra brite')||/^tp\b/.test(v))return 'Colgate';
  return '';
}
function inferOralSub(name=''){
  const v=name.toLowerCase();
  if(v.includes('mouthwash')||v.includes('rinse')||v.includes('periogard'))return 'Mouthwash & rinses';
  if(v.includes('varnish'))return 'Professional varnish';
  if(v.includes('toothbrush'))return 'Toothbrushes';
  if(v.includes('prevident')||v.includes('prescription'))return 'Prescription oral care';
  return 'Toothpaste';
}

const brandRows=[];
const retailerModel=[];
for(const market of ['USA','CA']){
  for(const brand of included[market]){
    const meta=metadata[brand];
    const pet=meta.category==='Pet Nutrition';
    const base=pool[market][pet?'Pet':'OPHC'];
    const wt=weights[market][brand]||0;
    const mid=+(base*wt/100).toFixed(1);
    const low=+(mid*0.7).toFixed(1), high=+(mid*1.3).toFixed(1);
    const [storePct,onlinePct]=channel[market][meta.category];
    const route=meta.category==='Pet Nutrition'?'pet':meta.category==='Skin Health'?'skin':'mass';
    const shares=retailerShares[market][route];
    const top=shares.slice(0,3).map(([r,s])=>`${r}: ~$ ${(mid*s/100).toFixed(1)}M`).join('; ');
    const ev=await evidenceFor(market,brand);
    brandRows.push({
      brand_market_id:`${market}-${brand.replace(/[^A-Za-z0-9]+/g,'-').replace(/^-|-$/g,'').toUpperCase()}`,
      market,brand,parent_company:'Colgate-Palmolive',primary_category:meta.category,
      positioning:meta.positioning,availability_status:ev.status,availability_confidence:ev.confidence,
      estimated_yearly_sales_low_usd_m:low,estimated_yearly_sales_mid_usd_m:mid,estimated_yearly_sales_high_usd_m:high,
      sales_estimate_basis:`${pool[market].pool_source}; ${wt}% editable brand allocation; range +/-30%. Not brand-reported.`,
      estimated_in_store_pct:storePct,estimated_online_pct:onlinePct,
      channel_estimate_basis:'Editable category-market proxy; public filings do not disclose brand channel mix.',
      top_retailers_estimated_spend_usd_m:top,
      estimated_marketing_spend_usd_m:+(mid*0.133).toFixed(1),
      marketing_estimate_basis:'Estimated brand sales x 13.3% 2025 company advertising intensity; not brand-reported.',
      market_share_pct:brand==='Colgate'&&market==='USA'?'31.9 toothpaste; 43.4 manual toothbrush':'Not publicly disclosed at brand-market-category level',
      share_scope:brand==='Colgate'&&market==='USA'?'U.S. YTD value share through latest available period at 2Q 2026':'Paid Nielsen/NIQ/Circana or internal data required',
      brand_assets_affinity:meta.assets,current_marketing_themes:meta.themes,
      general_sentiment:meta.sentiment,sentiment_method:'Directional synthesis of official messaging and current retailer/review signals; not a normalized score.',
      q4_2026_focus:meta.q4,current_innovation_pipeline:meta.innovation,
      brand_fact_source:meta.source,availability_source:ev.source,commercial_fact_source:URLs.tenK,
      current_2026_source:URLs.q2remarks,last_verified:'2026-08-31'
    });
    for(const [retailer,share] of shares){
      retailerModel.push({market,brand,category:meta.category,retailer,allocation_pct:share,brand_sales_mid_usd_m:mid,estimated_yearly_spend_usd_m:+(mid*share/100).toFixed(1),method:'Modeled allocation; editable assumption, not retailer-reported.'});
    }
  }
}

const skuRows=[];
const push=row=>{if(includedSet.has(row.market+'|'+row.brand))skuRows.push(row)};
for(const r of official){
  if(r.brand==="Hill's")continue;
  push({...r,availability_status:'Current first-party catalog/page captured',confidence:'High',regulatory_status:'',retailer:'',gtin_upc:'',data_quality_note:r.pack_size_evidence?'Pack evidence captured; confirm exact variant association where multiple sizes appear.':'Official product page did not publish a machine-readable pack size in capture.'});
}
for(const r of retail){
  push({...r,availability_status:'Current retailer product page captured',confidence:r.evidence_tier.includes('first party')?'High':'Medium-High',regulatory_status:'',gtin_upc:'',data_quality_note:'Retailer listing is a point-in-time availability signal; assortment can vary by location.'});
}
for(const r of fda){
  const brand=normalizeFdaBrand(r.brand_name); if(!brand)continue;
  const sub=inferOralSub(r.brand_name+' '+r.generic_name);
  const cat=['Softsoap','Speed Stick','Lady Speed Stick'].includes(brand)?'Personal Care':'Oral Care';
  const sc=cat==='Personal Care'?(brand.includes('Speed')?'Deodorant & antiperspirant':'Hand soap'):sub;
  push({market:'USA',brand,category:cat,subcategory:sc,product_portfolio:sc,product_name:r.brand_name,product_description:`${r.generic_name}; ${r.dosage_form}`,pack_size_evidence:r.package_description,product_sku:r.package_ndc,sku_type:'Package NDC',retailer:'',gtin_upc:'',source_url:r.source_url,source_type:'openFDA NDC Directory',evidence_tier:r.evidence_tier,source_file:'openfda_colgate_ndc.json',captured_date:'2026-08-31',availability_status:'Regulatory listing active as of 2026-08-31; distribution not guaranteed',confidence:'Medium-High for identifier; Medium for current retail sale',regulatory_status:`Active; listing expires ${r.listing_expiration_date}`,data_quality_note:'NDC status is regulatory, not proof of retailer inventory.'});
}
for(const r of dpd.filter(x=>['Marketed','Approved'].includes(x.status))){
  const brand=normalizeBrand(r.brand_name); if(!brand)continue;
  const sub=inferOralSub(r.brand_name);
  push({market:'CA',brand,category:brand==='Softsoap'?'Personal Care':'Oral Care',subcategory:brand==='Softsoap'?'Hand soap':sub,product_portfolio:brand==='Softsoap'?'Hand soap':sub,product_name:r.brand_name,product_description:'Health Canada Drug Product Database record',pack_size_evidence:'',product_sku:r.din,sku_type:'DIN',retailer:'',gtin_upc:'',source_url:r.source_url,source_type:'Health Canada DPD',evidence_tier:r.evidence_tier,source_file:'health_canada_dpd.json',captured_date:'2026-08-31',availability_status:r.status==='Marketed'?'Health Canada status: Marketed':'Health Canada status: Approved; marketed sale not confirmed',confidence:r.status==='Marketed'?'High':'Medium',regulatory_status:r.status,data_quality_note:'DIN is a regulatory identifier; pack size was not provided by the captured endpoint.'});
}
const marketedNpns=new Set(['80128874','02248410','80065338','80032257','80023029','80000133','80035527','80011366','80019067']);
for(const r of npn.filter(x=>marketedNpns.has(x.npn))){
  const brand=normalizeBrand(r.product_name); if(!brand)continue;
  const sub=inferOralSub(r.product_name);
  push({market:'CA',brand,category:'Oral Care',subcategory:sub,product_portfolio:sub,product_name:r.product_name,product_description:`Health Canada licensed natural health product; ${r.dosage_form}`,pack_size_evidence:'',product_sku:r.npn,sku_type:'NPN',retailer:'',gtin_upc:'',source_url:r.source_url,source_type:'Health Canada LNHPD',evidence_tier:r.evidence_tier,source_file:'health_canada_npn.json + exa_health_canada_npn_fetch.txt',captured_date:'2026-08-31',availability_status:'Health Canada licence page: Marketed / Active',confidence:'High for licence status; Medium for current retail assortment',regulatory_status:'Marketed / Active',data_quality_note:'One NPN may cover multiple marketed product names and does not encode pack size.'});
}
for(const r of registry){
  const registryBrand=normalizeBrand(r.product_name||'')||r.canonical_brand;
  if(!includedSet.has(r.market+'|'+registryBrand))continue;
  const meta=metadata[registryBrand];
  const category=meta?.category||'';
  const sub=category==='Oral Care'?inferOralSub((r.product_name||'')+' '+(r.categories||'')):category==='Pet Nutrition'?'Pet food':category==='Home Care'?(registryBrand==='Palmolive'?'Dish care':['Suavitel','Fleecy'].includes(registryBrand)?'Fabric care':'Surface care'):category==='Skin Health'?'Skin care':registryBrand.includes('Speed')?'Deodorant & antiperspirant':'Personal cleansing';
  push({market:r.market,brand:registryBrand,category,subcategory:sub,product_portfolio:sub,product_name:r.product_name||r.generic_name||'(unnamed registry item)',product_description:r.categories||r.generic_name||'',pack_size_evidence:r.quantity||'',product_sku:r.code,sku_type:'GTIN/UPC/EAN',retailer:r.stores||'',gtin_upc:r.code,source_url:r.registry_product_url,source_type:r.registry,evidence_tier:r.evidence_tier,source_file:'public_registry_products.json',captured_date:'2026-08-31',availability_status:'Secondary public registry lead; current sale requires corroboration',confidence:'Low-Medium',regulatory_status:'',data_quality_note:'Crowdsourced registry; retain as a barcode/pack lead, not official proof.'});
}

const key=row=>`${row.market}|${row.brand}|${row.product_sku||row.product_name}|${row.pack_size_evidence||''}`.toLowerCase().replace(/[^a-z0-9|]+/g,' ');
const tierRank={'Tier 1 - first party':1,'Tier 1 - U.S. government directory':1,'Tier 1 - Canadian government directory':1,'Tier 2 - major retailer':2,'Tier 2 - retailer':2,'Secondary crowdsourced registry':3};
skuRows.sort((a,b)=>(tierRank[a.evidence_tier]||9)-(tierRank[b.evidence_tier]||9)||`${a.market}|${a.brand}|${a.product_name}`.localeCompare(`${b.market}|${b.brand}|${b.product_name}`));
const seen=new Set();
const deduped=skuRows.filter(r=>{const k=key(r);if(seen.has(k))return false;seen.add(k);return true;});
deduped.forEach((r,i)=>r.repository_row_id='SKU-'+String(i+1).padStart(5,'0'));

const sourceMap=new Map();
function addSource(url,type,tier,claim,usedIn){
  if(!url)return;
  for(const part of String(url).split(' | ')){
    const u=part.trim(); if(!u)continue;
    const existing=sourceMap.get(u)||{source_id:'',source_url:u,source_type:type,evidence_tier:tier,claim_supported:claim,used_in:usedIn,captured_date:'2026-08-31'};
    existing.used_in=[...new Set((existing.used_in+'; '+usedIn).split('; ').filter(Boolean))].join('; ');
    sourceMap.set(u,existing);
  }
}
addSource(URLs.tenK,'SEC-filed annual report','Tier 1 - corporate filing','2025 sales pools, advertising intensity, customer concentration, U.S. and North America sales','Brand Repository; Assumptions');
addSource(URLs.q2,'Official earnings release','Tier 1 - corporate filing','2Q 2026 results, global and U.S. share, guidance and advertising direction','Brand Repository; Q4 Focus');
addSource(URLs.q2remarks,'Official management remarks','Tier 1 - corporate filing','North America performance, Colgate/Fabuloso priorities, Hill’s growth and Single Protein rollout','Brand Repository; Q4 Focus');
addSource(URLs.usBrands,'Official corporate brand page','Tier 1 - first party','Corporate portfolio candidates','Coverage & Gaps');
addSource(URLs.caBrands,'Official Canada corporate brand page','Tier 1 - first party','Explicit Canada portfolio list','Coverage & Gaps');
for(const r of brandRows){addSource(r.brand_fact_source,'Official brand/corporate page','Tier 1 - first party','Positioning, assets and innovation themes',`Brand Repository: ${r.market} ${r.brand}`);addSource(r.availability_source,'Availability evidence',r.availability_confidence==='High'?'Tier 1':'Tier 2','Market presence',`Brand Repository: ${r.market} ${r.brand}`);}
for(const r of deduped)addSource(r.source_url,r.source_type,r.evidence_tier,`${r.market} ${r.brand}: ${r.product_name}`,'SKU Library');
const sources=[...sourceMap.values()].sort((a,b)=>a.source_url.localeCompare(b.source_url));
sources.forEach((r,i)=>r.source_id='SRC-'+String(i+1).padStart(4,'0'));

const gapRows=[
  {market:'USA',candidate:'Fleecy',status:'Not included in current-sold brand table',reason:'Appears on global corporate portfolio but no U.S.-local catalog, current retailer or regulatory evidence was captured.',next_action:'Verify with syndicated retailer/GS1 data or local distributor list.'},
  {market:'CA',candidate:'Ajax',status:'Not included in current-sold brand table',reason:'Global/U.S. evidence exists, but Canada corporate page omits Ajax and no current Canadian retailer evidence was captured.',next_action:'Verify with Canadian retailer crawl or GS1 Canada.'},
  {market:'USA',candidate:'Protex and other global brands',status:'Excluded from current-sold table',reason:'Global portfolio or regulatory traces alone do not establish current U.S. consumer retail distribution.',next_action:'Require current local retailer/first-party evidence.'},
  {market:'CA',candidate:'Additional global brands',status:'Excluded from current-sold table',reason:'No current Canada-local first-party or retailer evidence captured.',next_action:'Require current local retailer/first-party evidence.'},
  {market:'USA/CA',candidate:'Private-label products',status:'Out of brand scope',reason:'The project requests Colgate-Palmolive brands; the company also exited private-label pet food.',next_action:'Add only if future scope includes manufacturer/private-label relationships.'},
  {market:'USA/CA',candidate:'Exact retail sales, retailer spend, channel mix and local share',status:'Modeled or unavailable',reason:'Not publicly disclosed at brand-market level; company market-share data has channel coverage limitations.',next_action:'Replace model fields with NIQ/Circana/Nielsen, retailer POS, Numerator, Profitero or internal finance data.'}
];

const summary={
  generated_at:new Date().toISOString(),as_of:'2026-08-31',
  brand_market_rows:brandRows.length,sku_rows:deduped.length,source_rows:sources.length,retailer_model_rows:retailerModel.length,
  sku_by_market:deduped.reduce((a,r)=>(a[r.market]=(a[r.market]||0)+1,a),{}),
  sku_by_tier:deduped.reduce((a,r)=>(a[r.evidence_tier]=(a[r.evidence_tier]||0)+1,a),{}),
  limitations:[
    'Public-web baseline, not a paid syndicated or internal commercial source of truth.',
    'Brand sales, channel mix, retailer spend and brand-level marketing are modeled and explicitly labeled.',
    'Regulatory-active identifiers do not guarantee current retail inventory.',
    'Retailer pages are point-in-time and location-dependent; crowdsourced registries are leads only.',
    'Pack size is exact where supplied by regulatory/retailer evidence; first-party catalog captures may omit or aggregate variants.'
  ]
};

const manifest=await publishCanonicalSnapshot({
  directory:canonicalDir,
  metadata:{
    pipelineVersion:PIPELINE_VERSION,
    generatedAt:summary.generated_at,
    client:{slug:'colgate-palmolive',name:'Colgate-Palmolive'},
    markets:Object.keys(included).sort()
  },
  artifacts:{
    brand_repository:{summary,records:brandRows},
    retailer_model:{records:retailerModel},
    sku_library:{summary,records:deduped},
    sources:{records:sources},
    coverage_gaps:{records:gapRows},
    summary
  }
});
console.log(JSON.stringify({summary,manifest},null,2));

