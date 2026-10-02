$ErrorActionPreference = "Stop"

$BackendPath = Resolve-Path (Join-Path $PSScriptRoot "..")
$ApiProjectPath = Join-Path $BackendPath "ProgridPlus.Api"

# Carrega e valida configuracoes do .env.local
. (Join-Path $PSScriptRoot "load-env.ps1")

# Verifica dotnet
if (-not (Get-Command "dotnet" -ErrorAction SilentlyContinue)) {
    Write-Error "O SDK do .NET nao foi encontrado. Verifique a instalacao."
    exit 1
}

if (-not (Test-Path $ApiProjectPath)) {
    Write-Error "Projeto nao encontrado: $ApiProjectPath"
    exit 1
}

Write-Host ""
Write-Host "Iniciando a API do CRM em http://localhost:5200 ..." -ForegroundColor Cyan
Write-Host ""

Set-Location $BackendPath
dotnet run --project "ProgridPlus.Api" --urls "http://localhost:5200"