param(
  [string]$OutputPath = ".\research\raw\openfda_colgate_ndc.json"
)

$ErrorActionPreference = "Stop"
$uri = 'https://api.fda.gov/drug/ndc.json?search=labeler_name:%22Colgate-Palmolive%20Company%22&limit=1000'
$headers = @{ 'User-Agent' = 'Codex-CPG-Repository/1.0 (research; local user)' }
$response = Invoke-RestMethod -Uri $uri -Headers $headers -Method Get -TimeoutSec 60
$asOf = 20260831
$rows = [System.Collections.Generic.List[object]]::new()

foreach ($product in @($response.results)) {
  $listingExpiration = 0
  [void][int]::TryParse([string]$product.listing_expiration_date, [ref]$listingExpiration)
  foreach ($package in @($product.packaging)) {
    $endDate = 99991231
    if ($package.marketing_end_date) {
      [void][int]::TryParse([string]$package.marketing_end_date, [ref]$endDate)
    }
    $isActiveAsOf = (($listingExpiration -eq 0 -or $listingExpiration -ge $asOf) -and $endDate -ge $asOf)
    $rows.Add([pscustomobject]@{
      is_active_as_of_2026_08_31 = $isActiveAsOf
      product_ndc = [string]$product.product_ndc
      package_ndc = [string]$package.package_ndc
      brand_name = [string]$product.brand_name
      brand_name_suffix = [string]$product.brand_name_suffix
      generic_name = [string]$product.generic_name
      dosage_form = [string]$product.dosage_form
      marketing_category = [string]$product.marketing_category
      route = (@($product.route) -join ' | ')
      package_description = [string]$package.description
      marketing_start_date = [string]$package.marketing_start_date
      marketing_end_date = [string]$package.marketing_end_date
      listing_expiration_date = [string]$product.listing_expiration_date
      source_last_updated = [string]$response.meta.last_updated
      source_url = $uri
      evidence_tier = 'Tier 1 - U.S. government directory'
    })
  }
}

$payload = [pscustomobject]@{
  generated_at = (Get-Date).ToUniversalTime().ToString('o')
  source_last_updated = [string]$response.meta.last_updated
  source_url = $uri
  total_products = [int]$response.meta.results.total
  package_row_count = $rows.Count
  active_package_row_count = @($rows | Where-Object is_active_as_of_2026_08_31).Count
  records = $rows
}
$payload | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $OutputPath -Encoding utf8
Write-Output "Saved $($rows.Count) package rows; $(@($rows | Where-Object is_active_as_of_2026_08_31).Count) active as of 2026-08-31."

