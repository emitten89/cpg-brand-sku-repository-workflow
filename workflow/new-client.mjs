import fs from 'node:fs/promises';
import path from 'node:path';

const args=Object.fromEntries(process.argv.slice(2).reduce((pairs,item,index,array)=>{
  if(item.startsWith('--'))pairs.push([item.slice(2),array[index+1]]);
  return pairs;
},[]));
const slug=args.slug;
const company=args.company;
const markets=(args.markets||'USA,CA').split(',').map(x=>x.trim()).filter(Boolean);
if(!slug||!company||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)){
  console.error('Usage: node workflow/new-client.mjs --slug acme-cpg --company "Acme CPG" --markets USA,CA');
  process.exit(2);
}
const root=path.resolve('clients',slug);
for(const dir of ['raw','canonical','outputs'])await fs.mkdir(path.join(root,dir),{recursive:true});
const config={
  $schema:'../../workflow/client-config.schema.json',
  slug,company,markets,
  asOf:new Date().toISOString().slice(0,10),
  inclusionRule:'Include a brand-market only when local corporate, first-party, current retailer, regulatory, syndicated or internal evidence supports current market presence.',
  sourceClasses:['corporate-filing','first-party-catalog','government-directory','retailer','secondary-registry'],
  requiredSkuFields:['market','brand','category','product_name','source_url','evidence_tier','availability_status','confidence']
};
const manifest={
  company,markets,
  sources:[
    {id:'corporate-portfolio',type:'first-party',status:'todo',url:''},
    {id:'regulatory',type:'government',status:'todo',url:''},
    {id:'retailer',type:'retailer',status:'todo',url:''},
    {id:'syndicated-or-internal',type:'commercial',status:'todo',url:''}
  ]
};
const adapter=`import fs from 'node:fs/promises';
import path from 'node:path';
import { PIPELINE_VERSION, publishCanonicalSnapshot } from '../../workflow/canonical-contract.mjs';

// Client adapter for ${company}. Transform reviewed raw captures into the
// canonical brand_repository, retailer_model, sku_library, sources,
// coverage_gaps and summary objects documented in the root README. Publish
// them with publishCanonicalSnapshot so files are staged, manifested,
// validated and promoted as one unit.
const clientRoot=path.resolve('clients','${slug}');
const config=JSON.parse(await fs.readFile(path.join(clientRoot,'config.json'),'utf8'));
// await publishCanonicalSnapshot({
//   directory:path.join(clientRoot,'canonical'),
//   metadata:{pipelineVersion:PIPELINE_VERSION,client:{slug:config.slug,name:config.company},markets:config.markets},
//   artifacts:{brand_repository,retailer_model,sku_library,sources,coverage_gaps,summary}
// });
throw new Error('Implement the ${company} source adapters and normalization rules before running this client.');
`;
await fs.writeFile(path.join(root,'config.json'),JSON.stringify(config,null,2)+'\n');
await fs.writeFile(path.join(root,'source-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
await fs.writeFile(path.join(root,'build-canonical.mjs'),adapter);
console.log(JSON.stringify({clientRoot:root,files:['config.json','source-manifest.json','build-canonical.mjs']},null,2));

