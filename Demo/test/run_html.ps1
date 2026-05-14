$publicPath = Join-Path $PSScriptRoot "public"

if (!(Test-Path $publicPath)) {
    Write-Host "public folder not found"
    exit 1
}

$npmCmd = Get-Command npm -ErrorAction SilentlyContinue
$npxCmd = Get-Command npx -ErrorAction SilentlyContinue

if (-not $npmCmd -or -not $npxCmd) {
    Write-Host "npm or npx not found"
    exit 1
}

Set-Location $PSScriptRoot

Write-Host "starting live-server..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npx live-server public --port=5500"

Start-Sleep -Seconds 3

Start-Process "http://localhost:5501"