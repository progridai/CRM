#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Testa os 6 cenarios obrigatorios de autorizacao do CRM.
    
.DESCRIPTION
    Antes de executar, configure as variaveis de ambiente ou edite as variaveis abaixo.
    
    TOKEN_COM_PERMISSAO    : JWT de usuario com crm.acessar
    TOKEN_SEM_PERMISSAO    : JWT de usuario sem crm.acessar e sem acesso_total
    TOKEN_ACESSO_TOTAL     : JWT de usuario com acesso_total = true (sem crm.acessar)
    TOKEN_INATIVO          : JWT de usuario com ativo = false
    TOKEN_INEXISTENTE      : JWT valido mas sub nao existe em seguranca.usuario
    API_URL                : URL base da API (padrao: http://localhost:5000)
    
    Exemplo de uso:
        $env:TOKEN_COM_PERMISSAO = "eyJ..."
        $env:API_URL = "http://localhost:5000"
        .\test-crm-auth.ps1

.NOTES
    Cenario 6 (sem JWT valido) nao requer token - usa string invalida.
#>

$BASE = $env:API_URL ?? "http://localhost:5000"
$ENDPOINT = "$BASE/api/users/profile"

$TOKEN_COM_PERMISSAO  = $env:TOKEN_COM_PERMISSAO  ?? ""
$TOKEN_SEM_PERMISSAO  = $env:TOKEN_SEM_PERMISSAO  ?? ""
$TOKEN_ACESSO_TOTAL   = $env:TOKEN_ACESSO_TOTAL   ?? ""
$TOKEN_INATIVO        = $env:TOKEN_INATIVO        ?? ""
$TOKEN_INEXISTENTE    = $env:TOKEN_INEXISTENTE     ?? ""

function Invoke-Teste {
    param(
        [string]$Descricao,
        [string]$Token,
        [int]$EsperadoStatus
    )
    
    $headers = @{}
    if (-not [string]::IsNullOrWhiteSpace($Token)) {
        $headers["Authorization"] = "Bearer $Token"
    }
    
    try {
        $resp = Invoke-WebRequest -Uri $ENDPOINT -Headers $headers -Method GET `
                    -SkipHttpErrorCheck -UseBasicParsing -ErrorAction Stop
        $status = $resp.StatusCode
    } catch {
        $status = 0
        Write-Host "  [ERRO DE CONEXAO] $_" -ForegroundColor Red
    }
    
    $ok = $status -eq $EsperadoStatus
    $simbolo = if ($ok) { "[OK]" } else { "[FAIL]" }
    $cor = if ($ok) { "Green" } else { "Red" }
    
    Write-Host "$simbolo $Descricao" -ForegroundColor $cor
    Write-Host "     Esperado: $EsperadoStatus | Obtido: $status"
    Write-Host ""
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Teste de Autorizacao CRM - 6 Cenarios" -ForegroundColor Cyan
Write-Host "  Endpoint: $ENDPOINT" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Cenario 1: usuario sem crm.acessar -> 403
Invoke-Teste -Descricao "1. Usuario sem crm.acessar -> 403" `
             -Token $TOKEN_SEM_PERMISSAO `
             -EsperadoStatus 403

# Cenario 2: usuario com crm.acessar -> 200
Invoke-Teste -Descricao "2. Usuario com crm.acessar -> 200" `
             -Token $TOKEN_COM_PERMISSAO `
             -EsperadoStatus 200

# Cenario 3: usuario com acesso_total -> 200
Invoke-Teste -Descricao "3. Usuario com acesso_total = true -> 200" `
             -Token $TOKEN_ACESSO_TOTAL `
             -EsperadoStatus 200

# Cenario 4: usuario inativo -> 403
Invoke-Teste -Descricao "4. Usuario inativo (ativo = false) -> 403" `
             -Token $TOKEN_INATIVO `
             -EsperadoStatus 403

# Cenario 5: usuario inexistente em seguranca.usuario -> 403
Invoke-Teste -Descricao "5. Sub nao existe em seguranca.usuario -> 403" `
             -Token $TOKEN_INEXISTENTE `
             -EsperadoStatus 403

# Cenario 6: sem JWT valido -> 401
Invoke-Teste -Descricao "6. Sem JWT valido (token invalido) -> 401" `
             -Token "token.invalido.assinatura" `
             -EsperadoStatus 401

Write-Host "Testes concluidos." -ForegroundColor Cyan