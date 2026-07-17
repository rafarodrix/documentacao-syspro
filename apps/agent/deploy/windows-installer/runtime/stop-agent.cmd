@echo off
taskkill /IM agent-updater.exe /F >nul 2>&1
taskkill /IM agent-ui.exe /F >nul 2>&1
exit /b 0
