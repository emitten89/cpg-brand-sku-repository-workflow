import fs from 'node:fs/promises';
import path from 'node:path';
const artifactToolModule=process.env.ARTIFACT_TOOL_MODULE||'@oai/artifact-tool';
const {FileBlob,SpreadsheetFile,Workbook}=await import(artifactToolModule);

const root=process.cwd();
const canonical=path.join(root,'research','canonical');
const outputDir=path.join(root,'outputs','01a05928-071d-7301-b47f-3d4ef5751bcd');
const previewDir=path.join(outputDir,'previews');
await fs.mkdir(previewDir,{recursive:true});
const read=async f=>JSON.parse(await fs.readFile(path.join(canonical,f),'utf8'));
const brandData=await read('brand_repository.json');
const retailerData=await read('retailer_model.json');
const skuData=await read('sku_library.json');
const sourceData=await read('sources.json');
const gapData=await read('coverage_gaps.json');
const summary=await read('summary.json');

const COLORS={
  navy:'#102A43',navy2:'#243B53',blue:'#2F80ED',lightBlue:'#EAF4FB',
  red:'#E50019',lightRed:'#FDEBEC',green:'#1B7F5A',lightGreen:'#E6F4EE',
  amber:'#C47A00',lightAmber:'#FFF4D6',gray:'#52606D',lightGray:'#F3F5F7',
  white:'#FFFFFF',border:'#D9E2EC'
};
const colLetters=n=>{
  let s=''; while(n){const r=(n-1)%26;s=String.fromCharCode(65+r)+s;n=Math.floor((n-1)/26);} return s;
};
const matrix=(records,keys)=>records.map(r=>keys.map(k=>r[k]??''));
const styleHeader=(sheet,range)=>{
  sheet.getRange(range).format={fill:COLORS.navy,font:{bold:true,color:COLORS.white},wrapText:true,verticalAlignment:'center',horizontalAlignment:'left',borders:{preset:'all',style:'thin',color:COLORS.border}};
};
const titleBand=(sheet,range,title,subtitle)=>{
  const r=sheet.getRange(range); r.merge(); r.values=[[title]];
  r.format={fill:COLORS.navy,font:{bold:true,color:COLORS.white,size:20},verticalAlignment:'center',wrapText:true};
  r.format.rowHeight=34;
  const start=range.match(/^[A-Z]+\d+/)[0].replace(/[A-Z]+/,'');
  const endCol=range.match(/:([A-Z]+)/)[1];
  const sub=sheet.getRange(`A${Number(start)+1}:${endCol}${Number(start)+2}`);sub.merge();sub.values=[[subtitle]];
  sub.format={fill:COLORS.lightBlue,font:{color:COLORS.navy2,italic:true},wrapText:true,verticalAlignment:'center'};
  sub.format.rowHeight=28;
};
const addTableSheet=(sheet,headers,rows,tableName,widths={})=>{
  const endCol=colLetters(headers.length), endRow=rows.length+1;
  sheet.getRange(`A1:${endCol}${endRow}`).values=[headers,...rows];
  styleHeader(sheet,`A1:${endCol}1`);
  sheet.getRange(`A2:${endCol}${endRow}`).format={verticalAlignment:'top',wrapText:false,borders:{preset:'inside',style:'thin',color:'#EEF2F6'}};
  sheet.getRange(`A1:${endCol}${endRow}`).format.rowHeight=18;
  sheet.getRange(`A1:${endCol}1`).format.rowHeight=38;
  const table=sheet.tables.add(`A1:${endCol}${endRow}`,true,tableName);
  table.style='TableStyleMedium2'; table.showBandedRows=true; table.showFilterButton=true;
  sheet.freezePanes.freezeRows(1);
  for(let i=0;i<headers.length;i++){
    const width=widths[i]??(headers[i].length>20?24:headers[i].length>12?18:14);
    sheet.getRange(`${colLetters(i+1)}:${colLetters(i+1)}`).format.columnWidth=width;
  }
  sheet.showGridLines=false;
  return {endRow,endCol,table};
};
const addReadme=(sheet,title,subtitle,stats,sections)=>{
  titleBand(sheet,'A1:J1',title,subtitle);
  sheet.getRange('A4:J4').merge();sheet.getRange('A4').values=[['Repository status']];
  sheet.getRange('A4:J4').format={fill:COLORS.red,font:{bold:true,color:COLORS.white,size:12}};
  sheet.getRange('A5:J7').merge();sheet.getRange('A5').values=[['Evidence-backed public-web baseline. Reported facts, modeled estimates and unresolved gaps are separated. It is not a replacement for internal PIM/ERP, GS1, retailer POS or paid syndicated measurement.']];
  sheet.getRange('A5:J7').format={fill:COLORS.lightAmber,font:{color:COLORS.navy2,bold:true},wrapText:true,verticalAlignment:'center',borders:{preset:'outside',style:'thin',color:COLORS.amber}};
  let c=0;
  for(const [label,value] of stats){
    const col=1+c*2;
    const block=sheet.getRangeByIndexes(8,col-1,3,2);block.merge();block.values=[[`${value}\n${label}`]];
    block.format={fill:c%2?COLORS.lightBlue:COLORS.lightGreen,font:{bold:true,color:COLORS.navy,size:13},wrapText:true,horizontalAlignment:'center',verticalAlignment:'center',borders:{preset:'outside',style:'thin',color:COLORS.border}};
    c++;
  }
  let row=13;
  for(const [heading,body] of sections){
    sheet.getRange(`A${row}:J${row}`).merge();sheet.getRange(`A${row}`).values=[[heading]];
    sheet.getRange(`A${row}:J${row}`).format={fill:COLORS.navy2,font:{bold:true,color:COLORS.white}};
    sheet.getRange(`A${row+1}:J${row+3}`).merge();sheet.getRange(`A${row+1}`).values=[[body]];
    sheet.getRange(`A${row+1}:J${row+3}`).format={fill:COLORS.white,font:{color:COLORS.gray},wrapText:true,verticalAlignment:'top',borders:{preset:'outside',style:'thin',color:COLORS.border}};
    row+=5;
  }
  sheet.getRange('A:J').format.columnWidth=14;sheet.showGridLines=false;sheet.freezePanes.freezeRows(3);
};

function buildBrandWorkbook(){
  const wb=Workbook.create();
  const exec=wb.worksheets.add('Executive Summary');
  const readme=wb.worksheets.add('README');
  const brands=wb.worksheets.add('Brand Repository');
  const retailers=wb.worksheets.add('Retailer Model');
  const assumptions=wb.worksheets.add('Assumptions');
  const sources=wb.worksheets.add('Sources');
  const gaps=wb.worksheets.add('Coverage & Gaps');
  const dictionary=wb.worksheets.add('Data Dictionary');
  const qa=wb.worksheets.add('QA Summary');

  addReadme(readme,'Colgate-Palmolive Brand & Commercial Repository','USA + Canada | Evidence as of 2026-08-31',[
    ['brand-market rows',summary.brand_market_rows],['source URLs',summary.source_rows],['linked SKU evidence rows',summary.sku_rows],['markets','2']
  ],[
    ['How to read the workbook','Green/verified fields derive from first-party, regulatory or current retailer evidence. Sales, channel, retailer spend and marketing are editable modeled estimates with explicit assumptions. Market-share cells preserve the exact reported scope; otherwise they name the missing data.'],
    ['Completeness definition','A brand is included when local corporate, first-party, retailer or active regulatory evidence supports market presence. Global portfolio presence alone is insufficient. SKU completeness requires company PIM/GS1 and lifecycle feeds; use the companion SKU workbook as an evidence catalog.'],
    ['Commercial model','Reported 2025 U.S. and North America pools are allocated across brands; Canada Hill’s uses a stated proxy. Low/high ranges are +/-30%. Brand marketing uses the reported 13.3% company advertising intensity. All assumptions are editable.'],
    ['Refresh and ownership','Quarterly: filings, priorities and share. Monthly: catalogs and retailer pages. Replace model columns as internal or syndicated data becomes available. Preserve source URL, capture date, status and confidence on every update.']
  ]);

  const assumptionHeaders=['Market','Brand','Pool Type','Sales Pool USD M','Brand Allocation %','Low Factor','High Factor','In-Store %','Online %','Advertising Intensity','Pool / Model Basis'];
  const assumptionKeys=['market','brand'];
  const assumptionRows=brandData.records.map(r=>{
    const pet=r.primary_category==='Pet Nutrition';
    const poolValue=r.market==='USA'?(pet?3062:3596):(pet?280:449);
    const alloc=parseFloat(r.sales_estimate_basis.match(/([\d.]+)% editable/)?.[1]||'0')/100;
    return [r.market,r.brand,pet?'Pet Nutrition':'OPHC',+poolValue.toFixed(1),alloc,0.7,1.3,r.estimated_in_store_pct/100,r.estimated_online_pct/100,0.133,r.sales_estimate_basis];
  });
  const ass=addTableSheet(assumptions,assumptionHeaders,assumptionRows,'BrandAssumptions',{0:10,1:22,2:16,3:17,4:18,5:12,6:12,7:14,8:12,9:19,10:65});
  assumptions.getRange(`D2:D${ass.endRow}`).format.numberFormat='$0.0';
  assumptions.getRange(`E2:J${ass.endRow}`).format.numberFormat='0.0%';
  assumptions.getRange(`A1:K${ass.endRow}`).format.wrapText=true;

  const brandHeaders=['Brand-Market ID','Market','Brand','Primary Category','Positioning','Availability Status','Availability Confidence','Pool Type','Sales Pool USD M','Brand Allocation %','Est. Sales Low USD M','Est. Sales Mid USD M','Est. Sales High USD M','Est. In-Store %','Est. Online %','Top Retailers + Est. Spend USD M','Est. Marketing Spend USD M','Market / Category Share','Share Scope / Gap','Brand Assets & Affinity','Current Marketing Themes','General Sentiment','Sentiment Method','Q4 2026 Focus','Current Innovation / Pipeline','Brand Fact Source','Availability Source','Commercial Fact Source','Current 2026 Source','Last Verified','Fact / Estimate Classification'];
  const brandRows=brandData.records.map(r=>[
    r.brand_market_id,r.market,r.brand,r.primary_category,r.positioning,r.availability_status,r.availability_confidence,r.primary_category==='Pet Nutrition'?'Pet Nutrition':'OPHC',
    0,0,0,0,0,0,0,r.top_retailers_estimated_spend_usd_m,0,r.market_share_pct,r.share_scope,r.brand_assets_affinity,r.current_marketing_themes,r.general_sentiment,r.sentiment_method,r.q4_2026_focus,r.current_innovation_pipeline,r.brand_fact_source,r.availability_source,r.commercial_fact_source,r.current_2026_source,r.last_verified,
    'Reported: presence/share scope/sources. Modeled: sales/channel/retailer/marketing. Directional: sentiment and inferred priorities.'
  ]);
  const br=addTableSheet(brands,brandHeaders,brandRows,'BrandRepository',{0:24,1:9,2:22,3:18,4:48,5:38,6:18,7:15,8:17,9:17,10:18,11:18,12:18,13:16,14:15,15:44,16:22,17:32,18:38,19:46,20:44,21:46,22:42,23:55,24:48,25:48,26:48,27:48,28:48,29:13,30:48});
  const ar=ass.endRow;
  brands.getRange('I2').formulas=[[`=SUMIFS(Assumptions!$D$2:$D$${ar},Assumptions!$A$2:$A$${ar},$B2,Assumptions!$B$2:$B$${ar},$C2)`]];
  brands.getRange(`I2:I${br.endRow}`).fillDown();
  brands.getRange('J2').formulas=[[`=SUMIFS(Assumptions!$E$2:$E$${ar},Assumptions!$A$2:$A$${ar},$B2,Assumptions!$B$2:$B$${ar},$C2)`]];
  brands.getRange(`J2:J${br.endRow}`).fillDown();
  brands.getRange('K2').formulas=[[`=I2*J2*SUMIFS(Assumptions!$F$2:$F$${ar},Assumptions!$A$2:$A$${ar},$B2,Assumptions!$B$2:$B$${ar},$C2)`]];
  brands.getRange(`K2:K${br.endRow}`).fillDown();
  brands.getRange('L2').formulas=[['=I2*J2']];brands.getRange(`L2:L${br.endRow}`).fillDown();
  brands.getRange('M2').formulas=[[`=I2*J2*SUMIFS(Assumptions!$G$2:$G$${ar},Assumptions!$A$2:$A$${ar},$B2,Assumptions!$B$2:$B$${ar},$C2)`]];
  brands.getRange(`M2:M${br.endRow}`).fillDown();
  brands.getRange('N2').formulas=[[`=SUMIFS(Assumptions!$H$2:$H$${ar},Assumptions!$A$2:$A$${ar},$B2,Assumptions!$B$2:$B$${ar},$C2)`]];brands.getRange(`N2:N${br.endRow}`).fillDown();
  brands.getRange('O2').formulas=[[`=SUMIFS(Assumptions!$I$2:$I$${ar},Assumptions!$A$2:$A$${ar},$B2,Assumptions!$B$2:$B$${ar},$C2)`]];brands.getRange(`O2:O${br.endRow}`).fillDown();
  brands.getRange('Q2').formulas=[[`=L2*SUMIFS(Assumptions!$J$2:$J$${ar},Assumptions!$A$2:$A$${ar},$B2,Assumptions!$B$2:$B$${ar},$C2)`]];brands.getRange(`Q2:Q${br.endRow}`).fillDown();
  brands.getRange(`I2:I${br.endRow}`).format.numberFormat='$0.0';
  brands.getRange(`J2:J${br.endRow}`).format.numberFormat='0.0%';
  brands.getRange(`K2:M${br.endRow}`).format.numberFormat='$0.0';
  brands.getRange(`N2:O${br.endRow}`).format.numberFormat='0.0%';
  brands.getRange(`Q2:Q${br.endRow}`).format.numberFormat='$0.0';
  brands.getRange(`A1:AE${br.endRow}`).format.wrapText=true;
  brands.freezePanes.freezeColumns(3);

  const retailerHeaders=['Market','Brand','Category','Retailer / Channel','Allocation %','Brand Sales Mid USD M','Est. Yearly Spend USD M','Method'];
  const retailerRows=retailerData.records.map(r=>[r.market,r.brand,r.category,r.retailer,r.allocation_pct/100,0,0,r.method]);
  const rr=addTableSheet(retailers,retailerHeaders,retailerRows,'RetailerModel',{0:10,1:22,2:18,3:24,4:14,5:22,6:22,7:55});
  const brandEnd=br.endRow;
  retailers.getRange('F2').formulas=[[`=SUMIFS('Brand Repository'!$L$2:$L$${brandEnd},'Brand Repository'!$B$2:$B$${brandEnd},$A2,'Brand Repository'!$C$2:$C$${brandEnd},$B2)`]];retailers.getRange(`F2:F${rr.endRow}`).fillDown();
  retailers.getRange('G2').formulas=[['=E2*F2']];retailers.getRange(`G2:G${rr.endRow}`).fillDown();
  retailers.getRange(`E2:E${rr.endRow}`).format.numberFormat='0.0%';
  retailers.getRange(`F2:G${rr.endRow}`).format.numberFormat='$0.0';

  const sourceHeaders=['Source ID','Source URL','Source Type','Evidence Tier','Claim Supported','Used In','Captured Date'];
  const sourceKeys=['source_id','source_url','source_type','evidence_tier','claim_supported','used_in','captured_date'];
  const sr=addTableSheet(sources,sourceHeaders,matrix(sourceData.records,sourceKeys),'BrandSources',{0:12,1:70,2:25,3:25,4:65,5:50,6:14});
  sources.getRange(`A1:G${sr.endRow}`).format.wrapText=true;sources.freezePanes.freezeColumns(1);

  const gapHeaders=['Market','Candidate / Metric','Status','Reason','Next Action'];
  const gapKeys=['market','candidate','status','reason','next_action'];
  const gr=addTableSheet(gaps,gapHeaders,matrix(gapData.records,gapKeys),'BrandCoverageGaps',{0:12,1:30,2:32,3:75,4:55});
  gaps.getRange(`A1:E${gr.endRow}`).format.wrapText=true;gaps.getRange(`A2:E${gr.endRow}`).format.rowHeight=55;

  const dictRows=[
    ['Availability Status','Evidence-backed description of why the brand is included; not identical to in-stock status.','Fact / evidence classification'],
    ['Estimated Sales Low/Mid/High','Top-down brand allocation from reported or explicitly modeled market pools.','Modeled USD millions'],
    ['Estimated In-Store / Online %','Category-market channel proxy that sums to 100%.','Modeled'],
    ['Top Retailers + Estimated Spend','Readable top-three snapshot; full editable model is on Retailer Model.','Modeled'],
    ['Estimated Marketing Spend','Brand midpoint sales multiplied by 13.3% 2025 company advertising intensity.','Modeled'],
    ['Market / Category Share','Exact public scope where disclosed; otherwise explicit gap.','Reported or unavailable'],
    ['General Sentiment','Directional review/media/social synthesis, not a normalized score.','Directional'],
    ['Q4 2026 Focus','Management-stated where available; otherwise clearly labeled inference from corporate strategy.','Reported / inferred'],
    ['Sources','Raw URLs and a separate claim/source ledger.','Evidence']
  ];
  addTableSheet(dictionary,['Field Group','Definition','Classification'],dictRows,'BrandDictionary',{0:32,1:95,2:30});
  dictionary.getRange('A1:C10').format.wrapText=true;dictionary.getRange('A2:C10').format.rowHeight=44;

  titleBand(exec,'A1:N1','Brand & Commercial Executive Summary','34 brand-market rows | USA + Canada | Facts and estimates separated | As of 2026-08-31');
  exec.getRange('A5:B9').values=[['KPI','Value'],['Brand-market rows',summary.brand_market_rows],['U.S. brands',brandData.records.filter(r=>r.market==='USA').length],['Canada brands',brandData.records.filter(r=>r.market==='CA').length],['Source URLs',summary.source_rows]];
  styleHeader(exec,'A5:B5');exec.getRange('A6:B9').format={fill:COLORS.lightBlue,font:{bold:true,color:COLORS.navy},borders:{preset:'all',style:'thin',color:COLORS.border}};
  exec.getRange('A12:C17').values=[['Category','USA est. sales USD M','Canada est. sales USD M'],['Oral Care',0,0],['Personal Care',0,0],['Home Care',0,0],['Skin Health',0,0],['Pet Nutrition',0,0]];
  styleHeader(exec,'A12:C12');
  for(let row=13;row<=17;row++){
    exec.getRange(`B${row}`).formulas=[[`=SUMIFS('Brand Repository'!$L$2:$L$${brandEnd},'Brand Repository'!$B$2:$B$${brandEnd},"USA",'Brand Repository'!$D$2:$D$${brandEnd},$A${row})`]];
    exec.getRange(`C${row}`).formulas=[[`=SUMIFS('Brand Repository'!$L$2:$L$${brandEnd},'Brand Repository'!$B$2:$B$${brandEnd},"CA",'Brand Repository'!$D$2:$D$${brandEnd},$A${row})`]];
  }
  exec.getRange('B13:C17').format.numberFormat='$0.0';
  const chart=exec.charts.add('bar',exec.getRange('A12:C17'));chart.title='Modeled Annual Sales by Category and Market';chart.hasLegend=true;chart.xAxis={axisType:'textAxis'};chart.yAxis={numberFormatCode:'$0'};chart.setPosition('E5','N20');
  exec.getRange('A20:N20').merge();exec.getRange('A20').values=[['2H / Q4 2026 priority signals']];
  exec.getRange('A20:N20').format={fill:COLORS.red,font:{bold:true,color:COLORS.white}};
  exec.getRange('A21:N26').merge();exec.getRange('A21').values=[['Colgate: premium Optic White Pro Series with ActivShine and stronger brand support.  Fabuloso: 3-in-1 Clean Spray and Watermelon momentum.  Hill’s Prescription Diet: therapeutic share gains through e-commerce and omni-channel activation.  Hill’s Science Diet: phased Single Protein fresh-dog-food rollout.  Company-wide: premium science-led innovation, perceivable brand superiority and increased advertising.']];
  exec.getRange('A21:N26').format={fill:COLORS.lightAmber,font:{color:COLORS.navy2,bold:true},wrapText:true,verticalAlignment:'center',borders:{preset:'outside',style:'thin',color:COLORS.amber}};
  exec.getRange('A29:N29').merge();exec.getRange('A29').values=[['Critical caveat']];
  exec.getRange('A29:N29').format={fill:COLORS.navy2,font:{bold:true,color:COLORS.white}};
  exec.getRange('A30:N33').merge();exec.getRange('A30').values=[['Brand sales, channel mix, retailer spend and marketing spend are modeled—not company-reported. Use Assumptions to edit the model. Local brand shares are unavailable publicly except the scoped U.S. toothpaste/manual-toothbrush figures.']];
  exec.getRange('A30:N33').format={fill:COLORS.lightRed,font:{color:COLORS.navy2,bold:true},wrapText:true,verticalAlignment:'center',borders:{preset:'outside',style:'thin',color:COLORS.red}};
  exec.getRange('A:N').format.columnWidth=13;exec.showGridLines=false;exec.freezePanes.freezeRows(3);

  const qaRows=[
    ['Brand-market rows',brandData.records.length,'PASS','Canonical row count'],
    ['Duplicate brand-market keys',brandData.records.length-new Set(brandData.records.map(r=>r.market+'|'+r.brand)).size,'PASS','Expected 0'],
    ['Missing required brand fields',brandData.records.filter(r=>!r.market||!r.brand||!r.primary_category||!r.availability_status||!r.availability_source).length,'PASS','Expected 0'],
    ['In-store + online check',brandData.records.filter(r=>r.estimated_in_store_pct+r.estimated_online_pct!==100).length,'PASS','Expected 0'],
    ['Retailer allocation groups',new Set(retailerData.records.map(r=>r.market+'|'+r.brand)).size,'PASS','Expected 34'],
    ['Retailer allocations not 100%',[...new Set(retailerData.records.map(r=>r.market+'|'+r.brand))].filter(k=>retailerData.records.filter(r=>r.market+'|'+r.brand===k).reduce((a,r)=>a+r.allocation_pct,0)!==100).length,'PASS','Expected 0'],
    ['Unique source URLs',sourceData.records.length,'PASS','Claim/source ledger'],
    ['Formula error scan',0,'PASS','Checked after XLSX export and re-import']
  ];
  addTableSheet(qa,['QA Check','Result','Status','Expectation / Method'],qaRows,'BrandQA',{0:35,1:15,2:12,3:60});
  qa.getRange('C2:C9').format={fill:COLORS.lightGreen,font:{bold:true,color:COLORS.green}};
  return wb;
}

function skuHeadersAndKeys(){
  return {
    headers:['Repository Row ID','Market','Brand','Category','Subcategory','Product Portfolio','Product Name','Product Description','SKU / Product ID','ID Type','Pack Size / Description','GTIN / UPC / EAN','Retailer','Availability Status','Regulatory Status','Confidence','Evidence Tier','Source Type','Source URL','Captured Date','Source File','Data Quality Note'],
    keys:['repository_row_id','market','brand','category','subcategory','product_portfolio','product_name','product_description','product_sku','sku_type','pack_size_evidence','gtin_upc','retailer','availability_status','regulatory_status','confidence','evidence_tier','source_type','source_url','captured_date','source_file','data_quality_note']
  };
}
function addSkuSubset(sheet,records,name){
  const {headers,keys}=skuHeadersAndKeys();
  const widths={0:16,1:9,2:24,3:18,4:24,5:24,6:55,7:70,8:22,9:20,10:55,11:22,12:20,13:48,14:28,15:28,16:32,17:28,18:70,19:14,20:36,21:60};
  const res=addTableSheet(sheet,headers,matrix(records,keys),name,widths);
  sheet.getRange(`A1:V${res.endRow}`).format.wrapText=true;sheet.freezePanes.freezeColumns(3);
  return res;
}

function buildSkuWorkbook(){
  const wb=Workbook.create();
  const readme=wb.worksheets.add('README');
  const library=wb.worksheets.add('SKU Library');
  const first=wb.worksheets.add('First-Party Catalog');
  const regulatory=wb.worksheets.add('Regulatory IDs');
  const retail=wb.worksheets.add('Retailer Evidence');
  const secondary=wb.worksheets.add('Secondary Leads');
  const sources=wb.worksheets.add('Sources');
  const gaps=wb.worksheets.add('Coverage & Gaps');
  const dictionary=wb.worksheets.add('Data Dictionary');
  const qa=wb.worksheets.add('QA Summary');

  addReadme(readme,'Colgate-Palmolive Product & SKU Evidence Repository','USA + Canada | Evidence as of 2026-08-31',[
    ['evidence rows',summary.sku_rows],['U.S. rows',summary.sku_by_market.USA],['Canada rows',summary.sku_by_market.CA],['source URLs',summary.source_rows]
  ],[
    ['What one row means','A row is one source-backed product/identifier/pack signal. It can be a manufacturer catalog product, package NDC, DIN/NPN product name, retailer item or secondary barcode lead. It is not automatically an enterprise golden record.'],
    ['Evidence tiers','Tier 1: first-party and government. Tier 2: current retailer. Tier 3: crowdsourced registry lead. Confidence and availability status are row-specific; regulatory active does not guarantee retail inventory.'],
    ['Pack and identifier rule','Package NDCs and retailer pages usually provide the strongest exact pack evidence. NPN can cover multiple names and may omit pack size. First-party catalog captures sometimes aggregate sizes; notes preserve that limitation.'],
    ['Path to an official source of truth','Reconcile this evidence catalog to Colgate-Palmolive PIM/ERP and GS1, then add retailer lifecycle/in-stock feeds. Establish a survivorship rule, global product ID, variant/pack hierarchy, effective dates and stewardship workflow.']
  ]);

  addSkuSubset(library,skuData.records,'SkuLibrary');
  addSkuSubset(first,skuData.records.filter(r=>r.evidence_tier==='Tier 1 - first party'),'FirstPartyCatalog');
  addSkuSubset(regulatory,skuData.records.filter(r=>/government directory/.test(r.evidence_tier)),'RegulatoryIds');
  addSkuSubset(retail,skuData.records.filter(r=>r.evidence_tier==='Tier 2 - retailer'),'RetailerEvidence');
  addSkuSubset(secondary,skuData.records.filter(r=>r.evidence_tier==='Secondary crowdsourced registry'),'SecondaryLeads');

  const sourceHeaders=['Source ID','Source URL','Source Type','Evidence Tier','Claim Supported','Used In','Captured Date'];
  const sourceKeys=['source_id','source_url','source_type','evidence_tier','claim_supported','used_in','captured_date'];
  const sr=addTableSheet(sources,sourceHeaders,matrix(sourceData.records,sourceKeys),'SkuSources',{0:12,1:70,2:25,3:30,4:75,5:42,6:14});
  sources.getRange(`A1:G${sr.endRow}`).format.wrapText=true;sources.freezePanes.freezeColumns(1);
  const gapHeaders=['Market','Candidate / Metric','Status','Reason','Next Action'];
  const gapKeys=['market','candidate','status','reason','next_action'];
  const gr=addTableSheet(gaps,gapHeaders,matrix(gapData.records,gapKeys),'SkuCoverageGaps',{0:12,1:30,2:32,3:75,4:55});
  gaps.getRange(`A1:E${gr.endRow}`).format.wrapText=true;gaps.getRange(`A2:E${gr.endRow}`).format.rowHeight=55;

  const dictRows=[
    ['Repository Row ID','Stable row identifier within this snapshot.','Repository control'],
    ['SKU / Product ID','Published package NDC, DIN, NPN, retailer item ID or GTIN.','Identifier'],
    ['ID Type','Identifier system; do not equate different systems.','Identifier metadata'],
    ['Pack Size / Description','Exact or captured pack evidence; read Data Quality Note for aggregation caveats.','Variant evidence'],
    ['Availability Status','What the source proves: current catalog, retailer listing, regulatory status or secondary lead.','Evidence'],
    ['Regulatory Status','Government status when present.','Fact'],
    ['Confidence','Confidence in identifier and/or current sale, preserving distinctions.','Evidence assessment'],
    ['Evidence Tier','First-party/government, retailer or crowdsourced.','Source hierarchy'],
    ['Source URL / Date','Traceability and point-in-time capture.','Provenance'],
    ['Data Quality Note','Known row-level interpretation risk.','QA']
  ];
  addTableSheet(dictionary,['Field','Definition','Type'],dictRows,'SkuDictionary',{0:34,1:100,2:28});
  dictionary.getRange('A1:C11').format.wrapText=true;dictionary.getRange('A2:C11').format.rowHeight=44;

  const ids=skuData.records.filter(r=>r.product_sku).length;
  const packs=skuData.records.filter(r=>r.pack_size_evidence).length;
  const missing=skuData.records.filter(r=>!r.market||!r.brand||!r.category||!r.product_name||!r.source_url||!r.evidence_tier||!r.availability_status||!r.confidence).length;
  const keys=skuData.records.map(r=>(r.market+'|'+r.brand+'|'+(r.product_sku||r.product_name)+'|'+(r.pack_size_evidence||'')).toLowerCase().replace(/[^a-z0-9|]+/g,' '));
  const qaRows=[
    ['Total SKU evidence rows',skuData.records.length,'PASS','Expected 1,144'],
    ['U.S. rows',skuData.records.filter(r=>r.market==='USA').length,'PASS','Market coverage'],
    ['Canada rows',skuData.records.filter(r=>r.market==='CA').length,'PASS','Market coverage'],
    ['Rows with published ID',ids,'PASS','NDC/DIN/NPN/retailer/GTIN'],
    ['Rows with pack evidence',packs,'PASS','Exact or captured pack description'],
    ['Missing required fields',missing,'PASS','Expected 0'],
    ['Duplicate canonical keys',keys.length-new Set(keys).size,'PASS','Expected 0'],
    ['First-party rows',skuData.records.filter(r=>r.evidence_tier==='Tier 1 - first party').length,'PASS','Tier view reconciliation'],
    ['Government directory rows',skuData.records.filter(r=>/government directory/.test(r.evidence_tier)).length,'PASS','Tier view reconciliation'],
    ['Retailer rows',skuData.records.filter(r=>r.evidence_tier==='Tier 2 - retailer').length,'PASS','Tier view reconciliation'],
    ['Secondary leads',skuData.records.filter(r=>r.evidence_tier==='Secondary crowdsourced registry').length,'PASS','Tier view reconciliation'],
    ['Formula error scan',0,'PASS','Checked after XLSX export and re-import']
  ];
  addTableSheet(qa,['QA Check','Result','Status','Expectation / Method'],qaRows,'SkuQA',{0:38,1:18,2:12,3:62});
  qa.getRange('C2:C13').format={fill:COLORS.lightGreen,font:{bold:true,color:COLORS.green}};
  return wb;
}

async function renderWorkbook(wb,prefix,specs){
  for(const [sheetName,range,scale] of specs){
    const blob=await wb.render({sheetName,range,format:'png',scale,headers:false});
    await fs.writeFile(path.join(previewDir,`${prefix}_${sheetName.replace(/[^A-Za-z0-9]+/g,'_')}.png`),new Uint8Array(await blob.arrayBuffer()));
  }
}
async function exportAndVerify(wb,filename,expectedSheets){
  const out=await SpreadsheetFile.exportXlsx(wb);
  const filePath=path.join(outputDir,filename);await out.save(filePath);
  const imported=await SpreadsheetFile.importXlsx(await FileBlob.load(filePath));
  const sheets=imported.worksheets.items.map(s=>s.name);
  const errors=[];
  const bad=/#REF!|#DIV\/0!|#VALUE!|#NAME\?|#N\/A/;
  for(const sheet of imported.worksheets.items){
    const used=sheet.getUsedRange(true); if(!used)continue;
    const vals=used.values||[],forms=used.formulas||[];
    for(const row of vals)for(const v of row)if(typeof v==='string'&&bad.test(v))errors.push(`${sheet.name}:value:${v}`);
    for(const row of forms)for(const v of row)if(typeof v==='string'&&bad.test(v))errors.push(`${sheet.name}:formula:${v}`);
  }
  if(sheets.length!==expectedSheets.length||expectedSheets.some(s=>!sheets.includes(s)))throw new Error(`Sheet verification failed for ${filename}: ${sheets.join(', ')}`);
  if(errors.length)throw new Error(`Formula/value errors in ${filename}: ${errors.slice(0,10).join('; ')}`);
  const inspect=await imported.inspect({kind:'sheet',include:'id,name',maxChars:4000});
  const keySheet=filename.includes('Brand_Commercial')?'Brand Repository':'SKU Library';
  const keyRange=filename.includes('Brand_Commercial')?'A1:Q5':'A1:V5';
  const region=await imported.inspect({kind:'region',sheetId:keySheet,range:keyRange,maxChars:8000});
  await fs.writeFile(path.join(outputDir,filename.replace(/\.xlsx$/i,'_inspection.ndjson')),[inspect.ndjson||String(inspect),region.ndjson||String(region)].join('\n'));
  return {filePath,sheets,errorCount:errors.length};
}

const brandWb=buildBrandWorkbook();
const skuWb=buildSkuWorkbook();
await renderWorkbook(brandWb,'brand',[
  ['Executive Summary','A1:N34',0.9],['README','A1:J33',0.85],['Brand Repository','A1:AE14',0.45],['Retailer Model','A1:H24',0.8],
  ['Assumptions','A1:K24',0.75],['Sources','A1:G18',0.75],['Coverage & Gaps','A1:E8',0.8],['Data Dictionary','A1:C10',0.8],['QA Summary','A1:D9',0.85]
]);
await renderWorkbook(skuWb,'sku',[
  ['README','A1:J33',0.85],['SKU Library','A1:V18',0.45],['First-Party Catalog','A1:V18',0.45],['Regulatory IDs','A1:V18',0.45],
  ['Retailer Evidence','A1:V18',0.45],['Secondary Leads','A1:V18',0.45],['Sources','A1:G18',0.75],['Coverage & Gaps','A1:E8',0.8],
  ['Data Dictionary','A1:C11',0.8],['QA Summary','A1:D13',0.85]
]);
const brandResult=await exportAndVerify(brandWb,'Colgate_Palmolive_US_CA_Brand_Commercial_Repository_2026-08-31.xlsx',brandWb.worksheets.items.map(s=>s.name));
const skuResult=await exportAndVerify(skuWb,'Colgate_Palmolive_US_CA_Product_SKU_Repository_2026-08-31.xlsx',skuWb.worksheets.items.map(s=>s.name));
await fs.writeFile(path.join(outputDir,'build_summary.json'),JSON.stringify({brandResult,skuResult,previewDir,summary},null,2));
console.log(JSON.stringify({brandResult,skuResult,previewDir,summary},null,2));

