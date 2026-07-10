@echo off
set SCRIPT=%~dp0configure_agent_helper.ps1
if not exist "%SCRIPT%" (
  echo Arquivo nao encontrado: %SCRIPT%
  exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Process powershell.exe -Verb RunAs -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File ""%SCRIPT%""'"
