import path from 'node:path';
const artifactToolModule=process.env.ARTIFACT_TOOL_MODULE||'@oai/artifact-tool';
const {FileBlob,SpreadsheetFile}=await import(artifactToolModule);
const out=path.resolve('outputs/01a05928-071d-7301-b47f-3d4ef5751bcd');
const files=[
  'Colgate_Palmolive_US_CA_Brand_Commercial_Repository_2026-08-31.xlsx',
  'Colgate_Palmolive_US_CA_Product_SKU_Repository_2026-08-31.xlsx'
];
const bad=/#REF!|#DIV\/0!|#VALUE!|#NAME\?|#N\/A/;
for(const file of files){
  const wb=await SpreadsheetFile.importXlsx(await FileBlob.load(path.join(out,file)));
  let errors=0,cells=0,formulas=0;
  for(const sheet of wb.worksheets.items){
    const used=sheet.getUsedRange(true); if(!used)continue;
    for(const row of used.values||[])for(const v of row){cells++;if(typeof v==='string'&&bad.test(v))errors++;}
    for(const row of used.formulas||[])for(const v of row){if(typeof v==='string'&&v.startsWith('=')){formulas++;if(bad.test(v))errors++;}}
  }
  const result={file,sheets:wb.worksheets.items.map(s=>s.name),cells,formulas,errors};
  if(file.includes('Brand_Commercial')){
    const s=wb.worksheets.getItem('Brand Repository');
    result.brandRows=s.getUsedRange(true).values.length-1;
    result.firstBrand={id:s.getRange('A2').values[0][0],salesMid:s.getRange('L2').values[0][0],inStore:s.getRange('N2').values[0][0],online:s.getRange('O2').values[0][0]};
  }else{
    const s=wb.worksheets.getItem('SKU Library');
    result.skuRows=s.getUsedRange(true).values.length-1;
    result.firstSku={id:s.getRange('A2').values[0][0],market:s.getRange('B2').values[0][0],brand:s.getRange('C2').values[0][0]};
  }
  if(errors)throw new Error(JSON.stringify(result));
  console.log(JSON.stringify(result));
}

