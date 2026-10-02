$ErrorActionPreference = "Stop"

$BackendPath = Resolve-Path (Join-Path $PSScriptRoot "..")
$EnvFilePath = Join-Path $BackendPath ".env.local"

$RequiredKeys = @(
    "ASPNETCORE_ENVIRONMENT",
    "ConnectionStrings__DefaultConnection"
)

$PublicDefaults = @{
    "ASPNETCORE_ENVIRONMENT" = "Development"
}

# 1. Carregar variaveis do .env.local em um dicionario
$EnvVars = @{}

if (Test-Path $EnvFilePath) {
    $Lines = Get-Content $EnvFilePath
    foreach ($Line in $Lines) {
        $Trimmed = $Line.Trim()
        if (-not [string]::IsNullOrWhiteSpace($Trimmed) -and -not $Trimmed.StartsWith("#")) {
            $Index = $Trimmed.IndexOf("=")
            if ($Index -gt 0) {
                $Key   = $Trimmed.Substring(0, $Index).Trim()
                $Value = $Trimmed.Substring($Index + 1).Trim()
                $EnvVars[$Key] = $Value
            }
        }
    }
}

# 2. Preencher defaults publicos e solicitar valores sensiveis ausentes
$Updated = $false

foreach ($Key in $RequiredKeys) {
    if (-not $EnvVars.ContainsKey($Key) -or [string]::IsNullOrWhiteSpace($EnvVars[$Key])) {

        if ($PublicDefaults.ContainsKey($Key)) {
            $EnvVars[$Key] = $PublicDefaults[$Key]
            $Updated = $true
        }
        elseif ($Key -eq "ConnectionStrings__DefaultConnection") {
            Write-Host ""
            Write-Host "Configuracao ausente: $Key" -ForegroundColor Yellow
            Write-Host "Formato: Host=<host>;Port=5432;Database=<db>;Username=<user>;Password=<senha>" -ForegroundColor DarkGray
            $SecureValue = Read-Host "Informe a connection string do PostgreSQL do CRM" -AsSecureString

            $BSTR  = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureValue)
            $Value = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
            [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)

            if ([string]::IsNullOrWhiteSpace($Value)) {
                Write-Error "A connection string e obrigatoria."
                exit 1
            }
            $EnvVars[$Key] = $Value
            $Updated = $true
        }
    }
}

# 3. Persistir .env.local se houve alteracoes
if ($Updated) {
    $FileContent = @()
    foreach ($Key in $RequiredKeys) {
        $FileContent += "$Key=$($EnvVars[$Key])"
    }
    Set-Content -Path $EnvFilePath -Value $FileContent -Encoding UTF8
    Write-Host "Arquivo .env.local gerado/atualizado." -ForegroundColor Green
}

# 4. Validar chaves obrigatorias e injetar no processo atual
foreach ($Key in $RequiredKeys) {
    if (-not $EnvVars.ContainsKey($Key) -or [string]::IsNullOrWhiteSpace($EnvVars[$Key])) {
        Write-Error "Configuracao obrigatoria ausente: $Key"
        exit 1
    }
    [Environment]::SetEnvironmentVariable($Key, $EnvVars[$Key], [EnvironmentVariableTarget]::Process)
}

Write-Host "Configuracoes carregadas." -ForegroundColor Green