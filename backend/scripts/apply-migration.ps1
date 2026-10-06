# Carrega o .env.local e aplica a migration
$envFile = Join-Path $PSScriptRoot '..\.env.local'
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith('#') -and $line -match '=') {
            $idx = $line.IndexOf('=')
            $key = $line.Substring(0, $idx).Trim()
            $val = $line.Substring($idx + 1).Trim()
            [System.Environment]::SetEnvironmentVariable($key, $val, 'Process')
            Write-Host "  SET $key"
        }
    }
} else {
    Write-Error "Arquivo .env.local nao encontrado em $envFile"
    exit 1
}

Set-Location (Join-Path $PSScriptRoot '..\ProgridPlus.Api')
Write-Host "`nAplicando migration CriarEstruturaNegocios..."
dotnet ef database update --context CrmDbContext
