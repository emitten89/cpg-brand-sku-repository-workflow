param(
  [string]$OutputPath = ".\research\raw\public_registry_products.json"
)

$ErrorActionPreference = "Stop"
$headers = @{
  "User-Agent" = "Codex-CPG-Repository/1.0 (research; contact: local-user)"
}

$registries = @(
  @{ Name = "Open Beauty Facts"; Base = "https://world.openbeautyfacts.org" },
  @{ Name = "Open Products Facts"; Base = "https://world.openproductsfacts.org" },
  @{ Name = "Open Pet Food Facts"; Base = "https://world.openpetfoodfacts.org" },
  @{ Name = "Open Food Facts"; Base = "https://world.openfoodfacts.org" }
)

$brands = @(
  @{ Brand = "Colgate"; Tags = @("colgate", "ultrabrite") },
  @{ Brand = "Tom's of Maine"; Tags = @("tom-s-of-maine", "toms-of-maine") },
  @{ Brand = "hello"; Tags = @("hello", "hello-products") },
  @{ Brand = "elmex"; Tags = @("elmex") },
  @{ Brand = "meridol"; Tags = @("meridol") },
  @{ Brand = "Softsoap"; Tags = @("softsoap", "soft-soap") },
  @{ Brand = "Irish Spring"; Tags = @("irish-spring") },
  @{ Brand = "Speed Stick"; Tags = @("speed-stick", "speedstick") },
  @{ Brand = "Lady Speed Stick"; Tags = @("lady-speed-stick") },
  @{ Brand = "Palmolive"; Tags = @("palmolive") },
  @{ Brand = "Fabuloso"; Tags = @("fabuloso") },
  @{ Brand = "Suavitel"; Tags = @("suavitel") },
  @{ Brand = "Ajax"; Tags = @("ajax") },
  @{ Brand = "Murphy Oil Soap"; Tags = @("murphy-oil-soap", "murphys-oil-soap") },
  @{ Brand = "Fleecy"; Tags = @("fleecy") },
  @{ Brand = "EltaMD"; Tags = @("eltamd", "elta-md") },
  @{ Brand = "PCA SKIN"; Tags = @("pca-skin", "pcaskin") },
  @{ Brand = "FILORGA"; Tags = @("filorga") },
  @{ Brand = "Hill's"; Tags = @("hill-s", "hills") },
  @{ Brand = "Hill's Science Diet"; Tags = @("hill-s-science-diet", "hills-science-diet") },
  @{ Brand = "Hill's Prescription Diet"; Tags = @("hill-s-prescription-diet", "hills-prescription-diet") }
)

$markets = @("United States", "Canada")
$fields = "code,product_name,generic_name,brands,quantity,packaging,countries,categories,product_quantity,product_quantity_unit,image_url,last_modified_t,stores,purchase_places,url"
$records = [System.Collections.Generic.List[object]]::new()
$gaps = [System.Collections.Generic.List[object]]::new()
$seen = @{}

foreach ($registry in $registries) {
  foreach ($brand in $brands) {
    foreach ($tag in $brand.Tags) {
      foreach ($market in $markets) {
        $page = 1
        do {
          $encodedTag = [uri]::EscapeDataString($tag)
          $encodedMarket = [uri]::EscapeDataString($market)
          $uri = "$($registry.Base)/api/v2/search?brands_tags=$encodedTag&countries_tags_en=$encodedMarket&fields=$fields&page_size=100&page=$page"
          try {
            $response = Invoke-RestMethod -Uri $uri -Headers $headers -Method Get -TimeoutSec 30
            foreach ($product in @($response.products)) {
              $code = [string]$product.code
              if ([string]::IsNullOrWhiteSpace($code)) { continue }
              $key = "$($registry.Name)|$market|$code"
              if ($seen.ContainsKey($key)) { continue }
              $seen[$key] = $true
              $records.Add([pscustomobject]@{
                registry = $registry.Name
                registry_domain = $registry.Base
                canonical_brand = $brand.Brand
                queried_brand_tag = $tag
                market = if ($market -eq "United States") { "USA" } else { "CA" }
                code = $code
                product_name = [string]$product.product_name
                generic_name = [string]$product.generic_name
                source_brands = [string]$product.brands
                quantity = [string]$product.quantity
                packaging = [string]$product.packaging
                countries = [string]$product.countries
                categories = [string]$product.categories
                product_quantity = $product.product_quantity
                product_quantity_unit = [string]$product.product_quantity_unit
                image_url = [string]$product.image_url
                last_modified_t = $product.last_modified_t
                stores = [string]$product.stores
                purchase_places = [string]$product.purchase_places
                registry_product_url = if ($product.url) { [string]$product.url } else { "$($registry.Base)/product/$code" }
                query_url = $uri
                evidence_tier = "Secondary crowdsourced registry"
              })
            }
            $pageCount = [int]$response.page_count
            if ($pageCount -lt 1) { $pageCount = 1 }
          } catch {
            $gaps.Add([pscustomobject]@{
              registry = $registry.Name
              canonical_brand = $brand.Brand
              queried_brand_tag = $tag
              market = $market
              query_url = $uri
              error = $_.Exception.Message
            })
            $pageCount = 0
          }
          $page++
          Start-Sleep -Milliseconds 120
        } while ($page -le $pageCount -and $page -le 20)
      }
    }
  }
}

$payload = [pscustomobject]@{
  generated_at = (Get-Date).ToUniversalTime().ToString("o")
  methodology = "Open Facts public APIs queried by brand tag and market; records require official or retailer corroboration before high-confidence inclusion."
  record_count = $records.Count
  records = $records
  gaps = $gaps
}

$payload | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $OutputPath -Encoding utf8
Write-Output "Saved $($records.Count) records and $($gaps.Count) query gaps to $OutputPath"

