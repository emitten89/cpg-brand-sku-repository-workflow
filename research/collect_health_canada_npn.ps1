param(
  [string]$OutputPath = '.\research\raw\health_canada_npn.json'
)

$ErrorActionPreference = 'Stop'
$headers = @{ 'User-Agent' = 'Codex-CPG-Repository/1.0 (research; local user)' }
$licences = @('80128874','02248410','80065338','80032257','80023029','80000133','80035527','80011366','80019067','80044950')
$rows = [System.Collections.Generic.List[object]]::new()
$gaps = [System.Collections.Generic.List[object]]::new()

foreach ($licence in $licences) {
  $apiUri = "https://health-products.canada.ca/api/natural-licences/productlicence/?id=$licence&lang=en&type=json"
  $pageUri = "https://health-products.canada.ca/lnhpd-bdpsnh/info?licence=$licence"
  try {
    $products = Invoke-RestMethod -Uri $apiUri -Headers $headers -Method Get -TimeoutSec 60
    $page = Invoke-WebRequest -Uri $pageUri -Headers $headers -Method Get -UseBasicParsing -TimeoutSec 60
    $plain = [System.Net.WebUtility]::HtmlDecode(($page.Content -replace '<[^>]+>',' ' -replace '\s+',' '))
    $marketStatus = if ($plain -match 'Market status:\s*(Marketed|Not Marketed)') { $Matches[1] } else { 'Not stated' }
    $licenceStatus = if ($plain -match 'Licence Status:\s*([^:]+?)\s*Brand name') { $Matches[1].Trim() } else { 'Not stated' }
    foreach ($product in @($products)) {
      if (([string]$product.company_name) -notlike '*Colgate-Palmolive Canada*') { continue }
      $rows.Add([pscustomobject]@{
        market = 'CA'
        npn = [string]($product.licence_number)
        product_name = [string]($product.product_name)
        dosage_form = [string]($product.dosage_form)
        company_name = [string]($product.company_name)
        licence_date = [string]($product.licence_date)
        revised_date = [string]($product.revised_date)
        flag_primary_name = $product.flag_primary_name
        flag_product_status = $product.flag_product_status
        market_status = $marketStatus
        licence_status = $licenceStatus
        source_url = $pageUri
        api_url = $apiUri
        evidence_tier = 'Tier 1 - Canadian government directory'
      })
    }
  } catch {
    $gaps.Add([pscustomobject]@{ licence=$licence; api_url=$apiUri; page_url=$pageUri; error=$_.Exception.Message })
  }
  Start-Sleep -Milliseconds 100
}

$payload = [pscustomobject]@{
  generated_at = (Get-Date).ToUniversalTime().ToString('o')
  methodology = 'Targeted Health Canada NPN retrieval for licence numbers discovered via indexed official pages; not a full company-wide LNHPD extract.'
  record_count = $rows.Count
  marketed_count = @($rows | Where-Object market_status -eq 'Marketed').Count
  records = $rows
  gaps = $gaps
}
$payload | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $OutputPath -Encoding utf8
Write-Output "Saved $($rows.Count) NPN name records; $(@($rows | Where-Object market_status -eq 'Marketed').Count) marked Marketed."

