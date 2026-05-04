param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$RtkArgs
)

$projectRoot = Split-Path -Parent $PSScriptRoot
$base = Join-Path $projectRoot ".rtk-home"
$roaming = Join-Path $base "Roaming"
$local = Join-Path $base "Local"

foreach ($path in @($base, $roaming, $local)) {
  if (-not (Test-Path $path)) {
    New-Item -ItemType Directory -Path $path | Out-Null
  }
}

$env:APPDATA = $roaming
$env:LOCALAPPDATA = $local
$env:HOME = $base
$env:USERPROFILE = $base

if (-not $RtkArgs -or $RtkArgs.Count -eq 0) {
  & rtk --help
  exit $LASTEXITCODE
}

& rtk @RtkArgs
exit $LASTEXITCODE
