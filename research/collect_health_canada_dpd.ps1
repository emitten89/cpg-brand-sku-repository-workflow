param(
  [string]$OutputPath = ".\research\raw\health_canada_dpd.json"
)

$ErrorActionPreference = 'Stop'
$headers = @{ 'User-Agent' = 'Codex-CPG-Repository/1.0 (research; local user)' }
$terms = @('COLGATE','HELLO','SOFTSOAP','SPEED STICK','LADY SPEED STICK','IRISH SPRING','PALMOLIVE','TOMS')
$seen = @{}
$rows = [System.Collections.Generic.List[object]]::new()
$gaps = [System.Collections.Generic.List[object]]::new()

foreach ($term in $terms) {
  $encoded = [uri]::EscapeDataString($term)
  $productUri = "https://health-products.canada.ca/api/drug/drugproduct/?brandname=$encoded&lang=en&type=json"
  try {
    $products = Invoke-RestMethod -Uri $productUri -Headers $headers -Method Get -TimeoutSec 60
  } catch {
    $gaps.Add([pscustomobject]@{ term=$term; url=$productUri; error=$_.Exception.Message })
    continue
  }
  foreach ($product in $products) {
    if (([string]$product.company_name) -notlike '*COLGATE-PALMOLIVE CANADA INC*') { continue }
    $code = [string]($product.drug_code)
    if ($seen.ContainsKey($code)) { continue }
    $seen[$code] = $true
    $statusUri = "https://health-products.canada.ca/api/drug/status/?id=$code&lang=en&type=json"
    try {
      $status = Invoke-RestMethod -Uri $statusUri -Headers $headers -Method Get -TimeoutSec 30
      $rows.Add([pscustomobject]@{
        market = 'CA'
        drug_code = $product.drug_code
        din = [string]($product.drug_identification_number)
        brand_name = [string]($product.brand_name)
        descriptor = [string]($product.descriptor)
        class_name = [string]($product.class_name)
        company_name = [string]($product.company_name)
        last_update_date = [string]($product.last_update_date)
        status = [string]($status.status)
        status_date = [string]($status.history_date)
        original_market_date = [string]($status.original_market_date)
        expiration_date = [string]($status.expiration_date)
        source_url = "https://health-products.canada.ca/dpd-bdpp/info?code=$code&lang=eng"
        api_product_url = $productUri
        api_status_url = $statusUri
        evidence_tier = 'Tier 1 - Canadian government directory'
      })
    } catch {
      $gaps.Add([pscustomobject]@{ term=$term; drug_code=$code; url=$statusUri; error=$_.Exception.Message })
    }
    Start-Sleep -Milliseconds 75
  }
}

$payload = [pscustomobject]@{
  generated_at = (Get-Date).ToUniversalTime().ToString('o')
  record_count = $rows.Count
  marketed_count = @($rows | Where-Object status -eq 'Marketed').Count
  approved_count = @($rows | Where-Object status -eq 'Approved').Count
  records = $rows
  gaps = $gaps
}
$payload | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $OutputPath -Encoding utf8
Write-Output "Saved $($rows.Count) DIN records: $(@($rows | Where-Object status -eq 'Marketed').Count) marketed, $(@($rows | Where-Object status -eq 'Approved').Count) approved."

