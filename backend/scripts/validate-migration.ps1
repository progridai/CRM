# Valida migration via dotnet ef migrations list e diretamente na connection string com Npgsql
$envFile = Join-Path $PSScriptRoot '..\.env.local'
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith('#') -and $line -match '=') {
            $idx = $line.IndexOf('=')
            $key = $line.Substring(0, $idx).Trim()
            $val = $line.Substring($idx + 1).Trim()
            [System.Environment]::SetEnvironmentVariable($key, $val, 'Process')
        }
    }
}

$apiDir = Join-Path $PSScriptRoot '..\ProgridPlus.Api'
Set-Location $apiDir

Write-Host "`n=== MIGRATIONS APLICADAS (ef migrations list) ===" -ForegroundColor Cyan
dotnet ef migrations list --context CrmDbContext 2>&1
