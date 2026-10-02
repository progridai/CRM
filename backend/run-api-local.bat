@echo off
setlocal

cd /d "%~dp0"

powershell.exe -NoProfile -ExecutionPolicy Bypass ^
  -File "%~dp0scripts\run-api-local.ps1"

if errorlevel 1 (
    echo.
    echo Nao foi possivel iniciar a API do CRM.
    pause
)

endlocal