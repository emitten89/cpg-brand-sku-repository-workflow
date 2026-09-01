param(
    [Parameter(Mandatory = $true)]
    [string]$ArtifactToolModule
)

$ErrorActionPreference = 'Stop'
$node = (Get-Command node -ErrorAction Stop).Source
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

& (Join-Path $repoRoot 'research\collect_openfda.ps1')
& (Join-Path $repoRoot 'research\collect_health_canada_dpd.ps1')
& (Join-Path $repoRoot 'research\collect_health_canada_npn.ps1')
& (Join-Path $repoRoot 'research\collect_public_registries.ps1')
& $node (Join-Path $repoRoot 'research\parse_exa_catalogs.mjs')
& $node (Join-Path $repoRoot 'research\parse_retail_catalogs.mjs')
& $node (Join-Path $repoRoot 'research\build_canonical_data.mjs')
& $node (Join-Path $repoRoot 'workflow\validate-canonical.mjs') (Join-Path $repoRoot 'research\canonical')

$env:ARTIFACT_TOOL_MODULE = $ArtifactToolModule
& $node (Join-Path $repoRoot 'research\build_workbooks.mjs')
& $node (Join-Path $repoRoot 'research\verify_workbooks.mjs')

