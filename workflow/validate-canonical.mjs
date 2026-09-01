import fs from 'node:fs/promises';
import path from 'node:path';

const dir=path.resolve(process.argv[2]||'research/canonical');
const read=async name=>JSON.parse(await fs.readFile(path.join(dir,name),'utf8'));
const brands=(await read('brand_repository.json')).records;
const skus=(await read('sku_library.json')).records;
const retailers=(await read('retailer_model.json')).records;
const sources=(await read('sources.json')).records;
const requiredSku=['market','brand','category','product_name','source_url','evidence_tier','availability_status','confidence'];
const errors=[];
const brandKeys=brands.map(r=>r.market+'|'+r.brand);
if(new Set(brandKeys).size!==brandKeys.length)errors.push('Duplicate brand-market keys');
for(const r of brands){
  if((r.estimated_in_store_pct??0)+(r.estimated_online_pct??0)!==100)errors.push(`Channel mix does not sum to 100: ${r.market} ${r.brand}`);
  if(!(r.estimated_yearly_sales_low_usd_m<=r.estimated_yearly_sales_mid_usd_m&&r.estimated_yearly_sales_mid_usd_m<=r.estimated_yearly_sales_high_usd_m))errors.push(`Invalid sales range: ${r.market} ${r.brand}`);
}
for(const r of skus)for(const field of requiredSku)if(!r[field])errors.push(`Missing ${field}: ${r.repository_row_id||'unknown row'}`);
const skuKeys=skus.map(r=>(r.market+'|'+r.brand+'|'+(r.product_sku||r.product_name)+'|'+(r.pack_size_evidence||'')).toLowerCase().replace(/[^a-z0-9|]+/g,' '));
if(new Set(skuKeys).size!==skuKeys.length)errors.push('Duplicate canonical SKU keys');
for(const key of new Set(retailers.map(r=>r.market+'|'+r.brand))){
  const total=retailers.filter(r=>r.market+'|'+r.brand===key).reduce((sum,r)=>sum+r.allocation_pct,0);
  if(total!==100)errors.push(`Retailer allocation is ${total}%: ${key}`);
}
if(new Set(sources.map(r=>r.source_url)).size!==sources.length)errors.push('Duplicate source URLs');
const result={directory:dir,brandRows:brands.length,skuRows:skus.length,retailerRows:retailers.length,sourceRows:sources.length,errors};
console.log(JSON.stringify(result,null,2));
if(errors.length)process.exit(1);

